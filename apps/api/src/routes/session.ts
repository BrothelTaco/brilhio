import type { FastifyPluginAsync } from "fastify";
import {
  type UserProfile,
  updateUserStrategyProfileInputSchema,
  updateUserTimezoneInputSchema,
} from "@brilhio/contracts";
import { isValidIanaTimezone } from "@brilhio/backend";
import { persistAndEnqueueJob, sendOperationalAlert } from "../context";

async function stripeDeleteRequest(secretKey: string, path: string) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof json?.error?.message === "string"
        ? json.error.message
        : "Stripe cleanup request failed.";
    throw new Error(message);
  }
  return json;
}

async function cleanupStripeBeforeAccountDelete(
  app: Parameters<FastifyPluginAsync>[0],
  profile: UserProfile,
) {
  const hasStripeBilling = Boolean(profile.stripeCustomerId || profile.stripeSubscriptionId);
  if (!hasStripeBilling) return;

  const { stripeSecretKey } = app.brilhio.config;
  if (!stripeSecretKey) {
    throw new Error(
      "Stripe cleanup is required before deleting this account, but STRIPE_SECRET_KEY is not configured.",
    );
  }

  if (profile.stripeSubscriptionId) {
    await stripeDeleteRequest(
      stripeSecretKey,
      `subscriptions/${encodeURIComponent(profile.stripeSubscriptionId)}`,
    );
  }

  if (profile.stripeCustomerId) {
    await stripeDeleteRequest(
      stripeSecretKey,
      `customers/${encodeURIComponent(profile.stripeCustomerId)}`,
    );
  }
}

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/me",
    { preHandler: app.requireAuth },
    async (request) => ({
      data: request.brilhioAuth!.session,
    }),
  );

  app.get(
    "/me/export",
    { preHandler: app.requireAuth },
    async (request) => {
      const userId = request.brilhioAuth!.user.id;
      return {
        data: {
          exportedAt: new Date().toISOString(),
          session: request.brilhioAuth!.session,
          dashboard: await app.brilhio.repository.getDashboard(userId),
          strategyProfile: await app.brilhio.repository.getUserStrategyProfile(userId),
        },
      };
    },
  );

  app.delete(
    "/me",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      const { user } = request.brilhioAuth!;
      if (user.authSource !== "supabase") {
        reply.code(403);
        return { error: "Account deletion is only available for Supabase users." };
      }

      if (!app.brilhio.supabaseAdmin) {
        reply.code(501);
        return { error: "Supabase admin auth is not configured." };
      }

      try {
        await cleanupStripeBeforeAccountDelete(app, request.brilhioAuth!.session.profile);
      } catch (error) {
        request.log.error({ err: error, userId: user.id }, "Stripe account cleanup failed");
        void sendOperationalAlert(app.brilhio, {
          severity: "error",
          event: "stripe.account_cleanup_failed",
          message: "Stripe account cleanup failed before account deletion.",
          details: { userId: user.id },
        });
        reply.code(502);
        return {
          error:
            error instanceof Error
              ? error.message
              : "Stripe account cleanup failed.",
        };
      }

      const { error } = await app.brilhio.supabaseAdmin.auth.admin.deleteUser(user.id);
      if (error) {
        reply.code(502);
        return { error: error.message };
      }

      return { data: { deleted: true } };
    },
  );

  app.patch(
    "/me/timezone",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      const parsed = updateUserTimezoneInputSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      if (!isValidIanaTimezone(parsed.data.timezone)) {
        reply.code(400);
        return { error: "Invalid IANA timezone." };
      }

      await app.brilhio.repository.updateUserTimezone(
        request.brilhioAuth!.user.id,
        parsed.data.timezone,
      );

      return { data: { timezone: parsed.data.timezone } };
    },
  );

  app.get(
    "/me/strategy-profile",
    { preHandler: app.requireAuth },
    async (request) => ({
      data: await app.brilhio.repository.getUserStrategyProfile(
        request.brilhioAuth!.user.id,
      ),
    }),
  );

  app.put(
    "/me/strategy-profile",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      const parsed = updateUserStrategyProfileInputSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      return {
        data: await app.brilhio.repository.updateUserStrategyProfile(
          request.brilhioAuth!.user.id,
          parsed.data,
        ),
      };
    },
  );

  // Called when the user finishes onboarding. Always marks onboarding complete
  // (idempotent via the `.is("onboarding_completed_at", null)` guard in the
  // repo). AI job enqueueing is skipped if a brand brief already exists.
  app.post(
    "/me/strategy-profile/finalize",
    { preHandler: app.requireAuth },
    async (request) => {
      const userId = request.brilhioAuth!.user.id;

      await app.brilhio.repository.setOnboardingCompleted(userId);

      const profile = await app.brilhio.repository.getUserStrategyProfile(userId);

      const hasMinimumStrategy = Boolean(
        profile.brandType || profile.primaryGoal || profile.postingFrequency,
      );

      if (profile.brandBriefGeneratedAt || !hasMinimumStrategy) {
        return { data: { enqueued: false, reason: profile.brandBriefGeneratedAt ? "already-generated" : "insufficient-strategy" } };
      }

      const now = new Date().toISOString();
      const briefJob = await persistAndEnqueueJob(app.brilhio, {
        userId,
        type: "regenerate-brand-brief",
        targetTable: "user_strategy_profiles",
        targetId: userId,
        scheduledFor: now,
        payload: {},
      });
      const calendarJob = await persistAndEnqueueJob(app.brilhio, {
        userId,
        type: "build-calendar",
        targetTable: "user_strategy_profiles",
        targetId: userId,
        scheduledFor: now,
        payload: {},
      });

      return {
        data: {
          enqueued: true,
          briefJobRecord: briefJob.jobRecord,
          calendarJobRecord: calendarJob.jobRecord,
          queued: briefJob.enqueued && calendarJob.enqueued,
        },
      };
    },
  );
};
