# Brilhio Worker

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
- OpenAI Responses API jobs for captions, platform variants, and calendar suggestions

## Run

```bash
pnpm --filter @brilhio/worker dev
```

Set `OPENAI_API_KEY` for AI jobs. `OPENAI_MODEL` defaults to `gpt-5-mini`.
