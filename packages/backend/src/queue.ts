import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { JobPayload } from "@ritmio/contracts";

export const RITMIO_QUEUE_NAME = "ritmio-jobs";

export function isQueueConfigured(redisUrl?: string | null) {
  return Boolean(redisUrl);
}

export function createRedisConnection(redisUrl: string) {
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export function createRitmioQueue(redisUrl: string) {
  return new Queue<JobPayload>(RITMIO_QUEUE_NAME, {
    connection: createRedisConnection(redisUrl),
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });
}

export function getQueueDelay(scheduledFor: string) {
  return Math.max(new Date(scheduledFor).getTime() - Date.now(), 0);
}

