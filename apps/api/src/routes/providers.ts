import type { FastifyPluginAsync } from "fastify";
import {
  getProviderDefinition,
  providerCatalog,
} from "@ritmio/backend";
import {
  createProviderConnectionInputSchema,
  platformSchema,
} from "@ritmio/contracts";
import { ensureWorkspaceAccess } from "../auth";

export const providerRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/providers",
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const workspaceId =
        typeof request.query === "object" &&
        request.query !== null &&
        "workspaceId" in request.query &&
        typeof request.query.workspaceId === "string"
          ? request.query.workspaceId
          : null;

      if (!workspaceId) {
        reply.code(400);
        return {
          error: "workspaceId query parameter is required.",
        };
      }

      const hasAccess = await ensureWorkspaceAccess(
        app.ritmio,
        request.ritmioAuth!.user.id,
        workspaceId,
      );

      if (!hasAccess) {
        reply.code(403);
        return {
          error: "Workspace access denied.",
        };
      }

      const accounts = await Promise.all(
        providerCatalog.map((provider) =>
          app.ritmio.repository.getSocialAccount(workspaceId, provider.platform),
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
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const parsedPlatform = platformSchema.safeParse(request.params.platform);
      if (!parsedPlatform.success) {
        reply.code(404);
        return {
          error: "Provider is not supported.",
        };
      }

      const parsed = createProviderConnectionInputSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      if (parsed.data.platform !== parsedPlatform.data) {
        reply.code(400);
        return {
          error: "Body platform must match the provider route parameter.",
        };
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

      const provider = getProviderDefinition(parsedPlatform.data);
      if (!provider) {
        reply.code(404);
        return {
          error: "Provider is not supported.",
        };
      }

      const account = await app.ritmio.repository.upsertSocialAccountConnection({
        ...parsed.data,
        accessToken:
          parsed.data.accessToken ??
          `sandbox-${parsedPlatform.data}-access-token`,
        providerMetadata: {
          connectionMode: provider.connectionMode,
          publishMode: provider.publishMode,
          connectedAt: new Date().toISOString(),
        },
      });

      return {
        data: {
          provider,
          account,
        },
      };
    },
  );
};
