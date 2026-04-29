import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import {
  createApprovalTaskInputSchema,
  createContentItemInputSchema,
  createMediaAssetInputSchema,
  createMediaUploadSessionInputSchema,
  queueJobInputSchema,
  schedulePostRequestInputSchema,
  updateApprovalTaskStatusInputSchema,
} from "@brilhio/contracts";
import { localToUtc } from "@brilhio/backend";
import { persistAndEnqueueJob } from "../context";

function sanitizeFileSegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const contentRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/media-assets/upload-session",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      const parsed = createMediaUploadSessionInputSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      const userId = request.brilhioAuth!.user.id;
      const extensionIndex = parsed.data.fileName.lastIndexOf(".");
      const extension = extensionIndex >= 0
        ? parsed.data.fileName.slice(extensionIndex).toLowerCase()
        : "";
      const path = [userId, "uploads", `${randomUUID()}-${sanitizeFileSegment(parsed.data.title)}${extension}`].join("/");

      if (!app.brilhio.supabaseAdmin) {
        return {
          data: {
            bucket: app.brilhio.config.storageBucket,
            storagePath: path,
            uploadPath: path,
            uploadToken: `memory-upload-${randomUUID()}`,
            contentType: parsed.data.contentType,
          },
          meta: { storageMode: "memory" },
        };
      }

      const { data, error } = await app.brilhio.supabaseAdmin.storage
        .from(app.brilhio.config.storageBucket)
        .createSignedUploadUrl(path, { upsert: false });

      if (error || !data?.token) {
        reply.code(500);
        return { error: error?.message ?? "Failed to create the upload session." };
      }

      return {
        data: {
          bucket: app.brilhio.config.storageBucket,
          storagePath: path,
          uploadPath: path,
          uploadToken: data.token,
          contentType: parsed.data.contentType,
        },
      };
    },
  );

  app.post(
    "/media-assets",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      const parsed = createMediaAssetInputSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      return {
        data: await app.brilhio.repository.createMediaAsset({
          ...parsed.data,
          userId: request.brilhioAuth!.user.id,
        }),
      };
    },
  );

  app.post(
    "/content-items",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      const parsed = createContentItemInputSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      return {
        data: await app.brilhio.repository.createContentItem({
          ...parsed.data,
          userId: request.brilhioAuth!.user.id,
        }),
      };
    },
  );

  app.post(
    "/approval-tasks",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      const parsed = createApprovalTaskInputSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      return {
        data: await app.brilhio.repository.createApprovalTask({
          ...parsed.data,
          userId: request.brilhioAuth!.user.id,
        }),
      };
    },
  );

  app.patch<{ Params: { approvalTaskId: string } }>(
    "/approval-tasks/:approvalTaskId/status",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      const parsed = updateApprovalTaskStatusInputSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      const updated = await app.brilhio.repository.updateApprovalTaskStatus(
        request.brilhioAuth!.user.id,
        request.params.approvalTaskId,
        parsed.data.status,
      );

      if (!updated) {
        reply.code(404);
        return { error: "Approval task not found." };
      }

      return { data: updated };
    },
  );

  app.post(
    "/scheduled-posts",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      const parsed = schedulePostRequestInputSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      const userId = request.brilhioAuth!.user.id;
      const timezone = await app.brilhio.repository.getUserTimezone(userId);
      const scheduledForUtc = localToUtc(parsed.data.localScheduledFor, timezone);

      const scheduledPost = await app.brilhio.repository.createScheduledPost({
        userId,
        contentItemId: parsed.data.contentItemId,
        platform: parsed.data.platform,
        scheduledFor: scheduledForUtc,
        platformCaption: parsed.data.platformCaption,
        publishWindowLabel: parsed.data.publishWindowLabel,
      });

      const queueResult = await persistAndEnqueueJob(app.brilhio, {
        userId,
        type: "publish-scheduled-post",
        targetTable: "scheduled_posts",
        targetId: scheduledPost.id,
        scheduledFor: scheduledForUtc,
        payload: {
          type: "publish-scheduled-post",
          userId,
          scheduledPostId: scheduledPost.id,
        },
      });

      return {
        data: {
          scheduledPost,
          jobRecord: queueResult.jobRecord,
          enqueued: queueResult.enqueued,
        },
      };
    },
  );

  app.post(
    "/jobs",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      const parsed = queueJobInputSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      const result = await persistAndEnqueueJob(app.brilhio, {
        ...parsed.data,
        userId: request.brilhioAuth!.user.id,
      });

      return {
        data: result.jobRecord,
        meta: { enqueued: result.enqueued },
      };
    },
  );
};
