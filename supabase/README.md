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
to the real Supabase project before production deployment.

