import type { FastifyPluginAsync } from "fastify";
import { scheduleFromSlotInputSchema } from "@brilhio/contracts";
import { persistAndEnqueueJob } from "../context";

export const slotRoutes: FastifyPluginAsync = async (app) => {
  // Promote an open recommended slot into a real scheduled_post by attaching media.
  // Creates a content_item, a scheduled_post, marks the slot filled, and enqueues
  // the publish job. The slot's UTC time and platform are used as-is.
  app.post<{ Params: { slotId: string } }>(
    "/me/recommended-slots/:slotId/schedule",
    { preHandler: app.requireSubscription },
    async (request, reply) => {
      const parsed = scheduleFromSlotInputSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      const userId = request.brilhioAuth!.user.id;
      const slot = await app.brilhio.repository.getRecommendedSlot(request.params.slotId);

      if (!slot || slot.userId !== userId) {
        reply.code(404);
        return { error: "Recommended slot not found." };
      }
      if (slot.status !== "open") {
        reply.code(409);
        return { error: `Slot is already ${slot.status}.` };
      }

      const contentItem = await app.brilhio.repository.createContentItem({
        userId,
        title: slot.contentTypeHint,
        brief: slot.rationale ?? slot.contentTypeHint,
        campaign: "Recommended slot",
        primaryCaption: parsed.data.platformCaption,
        mediaAssetIds: parsed.data.mediaAssetIds,
      });

      const scheduledPost = await app.brilhio.repository.createScheduledPost({
        userId,
        contentItemId: contentItem.id,
        platform: slot.platform,
        scheduledFor: slot.suggestedFor,
        platformCaption: parsed.data.platformCaption,
        publishWindowLabel: slot.contentTypeHint,
      });

      const updatedSlot = await app.brilhio.repository.markRecommendedSlotFilled(
        userId,
        slot.id,
        scheduledPost.id,
      );

      const queueResult = await persistAndEnqueueJob(app.brilhio, {
        userId,
        type: "publish-scheduled-post",
        targetTable: "scheduled_posts",
        targetId: scheduledPost.id,
        scheduledFor: slot.suggestedFor,
        payload: {
          type: "publish-scheduled-post",
          userId,
          scheduledPostId: scheduledPost.id,
        },
      });

      return {
        data: {
          scheduledPost,
          contentItem,
          slot: updatedSlot,
          jobRecord: queueResult.jobRecord,
          enqueued: queueResult.enqueued,
        },
      };
    },
  );

  app.post<{ Params: { slotId: string } }>(
    "/me/recommended-slots/:slotId/dismiss",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      const userId = request.brilhioAuth!.user.id;
      const updated = await app.brilhio.repository.dismissRecommendedSlot(
        userId,
        request.params.slotId,
      );
      if (!updated) {
        reply.code(404);
        return { error: "Recommended slot not found." };
      }
      return { data: updated };
    },
  );
};
