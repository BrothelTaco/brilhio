import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";

type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

function encodeForm(data: Record<string, string>) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    form.set(key, value);
  }
  return form;
}

async function stripeRequest<T>(
  secretKey: string,
  path: string,
  body: Record<string, string>,
): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodeForm(body),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof json?.error?.message === "string"
        ? json.error.message
        : "Stripe request failed.";
    throw new Error(message);
  }
  return json as T;
}

function getHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );
  const timestamp = parts.t;
  const signatures = signatureHeader
    .split(",")
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  return signatures.some((signature) => {
    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(signature, "hex");
    return (
      expectedBuffer.length === receivedBuffer.length &&
      timingSafeEqual(expectedBuffer, receivedBuffer)
    );
  });
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function boolValue(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function periodEnd(value: unknown) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

async function applySubscriptionObject(
  app: Parameters<FastifyPluginAsync>[0],
  subscription: Record<string, unknown>,
) {
  const customerId = stringValue(subscription.customer);
  if (!customerId) return;

  await app.brilhio.repository.updateBillingProfileByStripeCustomerId(customerId, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: stringValue(subscription.id),
    subscriptionStatus: stringValue(subscription.status),
    subscriptionCurrentPeriodEnd: periodEnd(subscription.current_period_end),
    subscriptionCancelAtPeriodEnd: boolValue(subscription.cancel_at_period_end),
  });
}

export const billingRoutes: FastifyPluginAsync = async (app) => {
  app.addContentTypeParser("application/json", { parseAs: "string" }, (_request, body, done) => {
    done(null, body);
  });

  app.post(
    "/billing/checkout-session",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      const { stripeSecretKey, stripePriceId, webAppUrl } = app.brilhio.config;
      if (!stripeSecretKey || !stripePriceId || !webAppUrl) {
        reply.code(501);
        return {
          error:
            "Stripe checkout is not configured. Set STRIPE_SECRET_KEY, STRIPE_PRICE_ID, and WEB_APP_URL.",
        };
      }

      const { user, session } = request.brilhioAuth!;
      let stripeCustomerId = session.profile.stripeCustomerId;

      if (!stripeCustomerId) {
        const customer = await stripeRequest<{ id: string }>(
          stripeSecretKey,
          "customers",
          {
            email: user.email ?? session.profile.email,
            "metadata[user_id]": user.id,
          },
        );
        stripeCustomerId = customer.id;
        await app.brilhio.repository.ensureStripeCustomerId(
          user.id,
          user.email ?? session.profile.email,
          stripeCustomerId,
        );
      }

      const checkout = await stripeRequest<{ id: string; url: string | null }>(
        stripeSecretKey,
        "checkout/sessions",
        {
          mode: "subscription",
          customer: stripeCustomerId,
          "line_items[0][price]": stripePriceId,
          "line_items[0][quantity]": "1",
          success_url: `${webAppUrl}/onboarding?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${webAppUrl}/join?checkout=cancelled`,
          client_reference_id: user.id,
          "metadata[user_id]": user.id,
          "subscription_data[metadata][user_id]": user.id,
        },
      );

      if (!checkout.url) {
        reply.code(502);
        return { error: "Stripe did not return a checkout URL." };
      }

      return { data: { id: checkout.id, url: checkout.url } };
    },
  );

  app.post("/billing/webhook", async (request, reply) => {
    const { stripeWebhookSecret } = app.brilhio.config;
    if (!stripeWebhookSecret) {
      reply.code(501);
      return { error: "Stripe webhook secret is not configured." };
    }

    const payload = typeof request.body === "string" ? request.body : "";
    const signature = getHeaderValue(request.headers["stripe-signature"]);
    if (!payload || !signature || !verifyStripeSignature(payload, signature, stripeWebhookSecret)) {
      reply.code(400);
      return { error: "Invalid Stripe signature." };
    }

    const event = JSON.parse(payload) as StripeEvent;
    const object = event.data.object;

    if (event.type === "checkout.session.completed") {
      const userId = stringValue(
        typeof object.metadata === "object" && object.metadata
          ? (object.metadata as Record<string, unknown>).user_id
          : null,
      ) ?? stringValue(object.client_reference_id);

      if (userId) {
        await app.brilhio.repository.updateBillingProfileByUserId(userId, {
          stripeCustomerId: stringValue(object.customer),
          stripeSubscriptionId: stringValue(object.subscription),
          subscriptionStatus:
            stringValue(object.payment_status) === "paid" ? "active" : null,
        });
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await applySubscriptionObject(app, object);
    }

    return { received: true };
  });
};
