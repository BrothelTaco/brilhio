# Brilhio API

Fastify API scaffold for:

- authenticated sessions
- current workspace selection
- media assets
- private Cloudflare R2 media upload sessions and authenticated object reads
- content items
- approval tasks
- scheduled posts
- dashboard snapshots
- job queuing
- provider catalog and sandbox connections
- provider OAuth start/callback state handling

## Run

```bash
pnpm --filter @brilhio/api dev
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
- `POST /api/providers/:platform/oauth/start`
- `GET /api/providers/:platform/oauth/callback`
- `POST /api/media-assets/upload-session`
- `GET /api/media-assets/:mediaAssetId/object`
- `POST /api/media-assets`
- `POST /api/content-items`
- `POST /api/approval-tasks`
- `PATCH /api/approval-tasks/:approvalTaskId/status`
- `POST /api/scheduled-posts`
- `POST /api/jobs`

## Auth modes

- Supabase bearer token when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured
- development identity headers when `ALLOW_DEV_AUTH=true`
  - `x-brilhio-dev-user-id`
  - `x-brilhio-dev-user-email`

## Provider OAuth

Set `API_PUBLIC_URL` to the externally reachable API origin used in provider
redirect URIs, and `WEB_APP_URL` to the web app origin. Provider credentials are
read from `BRILHIO_<PLATFORM>_OAUTH_CLIENT_ID` and
`BRILHIO_<PLATFORM>_OAUTH_CLIENT_SECRET`, with non-prefixed aliases like
`X_CLIENT_ID` also supported for local development.

For X, configure the developer app callback URL as:

```text
{API_PUBLIC_URL}/api/providers/x/oauth/callback
```

The default X scopes are `tweet.read`, `tweet.write`, `users.read`,
`media.write`, and `offline.access`. `media.write` is required for image upload,
and `offline.access` is required for refresh tokens.
