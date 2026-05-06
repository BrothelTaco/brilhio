import assert from "node:assert/strict";
import { describe, test } from "node:test";

const runStripeE2E = process.env.RUN_STRIPE_E2E === "true";
const apiBaseUrl = process.env.STRIPE_E2E_API_BASE_URL ?? "http://localhost:4000";
const accessToken = process.env.STRIPE_E2E_ACCESS_TOKEN ?? "";

async function readJson(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

describe("Stripe local API e2e", { skip: runStripeE2E ? false : "Set RUN_STRIPE_E2E=true to run." }, () => {
  test("creates a real Checkout Session through the local API", async () => {
    assert.ok(accessToken, "STRIPE_E2E_ACCESS_TOKEN must be a Supabase access token.");

    const health = await fetch(`${apiBaseUrl}/health`);
    assert.equal(health.status, 200);

    const me = await fetch(`${apiBaseUrl}/api/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.equal(me.status, 200);

    const checkout = await fetch(`${apiBaseUrl}/api/billing/checkout-session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        successUrl: "http://localhost:3000/onboarding?checkout=success&session_id={CHECKOUT_SESSION_ID}",
        cancelUrl: "http://localhost:3000/billing?checkout=cancelled",
      }),
    });
    const checkoutJson = await readJson(checkout);

    assert.equal(checkout.status, 200);
    assert.equal(typeof checkoutJson?.data?.id, "string");
    assert.match(checkoutJson.data.url, /^https:\/\/checkout\.stripe\.com\//);
  });
});
