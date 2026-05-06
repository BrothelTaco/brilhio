# Brilhio — agent notes

Monorepo (pnpm workspaces). Apps: `web`, `marketing`, `mobile`, `api`, `worker`. Packages: `contracts` (zod schemas + types — the source of truth), `backend` (repository + queue + providers), `api-client`, `design-system`, `utils` (demo data).

## Data model

One Supabase auth user → one row everywhere. There is no team/workspace concept — `workspaces` was removed in [20260428000001_remove_workspaces.sql](supabase/migrations/20260428000001_remove_workspaces.sql). All content tables key off `user_id` with simple `auth.uid() = user_id` RLS.

- [profiles](supabase/migrations/20260428000000_profiles.sql) — auth/email/timezone/Stripe state. Auto-created by `handle_new_user` trigger on signup.
- [user_strategy_profiles](supabase/migrations/20260428000002_strategy_and_billing.sql) — identity, industry, goals, voice, audience notes. Drives prompts.
- `media_assets` → Supabase Storage bucket `media-assets` (private, signed URLs only).
- `content_items` ↔ `content_item_media` ↔ `media_assets` — the "idea + files" unit.
- `scheduled_posts` — one row per platform per content_item. The publishing unit.
- `job_records` — every queued/running/completed BullMQ job. `bullmq_job_id` ties them together; the worker also recovers orphaned jobs on boot via `listOverdueJobRecords`.

## Posting workflow — calendar-first, hybrid

The calendar drives the workflow, not the content library. The product flow is:

1. **System recommends slots.** Based on `user_strategy_profiles` (industry, goals, voice, platform priorities), we propose when the user should post and what type of content fits each slot. These appear on the calendar as **opaque "Recommended Content" placeholders** — they have a time, a platform, and a content-type hint, but no media yet.
2. **User uploads media.** Goes into `media_assets` (Supabase Storage). At upload time, we suggest which open recommendation slot the asset best fits. The user confirms (or moves it).
3. **Slot fills → scheduled_post.** Once media is attached to a recommendation, it gets promoted to a real `scheduled_posts` row with `status='scheduled'`. A `publish-scheduled-post` job is enqueued for `scheduled_for`.
4. **Calendar full → defer.** If the week is fully populated and the user uploads more, we either (a) suggest additional time slots in the current week, or (b) recommend holding the asset for next week's plan. Unscheduled media just sits in `media_assets`.

Implication: recommendations need their own representation (they're not `scheduled_posts` until media is attached). Not yet built — when adding, prefer a separate `recommended_slots` table over overloading `scheduled_posts` with nullable `content_item_id`.

## Publishing pipeline

**One worker process handles every platform.** BullMQ concurrency (`concurrency: 5` in [apps/worker/src/index.ts](apps/worker/src/index.ts)) handles parallelism. Per-platform code lives in [packages/backend/src/providers/publishers/](packages/backend/src/providers/publishers/) behind a `Publisher` interface; `dispatchPublish` routes by `scheduledPost.platform`.

Each platform file (`instagram.ts`, `tiktok.ts`, `facebook.ts`, `x.ts`) currently:
- Falls back to `sandboxPublish` when `credentials.providerMetadata.publishMode !== "live"`.
- Throws `liveNotEnabledError` otherwise. The doc-comment in each file lists the exact API endpoints to call when wiring live mode.

To add live publishing for a platform: connect a real account that sets `publishMode: "live"` in `provider_metadata`, then implement the live branch in that platform's file. No worker changes needed.

The worker hands publishers a fully resolved context: `scheduledPost`, `contentItem`, `media[]` (each with a 1-hour signed URL from Supabase Storage), `credentials`, and the catalog `provider` definition.

## AI memory — single chokepoint

Every AI worker call goes through `buildUserContext(repository, userId)` + `renderUserContextPrompt(context)` from [packages/backend/src/ai/user-context.ts](packages/backend/src/ai/user-context.ts). This produces a stable system-prompt prefix containing strategy profile, brand brief (TODO), connected platforms, recent posts, and recent media. The per-call `input` to OpenAI is only the task-specific ask — everything else is in the cacheable prefix so prompt caching kicks in across repeat calls within a session.

When adding a new AI job:
1. Build instructions with `buildSystemPrompt(repository, userId, taskInstructions)` (helper in [apps/worker/src/jobs.ts](apps/worker/src/jobs.ts)).
2. Pass the task-specific data as `input`.
3. Do NOT inline strategy/recent-posts/media into the per-call prompt — that breaks cache hits and duplicates a source of truth.

**Brand brief** lives on `user_strategy_profiles.brand_brief` (with `brand_brief_generated_at`) — see [20260429000001_brand_brief.sql](supabase/migrations/20260429000001_brand_brief.sql). It's AI-generated, never user-edited; `updateUserStrategyProfile` preserves whatever's there. Regenerate via the `regenerate-brand-brief` job type, which builds context with the existing brief stripped (otherwise the model just remixes the old one) and calls `repository.setBrandBrief`.

When to enqueue a regen (not yet wired — these are the trigger points):
- After onboarding completes (first time the strategy profile is filled in).
- Weekly cron, or after N new published posts.
- After a material strategy edit (industry/voice/pillars change).

## Conventions

- Contracts (`@brilhio/contracts`) are the source of truth. Add a zod schema there before consuming the field elsewhere.
- Repository has two impls: `MemoryRepository` (dev, no Supabase) and `SupabaseRepository`. Both must stay in sync — adding a method means updating both.
- API routes never talk to Supabase directly; they go through `repository`.
- Migrations are timestamp-named: `YYYYMMDDHHMMSS_description.sql`. Don't edit existing migrations — append new ones.
- Storage path for media is `media-assets/{user_id}/{asset_id}/{filename}`; signed URLs are generated on demand by `repository.createSignedMediaUrl`.
