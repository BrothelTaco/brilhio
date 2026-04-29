import type { FastifyPluginAsync } from "fastify";
import { updateUserTimezoneInputSchema } from "@brilhio/contracts";
import { isValidIanaTimezone } from "@brilhio/backend";

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/me",
    { preHandler: app.requireAuth },
    async (request) => ({
      data: request.brilhioAuth!.session,
    }),
  );

  app.patch(
    "/me/timezone",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      const parsed = updateUserTimezoneInputSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.flatten() };
      }

      if (!isValidIanaTimezone(parsed.data.timezone)) {
        reply.code(400);
        return { error: "Invalid IANA timezone." };
      }

      await app.brilhio.repository.updateUserTimezone(
        request.brilhioAuth!.user.id,
        parsed.data.timezone,
      );

      return { data: { timezone: parsed.data.timezone } };
    },
  );
};
