import {
  createSandboxProviderPostId,
  getProviderDefinition,
  MemoryRepository,
  SupabaseRepository,
  type Repository,
} from "@brilhio/backend";
import type { JobPayload } from "@brilhio/contracts";

export type WorkerConfig = {
  openAiApiKey?: string | null;
  openAiModel?: string | null;
};

export function createWorkerRepository(config: {
  supabaseUrl?: string | null;
  serviceRoleKey?: string | null;
  encryptionSecret: string;
}): Repository {
  if (config.supabaseUrl && config.serviceRoleKey) {
    return SupabaseRepository.create({
      supabaseUrl: config.supabaseUrl,
      serviceRoleKey: config.serviceRoleKey,
      encryptionSecret: config.encryptionSecret,
    });
  }

  return new MemoryRepository();
}

async function buildCaptionSuggestion(
  repository: Repository,
  payload: Extract<JobPayload, { type: "generate-caption" }>,
  config: WorkerConfig,
) {
  const contentItem = await repository.getContentItem(payload.contentItemId);
  if (!contentItem) {
    throw new Error("Content item not found for caption generation.");
  }

  const generated = await generateTextWithOpenAI(config, {
    instructions:
      "You are Brilhio's social strategist. Return one concise caption recommendation with a specific hook, tone note, and CTA.",
    input: [
      `Title: ${contentItem.title}`,
      `Campaign: ${contentItem.campaign}`,
      `Brief: ${contentItem.brief}`,
      `Current caption: ${contentItem.primaryCaption}`,
    ].join("\n"),
  });

  await repository.createAiSuggestion({
    userId: payload.userId,
    contentItemId: payload.contentItemId,
    type: "caption",
    title: `AI caption direction for ${contentItem.title}`,
    body: generated,
    modelName: config.openAiModel ?? "gpt-5-mini",
    sourceJobId: payload.jobRecordId,
  });

  return `Generated caption suggestion for ${contentItem.title}.`;
}

async function buildPlatformVariants(
  repository: Repository,
  payload: Extract<JobPayload, { type: "generate-platform-variants" }>,
  config: WorkerConfig,
) {
  const contentItem = await repository.getContentItem(payload.contentItemId);
  if (!contentItem) {
    throw new Error("Content item not found for platform variant generation.");
  }

  const generated = await generateTextWithOpenAI(config, {
    instructions:
      "Create short platform-specific social copy guidance. Cover Instagram, TikTok, Facebook, and X when relevant. Keep it tactical and under 130 words.",
    input: [
      `Title: ${contentItem.title}`,
      `Campaign: ${contentItem.campaign}`,
      `Brief: ${contentItem.brief}`,
      `Caption anchor: ${contentItem.primaryCaption}`,
    ].join("\n"),
  });

  await repository.createAiSuggestion({
    userId: payload.userId,
    contentItemId: payload.contentItemId,
    type: "content_idea",
    title: `Platform variants ready for ${contentItem.title}`,
    body: generated,
    modelName: config.openAiModel ?? "gpt-5-mini",
    sourceJobId: payload.jobRecordId,
  });

  return `Generated platform variants guidance for ${contentItem.title}.`;
}

async function buildCalendarHint(
  repository: Repository,
  payload: Extract<JobPayload, { type: "build-calendar" }>,
  config: WorkerConfig,
) {
  const dashboard = await repository.getDashboard(payload.userId);
  if (!dashboard) {
    throw new Error("User not found for calendar rebuild.");
  }

  const nextSuggestionTarget = dashboard.contentItems[0];
  if (nextSuggestionTarget) {
    const strategy = await repository.getUserStrategyProfile(payload.userId);
    const generated = await generateTextWithOpenAI(config, {
      instructions:
        "Recommend a weekly publishing pattern for a creator social calendar. Mention timing, content mix, and platform focus in under 120 words.",
      input: [
        `Identity: ${strategy.identityType ?? "Unknown"}`,
        `Goals: ${strategy.goals.join(", ") || "None provided"}`,
        `Voice: ${strategy.voiceAttributes.join(", ") || "None provided"}`,
        `Existing scheduled posts: ${dashboard.scheduledPosts.length}`,
        `Content queue: ${dashboard.contentItems.map((item) => item.title).join(", ")}`,
      ].join("\n"),
    });

    await repository.createAiSuggestion({
      userId: payload.userId,
      contentItemId: nextSuggestionTarget.id,
      type: "publish_window",
      title: "Weekly calendar refreshed",
      body: generated,
      modelName: config.openAiModel ?? "gpt-5-mini",
      sourceJobId: payload.jobRecordId,
    });
  }

  return "Rebuilt calendar suggestions for the user.";
}

