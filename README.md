# Brilhio

Brilhio is a purpose-built monorepo foundation for an AI social media manager that ships across:

- a product web app
- a public marketing site
- a native mobile app
- an API surface for orchestration and CRUD
- a background worker for scheduled publishing, AI generation, retries, and provider maintenance

This repository is intentionally structured for the product you described rather than adapted from the SparkBooks electrical-generation domain.

## Repository layout

```text
apps/
  api/        Fastify API for workspaces, content, approvals, jobs, and provider surfaces
  marketing/  Next.js landing site
  mobile/     Expo React Native app
  web/        Next.js product app
  worker/     Background job processor

packages/
  api-client/     Shared fetch client for web and mobile
  backend/        Shared server-side repository, queue, crypto, and provider helpers
  contracts/      Shared domain types and validation schemas
  design-system/  Shared tokens and web CSS primitives
  utils/          Shared demo data and calendar helpers

supabase/
  migrations/     Initial product schema for workspaces, accounts, content, approvals, jobs, and webhooks
```

## Why this shape

- `web` and `mobile` are separate first-class clients because the product needs native mobile from day one.
- `marketing` is kept separate so the public site can move independently from the authenticated product.
- `api` owns synchronous product workflows and provider-facing HTTP boundaries.
- `worker` owns background execution: posting, retries, token refresh, calendar generation, and AI suggestion jobs.
- `packages/contracts` prevents each app from inventing its own view of the data model.
- `packages/api-client` keeps web and mobile on the same API contract.
- `packages/backend` keeps the API and worker on the same repository, queue, crypto, and provider logic.

## Core domain model

The shared contracts package defines the first-pass entities needed for the product:

- `workspaces`
- `social_accounts`
- `media_assets`
- `content_items`
- `scheduled_posts`
- `ai_suggestions`
- `approval_tasks`
- `job_records`
- `provider_webhooks`

## Scripts

From the repo root:

```bash
pnpm install
pnpm dev
pnpm dev:mobile
pnpm typecheck
pnpm build
```

## Environment

Copy `.env.example` and fill the production values before deployment:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET` for media uploads
- `APP_ENCRYPTION_KEY` for stored provider tokens
- `REDIS_URL` for BullMQ workers
- `OPENAI_API_KEY` and optional `OPENAI_MODEL` for AI worker jobs
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, and `WEB_APP_URL` for signup Checkout
- `REQUIRE_SUBSCRIPTION=true` in production once Stripe webhooks are configured
- `NEXT_PUBLIC_API_BASE_URL` for the web app API origin

Apply the SQL in `supabase/migrations` to the target Supabase project before pointing production traffic at it.

## Product direction encoded in this scaffold

- Multi-platform publishing is modeled explicitly instead of hidden inside app-specific code.
- Scheduling and AI generation are treated as queued jobs rather than request/response actions.
- Web and mobile can share contracts, tokens, and helper logic without forcing identical UI implementations.
- Provider boundaries are represented in API and worker packages so OAuth, token refresh, publishing constraints, and webhooks have a clear home.

## Implemented in this pass

- Supabase-backed repository layer with a memory fallback for local/offline development
- session-aware API auth with Supabase JWT support and development identity headers
- user-owned session/profile model backed by `profiles`
- CRUD routes for media assets, content items, approval tasks, scheduled posts, and queued jobs
- BullMQ queue integration with persisted `job_records`
- signed upload session creation for Supabase Storage media uploads
- manual provider catalog and connection flow for Instagram, TikTok, Facebook, and X
- sandbox worker publishing for the supported providers
- web and mobile apps now fetch real session/dashboard data through authenticated API calls
- production auth UI for web and mobile using Supabase Auth
- Stripe Checkout session creation after signup
- Stripe webhook handling for checkout/subscription status updates
- OpenAI Responses API calls for caption, platform variant, and calendar AI jobs

## Next implementation steps

1. Replace sandbox provider publishing with live platform adapters and reviewed OAuth flows per provider.
2. Add signed download URLs and richer media previews across web and mobile.
3. Add prompt/version management and evaluation coverage for AI generation.
4. Add tests around queue processing, repository mappings, auth state, and provider flows.
5. Add mobile-native media picking and upload UX on top of the signed upload session API.
