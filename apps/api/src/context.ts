import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createBrilhioQueue,
  getQueueDelay,
  isQueueConfigured,
  MemoryRepository,
  SupabaseRepository,
  type Repository,
} from "@brilhio/backend";
import type {
  JobPayload,
  JobRecord,
  QueueJobInput,
} from "@brilhio/contracts";

export type AppConfig = {
  port: number;
  host: string;
  allowDevAuth: boolean;
  devUserId: string | null;
  devUserEmail: string | null;
  supabaseUrl: string | null;
  supabaseServiceRoleKey: string | null;
  encryptionSecret: string;
  redisUrl: string | null;
  webAppUrl: string | null;
  storageBucket: string;
};

export type AppContext = {
  config: AppConfig;
  repository: Repository;
  supabaseAdmin: SupabaseClient | null;
  queue: ReturnType<typeof createBrilhioQueue> | null;
};

export function readAppConfig(env = process.env): AppConfig {
  return {
    port: Number(env.PORT ?? 4000),
    host: env.HOST ?? "0.0.0.0",
    allowDevAuth: env.ALLOW_DEV_AUTH !== "false",
    devUserId: env.BRILHIO_DEV_USER_ID ?? null,
    devUserEmail: env.BRILHIO_DEV_USER_EMAIL ?? null,
    supabaseUrl: env.SUPABASE_URL ?? null,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? null,
    encryptionSecret:
      env.APP_ENCRYPTION_KEY ??
      env.SUPABASE_SERVICE_ROLE_KEY ??
      "brilhio-local-secret",
    redisUrl: env.REDIS_URL ?? null,
    webAppUrl: env.WEB_APP_URL ?? null,
    storageBucket: env.SUPABASE_STORAGE_BUCKET ?? "media-assets",
  };
}

export function createAppContext(config = readAppConfig()): AppContext {
  const hasSupabase = Boolean(
    config.supabaseUrl && config.supabaseServiceRoleKey,
  );

  const repository = hasSupabase
    ? SupabaseRepository.create({
        supabaseUrl: config.supabaseUrl!,
        serviceRoleKey: config.supabaseServiceRoleKey!,
        encryptionSecret: config.encryptionSecret,
      })
    : new MemoryRepository();

  const supabaseAdmin = hasSupabase
    ? createClient(config.supabaseUrl!, config.supabaseServiceRoleKey!, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

  const queue = isQueueConfigured(config.redisUrl)
    ? createBrilhioQueue(config.redisUrl!)
    : null;

  return {
    config,
    repository,
    supabaseAdmin,
    queue,
  };
}

export function buildRuntimeJobPayload(
  record: JobRecord,
  input: QueueJobInput,
): JobPayload {
  switch (input.type) {
    case "build-calendar":
      return {
        type: "build-calendar",
        jobRecordId: record.id,
        workspaceId: input.workspaceId,
      };
    case "generate-caption":
      return {
        type: "generate-caption",
        jobRecordId: record.id,
        workspaceId: input.workspaceId,
        contentItemId: input.targetId,
      };
    case "generate-platform-variants":
      return {
        type: "generate-platform-variants",
        jobRecordId: record.id,
        workspaceId: input.workspaceId,
        contentItemId: input.targetId,
      };
    case "publish-scheduled-post":
      return {
        type: "publish-scheduled-post",
        jobRecordId: record.id,
        workspaceId: input.workspaceId,
        scheduledPostId: input.targetId,
      };
    case "refresh-social-token":
      return {
        type: "refresh-social-token",
        jobRecordId: record.id,
        workspaceId: input.workspaceId,
        socialAccountId: input.targetId,
      };
    case "ingest-provider-webhook":
      return {
        type: "ingest-provider-webhook",
        jobRecordId: record.id,
        workspaceId: input.workspaceId,
        providerWebhookId: input.targetId,
      };
    default: {
      const neverReached: never = input.type;
      return neverReached;
    }
  }
}

export async function persistAndEnqueueJob(
  context: AppContext,
  input: QueueJobInput,
) {
  const jobRecord = await context.repository.createJobRecord(input);
  const payload = buildRuntimeJobPayload(jobRecord, input);

  if (!context.queue) {
    return {
      jobRecord,
      enqueued: false,
    };
  }

  const bullJob = await context.queue.add(payload.type, payload, {
    delay: getQueueDelay(input.scheduledFor),
  });

  const updatedRecord =
    (await context.repository.attachBullmqJobId(
      jobRecord.id,
      String(bullJob.id),
    )) ?? jobRecord;

  return {
    jobRecord: updatedRecord,
    enqueued: true,
  };
}
