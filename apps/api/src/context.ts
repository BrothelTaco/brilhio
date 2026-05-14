import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createBrilhioQueue,
  getQueueDelay,
  isQueueConfigured,
  MemoryRepository,
  SupabaseRepository,
  type Repository,
} from "@brilhio/backend";
import type { JobPayload, JobRecord, QueueJobInput } from "@brilhio/contracts";
import { createMediaStorage, type MediaStorage } from "./storage";

export type AppConfig = {
  port: number;
  host: string;
  allowDevAuth: boolean;
  devUserId: string | null;
  devUserEmail: string | null;
  useMemoryRepository: boolean;
  supabaseUrl: string | null;
  supabaseServiceRoleKey: string | null;
  encryptionSecret: string;
  redisUrl: string | null;
  apiPublicUrl: string | null;
  webAppUrl: string | null;
  storageBucket: string;
  r2AccountId: string | null;
  r2AccessKeyId: string | null;
  r2SecretAccessKey: string | null;
  r2Endpoint: string | null;
  r2SignedUrlTtlSeconds: number;
  mediaMaxFileSizeBytes: number;
  stripeSecretKey: string | null;
  stripePriceId: string | null;
  stripeWebhookSecret: string | null;
  requireSubscription: boolean;
  subscriptionEnforcementConfirmed: boolean;
  alertWebhookUrl: string | null;
  supabaseAuthRedirectUrls: string[];
};

export type AppContext = {
  config: AppConfig;
  repository: Repository;
  supabaseAdmin: SupabaseClient | null;
  queue: ReturnType<typeof createBrilhioQueue> | null;
  mediaStorage: MediaStorage;
};

export function readAppConfig(env = process.env): AppConfig {
  return {
    port: Number(env.PORT ?? 4000),
    host: env.HOST ?? "0.0.0.0",
    allowDevAuth: env.ALLOW_DEV_AUTH === "true",
    devUserId: env.BRILHIO_DEV_USER_ID ?? null,
    devUserEmail: env.BRILHIO_DEV_USER_EMAIL ?? null,
    useMemoryRepository: env.USE_MEMORY_REPOSITORY === "true",
    supabaseUrl: env.SUPABASE_URL ?? null,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? null,
    encryptionSecret:
      env.APP_ENCRYPTION_KEY ??
      env.SUPABASE_SERVICE_ROLE_KEY ??
      "brilhio-local-secret",
    redisUrl: env.REDIS_URL ?? null,
    apiPublicUrl:
      env.API_PUBLIC_URL ??
      env.NEXT_PUBLIC_API_BASE_URL ??
      env.NEXT_PUBLIC_API_URL ??
      null,
    webAppUrl: env.WEB_APP_URL ?? null,
    storageBucket: env.R2_BUCKET ?? "media-assets",
    r2AccountId: env.R2_ACCOUNT_ID ?? null,
    r2AccessKeyId: env.R2_ACCESS_KEY_ID ?? null,
    r2SecretAccessKey: env.R2_SECRET_ACCESS_KEY ?? null,
    r2Endpoint:
      env.R2_ENDPOINT ??
      (env.R2_ACCOUNT_ID
        ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : null),
    r2SignedUrlTtlSeconds: Number(env.R2_SIGNED_URL_TTL_SECONDS ?? 300),
    mediaMaxFileSizeBytes: Number(env.MEDIA_MAX_FILE_SIZE_BYTES ?? 104_857_600),
    stripeSecretKey: env.STRIPE_SECRET_KEY ?? null,
    stripePriceId: env.STRIPE_PRICE_ID ?? null,
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET ?? null,
    requireSubscription: env.REQUIRE_SUBSCRIPTION === "true",
    subscriptionEnforcementConfirmed:
      env.SUBSCRIPTION_ENFORCEMENT_CONFIRMED === "true",
    alertWebhookUrl: env.ALERT_WEBHOOK_URL ?? null,
    supabaseAuthRedirectUrls: (env.SUPABASE_AUTH_REDIRECT_URLS ?? "")
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean),
  };
}

export function createAppContext(config = readAppConfig()): AppContext {
  const hasSupabase = Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
  const useMemoryRepository = config.useMemoryRepository || !hasSupabase;

  const repository = useMemoryRepository
    ? new MemoryRepository()
    : SupabaseRepository.create({
        supabaseUrl: config.supabaseUrl!,
        serviceRoleKey: config.supabaseServiceRoleKey!,
        encryptionSecret: config.encryptionSecret,
      });

  const supabaseAdmin = hasSupabase
    ? createClient(config.supabaseUrl!, config.supabaseServiceRoleKey!, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

  const queue = isQueueConfigured(config.redisUrl)
    ? createBrilhioQueue(config.redisUrl!)
    : null;
  const mediaStorage = createMediaStorage(config);

  return { config, repository, supabaseAdmin, queue, mediaStorage };
}

export function buildRuntimeJobPayload(record: JobRecord, input: QueueJobInput): JobPayload {
  switch (input.type) {
    case "build-calendar":
      return { type: "build-calendar", jobRecordId: record.id, userId: input.userId };
    case "generate-caption":
      return { type: "generate-caption", jobRecordId: record.id, userId: input.userId, contentItemId: input.targetId };
    case "generate-platform-variants":
      return { type: "generate-platform-variants", jobRecordId: record.id, userId: input.userId, contentItemId: input.targetId };
    case "publish-scheduled-post":
      return { type: "publish-scheduled-post", jobRecordId: record.id, userId: input.userId, scheduledPostId: input.targetId };
    case "refresh-social-token":
      return { type: "refresh-social-token", jobRecordId: record.id, userId: input.userId, socialAccountId: input.targetId };
    case "ingest-provider-webhook":
      return { type: "ingest-provider-webhook", jobRecordId: record.id, userId: input.userId, providerWebhookId: input.targetId };
    case "regenerate-brand-brief":
      return { type: "regenerate-brand-brief", jobRecordId: record.id, userId: input.userId };
    default: {
      const neverReached: never = input.type;
      return neverReached;
    }
  }
}

export async function persistAndEnqueueJob(context: AppContext, input: QueueJobInput) {
  const jobRecord = await context.repository.createJobRecord(input);
  const payload = buildRuntimeJobPayload(jobRecord, input);

  if (!context.queue) {
    return { jobRecord, enqueued: false };
  }

  const bullJob = await context.queue.add(payload.type, payload, {
    delay: getQueueDelay(input.scheduledFor),
  });

  const updatedRecord =
    (await context.repository.attachBullmqJobId(jobRecord.id, String(bullJob.id))) ?? jobRecord;

  return { jobRecord: updatedRecord, enqueued: true };
}

export async function sendOperationalAlert(
  context: AppContext,
  input: {
    severity: "warning" | "error";
    event: string;
    message: string;
    details?: Record<string, unknown>;
  },
) {
  if (!context.config.alertWebhookUrl) return;

  try {
    await fetch(context.config.alertWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service: "brilhio-api",
        at: new Date().toISOString(),
        ...input,
      }),
    });
  } catch {
    // Logging may be unavailable here; callers already log the source error.
  }
}
