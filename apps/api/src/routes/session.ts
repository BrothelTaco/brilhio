import type { FastifyPluginAsync } from "fastify";
import { updateCurrentWorkspaceInputSchema, updateWorkspaceTimezoneInputSchema } from "@brilhio/contracts";
import { isValidIanaTimezone } from "@brilhio/backend";

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/me",
    {
      preHandler: app.requireAuth,
    },
    async (request) => ({
      data: request.brilhioAuth!.session,
    }),
  );

  app.patch(
    "/me/current-workspace",
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const parsed = updateCurrentWorkspaceInputSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      const session = await app.brilhio.repository.setCurrentWorkspace(
        request.brilhioAuth!.user.id,
        parsed.data.workspaceId,
      );

      return {
        data: session,
      };
    },
  );

  app.patch<{ Params: { workspaceId: string } }>(
    "/workspaces/:workspaceId/timezone",
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const parsed = updateWorkspaceTimezoneInputSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      if (!isValidIanaTimezone(parsed.data.timezone)) {
        reply.code(400);
        return { error: "Invalid IANA timezone." };
      }

      const hasAccess = await app.brilhio.repository.userHasWorkspaceAccess(
        request.brilhioAuth!.user.id,
        request.params.workspaceId,
      );

      if (!hasAccess) {
        reply.code(403);
        return { error: "Workspace access denied." };
      }

      const updated = await app.brilhio.repository.updateWorkspaceTimezone(
        request.params.workspaceId,
        parsed.data.timezone,
      );

      if (!updated) {
        reply.code(404);
        return { error: "Workspace not found." };
      }

      return { data: updated };
    },
  );
};

