import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import {
  createApprovalTaskInputSchema,
  createContentItemInputSchema,
  createMediaAssetRequestInputSchema,
  createMediaUploadSessionInputSchema,
  queueJobInputSchema,
  schedulePostRequestInputSchema,
  updateApprovalTaskStatusInputSchema,
} from "@brilhio/contracts";
import { localToUtc } from "@brilhio/backend";
import { persistAndEnqueueJob } from "../context";
import { isAllowedMediaContentType } from "../storage";

function sanitizeFileSegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function isSupportedUploadKind(kind: string) {
  return kind === "image" || kind === "video";
}

function contentTypeMatchesKind(kind: string, contentType: string) {
  if (kind === "image") return contentType.startsWith("image/");
  if (kind === "video") return contentType.startsWith("video/");
  return false;
}

export const contentRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/media-assets/upload-session",
    { preHandler: app.requireSubscription },
    async (request, reply) => {
      const parsed = createMediaUploadSessionInputSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      const userId = request.brilhioAuth!.user.id;
      const contentType = parsed.data.contentType.toLowerCase();

      if (!isSupportedUploadKind(parsed.data.kind)) {
        reply.code(400);
        return { error: "Only image and short video uploads are supported right now." };
      }

      if (
        !isAllowedMediaContentType(contentType) ||
        !contentTypeMatchesKind(parsed.data.kind, contentType)
      ) {
        reply.code(400);
        return { error: "Unsupported media content type." };
      }

      if (parsed.data.fileSizeBytes > app.brilhio.mediaStorage.maxFileSizeBytes) {
        reply.code(413);
        return {
          error: `Media files must be ${app.brilhio.mediaStorage.maxFileSizeBytes} bytes or smaller.`,
        };
      }

      const extensionIndex = parsed.data.fileName.lastIndexOf(".");
      const extension = extensionIndex >= 0
        ? parsed.data.fileName.slice(extensionIndex).toLowerCase()
        : "";
      const path = [userId, "uploads", `${randomUUID()}-${sanitizeFileSegment(parsed.data.title)}${extension}`].join("/");

      if (app.brilhio.mediaStorage.mode === "memory") {
        return {
          data: {
            provider: "memory",
            bucket: app.brilhio.mediaStorage.bucket,
            storagePath: path,
            uploadUrl: null,
            uploadMethod: "PUT",
            uploadHeaders: {},
            expiresAt: null,
            contentType,
            maxFileSizeBytes: app.brilhio.mediaStorage.maxFileSizeBytes,
          },
          meta: { storageMode: "memory" },
        };
      }

      const upload = await app.brilhio.mediaStorage.createUploadUrl({
        key: path,
        contentType,
        contentLength: parsed.data.fileSizeBytes,
      });

      return {
        data: {
          provider: "r2",
          bucket: app.brilhio.mediaStorage.bucket,
          storagePath: path,
          uploadUrl: upload.url,
          uploadMethod: "PUT",
          uploadHeaders: {
            "Content-Type": contentType,
          },
          expiresAt: upload.expiresAt,
          contentType,
          maxFileSizeBytes: app.brilhio.mediaStorage.maxFileSizeBytes,
        },
      };
    },
  );

  app.get<{ Params: { mediaAssetId: string } }>(
    "/media-assets/:mediaAssetId/object",
    { preHandler: app.requireSubscription },
    async (request, reply) => {
      const asset = await app.brilhio.repository.getMediaAsset(
        request.brilhioAuth!.user.id,
        request.params.mediaAssetId,
      );

      if (!asset) {
        reply.code(404);
        return { error: "Media asset not found." };
      }

      if (app.brilhio.mediaStorage.mode === "memory") {
        reply.code(404);
        return { error: "Media object storage is not configured." };
      }

      const object = await app.brilhio.mediaStorage.getObject({
        key: asset.storagePath,
      });

      reply.header("Content-Type", object.contentType ?? "application/octet-stream");
      reply.header("Cache-Control", "private, max-age=60");
      if (object.contentLength !== null) {
        reply.header("Content-Length", object.contentLength);
      }

      return reply.send(object.body);
    },
  );

  app.post(
    "/media-assets",
    { preHandler: app.requireSubscription },
    async (request, reply) => {
      const parsed = createMediaAssetRequestInputSchema.safeParse(request.body);
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
    { preHandler: app.requireSubscription },
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
    { preHandler: app.requireSubscription },
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
    { preHandler: app.requireSubscription },
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
    { preHandler: app.requireSubscription },
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
    { preHandler: app.requireSubscription },
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
