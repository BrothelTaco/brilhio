-- Add timezone to the profiles table (replaces workspaces.timezone)
alter table profiles add column if not exists timezone text not null default 'UTC';

-- ============================================================
-- 1. Drop old RLS policies (use functions we're about to remove)
-- ============================================================
drop policy if exists "workspaces_select_member"           on workspaces;
drop policy if exists "workspaces_insert_owner"            on workspaces;
drop policy if exists "workspaces_update_owner_or_editor"  on workspaces;
drop policy if exists "workspace_members_select_member"    on workspace_members;
drop policy if exists "workspace_members_insert_owner"     on workspace_members;
drop policy if exists "workspace_members_update_owner"     on workspace_members;
drop policy if exists "workspace_members_delete_owner"     on workspace_members;
drop policy if exists "social_accounts_select_member"      on social_accounts;
drop policy if exists "social_accounts_modify_editor"      on social_accounts;
drop policy if exists "media_assets_select_member"         on media_assets;
drop policy if exists "media_assets_modify_editor"         on media_assets;
drop policy if exists "content_items_select_member"        on content_items;
drop policy if exists "content_items_modify_editor"        on content_items;
drop policy if exists "content_item_media_select_member"   on content_item_media;
drop policy if exists "content_item_media_modify_editor"   on content_item_media;
drop policy if exists "scheduled_posts_select_member"      on scheduled_posts;
drop policy if exists "scheduled_posts_modify_operator"    on scheduled_posts;
drop policy if exists "ai_suggestions_select_member"       on ai_suggestions;
drop policy if exists "ai_suggestions_modify_operator"     on ai_suggestions;
drop policy if exists "approval_tasks_select_member"       on approval_tasks;
drop policy if exists "approval_tasks_modify_operator"     on approval_tasks;
drop policy if exists "job_records_select_member"          on job_records;
drop policy if exists "job_records_modify_operator"        on job_records;
drop policy if exists "provider_webhooks_select_member"    on provider_webhooks;
drop policy if exists "user_profiles_select_own"           on user_profiles;
drop policy if exists "user_profiles_update_own"           on user_profiles;
drop policy if exists "user_profiles_insert_self"          on user_profiles;

-- ============================================================
-- 2. Drop workspace helper functions
-- ============================================================
drop function if exists is_workspace_member(uuid);
drop function if exists has_workspace_role(uuid, text[]);

-- ============================================================
-- 3. Drop old workspace infrastructure tables
--    CASCADE removes FK constraints in child tables that point here
-- ============================================================
drop table if exists user_profiles      cascade;
drop table if exists workspace_members  cascade;
drop table if exists workspaces         cascade;

-- ============================================================
-- 4. Replace workspace_id with user_id on every content table
--    All tables had workspace_id as a FK to workspaces.id (now gone).
--    We add user_id (FK to auth.users), then drop the orphaned column.
-- ============================================================

-- social_accounts
alter table social_accounts
  add column user_id uuid references auth.users(id) on delete cascade;
alter table social_accounts drop column workspace_id cascade;
alter table social_accounts alter column user_id set not null;
alter table social_accounts
  add constraint social_accounts_user_id_platform_key unique (user_id, platform);

-- media_assets
alter table media_assets
  add column user_id uuid references auth.users(id) on delete cascade;
alter table media_assets drop column workspace_id cascade;
alter table media_assets alter column user_id set not null;

-- content_items
alter table content_items
  add column user_id uuid references auth.users(id) on delete cascade;
alter table content_items drop column workspace_id cascade;
alter table content_items alter column user_id set not null;

-- scheduled_posts
alter table scheduled_posts
  add column user_id uuid references auth.users(id) on delete cascade;
alter table scheduled_posts drop column workspace_id cascade;
alter table scheduled_posts alter column user_id set not null;

-- approval_tasks
alter table approval_tasks
  add column user_id uuid references auth.users(id) on delete cascade;
alter table approval_tasks drop column workspace_id cascade;
alter table approval_tasks alter column user_id set not null;

-- job_records
alter table job_records
  add column user_id uuid references auth.users(id) on delete cascade;
alter table job_records drop column workspace_id cascade;
alter table job_records alter column user_id set not null;

-- ai_suggestions
alter table ai_suggestions
  add column user_id uuid references auth.users(id) on delete cascade;
alter table ai_suggestions drop column workspace_id cascade;
alter table ai_suggestions alter column user_id set not null;

-- provider_webhooks (workspace_id was nullable here)
alter table provider_webhooks
  add column user_id uuid references auth.users(id) on delete cascade;
alter table provider_webhooks drop column workspace_id cascade;

-- ============================================================
-- 5. Rebuild indexes
-- ============================================================
drop index if exists workspace_members_user_idx;
drop index if exists social_accounts_workspace_idx;
drop index if exists media_assets_workspace_idx;
drop index if exists content_items_workspace_idx;
drop index if exists scheduled_posts_workspace_idx;
drop index if exists ai_suggestions_workspace_idx;
drop index if exists approval_tasks_workspace_idx;
drop index if exists job_records_workspace_idx;
drop index if exists provider_webhooks_platform_idx;

create index social_accounts_user_idx      on social_accounts      (user_id, platform);
create index media_assets_user_idx         on media_assets         (user_id, created_at desc);
create index content_items_user_idx        on content_items        (user_id, created_at desc);
create index scheduled_posts_user_idx      on scheduled_posts      (user_id, scheduled_for);
create index scheduled_posts_status_idx    on scheduled_posts      (status, scheduled_for);
create index ai_suggestions_user_idx       on ai_suggestions       (user_id, created_at desc);
create index approval_tasks_user_idx       on approval_tasks       (user_id, status, due_at);
create index job_records_user_idx          on job_records          (user_id, status, scheduled_for);
create index provider_webhooks_user_idx    on provider_webhooks    (user_id, platform, received_at desc);

-- ============================================================
-- 6. New simple RLS policies: each user owns their own rows
-- ============================================================
create policy "social_accounts_own"
  on social_accounts for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "media_assets_own"
  on media_assets for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "content_items_own"
  on content_items for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "content_item_media_own"
  on content_item_media for all
  using (
    exists (
      select 1 from content_items ci
      where ci.id = content_item_media.content_item_id
        and ci.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from content_items ci
      where ci.id = content_item_media.content_item_id
        and ci.user_id = auth.uid()
    )
  );

create policy "scheduled_posts_own"
  on scheduled_posts for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "ai_suggestions_own"
  on ai_suggestions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "approval_tasks_own"
  on approval_tasks for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "job_records_own"
  on job_records for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "provider_webhooks_own"
  on provider_webhooks for all
  using  (user_id is not null and auth.uid() = user_id)
  with check (auth.uid() = user_id);
