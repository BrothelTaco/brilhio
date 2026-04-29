import { Worker, Queue } from "bullmq";
import { createRedisConnection, createBrilhioQueue, getQueueDelay, BRILHIO_QUEUE_NAME } from "@brilhio/backend";
import { jobPayloadSchema } from "@brilhio/contracts";
import { createWorkerRepository, processJob } from "./jobs";

const redisUrl = process.env.REDIS_URL;
const repository = createWorkerRepository({
  supabaseUrl: process.env.SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  encryptionSecret:
    process.env.APP_ENCRYPTION_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "brilhio-local-secret",
});

async function boot() {
  console.log("Brilhio worker online");
  console.log(`Repository mode: ${repository.mode}`);

  if (!redisUrl) {
    console.log(
      "REDIS_URL is not configured. BullMQ worker is idle until Redis is available.",
    );
    return;
  }

  const connection = createRedisConnection(redisUrl);
  const queue = createBrilhioQueue(redisUrl);

  async function recoverOverdueJobs() {
    try {
      const overdue = await repository.listOverdueJobRecords();
      for (const jobRecord of overdue) {
        const payload = jobPayloadSchema.parse(jobRecord.payload);
        const bullJob = await queue.add(
          jobRecord.type,
          payload,
          { delay: getQueueDelay(jobRecord.scheduledFor) },
        );
        await repository.attachBullmqJobId(jobRecord.id, String(bullJob.id));
        console.log(`[recovery] re-enqueued overdue job ${jobRecord.id} (${jobRecord.type})`);
      }
    } catch (error) {
      console.error("[recovery] failed to scan overdue jobs", error);
    }
  }

  const RECOVERY_INTERVAL_MS = 60_000;
  const recoveryTimer = setInterval(recoverOverdueJobs, RECOVERY_INTERVAL_MS);
  recoverOverdueJobs();

  const worker = new Worker(
    BRILHIO_QUEUE_NAME,
    async (job) => {
      const payload = jobPayloadSchema.parse(job.data);

      await repository.updateJobRecord(payload.jobRecordId, {
        status: "running",
        attemptCount: job.attemptsMade + 1,
        lastError: null,
      });

      try {
        const result = await processJob(repository, payload, {
          openAiApiKey: process.env.OPENAI_API_KEY,
          openAiModel: process.env.OPENAI_MODEL,
        });

        await repository.updateJobRecord(payload.jobRecordId, {
          status: "completed",
          lastError: null,
        });

        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown worker error.";

        if (payload.type === "publish-scheduled-post") {
          await repository.markScheduledPostFailed(
            payload.scheduledPostId,
            message,
          );
        }

        await repository.updateJobRecord(payload.jobRecordId, {
          status: "failed",
          lastError: message,
          attemptCount: job.attemptsMade + 1,
        });

        throw error;
      }
    },
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on("completed", (job, result) => {
    console.log(`[${job.name}] completed: ${String(result)}`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[${job?.name ?? "unknown"}] failed`, error);
  });

  process.on("SIGINT", async () => {
    clearInterval(recoveryTimer);
    await worker.close();
    await queue.close();
    await connection.quit();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    clearInterval(recoveryTimer);
    await worker.close();
    await queue.close();
    await connection.quit();
    process.exit(0);
  });
}

boot().catch((error) => {
  console.error("Worker boot failed", error);
  process.exit(1);
});
