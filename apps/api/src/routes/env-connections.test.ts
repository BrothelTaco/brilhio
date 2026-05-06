/*
Run this live connection test from the repo root after filling your real .env:

pnpm --filter @brilhio/api exec node --import tsx --test src/routes/env-connections.test.ts

This is a network smoke test. It reads process.env, calls Supabase, Stripe, and
OpenAI over HTTPS, and pings Redis when REDIS_URL is set. Missing values fail.
By default it loads the repo-root .env file. To test a different file in
PowerShell, run:

$env:BRILHIO_ENV_FILE=".env.example"; pnpm --filter @brilhio/api exec node --import tsx --test src/routes/env-connections.test.ts
*/

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { test } from "node:test";
import { createRedisConnection } from "@brilhio/backend";

function findUp(fileName: string) {
  let current = process.cwd();

  while (true) {
    const candidate = join(current, fileName);
    if (existsSync(candidate)) return candidate;

    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function loadEnvFile() {
  const configuredPath = process.env.BRILHIO_ENV_FILE?.trim() || ".env";
  const envPath = isAbsolute(configuredPath)
    ? configuredPath
    : configuredPath.includes("/") || configuredPath.includes("\\")
      ? resolve(process.cwd(), configuredPath)
      : findUp(configuredPath);

  assert.ok(envPath && existsSync(envPath), `${configuredPath} file was not found`);

  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim();
    process.env[key] ??= value;
  }
}

loadEnvFile();

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  assert.ok(value, `${name} is required`);
  return value;
}

function supabaseRestUrl(projectUrl: string) {
  return `${projectUrl.replace(/\/$/, "")}/rest/v1/`;
}

async function assertFetchOk(
  name: string,
  input: string,
  init: RequestInit,
  expectedStatuses = new Set([200]),
) {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error && "cause" in error
      ? ` Cause: ${String(error.cause)}`
      : "";
    assert.fail(`${name} network request failed for ${input}: ${message}.${cause}`);
  }

  const body = await response.text();

  assert.ok(
    expectedStatuses.has(response.status),
    `${name} failed with HTTP ${response.status}: ${body.slice(0, 500)}`,
  );
}

test("supabase server connection accepts SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", async () => {
  const url = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  await assertFetchOk("supabase server", supabaseRestUrl(url), {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/openapi+json",
    },
  });
});

test("supabase web connection accepts NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY", async () => {
  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  await assertFetchOk("supabase web", supabaseRestUrl(url), {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: "application/openapi+json",
    },
  });
});

test("supabase mobile connection accepts EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY", async () => {
  const url = requiredEnv("EXPO_PUBLIC_SUPABASE_URL");
  const anonKey = requiredEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");

  await assertFetchOk("supabase mobile", supabaseRestUrl(url), {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: "application/openapi+json",
    },
  });
});

test("stripe connection can retrieve STRIPE_PRICE_ID with STRIPE_SECRET_KEY", async () => {
  const secretKey = requiredEnv("STRIPE_SECRET_KEY");
  const priceId = requiredEnv("STRIPE_PRICE_ID");
  requiredEnv("STRIPE_WEBHOOK_SECRET");
  requiredEnv("WEB_APP_URL");

  await assertFetchOk(
    "stripe price lookup",
    `https://api.stripe.com/v1/prices/${encodeURIComponent(priceId)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    },
  );
});

test("redis connection responds to PING", async () => {
  const redisUrl = requiredEnv("REDIS_URL");
  const connection = createRedisConnection(redisUrl);

  try {
    const pong = await Promise.race([
      connection.ping(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Redis PING timed out after 5000ms")), 5000),
      ),
    ]);
    assert.equal(pong, "PONG");
  } finally {
    connection.disconnect();
  }
});

test("openai connection can retrieve configured model", async () => {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";

  await assertFetchOk(
    "openai model lookup",
    `https://api.openai.com/v1/models/${encodeURIComponent(model)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );
});
