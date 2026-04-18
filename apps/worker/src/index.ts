import { Worker } from "bullmq";
import { createRedisConnection, RITMIO_QUEUE_NAME } from "@ritmio/backend";
import { jobPayloadSchema } from "@ritmio/contracts";
import { createWorkerRepository, processJob } from "./jobs";

const redisUrl = process.env.REDIS_URL;
const repository = createWorkerRepository({
  supabaseUrl: process.env.SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  encryptionSecret:
    process.env.APP_ENCRYPTION_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "ritmio-local-secret",
});

async function boot() {
  console.log("Ritmio worker online");
  console.log(`Repository mode: ${repository.mode}`);

  if (!redisUrl) {
    console.log(
      "REDIS_URL is not configured. BullMQ worker is idle until Redis is available.",
    );
    return;
  }

  const connection = createRedisConnection(redisUrl);

  const worker = new Worker(
    RITMIO_QUEUE_NAME,
    async (job) => {
      const payload = jobPayloadSchema.parse(job.data);

      await repository.updateJobRecord(payload.jobRecordId, {
        status: "running",
        attemptCount: job.attemptsMade + 1,
        lastError: null,
      });

      try {
        const result = await processJob(repository, payload, {});

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
    await worker.close();
    await connection.quit();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await worker.close();
    await connection.quit();
    process.exit(0);
  });
}

boot().catch((error) => {
  console.error("Worker boot failed", error);
  process.exit(1);
});
