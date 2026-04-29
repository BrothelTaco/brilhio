# UI Test Harness (Marketing + Web)

```bash
# One-time setup from repo root.
corepack pnpm install

# Start the full local stack (web, marketing, api, worker).
# Marketing site: http://localhost:3001
# Product web app: http://localhost:3000
corepack pnpm dev

# Optional: run only the marketing site.
corepack pnpm dev:marketing

# Optional: run only the web app with demo auth flow.
corepack pnpm dev:web
```

## What this test flow covers

- Open the marketing site and click through in-page sections.
- Use "View desktop scaffold", "See the planner", or "Start with web" to move into the web app login page.
- Log in with demo credentials and navigate dashboard/account/account-linking/onboarding.
- Sign out via the sidebar "Sign out" link to reset the session quickly.

## Demo auth behavior

- Login credentials are intentionally hardcoded for UI testing: username `username`, password `12345`.
- Sign up accepts any input and always routes to `/onboarding`.
- Protected routes redirect unauthenticated visitors back to `/` in the web app: `/dashboard`, `/account`, `/accounts`, `/onboarding`.

## Optional environment variable

- Marketing app links to `http://localhost:3000` by default.
- To target a different web URL, set `NEXT_PUBLIC_WEB_APP_URL=<your-web-url>` (for example `https://staging.example.com`).
