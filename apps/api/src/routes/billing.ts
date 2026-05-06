import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { sendOperationalAlert } from "../context";

type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
};

function encodeForm(data: Record<string, string>) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    form.set(key, value);
  }
  return form;
}

async function stripeFormRequest<T>(
  secretKey: string,
  path: string,
  init: { method: "GET" } | { method: "POST"; body: Record<string, string> },
): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(init.method === "POST"
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    body: init.method === "POST" ? encodeForm(init.body) : undefined,
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

async function stripePostRequest<T>(
  secretKey: string,
  path: string,
  body: Record<string, string>,
): Promise<T> {
  return stripeFormRequest<T>(secretKey, path, { method: "POST", body });
}

async function stripeGetRequest<T>(secretKey: string, path: string): Promise<T> {
  return stripeFormRequest<T>(secretKey, path, { method: "GET" });
}

function getHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
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

function requestBodyObject(body: unknown) {
  if (typeof body !== "string" || !body.trim()) return {};
  try {
    const parsed = JSON.parse(body) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function stringBodyValue(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeReturnUrl(value: string | null, fallback: string) {
  if (!value) return fallback;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "brilhio:") {
      return value;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

export function parseStripeEvent(payload: string): StripeEvent | null {
  try {
    const event = JSON.parse(payload) as Partial<StripeEvent>;
    if (
      typeof event.id !== "string" ||
      typeof event.type !== "string" ||
      !event.data ||
      typeof event.data !== "object" ||
      !event.data.object ||
      typeof event.data.object !== "object"
    ) {
      return null;
    }
    return event as StripeEvent;
  } catch {
    return null;
  }
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

async function applySubscriptionFromStripe(
  app: Parameters<FastifyPluginAsync>[0],
  subscriptionId: string,
) {
  const { stripeSecretKey } = app.brilhio.config;
  if (!stripeSecretKey) return;

  const subscription = await stripeGetRequest<StripeSubscription>(
    stripeSecretKey,
    `subscriptions/${subscriptionId}`,
  );
  await applySubscriptionObject(app, subscription);
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
      const body = requestBodyObject(request.body);
      const successUrl = safeReturnUrl(
        stringBodyValue(body, "successUrl"),
        `${webAppUrl}/onboarding?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      );
      const cancelUrl = safeReturnUrl(
        stringBodyValue(body, "cancelUrl"),
        `${webAppUrl}/join?checkout=cancelled`,
      );
      let stripeCustomerId = session.profile.stripeCustomerId;

      if (!stripeCustomerId) {
        try {
          const customer = await stripePostRequest<{ id: string }>(
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
        } catch (error) {
          request.log.error({ err: error, userId: user.id }, "Stripe customer creation failed");
          void sendOperationalAlert(app.brilhio, {
            severity: "error",
            event: "stripe.customer_creation_failed",
            message: "Stripe customer creation failed.",
            details: { userId: user.id },
          });
          reply.code(502);
          return { error: "Could not create Stripe customer." };
        }
      }

      const checkout = await stripePostRequest<{ id: string; url: string | null }>(
        stripeSecretKey,
        "checkout/sessions",
        {
          mode: "subscription",
          customer: stripeCustomerId,
          "line_items[0][price]": stripePriceId,
          "line_items[0][quantity]": "1",
          success_url: successUrl,
          cancel_url: cancelUrl,
          client_reference_id: user.id,
          "metadata[user_id]": user.id,
          "subscription_data[metadata][user_id]": user.id,
        },
      ).catch((error) => {
        request.log.error(
          { err: error, userId: user.id, stripeCustomerId },
          "Stripe checkout session creation failed",
        );
        void sendOperationalAlert(app.brilhio, {
          severity: "error",
          event: "stripe.checkout_session_creation_failed",
          message: "Stripe checkout session creation failed.",
          details: { userId: user.id, stripeCustomerId },
        });
        return null;
      });

      if (!checkout) {
        reply.code(502);
        return { error: "Could not start Stripe checkout." };
      }

      if (!checkout.url) {
        reply.code(502);
        return { error: "Stripe did not return a checkout URL." };
      }

      return { data: { id: checkout.id, url: checkout.url } };
    },
  );

  app.post(
    "/billing/portal-session",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      const { stripeSecretKey, webAppUrl } = app.brilhio.config;
      if (!stripeSecretKey || !webAppUrl) {
        reply.code(501);
        return {
          error:
            "Stripe customer portal is not configured. Set STRIPE_SECRET_KEY and WEB_APP_URL.",
        };
      }

      const { session } = request.brilhioAuth!;
      const body = requestBodyObject(request.body);
      const stripeCustomerId = session.profile.stripeCustomerId;
      if (!stripeCustomerId) {
        reply.code(409);
        return { error: "No Stripe customer is associated with this account yet." };
      }

      const portal = await stripePostRequest<{ id: string; url: string | null }>(
        stripeSecretKey,
        "billing_portal/sessions",
        {
          customer: stripeCustomerId,
          return_url: safeReturnUrl(stringBodyValue(body, "returnUrl"), `${webAppUrl}/account`),
        },
      ).catch((error) => {
        request.log.error(
          { err: error, stripeCustomerId },
          "Stripe billing portal session creation failed",
        );
        void sendOperationalAlert(app.brilhio, {
          severity: "error",
          event: "stripe.billing_portal_session_creation_failed",
          message: "Stripe billing portal session creation failed.",
          details: { stripeCustomerId },
        });
        return null;
      });

      if (!portal) {
        reply.code(502);
        return { error: "Could not open Stripe billing portal." };
      }

      if (!portal.url) {
        reply.code(502);
        return { error: "Stripe did not return a customer portal URL." };
      }

      return { data: { id: portal.id, url: portal.url } };
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
      request.log.warn(
        { hasPayload: Boolean(payload), hasSignature: Boolean(signature) },
        "Invalid Stripe webhook signature",
      );
      void sendOperationalAlert(app.brilhio, {
        severity: "warning",
        event: "stripe.invalid_webhook_signature",
        message: "Invalid Stripe webhook signature.",
        details: { hasPayload: Boolean(payload), hasSignature: Boolean(signature) },
      });
      reply.code(400);
      return { error: "Invalid Stripe signature." };
    }

    const event = parseStripeEvent(payload);
    if (!event) {
      request.log.warn("Invalid Stripe webhook payload");
      void sendOperationalAlert(app.brilhio, {
        severity: "warning",
        event: "stripe.invalid_webhook_payload",
        message: "Invalid Stripe webhook payload.",
      });
      reply.code(400);
      return { error: "Invalid Stripe event payload." };
    }

    if (await app.brilhio.repository.hasProcessedStripeWebhookEvent(event.id)) {
      return { received: true, duplicate: true };
    }

    const object = event.data.object;

    try {
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
          });
        }

        const subscriptionId = stringValue(object.subscription);
        if (subscriptionId) {
          await applySubscriptionFromStripe(app, subscriptionId);
        }
      }

      if (
        event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted"
      ) {
        await applySubscriptionObject(app, object);
      }

      await app.brilhio.repository.recordProcessedStripeWebhookEvent(event.id, event.type);
    } catch (error) {
      request.log.error(
        { err: error, stripeEventId: event.id, stripeEventType: event.type },
        "Stripe webhook processing failed",
      );
      void sendOperationalAlert(app.brilhio, {
        severity: "error",
        event: "stripe.webhook_processing_failed",
        message: "Stripe webhook processing failed.",
        details: { stripeEventId: event.id, stripeEventType: event.type },
      });
      reply.code(500);
      return { error: "Stripe webhook processing failed." };
    }

    return { received: true };
  });
};
