import Fastify from "fastify";
import cors from "@fastify/cors";
import { resolveRequestAuth } from "./auth";
import { createAppContext, readAppConfig } from "./context";
import { contentRoutes } from "./routes/content";
import { dashboardRoutes } from "./routes/dashboard";
import { healthRoutes } from "./routes/health";
import { providerRoutes } from "./routes/providers";
import { sessionRoutes } from "./routes/session";

export function createServer() {
  const config = readAppConfig();
  const context = createAppContext(config);
  const app = Fastify({
    logger: true,
  });

  app.decorate("ritmio", context);
  app.decorateRequest("ritmioAuth", null);
  app.decorate("requireAuth", async function requireAuth(request, reply) {
    const resolved = await resolveRequestAuth(context, request);

    if (!resolved) {
      reply.code(401);
      throw new Error("Authentication required.");
    }

    request.ritmioAuth = resolved;
  });

  void app.register(cors, {
    origin: true,
  });

  app.addHook("onClose", async () => {
    if (context.queue) {
      await context.queue.close();
    }
  });

  void app.register(healthRoutes);
  void app.register(sessionRoutes, { prefix: "/api" });
  void app.register(dashboardRoutes, { prefix: "/api" });
  void app.register(contentRoutes, { prefix: "/api" });
  void app.register(providerRoutes, { prefix: "/api" });

  return app;
}
