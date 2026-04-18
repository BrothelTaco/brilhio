import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import {
  createApprovalTaskInputSchema,
  createContentItemInputSchema,
  createMediaAssetInputSchema,
  createMediaUploadSessionInputSchema,
  queueJobInputSchema,
  schedulePostInputSchema,
  updateApprovalTaskStatusInputSchema,
} from "@ritmio/contracts";
import { ensureWorkspaceAccess } from "../auth";
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
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const parsed = createMediaUploadSessionInputSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      const hasAccess = await ensureWorkspaceAccess(
        app.ritmio,
        request.ritmioAuth!.user.id,
        parsed.data.workspaceId,
      );

      if (!hasAccess) {
        reply.code(403);
        return { error: "Workspace access denied." };
      }

      const extensionIndex = parsed.data.fileName.lastIndexOf(".");
      const extension =
        extensionIndex >= 0
          ? parsed.data.fileName.slice(extensionIndex).toLowerCase()
          : "";
      const path = [
        parsed.data.workspaceId,
        "uploads",
        `${randomUUID()}-${sanitizeFileSegment(parsed.data.title)}${extension}`,
      ].join("/");

      if (!app.ritmio.supabaseAdmin) {
        return {
          data: {
            bucket: app.ritmio.config.storageBucket,
            storagePath: path,
            uploadPath: path,
            uploadToken: `memory-upload-${randomUUID()}`,
            contentType: parsed.data.contentType,
          },
          meta: {
            storageMode: "memory",
          },
        };
      }

      const { data, error } = await app.ritmio.supabaseAdmin.storage
        .from(app.ritmio.config.storageBucket)
        .createSignedUploadUrl(path, {
          upsert: false,
        });

      if (error || !data?.token) {
        reply.code(500);
        return {
          error: error?.message ?? "Failed to create the upload session.",
        };
      }

      return {
        data: {
          bucket: app.ritmio.config.storageBucket,
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
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const parsed = createMediaAssetInputSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      const hasAccess = await ensureWorkspaceAccess(
        app.ritmio,
        request.ritmioAuth!.user.id,
        parsed.data.workspaceId,
      );

      if (!hasAccess) {
        reply.code(403);
        return { error: "Workspace access denied." };
      }

      return {
        data: await app.ritmio.repository.createMediaAsset(parsed.data),
      };
    },
  );

  app.post(
    "/content-items",
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const parsed = createContentItemInputSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      const hasAccess = await ensureWorkspaceAccess(
        app.ritmio,
        request.ritmioAuth!.user.id,
        parsed.data.workspaceId,
      );

      if (!hasAccess) {
        reply.code(403);
        return { error: "Workspace access denied." };
      }

      return {
        data: await app.ritmio.repository.createContentItem(parsed.data),
      };
    },
  );

  app.post(
    "/approval-tasks",
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const parsed = createApprovalTaskInputSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      const hasAccess = await ensureWorkspaceAccess(
        app.ritmio,
        request.ritmioAuth!.user.id,
        parsed.data.workspaceId,
      );

      if (!hasAccess) {
        reply.code(403);
        return { error: "Workspace access denied." };
      }

      return {
        data: await app.ritmio.repository.createApprovalTask(parsed.data),
      };
    },
  );

  app.patch<{ Params: { approvalTaskId: string } }>(
    "/approval-tasks/:approvalTaskId/status",
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const parsed = updateApprovalTaskStatusInputSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      const hasAccess = await ensureWorkspaceAccess(
        app.ritmio,
        request.ritmioAuth!.user.id,
        parsed.data.workspaceId,
      );

      if (!hasAccess) {
        reply.code(403);
        return { error: "Workspace access denied." };
      }

      const updated = await app.ritmio.repository.updateApprovalTaskStatus(
        parsed.data.workspaceId,
        request.params.approvalTaskId,
        parsed.data.status,
      );

      if (!updated) {
        reply.code(404);
        return { error: "Approval task not found." };
      }

      return {
        data: updated,
      };
    },
  );

  app.post(
    "/scheduled-posts",
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const parsed = schedulePostInputSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      const hasAccess = await ensureWorkspaceAccess(
        app.ritmio,
        request.ritmioAuth!.user.id,
        parsed.data.workspaceId,
      );

      if (!hasAccess) {
        reply.code(403);
        return { error: "Workspace access denied." };
      }

      const scheduledPost = await app.ritmio.repository.createScheduledPost(
        parsed.data,
      );

      const queueResult = await persistAndEnqueueJob(app.ritmio, {
        workspaceId: parsed.data.workspaceId,
        type: "publish-scheduled-post",
        targetTable: "scheduled_posts",
        targetId: scheduledPost.id,
        scheduledFor: parsed.data.scheduledFor,
        payload: {
          type: "publish-scheduled-post",
          workspaceId: parsed.data.workspaceId,
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
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const parsed = queueJobInputSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      const hasAccess = await ensureWorkspaceAccess(
        app.ritmio,
        request.ritmioAuth!.user.id,
        parsed.data.workspaceId,
      );

      if (!hasAccess) {
        reply.code(403);
        return { error: "Workspace access denied." };
      }

      const result = await persistAndEnqueueJob(app.ritmio, parsed.data);

      return {
        data: result.jobRecord,
        meta: {
          enqueued: result.enqueued,
        },
      };
    },
  );
};
