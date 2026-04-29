import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { JobPayload } from "@brilhio/contracts";

export const BRILHIO_QUEUE_NAME = "brilhio-jobs";

export function isQueueConfigured(redisUrl?: string | null) {
  return Boolean(redisUrl);
}

export function createRedisConnection(redisUrl: string) {
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export function createBrilhioQueue(redisUrl: string) {
  return new Queue<JobPayload>(BRILHIO_QUEUE_NAME, {
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

