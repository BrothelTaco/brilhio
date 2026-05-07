import {
  buildUserContext,
  dispatchPublish,
  getProviderDefinition,
  localToUtc,
  MemoryRepository,
  renderUserContextPrompt,
  SupabaseRepository,
  type PublisherMediaRef,
  type Repository,
} from "@brilhio/backend";
import type { JobPayload } from "@brilhio/contracts";
import { z } from "zod";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1h is enough for any platform's fetch step

// Stable system preamble. Keeping the order [role → user context → task] stable across
// calls is what lets OpenAI/Anthropic prompt caching kick in on the prefix.
const ROLE_PREAMBLE =
  "You are Brilhio's AI social strategist. You always tailor advice to the specific user described below — their voice, industry, audience, and what they have posted recently. Respond concisely and tactically; never restate facts back at the user.";

async function buildSystemPrompt(repository: Repository, userId: string, taskInstructions: string) {
  const context = await buildUserContext(repository, userId);
  return [ROLE_PREAMBLE, "", renderUserContextPrompt(context), "", "# Task", taskInstructions].join("\n");
}

export type WorkerConfig = {
  openAiApiKey?: string | null;
  openAiModel?: string | null;
  stripeSecretKey?: string | null;
  xOAuthClientId?: string | null;
  xOAuthClientSecret?: string | null;
  xOAuthTokenUrl?: string | null;
  xOAuthTokenAuthMethod?: string | null;
};

type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
};

type StripeSubscriptionList = {
  data?: StripeSubscription[];
};

function periodEnd(value: unknown) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

