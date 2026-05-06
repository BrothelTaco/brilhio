import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import Fastify from "fastify";
import { sessionRoutes } from "./session";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function responseJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createSessionTestApp(options: {
  stripeSecretKey: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  deleteUser: () => Promise<{ error: { message: string } | null }>;
}) {
  const app = Fastify({ logger: false });

  app.decorate("brilhio", {
    config: {
      stripeSecretKey: options.stripeSecretKey,
    },
    repository: {},
    supabaseAdmin: {
      auth: {
        admin: {
          deleteUser: options.deleteUser,
        },
      },
    },
    queue: null,
  } as any);
  app.decorateRequest("brilhioAuth", null);
  app.decorate("requireAuth", async (request: any) => {
    request.brilhioAuth = {
      user: { id: "user-1", email: "user@example.com", authSource: "supabase" },
      session: {
        user: { id: "user-1", email: "user@example.com", authSource: "supabase" },
        profile: {
          id: "profile-1",
          userId: "user-1",
          email: "user@example.com",
          timezone: "UTC",
          stripeCustomerId: options.stripeCustomerId ?? null,
          stripeSubscriptionId: options.stripeSubscriptionId ?? null,
          subscriptionStatus: "active",
          subscriptionCurrentPeriodEnd: null,
          subscriptionCancelAtPeriodEnd: false,
          createdAt: new Date().toISOString(),
        },
      },
    };
  });

  void app.register(sessionRoutes, { prefix: "/api" });
  return app;
}

describe("account deletion", () => {
  test("cancels Stripe subscription and customer before deleting Supabase user", async () => {
    const stripeDeletes: string[] = [];
    let deletedUserId: string | null = null;

    globalThis.fetch = (async (input: string | URL | Request) => {
      stripeDeletes.push(String(input));
      return responseJson({ deleted: true });
    }) as typeof fetch;

    const app = createSessionTestApp({
      stripeSecretKey: "sk_test_123",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      deleteUser: async () => {
        deletedUserId = "user-1";
        return { error: null };
      },
    });

    const response = await app.inject({ method: "DELETE", url: "/api/me" });
    await app.close();

    assert.equal(response.statusCode, 200);
    assert.deepEqual(stripeDeletes.map((url) => new URL(url).pathname), [
      "/v1/subscriptions/sub_123",
      "/v1/customers/cus_123",
    ]);
    assert.equal(deletedUserId, "user-1");
  });

  test("does not delete Supabase user when Stripe cleanup is required but unconfigured", async () => {
    let deleteUserCalled = false;
    const app = createSessionTestApp({
      stripeSecretKey: null,
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      deleteUser: async () => {
        deleteUserCalled = true;
        return { error: null };
      },
    });

    const response = await app.inject({ method: "DELETE", url: "/api/me" });
    await app.close();

    assert.equal(response.statusCode, 502);
    assert.equal(deleteUserCalled, false);
    assert.match(response.json().error, /STRIPE_SECRET_KEY/);
  });
});
