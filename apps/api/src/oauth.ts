import { createHash, randomBytes } from "node:crypto";
import type { Platform } from "@brilhio/contracts";
import type { AppConfig } from "./context";

type TokenAuthMethod = "client_secret_basic" | "client_secret_post" | "none";

export type OAuthProviderRuntimeConfig = {
  platform: Platform;
  clientId: string;
  clientSecret: string | null;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string | null;
  scopes: string[];
  usePkce: boolean;
  tokenAuthMethod: TokenAuthMethod;
};

export type OAuthProviderProfile = {
  providerAccountId: string | null;
  handle: string;
  profileUrl: string | null;
  raw: Record<string, unknown>;
};

const DEFAULTS: Record<
  Platform,
  Omit<OAuthProviderRuntimeConfig, "platform" | "clientId" | "clientSecret">
> = {
  instagram: {
    authorizationUrl: "https://www.facebook.com/v20.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v20.0/oauth/access_token",
    userInfoUrl: "https://graph.facebook.com/v20.0/me/accounts",
    scopes: [
      "instagram_basic",
      "instagram_content_publish",
      "pages_show_list",
      "pages_read_engagement",
    ],
    usePkce: false,
    tokenAuthMethod: "client_secret_post",
  },
  facebook: {
    authorizationUrl: "https://www.facebook.com/v20.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v20.0/oauth/access_token",
    userInfoUrl: "https://graph.facebook.com/v20.0/me/accounts",
    scopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts"],
    usePkce: false,
    tokenAuthMethod: "client_secret_post",
  },
  tiktok: {
    authorizationUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    userInfoUrl:
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name,avatar_url",
    scopes: ["user.info.basic", "video.publish"],
    usePkce: false,
    tokenAuthMethod: "client_secret_post",
  },
  x: {
    authorizationUrl: "https://x.com/i/oauth2/authorize",
    tokenUrl: "https://api.x.com/2/oauth2/token",
    userInfoUrl: "https://api.x.com/2/users/me?user.fields=username,url",
    scopes: ["tweet.read", "tweet.write", "users.read", "media.write", "offline.access"],
    usePkce: true,
    tokenAuthMethod: "client_secret_basic",
  },
};

function envKey(platform: Platform) {
  return platform === "x" ? "X" : platform.toUpperCase();
}