async function stripeGetRequest<T>(
  secretKey: string,
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`https://api.stripe.com/v1/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof json?.error?.message === "string"
        ? json.error.message
        : "Stripe request failed.";
    throw new Error(message);
  }

  return json as T;
}

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

async function fetchStripeSubscriptionForProfile(
  secretKey: string,
  profile: Awaited<ReturnType<Repository["listBillingProfilesForReconciliation"]>>[number],
) {
  if (profile.stripeSubscriptionId) {
    return stripeGetRequest<StripeSubscription>(
      secretKey,
      `subscriptions/${profile.stripeSubscriptionId}`,
    );
  }

  if (!profile.stripeCustomerId) return null;

  const subscriptions = await stripeGetRequest<StripeSubscriptionList>(
    secretKey,
    "subscriptions",
    {
      customer: profile.stripeCustomerId,
      status: "all",
      limit: "1",
    },
  );

  return subscriptions.data?.[0] ?? null;
}

export async function reconcileStripeSubscriptions(
  repository: Repository,
  config: WorkerConfig,
) {
  if (!config.stripeSecretKey) {
    return "Skipped Stripe reconciliation because STRIPE_SECRET_KEY is not configured.";
  }

  const profiles = await repository.listBillingProfilesForReconciliation();
  let updated = 0;
  let skipped = 0;

  for (const profile of profiles) {
    const subscription = await fetchStripeSubscriptionForProfile(
      config.stripeSecretKey,
      profile,
    );

    if (!subscription) {
      skipped += 1;
      continue;
    }

    await repository.updateBillingProfileByUserId(profile.userId, {
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: periodEnd(subscription.current_period_end),
      subscriptionCancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    });
    updated += 1;
  }

  return `Reconciled Stripe subscriptions for ${updated} profile(s); skipped ${skipped}.`;
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

  const instructions = await buildSystemPrompt(
    repository,
    payload.userId,
    "Return ONE concise caption recommendation for the content item below. Include a specific hook, a tone note, and a CTA. Match the user's voice and content pillars.",
  );

  const generated = await generateTextWithOpenAI(config, {
    instructions,
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

  const instructions = await buildSystemPrompt(
    repository,
    payload.userId,
    "Create short platform-specific copy guidance for the content item below. Cover Instagram, TikTok, Facebook, and X when relevant — but only the platforms the user has connected. Keep it tactical and under 130 words.",
  );

  const generated = await generateTextWithOpenAI(config, {
    instructions,
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

const calendarSlotSchema = z.object({
  dayOffset: z.number().int().min(0).max(6),
  localTime: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/),
  platform: z.enum(["instagram", "tiktok", "facebook", "x"]),
  contentTypeHint: z.string().min(1).max(120),
  rationale: z.string().min(1).max(280),
});
const calendarSlotsSchema = z.object({
  slots: z.array(calendarSlotSchema).min(1).max(14),
});

const CALENDAR_SLOTS_JSON_SCHEMA = {
  type: "object",
  properties: {
    slots: {
      type: "array",
      items: {
        type: "object",
        properties: {
          dayOffset: { type: "integer", description: "0 = today, 6 = a week from today, in the user's timezone." },
          localTime: { type: "string", description: "24-hour HH:MM in the user's timezone." },
          platform: { type: "string", enum: ["instagram", "tiktok", "facebook", "x"] },
          contentTypeHint: { type: "string", description: "Short description of what kind of content fits this slot (one of the user's content pillars when possible)." },
          rationale: { type: "string", description: "Why this time/platform/content combination, in one sentence." },
        },
        required: ["dayOffset", "localTime", "platform", "contentTypeHint", "rationale"],
        additionalProperties: false,
      },
    },
  },
  required: ["slots"],
  additionalProperties: false,
} as const;

function todayPartsInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function slotToUtcIso(
  timezone: string,
  baseToday: { year: number; month: number; day: number },
  dayOffset: number,
  localTime: string,
): string {
  // Date math in UTC just to walk calendar days; we're not setting a real instant yet.
  const date = new Date(Date.UTC(baseToday.year, baseToday.month - 1, baseToday.day));
  date.setUTCDate(date.getUTCDate() + dayOffset);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return localToUtc(`${yyyy}-${mm}-${dd}T${localTime}:00`, timezone);
}

async function buildCalendarSlots(
  repository: Repository,
  payload: Extract<JobPayload, { type: "build-calendar" }>,
  config: WorkerConfig,
) {
  const timezone = await repository.getUserTimezone(payload.userId);
  const today = todayPartsInTimezone(timezone);
  const todayLabel = `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;

  const instructions = await buildSystemPrompt(
    repository,
    payload.userId,
    [
      "Propose 5-9 publishing slots for the user over the next 7 days. Each slot is an opaque calendar placeholder — time, platform, and content-type hint only; no captions or media yet.",
      "Spread slots across the week (don't cluster everything on one day). Bias platforms by the user's platformPriorities. Pick contentTypeHints from the user's content pillars when possible. Use audience-appropriate windows (consider industry norms, the user's audience notes, and quiet hours).",
      "Return ONLY the structured JSON. dayOffset 0 = today.",
    ].join("\n"),
  );

  const parsed = await generateJsonWithOpenAI(config, {
    instructions,
    input: `Plan the next 7 days starting ${todayLabel} (user timezone: ${timezone}).`,
    schemaName: "calendar_slots",
    schema: CALENDAR_SLOTS_JSON_SCHEMA,
  });

  const validated = calendarSlotsSchema.parse(parsed);

  // Refresh: drop existing open slots so re-runs replace stale recommendations.
  // Filled and dismissed slots are preserved.
  await repository.deleteOpenRecommendedSlots(payload.userId);

  for (const slot of validated.slots) {
    const suggestedFor = slotToUtcIso(timezone, today, slot.dayOffset, slot.localTime);
    await repository.createRecommendedSlot({
      userId: payload.userId,
      suggestedFor,
      platform: slot.platform,
      contentTypeHint: slot.contentTypeHint,
      rationale: slot.rationale,
    });
  }

  return `Wrote ${validated.slots.length} recommended slot${validated.slots.length === 1 ? "" : "s"} for the user.`;
}

