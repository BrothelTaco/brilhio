import type { FastifyPluginAsync } from "fastify";
import { updateCurrentWorkspaceInputSchema } from "@ritmio/contracts";

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/me",
    {
      preHandler: app.requireAuth,
    },
    async (request) => ({
      data: request.ritmioAuth!.session,
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

      const session = await app.ritmio.repository.setCurrentWorkspace(
        request.ritmioAuth!.user.id,
        parsed.data.workspaceId,
      );

      return {
        data: session,
      };
    },
  );
};

