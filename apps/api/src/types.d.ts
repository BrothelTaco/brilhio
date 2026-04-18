import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthSession, AuthenticatedUser } from "@ritmio/contracts";
import type { AppContext } from "./context";

declare module "fastify" {
  interface FastifyInstance {
    ritmio: AppContext;
    requireAuth: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }

  interface FastifyRequest {
    ritmioAuth: {
      user: AuthenticatedUser;
      session: AuthSession;
    } | null;
  }
}

export {};

