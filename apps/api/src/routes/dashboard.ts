import type { FastifyPluginAsync } from "fastify";

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/me/dashboard",
    { preHandler: app.requireSubscription },
    async (request) => ({
      data: await app.brilhio.repository.getDashboard(request.brilhioAuth!.user.id),
    }),
  );

  app.get(
    "/me/media-assets",
    { preHandler: app.requireSubscription },
    async (request) => ({
      data: await app.brilhio.repository.listMediaAssets(request.brilhioAuth!.user.id),
    }),
  );
};
