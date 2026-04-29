import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthSession, AuthenticatedUser } from "@brilhio/contracts";
import type { AppContext } from "./context";

declare module "fastify" {
  interface FastifyInstance {
    brilhio: AppContext;
    requireAuth: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    requireSubscription: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }

  interface FastifyRequest {
    brilhioAuth: {
      user: AuthenticatedUser;
      session: AuthSession;
    } | null;
  }
}

export {};
