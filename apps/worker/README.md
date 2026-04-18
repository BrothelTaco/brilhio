# Ritmio Worker

Dedicated background execution surface for:

- scheduled publishing
- AI content generation
- token refresh
- retries
- webhook follow-up

## Current execution model

- BullMQ + Redis for queue consumption
- persisted job status in `job_records`
- sandbox publish execution for Instagram, TikTok, Facebook, and X
- heuristic AI jobs for caption and calendar suggestions until model orchestration is added

## Run

```bash
pnpm --filter @ritmio/worker dev
```
