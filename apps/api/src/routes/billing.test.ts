import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import Fastify from "fastify";
import { hasActiveSubscriptionStatus } from "@brilhio/contracts";
import { MemoryRepository } from "@brilhio/backend";
import { resolveRequestAuth } from "../auth";
import { createAppContext, type AppConfig } from "../context";
import { billingRoutes, verifyStripeSignature } from "./billing";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function stripeSignature(payload: string, secret: string, timestamp = Math.floor(Date.now() / 1000)) {
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    port: 0,
    host: "127.0.0.1",
    allowDevAuth: false,
    devUserId: null,
    devUserEmail: null,
    useMemoryRepository: false,
    supabaseUrl: null,
    supabaseServiceRoleKey: null,
    encryptionSecret: "test-secret",
    redisUrl: null,
    apiPublicUrl: "http://localhost:4000",
    webAppUrl: "http://localhost:3000",
    storageBucket: "media-assets",
    stripeSecretKey: "sk_test_123",
    stripePriceId: "price_123",
    stripeWebhookSecret: "whsec_test",
    requireSubscription: false,
    subscriptionEnforcementConfirmed: false,
    alertWebhookUrl: null,
    supabaseAuthRedirectUrls: [
      "http://localhost:3000/auth/callback",
      "brilhio://auth/callback",
    ],
    ...overrides,
  };
}

function responseJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createBillingTestApp(options: {
  repository: Record<string, unknown>;
  profile?: {
    stripeCustomerId: string | null;
    email?: string;
  };
}) {
  const app = Fastify({ logger: false });
  const profile = {
    id: "profile-1",
    userId: "user-1",
    email: options.profile?.email ?? "user@example.com",
    timezone: "UTC",
    stripeCustomerId: options.profile?.stripeCustomerId ?? null,
    stripeSubscriptionId: null,
    subscriptionStatus: null,
    subscriptionCurrentPeriodEnd: null,
    subscriptionCancelAtPeriodEnd: false,
    createdAt: new Date().toISOString(),
  };

  app.decorate("brilhio", {
    config: testConfig(),
    repository: options.repository as any,
    supabaseAdmin: null,
    queue: null,
  });
  app.decorateRequest("brilhioAuth", null);
  app.decorate("requireAuth", async (request: any) => {
    request.brilhioAuth = {
      user: { id: "user-1", email: profile.email, authSource: "supabase" },
      session: {
        user: { id: "user-1", email: profile.email, authSource: "supabase" },
        profile,
      },
    };
  });

  void app.register(billingRoutes, { prefix: "/api" });
  return app;
}

describe("auth resolution", () => {
  test("uses memory repository when explicitly requested even if Supabase is configured", () => {
    const context = createAppContext(
      testConfig({
        useMemoryRepository: true,
        supabaseUrl: "https://example.supabase.co",
        supabaseServiceRoleKey: "service-role-key",
      }),
    );

    assert.equal(context.repository.mode, "memory");
  });

  test("resolves dev users only when dev auth is explicitly enabled", async () => {
    const enabledContext = createAppContext(
      testConfig({ allowDevAuth: true, devUserId: "dev-user", devUserEmail: "dev@example.com" }),
    );
    const enabled = await resolveRequestAuth(enabledContext, { headers: {} } as any);

    assert.equal(enabled?.user.id, "dev-user");
    assert.equal(enabled?.user.authSource, "development");

    const disabledContext = createAppContext(
      testConfig({ allowDevAuth: false, devUserId: "dev-user", devUserEmail: "dev@example.com" }),
    );
    const disabled = await resolveRequestAuth(disabledContext, { headers: {} } as any);

    assert.equal(disabled, null);
  });

  test("resolves dev users by email when the dev user id is not configured", async () => {
    const context = {
      config: {
        allowDevAuth: true,
        devUserId: null,
        devUserEmail: "demo@brilhio.local",
      },
      supabaseAdmin: {
        auth: {
          admin: {
            listUsers: async () => ({
              data: {
                users: [{ id: "resolved-user", email: "demo@brilhio.local" }],
              },
              error: null,
            }),
          },
        },
      },
      repository: {
        getAuthSession: async (user: any) => ({
          user,
          profile: { id: "profile-1", userId: user.id },
        }),
      },
    } as any;

    const resolved = await resolveRequestAuth(context, {
      headers: { "x-brilhio-dev-user-email": "demo@brilhio.local" },
    } as any);

    assert.equal(resolved?.user.id, "resolved-user");
    assert.equal(resolved?.user.authSource, "development");
  });

  test("explains dev auth email lookup failures when Supabase is unreachable", async () => {
    const context = {
      config: {
        allowDevAuth: true,
        devUserId: null,
        devUserEmail: "demo@brilhio.local",
      },
      supabaseAdmin: {
        auth: {
          admin: {
            listUsers: async () => {
              throw new TypeError("fetch failed");
            },
          },
        },
      },
      repository: {
        getAuthSession: async (user: any) => ({ user, profile: {} }),
      },
    } as any;

    await assert.rejects(
      () =>
        resolveRequestAuth(context, {
          headers: { "x-brilhio-dev-user-email": "demo@brilhio.local" },
        } as any),
      /Local development auth could not resolve the dev user/,
    );
  });
});