async function generateTextWithOpenAI(
  config: WorkerConfig,
  request: { instructions: string; input: string },
) {
  if (!config.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is required for AI job processing.");
  }

  const model = config.openAiModel ?? "gpt-5-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: request.instructions,
      input: request.input,
      max_output_tokens: 350,
    }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof json?.error?.message === "string"
        ? json.error.message
        : "OpenAI response failed.";
    throw new Error(message);
  }

  if (typeof json.output_text === "string" && json.output_text.trim()) {
    return json.output_text.trim();
  }

  const text = json.output
    ?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? [])
    .map((content: { text?: string }) => content.text)
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("OpenAI response did not include text output.");
  }

  return text;
}

async function publishScheduledPost(
  repository: Repository,
  payload: Extract<JobPayload, { type: "publish-scheduled-post" }>,
  _config: WorkerConfig,
) {
  const scheduledPost = await repository.getScheduledPost(payload.scheduledPostId);
  if (!scheduledPost) {
    throw new Error("Scheduled post not found.");
  }

  const provider = getProviderDefinition(scheduledPost.platform);
  if (!provider) {
    throw new Error(`Publishing for ${scheduledPost.platform} is not supported.`);
  }

  const credentials = await repository.getSocialAccountCredentials(
    scheduledPost.userId,
    scheduledPost.platform,
  );
  if (!credentials) {
    throw new Error(
      `${provider.displayName} is not connected or is missing publishing credentials.`,
    );
  }

  if (!credentials.accessToken) {
    throw new Error(
      `${provider.displayName} requires an access token before sandbox publishing can run.`,
    );
  }

  if (credentials.providerMetadata.publishMode !== "sandbox") {
    throw new Error(
      `${provider.displayName} is connected, but live publishing is not wired yet for this provider.`,
    );
  }

  await repository.markScheduledPostPublished(
    payload.scheduledPostId,
    createSandboxProviderPostId(scheduledPost.platform),
  );

  return `Published ${provider.displayName} scheduled post ${payload.scheduledPostId} in sandbox mode.`;
}

async function refreshSocialToken(
  repository: Repository,
  payload: Extract<JobPayload, { type: "refresh-social-token" }>,
) {
  const socialAccount = await repository.getSocialAccountById(payload.socialAccountId);
  if (!socialAccount) {
    throw new Error("Social account not found for token refresh.");
  }

  throw new Error(
    `Automatic token refresh is not available for ${socialAccount.platform} yet. Reconnect the account to continue publishing.`,
  );
}

async function ingestProviderWebhook(
  _repository: Repository,
  payload: Extract<JobPayload, { type: "ingest-provider-webhook" }>,
) {
  return `Webhook ${payload.providerWebhookId} marked for downstream processing.`;
}

export async function processJob(
  repository: Repository,
  payload: JobPayload,
  config: WorkerConfig,
) {
  switch (payload.type) {
    case "generate-caption":
      return buildCaptionSuggestion(repository, payload, config);
    case "generate-platform-variants":
      return buildPlatformVariants(repository, payload, config);
    case "build-calendar":
      return buildCalendarHint(repository, payload, config);
    case "publish-scheduled-post":
      return publishScheduledPost(repository, payload, config);
    case "refresh-social-token":
      return refreshSocialToken(repository, payload);
    case "ingest-provider-webhook":
      return ingestProviderWebhook(repository, payload);
    default: {
      const neverReached: never = payload;
      return neverReached;
    }
  }
}