function readList(value: string | undefined, fallback: string[]) {
  return value
    ? value
        .split(/[,\s]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    : fallback;
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function readTokenAuthMethod(
  value: string | undefined,
  fallback: TokenAuthMethod,
): TokenAuthMethod {
  if (
    value === "client_secret_basic" ||
    value === "client_secret_post" ||
    value === "none"
  ) {
    return value;
  }
  return fallback;
}

export function getOAuthProviderConfig(
  platform: Platform,
  env = process.env,
): OAuthProviderRuntimeConfig | null {
  const key = envKey(platform);
  const defaults = DEFAULTS[platform];
  const clientId =
    env[`BRILHIO_${key}_OAUTH_CLIENT_ID`] ??
    env[`${key}_OAUTH_CLIENT_ID`] ??
    env[`${key}_CLIENT_ID`] ??
    null;

  if (!clientId) return null;

  const clientSecret =
    env[`BRILHIO_${key}_OAUTH_CLIENT_SECRET`] ??
    env[`${key}_OAUTH_CLIENT_SECRET`] ??
    env[`${key}_CLIENT_SECRET`] ??
    null;

  return {
    platform,
    clientId,
    clientSecret,
    authorizationUrl:
      env[`BRILHIO_${key}_OAUTH_AUTHORIZATION_URL`] ??
      env[`${key}_OAUTH_AUTHORIZATION_URL`] ??
      defaults.authorizationUrl,
    tokenUrl:
      env[`BRILHIO_${key}_OAUTH_TOKEN_URL`] ??
      env[`${key}_OAUTH_TOKEN_URL`] ??
      defaults.tokenUrl,
    userInfoUrl:
      env[`BRILHIO_${key}_OAUTH_USER_INFO_URL`] ??
      env[`${key}_OAUTH_USER_INFO_URL`] ??
      defaults.userInfoUrl,
    scopes: readList(
      env[`BRILHIO_${key}_OAUTH_SCOPES`] ?? env[`${key}_OAUTH_SCOPES`],
      defaults.scopes,
    ),
    usePkce: readBoolean(
      env[`BRILHIO_${key}_OAUTH_USE_PKCE`] ?? env[`${key}_OAUTH_USE_PKCE`],
      defaults.usePkce,
    ),
    tokenAuthMethod: readTokenAuthMethod(
      env[`BRILHIO_${key}_OAUTH_TOKEN_AUTH_METHOD`] ??
        env[`${key}_OAUTH_TOKEN_AUTH_METHOD`],
      defaults.tokenAuthMethod,
    ),
  };
}

export function createOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function hashOAuthState(state: string) {
  return createHash("sha256").update(state).digest("hex");
}

export function createCodeVerifier() {
  return randomBytes(32).toString("base64url");
}

export function createCodeChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function getApiPublicUrl(config: AppConfig) {
  return config.apiPublicUrl ?? `http://localhost:${config.port}`;
}

export function getWebAppUrl(config: AppConfig) {
  return config.webAppUrl ?? "http://localhost:3000";
}

export function getOAuthRedirectUri(config: AppConfig, platform: Platform) {
  return `${getApiPublicUrl(config).replace(/\/$/, "")}/api/providers/${platform}/oauth/callback`;
}

export function sanitizeRedirectPath(value: unknown) {
  if (typeof value !== "string") return "/accounts";
  if (!value.startsWith("/") || value.startsWith("//")) return "/accounts";
  return value;
}

export function buildAuthorizationUrl(input: {
  config: OAuthProviderRuntimeConfig;
  redirectUri: string;
  state: string;
  codeChallenge: string | null;
}) {
  const url = new URL(input.config.authorizationUrl);
  url.searchParams.set("client_id", input.config.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", input.state);
  if (input.config.scopes.length) {
    url.searchParams.set("scope", input.config.scopes.join(" "));
  }
  if (input.codeChallenge) {
    url.searchParams.set("code_challenge", input.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
  }
  return url.toString();
}

export function buildWebRedirect(
  config: AppConfig,
  redirectPath: string,
  params: Record<string, string>,
) {
  const url = new URL(sanitizeRedirectPath(redirectPath), getWebAppUrl(config));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  [key: string]: unknown;
};

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

export async function exchangeAuthorizationCode(input: {
  config: OAuthProviderRuntimeConfig;
  code: string;
  redirectUri: string;
  codeVerifier: string | null;
}) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.config.clientId,
  });

  const headers = new Headers({
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  });

  if (input.codeVerifier) {
    body.set("code_verifier", input.codeVerifier);
  }

  if (input.config.clientSecret) {
    if (input.config.tokenAuthMethod === "client_secret_basic") {
      const credentials = Buffer.from(
        `${input.config.clientId}:${input.config.clientSecret}`,
      ).toString("base64");
      headers.set("Authorization", `Basic ${credentials}`);
    } else if (input.config.tokenAuthMethod === "client_secret_post") {
      body.set("client_secret", input.config.clientSecret);
    }
  }

  const response = await fetch(input.config.tokenUrl, {
    method: "POST",
    headers,
    body,
  });
  const json = await readJsonResponse(response);

  if (!response.ok) {
    const message =
      typeof json.error_description === "string"
        ? json.error_description
        : typeof json.error === "string"
          ? json.error
          : `Token exchange failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  const token = json as TokenResponse;
  if (typeof token.access_token !== "string" || !token.access_token) {
    throw new Error("Token exchange did not return an access token.");
  }

  return {
    accessToken: token.access_token,
    refreshToken:
      typeof token.refresh_token === "string" ? token.refresh_token : null,
    tokenExpiresAt:
      typeof token.expires_in === "number"
        ? new Date(Date.now() + token.expires_in * 1000).toISOString()
        : null,
    tokenType: typeof token.token_type === "string" ? token.token_type : null,
    scope: typeof token.scope === "string" ? token.scope : null,
    raw: json,
  };
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && Boolean(value));
}

export function normalizeProviderProfile(
  platform: Platform,
  raw: Record<string, unknown>,
): OAuthProviderProfile {
  const xData = raw.data && typeof raw.data === "object" ? raw.data as Record<string, unknown> : null;
  const tiktokUser =
    xData?.user && typeof xData.user === "object"
      ? xData.user as Record<string, unknown>
      : null;
  const facebookPage =
    Array.isArray(raw.data) && raw.data[0] && typeof raw.data[0] === "object"
      ? raw.data[0] as Record<string, unknown>
      : null;

  const providerAccountId = firstString(
    xData?.id,
    tiktokUser?.open_id,
    facebookPage?.id,
    raw.id,
    raw.open_id,
  ) ?? null;
  const username = firstString(
    xData?.username,
    tiktokUser?.display_name,
    facebookPage?.name,
    raw.username,
    raw.name,
  );
  const handle =
    username ??
    (providerAccountId ? `${platform}-${providerAccountId}` : `${platform}-account`);
  const profileUrl = firstString(xData?.url, tiktokUser?.avatar_url, raw.profile_url) ?? null;

  return {
    providerAccountId,
    handle: platform === "x" && username ? `@${username}` : handle,
    profileUrl,
    raw,
  };
}

export async function fetchProviderProfile(input: {
  config: OAuthProviderRuntimeConfig;
  accessToken: string;
}) {
  if (!input.config.userInfoUrl) {
    return normalizeProviderProfile(input.config.platform, {});
  }

  const response = await fetch(input.config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      Accept: "application/json",
    },
  });
  const json = await readJsonResponse(response);

  if (!response.ok) {
    const message =
      typeof json.error_description === "string"
        ? json.error_description
        : typeof json.error === "string"
          ? json.error
          : `Profile lookup failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  return normalizeProviderProfile(input.config.platform, json);
}
