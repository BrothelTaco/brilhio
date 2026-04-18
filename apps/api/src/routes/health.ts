import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => ({
    status: "ok",
    service: "ritmio-api",
    repositoryMode: app.ritmio.repository.mode,
    queueEnabled: Boolean(app.ritmio.queue),
  }));
};
