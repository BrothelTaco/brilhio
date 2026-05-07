-- Auth/payment hardening:
-- - Keep product writes API/service-role owned for subscription enforcement.
-- - Allow browser clients to read their own rows where direct reads are useful.
-- - Keep internal audit/OAuth/webhook tables service-role only.

alter type job_type add value if not exists 'regenerate-brand-brief';

alter table stripe_webhook_events enable row level security;

comment on table stripe_webhook_events is
  'Processed Stripe webhook event ids used to make billing webhook handling idempotent. Service-role only; no client RLS policies.';

drop policy if exists "social_accounts_own" on social_accounts;
drop policy if exists "social_accounts_select_own" on social_accounts;
create policy "social_accounts_select_own"
  on social_accounts for select
  using (auth.uid() = user_id);

drop policy if exists "media_assets_own" on media_assets;
drop policy if exists "media_assets_select_own" on media_assets;
create policy "media_assets_select_own"
  on media_assets for select
  using (auth.uid() = user_id);

drop policy if exists "content_items_own" on content_items;
drop policy if exists "content_items_select_own" on content_items;
create policy "content_items_select_own"
  on content_items for select
  using (auth.uid() = user_id);

drop policy if exists "content_item_media_own" on content_item_media;
drop policy if exists "content_item_media_select_own" on content_item_media;
create policy "content_item_media_select_own"
  on content_item_media for select
  using (
    exists (
      select 1
      from content_items ci
      where ci.id = content_item_media.content_item_id
        and ci.user_id = auth.uid()
    )
  );

drop policy if exists "scheduled_posts_own" on scheduled_posts;
drop policy if exists "scheduled_posts_select_own" on scheduled_posts;
create policy "scheduled_posts_select_own"
  on scheduled_posts for select
  using (auth.uid() = user_id);

drop policy if exists "ai_suggestions_own" on ai_suggestions;
drop policy if exists "ai_suggestions_select_own" on ai_suggestions;
create policy "ai_suggestions_select_own"
  on ai_suggestions for select
  using (auth.uid() = user_id);

drop policy if exists "approval_tasks_own" on approval_tasks;
drop policy if exists "approval_tasks_select_own" on approval_tasks;
create policy "approval_tasks_select_own"
  on approval_tasks for select
  using (auth.uid() = user_id);

drop policy if exists "job_records_own" on job_records;
drop policy if exists "job_records_select_own" on job_records;
create policy "job_records_select_own"
  on job_records for select
  using (auth.uid() = user_id);

drop policy if exists "user_strategy_profiles_own" on user_strategy_profiles;
drop policy if exists "user_strategy_profiles_select_own" on user_strategy_profiles;
create policy "user_strategy_profiles_select_own"
  on user_strategy_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "recommended_slots_own" on recommended_slots;
drop policy if exists "recommended_slots_select_own" on recommended_slots;
create policy "recommended_slots_select_own"
  on recommended_slots for select
  using (auth.uid() = user_id);

drop policy if exists "provider_webhooks_own" on provider_webhooks;
drop policy if exists "provider_oauth_states_own" on provider_oauth_states;

comment on table provider_webhooks is
  'Provider webhook receipts and payloads. Service-role only; product access should go through API routes.';

comment on table provider_oauth_states is
  'Short-lived provider OAuth state/PKCE records. Service-role only; never queried directly by browser clients.';
