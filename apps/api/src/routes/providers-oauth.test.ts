import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import Fastify from "fastify";
import type {
  CreateProviderOAuthStateInput,
  ProviderOAuthState,
  UpsertSocialAccountConnectionInput,
} from "@brilhio/backend";
import { providerRoutes } from "./providers";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createProviderOAuthTestApp() {
  const states: ProviderOAuthState[] = [];
  const upserts: UpsertSocialAccountConnectionInput[] = [];
  const app = Fastify({ logger: false });

  app.decorate("brilhio", {
    config: {
      port: 4000,
      apiPublicUrl: "http://api.test",
      webAppUrl: "http://web.test",
    },
    repository: {
      async getSocialAccount() {
        return null;
      },
      async createProviderOAuthState(input: CreateProviderOAuthStateInput) {
        const state: ProviderOAuthState = {
          id: `state-${states.length + 1}`,
          createdAt: new Date().toISOString(),
          codeVerifier: input.codeVerifier ?? null,
          ...input,
        };
        states.push(state);
        return state;
      },
      async consumeProviderOAuthState(stateHash: string) {
        const index = states.findIndex((state) => state.stateHash === stateHash);
        if (index === -1) return null;
        const [state] = states.splice(index, 1);
        return state ?? null;
      },
      async upsertSocialAccountConnection(input: UpsertSocialAccountConnectionInput) {
        upserts.push(input);
        return {
          id: "account-1",
          userId: input.userId,
          platform: input.platform,
          handle: input.handle,
          status: "connected",
          audienceLabel: input.audienceLabel,
          tokenExpiresAt: input.tokenExpiresAt,
          providerAccountId: input.providerAccountId,
          profileUrl: input.profileUrl,
        };
      },
    },
    supabaseAdmin: null,
    queue: null,
  } as any);
  app.decorateRequest("brilhioAuth", null);
  app.decorate("requireAuth", async (request: any) => {
    request.brilhioAuth = {
      user: { id: "user-1", email: "user@example.com", authSource: "supabase" },
      session: {},
    };
  });
  app.decorate("requireSubscription", async (request: any, reply: any) => {
    await app.requireAuth(request, reply);
  });
  void app.register(providerRoutes, { prefix: "/api" });

  return { app, states, upserts };
}

describe("provider OAuth routes", () => {
  test("start returns a provider authorization URL and stores state", async () => {
    process.env.X_CLIENT_ID = "x-client";

    const { app, states } = createProviderOAuthTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/providers/x/oauth/start",
      payload: { redirectPath: "/accounts" },
    });
    await app.close();

    assert.equal(response.statusCode, 200);
    assert.equal(states.length, 1);
    assert.equal(states[0]?.platform, "x");
    assert.equal(states[0]?.userId, "user-1");
    assert.equal(states[0]?.redirectPath, "/accounts");
    assert.ok(states[0]?.codeVerifier);

    const authorizationUrl = new URL(response.json().data.authorizationUrl);
    assert.equal(authorizationUrl.origin, "https://x.com");
    assert.equal(authorizationUrl.searchParams.get("client_id"), "x-client");
    assert.equal(
      authorizationUrl.searchParams.get("redirect_uri"),
      "http://api.test/api/providers/x/oauth/callback",
    );
    assert.ok(authorizationUrl.searchParams.get("scope")?.includes("media.write"));
    assert.ok(authorizationUrl.searchParams.get("state"));
    assert.ok(authorizationUrl.searchParams.get("code_challenge"));
  });

  test("callback exchanges code, stores live credentials, and redirects to accounts", async () => {
    process.env.X_CLIENT_ID = "x-client";
    process.env.X_OAUTH_TOKEN_URL = "https://provider.test/token";
    process.env.X_OAUTH_USER_INFO_URL = "https://provider.test/user";
    process.env.X_OAUTH_TOKEN_AUTH_METHOD = "none";

    const fetches: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      fetches.push(url);
      if (url === "https://provider.test/token") {
        return jsonResponse({
          access_token: "access-1",
          refresh_token: "refresh-1",
          expires_in: 3600,
          token_type: "bearer",
          scope: "tweet.write users.read",
        });
      }
      if (url === "https://provider.test/user") {
        return jsonResponse({
          data: {
            id: "x-user-1",
            username: "brilhio",
            url: "https://x.com/brilhio",
          },
        });
      }
      return jsonResponse({ error: "unexpected url" }, 500);
    }) as typeof fetch;

    const { app, upserts } = createProviderOAuthTestApp();
    const startResponse = await app.inject({
      method: "POST",
      url: "/api/providers/x/oauth/start",
      payload: { redirectPath: "/accounts" },
    });
    const state = new URL(startResponse.json().data.authorizationUrl).searchParams.get("state");

    const callbackResponse = await app.inject({
      method: "GET",
      url: `/api/providers/x/oauth/callback?code=code-1&state=${state}`,
    });
    await app.close();

    assert.equal(callbackResponse.statusCode, 302);
    assert.equal(
      callbackResponse.headers.location,
      "http://web.test/accounts?oauth=connected&platform=x",
    );
    assert.deepEqual(fetches, [
      "https://provider.test/token",
      "https://provider.test/user",
    ]);
    assert.equal(upserts.length, 1);
    assert.equal(upserts[0]?.accessToken, "access-1");
    assert.equal(upserts[0]?.refreshToken, "refresh-1");
    assert.equal(upserts[0]?.providerAccountId, "x-user-1");
    assert.equal(upserts[0]?.handle, "@brilhio");
    assert.equal(upserts[0]?.providerMetadata?.connectionMode, "oauth");
    assert.equal(upserts[0]?.providerMetadata?.publishMode, "live");
  });
});
