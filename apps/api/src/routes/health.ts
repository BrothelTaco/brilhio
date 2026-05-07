import type { FastifyPluginAsync } from "fastify";

async function checkTable(app: Parameters<FastifyPluginAsync>[0], table: string) {
  if (!app.brilhio.supabaseAdmin) return false;

  const { error } = await app.brilhio.supabaseAdmin
    .from(table)
    .select("*", { count: "exact", head: true });
  return !error;
}

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => ({
    status: "ok",
    service: "brilhio-api",
    repositoryMode: app.brilhio.repository.mode,
    queueEnabled: Boolean(app.brilhio.queue),
  }));

  app.get("/health/readiness", async (_request, reply) => {
    const { config } = app.brilhio;
    const checks = {
      supabaseConfigured: Boolean(config.supabaseUrl && config.supabaseServiceRoleKey),
      stripeConfigured: Boolean(config.stripeSecretKey && config.stripePriceId),
      stripeWebhookConfigured: Boolean(config.stripeWebhookSecret),
      alertWebhookConfigured: Boolean(config.alertWebhookUrl),
      webAppUrlConfigured: Boolean(config.webAppUrl),
      webAuthCallbackRedirectConfigured: config.supabaseAuthRedirectUrls.some((url) =>
        url.includes("/auth/callback"),
      ),
      mobileAuthCallbackRedirectConfigured: config.supabaseAuthRedirectUrls.some((url) =>
        url.startsWith("brilhio://auth/callback"),
      ),
      subscriptionEnforcementConfirmed: config.subscriptionEnforcementConfirmed,
      stripeWebhookEventsTable: await checkTable(app, "stripe_webhook_events"),
      profilesTable: await checkTable(app, "profiles"),
      userStrategyProfilesTable: await checkTable(app, "user_strategy_profiles"),
      providerOAuthStatesTable: await checkTable(app, "provider_oauth_states"),
    };

    const requireSubscriptionReady =
      !config.requireSubscription ||
      (checks.stripeConfigured &&
        checks.stripeWebhookConfigured &&
        checks.subscriptionEnforcementConfirmed &&
        checks.stripeWebhookEventsTable);
    const ready =
      checks.supabaseConfigured &&
      checks.webAppUrlConfigured &&
      checks.webAuthCallbackRedirectConfigured &&
      checks.mobileAuthCallbackRedirectConfigured &&
      checks.profilesTable &&
      checks.userStrategyProfilesTable &&
      checks.providerOAuthStatesTable &&
      requireSubscriptionReady;

    if (!ready) {
      reply.code(503);
    }

    return {
      status: ready ? "ready" : "not_ready",
      service: "brilhio-api",
      requireSubscription: config.requireSubscription,
      checks,
      requiredMigrations: [
        "20260428000003_stripe_webhook_events.sql",
        "20260429000000_strategy_industry.sql",
        "20260429000001_brand_brief.sql",
        "20260429000002_profiles_api_owned_writes.sql",
        "20260430000000_recommended_slots.sql",
        "20260506000000_provider_oauth_states.sql",
        "20260506000001_auth_payment_hardening.sql",
        "20260506000002_onboarding_completed.sql",
        "20260507000000_api_role_grants.sql",
      ],
    };
  });
};