async function callOpenAiResponses(
  config: WorkerConfig,
  body: Record<string, unknown>,
) {
  if (!config.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is required for AI job processing.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: config.openAiModel ?? "gpt-5-mini", ...body }),
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

async function generateTextWithOpenAI(
  config: WorkerConfig,
  request: { instructions: string; input: string },
) {
  return callOpenAiResponses(config, {
    instructions: request.instructions,
    input: request.input,
    max_output_tokens: 350,
  });
}

async function generateJsonWithOpenAI(
  config: WorkerConfig,
  request: {
    instructions: string;
    input: string;
    schemaName: string;
    schema: Record<string, unknown>;
  },
) {
  const text = await callOpenAiResponses(config, {
    instructions: request.instructions,
    input: request.input,
    max_output_tokens: 1200,
    text: {
      format: {
        type: "json_schema",
        name: request.schemaName,
        schema: request.schema,
        strict: true,
      },
    },
  });

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("OpenAI returned non-JSON output despite structured-output request.");
  }
}

async function publishScheduledPost(
  repository: Repository,
  payload: Extract<JobPayload, { type: "publish-scheduled-post" }>,
  config: WorkerConfig,
) {
  const scheduledPost = await repository.getScheduledPost(payload.scheduledPostId);
  if (!scheduledPost) {
    throw new Error("Scheduled post not found.");
  }

  const provider = getProviderDefinition(scheduledPost.platform);
  if (!provider) {
    throw new Error(`Publishing for ${scheduledPost.platform} is not supported.`);
  }

  const contentItem = await repository.getContentItem(scheduledPost.contentItemId);
  if (!contentItem) {
    throw new Error("Content item for scheduled post not found.");
  }

  let credentials = await repository.getSocialAccountCredentials(
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
      `${provider.displayName} requires an access token before publishing can run.`,
    );
  }

  const expiresAt = credentials.tokenExpiresAt
    ? new Date(credentials.tokenExpiresAt).getTime()
    : null;
  if (
    scheduledPost.platform === "x" &&
    credentials.refreshToken &&
    expiresAt !== null &&
    expiresAt <= Date.now() + 5 * 60 * 1000
  ) {
    const socialAccount = await repository.getSocialAccount(
      scheduledPost.userId,
      scheduledPost.platform,
    );
    if (socialAccount) {
      await refreshXToken(repository, socialAccount, config);
      credentials = await repository.getSocialAccountCredentials(
        scheduledPost.userId,
        scheduledPost.platform,
      );
    }
  }

  if (!credentials?.accessToken) {
    throw new Error(
      `${provider.displayName} requires a valid access token before publishing can run.`,
    );
  }

  const assets = await repository.getMediaAssetsByIds(contentItem.mediaAssetIds);
  const media: PublisherMediaRef[] = await Promise.all(
    assets.map(async (asset) => ({
      asset,
      signedUrl: await repository.createSignedMediaUrl(asset.storagePath, SIGNED_URL_TTL_SECONDS),
    })),
  );

  const result = await dispatchPublish({
    scheduledPost,
    contentItem,
    media,
    credentials,
    provider,
  });

  await repository.markScheduledPostPublished(payload.scheduledPostId, result.providerPostId);

  return `Published ${provider.displayName} scheduled post ${payload.scheduledPostId} (${result.mode}).`;
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

function resolveXTokenAuthMethod(value: string | null | undefined) {
  if (
    value === "client_secret_basic" ||
    value === "client_secret_post" ||
    value === "none"
  ) {
    return value;
  }
  return "client_secret_basic";
}

