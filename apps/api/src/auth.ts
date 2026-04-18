import type { FastifyRequest } from "fastify";
import type { AuthSession, AuthenticatedUser } from "@ritmio/contracts";
import type { AppContext } from "./context";

type ResolvedAuth = {
  user: AuthenticatedUser;
  session: AuthSession;
};

function getBearerToken(request: FastifyRequest) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

async function resolveSupabaseUser(
  context: AppContext,
  request: FastifyRequest,
): Promise<AuthenticatedUser | null> {
  const token = getBearerToken(request);
  if (!token || !context.supabaseAdmin) {
    return null;
  }

  const { data, error } = await context.supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    authSource: "supabase",
  };
}

function resolveDevUser(
  context: AppContext,
  request: FastifyRequest,
): AuthenticatedUser | null {
  if (!context.config.allowDevAuth) {
    return null;
  }

  const headerUserId = request.headers["x-ritmio-dev-user-id"];
  const headerUserEmail = request.headers["x-ritmio-dev-user-email"];

  const userId =
    (typeof headerUserId === "string" ? headerUserId : null) ??
    context.config.devUserId;
  const email =
    (typeof headerUserEmail === "string" ? headerUserEmail : null) ??
    context.config.devUserEmail;

  if (!userId) {
    return null;
  }

  return {
    id: userId,
    email,
    authSource: "development",
  };
}

export async function resolveRequestAuth(
  context: AppContext,
  request: FastifyRequest,
): Promise<ResolvedAuth | null> {
  const supabaseUser = await resolveSupabaseUser(context, request);
  const user = supabaseUser ?? resolveDevUser(context, request);

  if (!user) {
    return null;
  }

  const session = await context.repository.getAuthSession(user);
  return {
    user,
    session,
  };
}

export async function ensureWorkspaceAccess(
  context: AppContext,
  userId: string,
  workspaceId: string,
) {
  return context.repository.userHasWorkspaceAccess(userId, workspaceId);
}

