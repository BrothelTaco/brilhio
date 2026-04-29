# Brilhio Architecture

## Surfaces

- `apps/web`: Authenticated desktop and browser experience for calendar management, approvals, connected platforms, and analytics.
- `apps/mobile`: Native operator experience for reviewing drafts, approving posts, and monitoring publishing health.
- `apps/marketing`: Public-facing positioning site and acquisition funnel.

## Runtime services

- `apps/api`: Owns request/response workflows and stable HTTP boundaries.
- `apps/worker`: Owns asynchronous execution.

## Implemented boundaries

- Session/auth resolution happens in `apps/api` and returns a current workspace context.
- Queue persistence lives in `job_records`, while BullMQ handles dispatch and execution timing.
- Provider connections are modeled as a shared catalog for Instagram, TikTok, Facebook, and X.
- Media uploads use signed Supabase Storage upload sessions created by `apps/api`.
- Provider publishing currently runs in explicit sandbox mode inside the worker.

## Shared packages

- `packages/api-client`: Shared API client used by web and mobile.
- `packages/backend`: Shared repository, queue, crypto, and provider helpers for API and worker.
- `packages/contracts`: Canonical schemas, DTOs, enums, and response contracts.
- `packages/design-system`: Tokens and web styling primitives.
- `packages/utils`: Demo data plus reusable calendar and dashboard helpers.

## Queue-first behaviors

The worker is expected to own these flows:

- caption generation
- publish window recommendation
- platform variant generation
- scheduled post execution
- token refresh
- webhook ingestion follow-up
- failure retries and dead-letter handling

## Provider boundary rules

- Provider connection and capability HTTP entry belongs in `apps/api`.
- Provider-specific publishing logic belongs in `apps/worker`.
- Shared capability flags and constraints belong in `packages/contracts`.
- Persisted provider state belongs in Supabase tables and storage.

## v1 product assumptions

- A single workspace may manage multiple brands or channels later, but the initial model is workspace-centric.
- A content item can produce multiple scheduled posts, one per platform or variant.
- Approval is task-driven rather than embedded ad hoc in the content item record.
- AI suggestions are additive artifacts, not the source of truth for content scheduling.
