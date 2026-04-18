# Ritmio API

Fastify API scaffold for:

- authenticated sessions
- current workspace selection
- media assets
- signed media upload sessions
- content items
- approval tasks
- scheduled posts
- dashboard snapshots
- job queuing
- provider catalog and sandbox connections

## Run

```bash
pnpm --filter @ritmio/api dev
```

## Current endpoints

- `GET /health`
- `GET /api/me`
- `PATCH /api/me/current-workspace`
- `GET /api/workspaces`
- `GET /api/workspaces/:workspaceId/dashboard`
- `GET /api/workspaces/:workspaceId/media-assets`
- `GET /api/providers`
- `POST /api/providers/:platform/connect`
- `POST /api/media-assets/upload-session`
- `POST /api/media-assets`
- `POST /api/content-items`
- `POST /api/approval-tasks`
- `PATCH /api/approval-tasks/:approvalTaskId/status`
- `POST /api/scheduled-posts`
- `POST /api/jobs`

## Auth modes

- Supabase bearer token when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured
- development identity headers when `ALLOW_DEV_AUTH=true`
  - `x-ritmio-dev-user-id`
  - `x-ritmio-dev-user-email`
