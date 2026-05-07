# Supabase Schema

The migration set creates the product domain for:

- connected social accounts
- media assets
- content items
- scheduled posts
- AI suggestions
- approval tasks
- background job records
- provider webhooks
- user-owned profiles and strategy profile settings
- Stripe billing state and webhook idempotency
- provider OAuth state records

The current app model is one Supabase Auth user with shared product tables keyed
by `user_id`. The early workspace migration is retained for history, then
`20260428000001_remove_workspaces.sql` converts those tables to direct
user ownership.

RLS is enabled for user-owned rows. Browser/mobile clients may read their own
rows where useful, but meaningful product writes are API/service-role owned so
subscription enforcement cannot be bypassed with the anon key. Auth writes
such as sign-in, sign-up, and password reset still go through Supabase Auth.

Apply every file in `supabase/migrations` to the real Supabase project before
production deployment, in filename order:

1. `20260417000000_initial_social_manager.sql`
2. `20260428000000_profiles.sql`
3. `20260428000001_remove_workspaces.sql`
4. `20260428000002_strategy_and_billing.sql`
5. `20260428000003_stripe_webhook_events.sql`
6. `20260429000000_strategy_industry.sql`
7. `20260429000001_brand_brief.sql`
8. `20260429000002_profiles_api_owned_writes.sql`
9. `20260430000000_recommended_slots.sql`
10. `20260506000000_provider_oauth_states.sql`
11. `20260506000001_auth_payment_hardening.sql`
12. `20260506000002_onboarding_completed.sql`
13. `20260507000000_api_role_grants.sql`

After applying migrations and setting environment variables, check API readiness
at `/health/readiness`. It verifies key config and the tables needed by billing,
profiles, strategy/brand brief, and provider OAuth flows.

