import type { FastifyRequest } from "fastify";
import type { AuthSession, AuthenticatedUser } from "@brilhio/contracts";
import type { AppContext } from "./context";

type ResolvedAuth = {
  user: AuthenticatedUser;
  session: AuthSession;
};

export class AuthConfigurationError extends Error {
  statusCode = 503;

  constructor(message: string) {
    super(message);
    this.name = "AuthConfigurationError";
  }
}

function getBearerToken(request: FastifyRequest) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

async function resolveSupabaseUser(
  context: AppContext,
  request: FastifyRequest,
): Promise<AuthenticatedUser | null> {
  const token = getBearerToken(request);
  if (!token || !context.supabaseAdmin) return null;

  let result: Awaited<ReturnType<typeof context.supabaseAdmin.auth.getUser>>;
  try {
    result = await context.supabaseAdmin.auth.getUser(token);
  } catch {
    throw new AuthConfigurationError(
      "Supabase is unreachable, so Brilhio cannot verify your session. Check SUPABASE_URL and your network/DNS.",
    );
  }

  const { data, error } = result;
  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    authSource: "supabase",
  };
}

async function resolveDevUser(
  context: AppContext,
  request: FastifyRequest,
): Promise<AuthenticatedUser | null> {
  if (!context.config.allowDevAuth) return null;

  const headerUserId = request.headers["x-brilhio-dev-user-id"];
  const headerUserEmail = request.headers["x-brilhio-dev-user-email"];

  const userId =
    (typeof headerUserId === "string" ? headerUserId : null) ??
    context.config.devUserId;
  const email =
    (typeof headerUserEmail === "string" ? headerUserEmail : null) ??
    context.config.devUserEmail;

  if (!userId && email && context.supabaseAdmin) {
    let result: Awaited<ReturnType<typeof context.supabaseAdmin.auth.admin.listUsers>>;
    try {
      result = await context.supabaseAdmin.auth.admin.listUsers();
    } catch {
      throw new AuthConfigurationError(
        "Local development auth could not resolve the dev user because Supabase is unreachable. Set BRILHIO_DEV_USER_ID and NEXT_PUBLIC_BRILHIO_DEV_USER_ID to a real Supabase user id, or fix SUPABASE_URL/network access.",
      );
    }

    const { data, error } = result;
    if (!error) {
      const found = data.users.find(
        (user) => user.email?.toLowerCase() === email.toLowerCase(),
      );
      if (found) {
        return { id: found.id, email: found.email ?? email, authSource: "development" };
      }
    }
  }

  if (!userId && email && !context.supabaseAdmin) {
    throw new AuthConfigurationError(
      "Local development auth needs BRILHIO_DEV_USER_ID and NEXT_PUBLIC_BRILHIO_DEV_USER_ID when Supabase admin access is not configured.",
    );
  }

  if (!userId) return null;

  return { id: userId, email, authSource: "development" };
}

export async function resolveRequestAuth(
  context: AppContext,
  request: FastifyRequest,
): Promise<ResolvedAuth | null> {
  const supabaseUser = await resolveSupabaseUser(context, request);
  const user = supabaseUser ?? (await resolveDevUser(context, request));
  if (!user) return null;

  const session = await context.repository.getAuthSession(user);
  return { user, session };
}
