import {
  createSandboxProviderPostId,
  getProviderDefinition,
  MemoryRepository,
  SupabaseRepository,
  type Repository,
} from "@ritmio/backend";
import type { JobPayload } from "@ritmio/contracts";

export type WorkerConfig = Record<string, never>;

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
) {
  const contentItem = await repository.getContentItem(payload.contentItemId);
  if (!contentItem) {
    throw new Error("Content item not found for caption generation.");
  }

  await repository.createAiSuggestion({
    workspaceId: payload.workspaceId,
    contentItemId: payload.contentItemId,
    type: "caption",
    title: `AI caption direction for ${contentItem.title}`,
    body: `Lead with the business outcome from "${contentItem.brief}", keep the first sentence shorter than the current draft, and close with a platform-specific CTA. Draft anchor: ${contentItem.primaryCaption}`,
    modelName: "ritmio-heuristic-v1",
    sourceJobId: payload.jobRecordId,
  });

  return `Generated caption suggestion for ${contentItem.title}.`;
}

async function buildPlatformVariants(
  repository: Repository,
  payload: Extract<JobPayload, { type: "generate-platform-variants" }>,
) {
  const contentItem = await repository.getContentItem(payload.contentItemId);
  if (!contentItem) {
    throw new Error("Content item not found for platform variant generation.");
  }

  await repository.createAiSuggestion({
    workspaceId: payload.workspaceId,
    contentItemId: payload.contentItemId,
    type: "content_idea",
    title: `Platform variants ready for ${contentItem.title}`,
    body: "Create an Instagram version focused on visual pacing, then a shorter X version that sharpens the hook and CTA.",
    modelName: "ritmio-heuristic-v1",
    sourceJobId: payload.jobRecordId,
  });

  return `Generated platform variants guidance for ${contentItem.title}.`;
}

async function buildCalendarHint(
  repository: Repository,
  payload: Extract<JobPayload, { type: "build-calendar" }>,
) {
  const dashboard = await repository.getDashboard(payload.workspaceId);
  if (!dashboard) {
    throw new Error("Workspace not found for calendar rebuild.");
  }

  const nextSuggestionTarget = dashboard.contentItems[0];
  if (nextSuggestionTarget) {
    await repository.createAiSuggestion({
      workspaceId: payload.workspaceId,
      contentItemId: nextSuggestionTarget.id,
      type: "publish_window",
      title: "Weekly calendar refreshed",
      body: "Cluster educational content earlier in the week and reserve launch-style posts for late-morning Instagram and Facebook windows.",
      modelName: "ritmio-heuristic-v1",
      sourceJobId: payload.jobRecordId,
    });
  }

  return "Rebuilt calendar suggestions for the workspace.";
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
    scheduledPost.workspaceId,
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
      return buildCaptionSuggestion(repository, payload);
    case "generate-platform-variants":
      return buildPlatformVariants(repository, payload);
    case "build-calendar":
      return buildCalendarHint(repository, payload);
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