async function refreshXToken(
  repository: Repository,
  socialAccount: NonNullable<Awaited<ReturnType<Repository["getSocialAccountById"]>>>,
  config: WorkerConfig,
) {
  const credentials = await repository.getSocialAccountCredentials(
    socialAccount.userId,
    "x",
  );
  if (!credentials?.refreshToken) {
    throw new Error("X account is missing a refresh token. Reconnect the account.");
  }

  const clientId = config.xOAuthClientId;
  if (!clientId) {
    throw new Error("X OAuth client id is required to refresh tokens.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: credentials.refreshToken,
    client_id: clientId,
  });
  const headers = new Headers({
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  });

  const tokenAuthMethod = resolveXTokenAuthMethod(config.xOAuthTokenAuthMethod);
  if (config.xOAuthClientSecret) {
    if (tokenAuthMethod === "client_secret_basic") {
      headers.set(
        "Authorization",
        `Basic ${Buffer.from(`${clientId}:${config.xOAuthClientSecret}`).toString("base64")}`,
      );
    } else if (tokenAuthMethod === "client_secret_post") {
      body.set("client_secret", config.xOAuthClientSecret);
    }
  }

  const response = await fetch(
    config.xOAuthTokenUrl ?? "https://api.x.com/2/oauth2/token",
    {
      method: "POST",
      headers,
      body,
    },
  );
  const json = await readJsonResponse(response);
  if (!response.ok) {
    const message =
      typeof json.error_description === "string"
        ? json.error_description
        : typeof json.error === "string"
          ? json.error
          : `X token refresh failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  const accessToken =
    typeof json.access_token === "string" ? json.access_token : null;
  if (!accessToken) {
    throw new Error("X token refresh did not return an access token.");
  }

  const refreshToken =
    typeof json.refresh_token === "string" ? json.refresh_token : credentials.refreshToken;
  const tokenExpiresAt =
    typeof json.expires_in === "number"
      ? new Date(Date.now() + json.expires_in * 1000).toISOString()
      : null;

  await repository.updateSocialAccountCredentials({
    userId: socialAccount.userId,
    platform: "x",
    accessToken,
    refreshToken,
    tokenExpiresAt,
    providerMetadata: {
      tokenRefreshedAt: new Date().toISOString(),
      tokenType: typeof json.token_type === "string" ? json.token_type : null,
      scope: typeof json.scope === "string" ? json.scope : null,
    },
  });

  return "Refreshed X account credentials.";
}

async function refreshSocialToken(
  repository: Repository,
  payload: Extract<JobPayload, { type: "refresh-social-token" }>,
  config: WorkerConfig,
) {
  const socialAccount = await repository.getSocialAccountById(payload.socialAccountId);
  if (!socialAccount) {
    throw new Error("Social account not found for token refresh.");
  }

  if (socialAccount.platform === "x") {
    return refreshXToken(repository, socialAccount, config);
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

async function regenerateBrandBrief(
  repository: Repository,
  payload: Extract<JobPayload, { type: "regenerate-brand-brief" }>,
  config: WorkerConfig,
) {
  // Build context but strip the existing brief — otherwise the model just remixes it.
  const context = await buildUserContext(repository, payload.userId);
  const contextWithoutBrief = { ...context, brandBrief: null };

  const instructions = [
    ROLE_PREAMBLE,
    "",
    renderUserContextPrompt(contextWithoutBrief),
    "",
    "# Task",
    "Write a compact internal brand brief for this account. Cover audience, voice, content pillars, platform emphasis, and practical do/don't guidance derived from their recent posts. Be specific (cite hook patterns, recurring themes) — generic adjectives are useless. Under 250 words. Plain prose, no headings.",
  ].join("\n");

  const generated = await generateTextWithOpenAI(config, {
    instructions,
    input: "Regenerate the brand brief from the current account context.",
  });

  await repository.setBrandBrief(payload.userId, generated);
  return "Regenerated brand brief for the user.";
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
      return buildCalendarSlots(repository, payload, config);
    case "publish-scheduled-post":
      return publishScheduledPost(repository, payload, config);
    case "refresh-social-token":
      return refreshSocialToken(repository, payload, config);
    case "ingest-provider-webhook":
      return ingestProviderWebhook(repository, payload);
    case "regenerate-brand-brief":
      return regenerateBrandBrief(repository, payload, config);
    default: {
      const neverReached: never = payload;
      return neverReached;
    }
  }
}
