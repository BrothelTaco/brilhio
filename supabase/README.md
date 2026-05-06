# Supabase Schema

The initial migration sets up the product domain for:

- workspaces and membership
- connected social accounts
- media assets
- content items
- scheduled posts
- AI suggestions
- approval tasks
- background job records
- provider webhooks
- user-owned profiles and strategy profile settings

RLS is enabled for user-owned rows. Apply every file in `supabase/migrations`
to the real Supabase project before production deployment, in filename order:

1. `20260417000000_initial_social_manager.sql`
2. `20260428000000_profiles.sql`
3. `20260428000001_remove_workspaces.sql`
4. `20260428000002_strategy_and_billing.sql`
5. `20260428000003_stripe_webhook_events.sql`
6. `20260429000000_strategy_industry.sql`
7. `20260429000001_brand_brief.sql`
8. `20260429000002_profiles_api_owned_writes.sql`
9. `20260430000000_recommended_slots.sql`

After applying migrations and setting environment variables, check API readiness
at `/health/readiness`. It verifies key config and the tables needed by billing,
profiles, and strategy/brand brief flows.

