import type { FastifyPluginAsync } from "fastify";
import { getProviderDefinition, providerCatalog } from "@brilhio/backend";
import { createProviderConnectionInputSchema, platformSchema } from "@brilhio/contracts";
import {
  buildAuthorizationUrl,
  buildWebRedirect,
  createCodeChallenge,
  createCodeVerifier,
  createOAuthState,
  exchangeAuthorizationCode,
  fetchProviderProfile,
  getOAuthProviderConfig,
  getOAuthRedirectUri,
  hashOAuthState,
  sanitizeRedirectPath,
} from "../oauth";

export const providerRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/providers",
    { preHandler: app.requireSubscription },
    async (request) => {
      const userId = request.brilhioAuth!.user.id;
      const accounts = await Promise.all(
        providerCatalog.map((provider) =>
          app.brilhio.repository.getSocialAccount(userId, provider.platform),
        ),
      );

      return {
        data: providerCatalog.map((provider, index) => ({
          ...provider,
          connectionMode:
            provider.platform === "x" && getOAuthProviderConfig(provider.platform)
              ? "oauth"
              : provider.connectionMode,
          publishMode:
            provider.platform === "x" && getOAuthProviderConfig(provider.platform)
              ? "live"
              : provider.publishMode,
          oauthEnabled: provider.platform === "x" && Boolean(getOAuthProviderConfig(provider.platform)),
          account: accounts[index] ?? null,
        })),
      };
    },
  );

  app.post<{ Params: { platform: string } }>(
    "/providers/:platform/connect",
    { preHandler: app.requireSubscription },
    async (request, reply) => {
      const parsedPlatform = platformSchema.safeParse(request.params.platform);
      if (!parsedPlatform.success) {
        reply.code(404);
        return { error: "Provider is not supported." };
      }

      const parsed = createProviderConnectionInputSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      if (parsed.data.platform !== parsedPlatform.data) {
        reply.code(400);
        return { error: "Body platform must match the provider route parameter." };
      }

      const provider = getProviderDefinition(parsedPlatform.data);
      if (!provider) {
        reply.code(404);
        return { error: "Provider is not supported." };
      }

      const account = await app.brilhio.repository.upsertSocialAccountConnection({
        ...parsed.data,
        userId: request.brilhioAuth!.user.id,
        accessToken: parsed.data.accessToken ?? `sandbox-${parsedPlatform.data}-access-token`,
        providerMetadata: {
          connectionMode: provider.connectionMode,
          publishMode: provider.publishMode,
          connectedAt: new Date().toISOString(),
        },
      });

      return { data: { provider, account } };
    },
  );

  app.post<{ Params: { platform: string } }>(
    "/providers/:platform/disconnect",
    { preHandler: app.requireSubscription },
    async (request, reply) => {
      const parsedPlatform = platformSchema.safeParse(request.params.platform);
      if (!parsedPlatform.success) {
        reply.code(404);
        return { error: "Provider is not supported." };
      }

      const account = await app.brilhio.repository.disconnectSocialAccount(
        request.brilhioAuth!.user.id,
        parsedPlatform.data,
      );

      return { data: { account } };
    },
  );

  app.post<{ Params: { platform: string }; Body: { redirectPath?: unknown } }>(
    "/providers/:platform/oauth/start",
    { preHandler: app.requireSubscription },
    async (request, reply) => {
      const parsedPlatform = platformSchema.safeParse(request.params.platform);
      if (!parsedPlatform.success) {
        reply.code(404);
        return { error: "Provider is not supported." };
      }

      const provider = getProviderDefinition(parsedPlatform.data);
      const oauthConfig = getOAuthProviderConfig(parsedPlatform.data);
      if (!provider || !oauthConfig) {
        reply.code(501);
        return { error: "OAuth is not configured for this provider." };
      }

      const state = createOAuthState();
      const codeVerifier = oauthConfig.usePkce ? createCodeVerifier() : null;
      const redirectUri = getOAuthRedirectUri(app.brilhio.config, parsedPlatform.data);
      const redirectPath = sanitizeRedirectPath(request.body?.redirectPath);

      await app.brilhio.repository.createProviderOAuthState({
        userId: request.brilhioAuth!.user.id,
        platform: parsedPlatform.data,
        stateHash: hashOAuthState(state),
        codeVerifier,
        redirectPath,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

      return {
        data: {
          authorizationUrl: buildAuthorizationUrl({
            config: oauthConfig,
            redirectUri,
            state,
            codeChallenge: codeVerifier ? createCodeChallenge(codeVerifier) : null,
          }),
          provider,
        },
      };
    },
  );

  app.get<{ Params: { platform: string }; Querystring: { code?: string; state?: string; error?: string; error_description?: string } }>(
    "/providers/:platform/oauth/callback",
    async (request, reply) => {
      const parsedPlatform = platformSchema.safeParse(request.params.platform);
      const fallbackRedirect = (reason: string) =>
        buildWebRedirect(app.brilhio.config, "/accounts", {
          oauth: "failed",
          reason,
          ...(parsedPlatform.success ? { platform: parsedPlatform.data } : {}),
        });

      if (!parsedPlatform.success) {
        return reply.redirect(fallbackRedirect("unsupported-provider"));
      }

      if (request.query.error) {
        return reply.redirect(
          fallbackRedirect(request.query.error_description ?? request.query.error),
        );
      }

      if (!request.query.state || !request.query.code) {
        return reply.redirect(fallbackRedirect("missing-code-or-state"));
      }

      const oauthState = await app.brilhio.repository.consumeProviderOAuthState(
        hashOAuthState(request.query.state),
      );
      if (!oauthState || oauthState.platform !== parsedPlatform.data) {
        return reply.redirect(fallbackRedirect("invalid-or-expired-state"));
      }

      const oauthConfig = getOAuthProviderConfig(parsedPlatform.data);
      if (!oauthConfig) {
        return reply.redirect(
          buildWebRedirect(app.brilhio.config, oauthState.redirectPath, {
            oauth: "failed",
            platform: parsedPlatform.data,
            reason: "provider-oauth-not-configured",
          }),
        );
      }

      try {
        const redirectUri = getOAuthRedirectUri(app.brilhio.config, parsedPlatform.data);
        const token = await exchangeAuthorizationCode({
          config: oauthConfig,
          code: request.query.code,
          redirectUri,
          codeVerifier: oauthState.codeVerifier,
        });
        const profile = await fetchProviderProfile({
          config: oauthConfig,
          accessToken: token.accessToken,
        });

        await app.brilhio.repository.upsertSocialAccountConnection({
          userId: oauthState.userId,
          platform: parsedPlatform.data,
          handle: profile.handle,
          audienceLabel: "General audience",
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          tokenExpiresAt: token.tokenExpiresAt,
          providerAccountId: profile.providerAccountId,
          profileUrl: profile.profileUrl,
          providerMetadata: {
            connectionMode: "oauth",
            publishMode: "live",
            connectedAt: new Date().toISOString(),
            tokenType: token.tokenType,
            scope: token.scope,
            providerProfile: profile.raw,
          },
        });

        return reply.redirect(
          buildWebRedirect(app.brilhio.config, oauthState.redirectPath, {
            oauth: "connected",
            platform: parsedPlatform.data,
          }),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "oauth-callback-failed";
        request.log.error({ error }, "provider OAuth callback failed");
        return reply.redirect(
          buildWebRedirect(app.brilhio.config, oauthState.redirectPath, {
            oauth: "failed",
            platform: parsedPlatform.data,
            reason: message,
          }),
        );
      }
    },
  );
};
