import type { FastifyPluginAsync } from "fastify";
import { getProviderDefinition, providerCatalog } from "@brilhio/backend";
import { createProviderConnectionInputSchema, platformSchema } from "@brilhio/contracts";

export const providerRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/providers",
    { preHandler: app.requireAuth },
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
          account: accounts[index] ?? null,
        })),
      };
    },
  );

  app.post<{ Params: { platform: string } }>(
    "/providers/:platform/connect",
    { preHandler: app.requireAuth },
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
};
