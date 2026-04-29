import type { FastifyPluginAsync } from "fastify";
import { ensureWorkspaceAccess } from "../auth";

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/workspaces",
    {
      preHandler: app.requireAuth,
    },
    async (request) => ({
      data: request.brilhioAuth!.session.workspaces,
    }),
  );

  app.get<{ Params: { workspaceId: string } }>(
    "/workspaces/:workspaceId/dashboard",
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const hasAccess = await ensureWorkspaceAccess(
        app.brilhio,
        request.brilhioAuth!.user.id,
        request.params.workspaceId,
      );

      if (!hasAccess) {
        reply.code(403);
        return {
          error: "Workspace access denied.",
        };
      }

      const snapshot = await app.brilhio.repository.getDashboard(
        request.params.workspaceId,
      );

      if (!snapshot) {
        reply.code(404);
        return {
          error: "Workspace not found.",
        };
      }

      return {
        data: snapshot,
      };
    },
  );

  app.get<{ Params: { workspaceId: string } }>(
    "/workspaces/:workspaceId/media-assets",
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const hasAccess = await ensureWorkspaceAccess(
        app.brilhio,
        request.brilhioAuth!.user.id,
        request.params.workspaceId,
      );

      if (!hasAccess) {
        reply.code(403);
        return {
          error: "Workspace access denied.",
        };
      }

      return {
        data: await app.brilhio.repository.listMediaAssets(
          request.params.workspaceId,
        ),
      };
    },
  );
};
