# Stripe Operations

## Production Webhook Endpoint

Configure the Stripe webhook endpoint to call:

```text
https://<api-origin>/api/billing/webhook
```

Use the signing secret from that endpoint as `STRIPE_WEBHOOK_SECRET` in the API environment. Subscribe at minimum to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Do not enable `REQUIRE_SUBSCRIPTION=true` until the endpoint is deployed, the secret is set, and a test checkout has updated the user's `profiles.subscription_status`. After that live check succeeds, set `SUBSCRIPTION_ENFORCEMENT_CONFIRMED=true` in the API environment.

Before enabling subscription enforcement, call:

```bash
curl https://<api-origin>/health/readiness
```

The response should have `status: "ready"`, `stripeWebhookEventsTable: true`, and `subscriptionEnforcementConfirmed: true` when `REQUIRE_SUBSCRIPTION=true`.

## Subscription Enforcement Model

Stripe webhooks are the source of truth for payment state. Webhook handlers update
`profiles.subscription_status`, `profiles.stripe_customer_id`, and related
subscription fields. Web and API route guards check those local profile fields
instead of calling Stripe on every navigation.

The worker runs a Stripe subscription reconciliation pass once per day by
default. It scans profiles with Stripe customer/subscription ids and refreshes
their local billing status from Stripe. Override the cadence with:

```text
STRIPE_RECONCILIATION_INTERVAL_HOURS=24
```

This reconciliation is a backup for missed or delayed webhooks; it is not the
primary request-time access check.

## Local Webhook Test

Run the API:

```bash
pnpm dev:api
```

In another terminal, forward Stripe events:

```bash
stripe login
stripe listen --forward-to localhost:4000/api/billing/webhook
```

Copy the `whsec_...` value printed by Stripe into local `.env` as `STRIPE_WEBHOOK_SECRET`, then restart the API.

Trigger useful test events:

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
```

For end-to-end checkout, use the web app's billing page so the Checkout Session contains Brilhio's user metadata. The synthetic `stripe trigger checkout.session.completed` event is useful for signature/receipt testing, but may not map to a real local user.

## Local API + Supabase + Stripe E2E Check

After the API is running with real Supabase and Stripe test-mode values, run the opt-in e2e check with a Supabase user access token:

```bash
pnpm test:stripe:e2e
```

Set these environment variables before running it:

```text
RUN_STRIPE_E2E=true
STRIPE_E2E_API_BASE_URL=http://localhost:4000
STRIPE_E2E_ACCESS_TOKEN=<supabase-user-access-token>
```

The e2e check calls the local API health endpoint, validates the Supabase-backed `/api/me` session, and creates a real Stripe Checkout Session through `/api/billing/checkout-session`. Keep `stripe listen --forward-to localhost:4000/api/billing/webhook` running in another terminal when you complete that Checkout Session in the browser so the subscription update lands back in Supabase.

## Monitoring Checklist

- Set `ALERT_WEBHOOK_URL` to an HTTPS endpoint that accepts JSON alert payloads.
- Alert on API logs containing `Stripe checkout session creation failed`.
- Alert on API logs containing `Stripe billing portal session creation failed`.
- Alert on API logs containing `Stripe webhook processing failed`.
- Track spikes in `Invalid Stripe webhook signature`; occasional local mistakes are normal, production spikes are suspicious.
- Watch for repeated Stripe retries for the same event id. Processed event ids are stored in `stripe_webhook_events`.