describe("subscription gating", () => {
  test("uses the shared active subscription status list", () => {
    assert.equal(hasActiveSubscriptionStatus("active"), true);
    assert.equal(hasActiveSubscriptionStatus("trialing"), true);
    assert.equal(hasActiveSubscriptionStatus("past_due"), false);
    assert.equal(hasActiveSubscriptionStatus(null), false);
  });
});

describe("Stripe billing", () => {
  test("verifies Stripe webhook signatures", () => {
    const payload = JSON.stringify({ id: "evt_1", type: "customer.subscription.updated" });
    const signature = stripeSignature(payload, "whsec_test");

    assert.equal(verifyStripeSignature(payload, signature, "whsec_test"), true);
    assert.equal(verifyStripeSignature(payload, signature, "wrong_secret"), false);
  });

  test("creates a customer and checkout session", async () => {
    const paths: string[] = [];
    const repository = {
      ensureStripeCustomerId: async (_userId: string, _email: string | null, stripeCustomerId: string) => {
        assert.equal(stripeCustomerId, "cus_123");
      },
    };
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      paths.push(url);
      if (url.endsWith("/customers")) {
        return responseJson({ id: "cus_123" });
      }
      if (url.endsWith("/checkout/sessions")) {
        return responseJson({ id: "cs_123", url: "https://checkout.stripe.test/cs_123" });
      }
      return responseJson({ error: { message: "Unexpected Stripe path" } }, 404);
    }) as typeof fetch;

    const app = createBillingTestApp({ repository, profile: { stripeCustomerId: null } });
    const response = await app.inject({
      method: "POST",
      url: "/api/billing/checkout-session",
    });
    await app.close();

    assert.equal(response.statusCode, 200);
    assert.deepEqual(paths.map((path) => new URL(path).pathname), [
      "/v1/customers",
      "/v1/checkout/sessions",
    ]);
    assert.equal(response.json().data.url, "https://checkout.stripe.test/cs_123");
  });

  test("applies subscription webhook updates once", async () => {
    const processed = new Set<string>();
    const updates: unknown[] = [];
    const repository = {
      hasProcessedStripeWebhookEvent: async (stripeEventId: string) => processed.has(stripeEventId),
      recordProcessedStripeWebhookEvent: async (stripeEventId: string) => {
        processed.add(stripeEventId);
      },
      updateBillingProfileByStripeCustomerId: async (_customerId: string, update: unknown) => {
        updates.push(update);
      },
    };
    const app = createBillingTestApp({ repository, profile: { stripeCustomerId: "cus_123" } });
    const payload = JSON.stringify({
      id: "evt_subscription_updated",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          status: "active",
          current_period_end: 1_800_000_000,
          cancel_at_period_end: false,
        },
      },
    });
    const signature = stripeSignature(payload, "whsec_test");

    const first = await app.inject({
      method: "POST",
      url: "/api/billing/webhook",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
      payload,
    });
    const duplicate = await app.inject({
      method: "POST",
      url: "/api/billing/webhook",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
      payload,
    });
    await app.close();

    assert.equal(first.statusCode, 200);
    assert.equal(duplicate.statusCode, 200);
    assert.equal(duplicate.json().duplicate, true);
    assert.equal(updates.length, 1);
    assert.deepEqual(updates[0], {
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      subscriptionStatus: "active",
      subscriptionCurrentPeriodEnd: "2027-01-15T08:00:00.000Z",
      subscriptionCancelAtPeriodEnd: false,
    });
  });
});
