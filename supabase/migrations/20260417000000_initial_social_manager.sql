create extension if not exists pgcrypto;

create type social_platform as enum (
  'instagram',
  'tiktok',
  'facebook',
  'x'
);

create type social_account_status as enum (
  'connected',
  'attention_required',
  'disconnected'
);

create type media_asset_kind as enum (
  'image',
  'video',
  'carousel',
  'document'
);

create type content_stage as enum (
  'draft',
  'ready_for_review',
  'approved',
  'scheduled',
  'published',
  'failed'
);

create type scheduled_post_status as enum (
  'draft',
  'queued',
  'scheduled',
  'publishing',
  'published',
  'failed',
  'paused'
);

create type approval_task_status as enum (
  'pending',
  'approved',
  'changes_requested',
  'rejected'
);

create type job_type as enum (
  'build-calendar',
  'generate-caption',
  'generate-platform-variants',
  'publish-scheduled-post',
  'refresh-social-token',
  'ingest-provider-webhook'
);

create type job_status as enum (
  'queued',
  'running',
  'completed',
  'retrying',
  'failed'
);

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  slug text not null unique,
  timezone text not null,
  owner_user_id uuid references auth.users(id) on delete set null
);

create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  display_name text not null,
  email text,
  current_workspace_id uuid references workspaces(id) on delete set null
);

create table workspace_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'approver', 'viewer')),
  unique (workspace_id, user_id)
);

create table social_accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  platform social_platform not null,
  handle text not null,
  status social_account_status not null default 'connected',
  audience_label text not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  provider_metadata jsonb not null default '{}'::jsonb,
  unique (workspace_id, platform, handle)
);

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind media_asset_kind not null,
  title text not null,
  storage_path text not null,
  alt_text text,
  duration_seconds integer,
  metadata jsonb not null default '{}'::jsonb
);

create table content_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  brief text not null,
  campaign text not null,
  stage content_stage not null default 'draft',
  primary_caption text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table content_item_media (
  content_item_id uuid not null references content_items(id) on delete cascade,
  media_asset_id uuid not null references media_assets(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (content_item_id, media_asset_id)
);

create table scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  content_item_id uuid not null references content_items(id) on delete cascade,
  platform social_platform not null,
  scheduled_for timestamptz not null,
  publish_window_label text not null,
  status scheduled_post_status not null default 'draft',
  platform_caption text not null,
  provider_post_id text,
  error_message text
);

create table approval_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  content_item_id uuid not null references content_items(id) on delete cascade,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  reviewer_name text not null,
  due_at timestamptz not null,
  status approval_task_status not null default 'pending',
  note text not null
);

create table job_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  type job_type not null,
  status job_status not null default 'queued',
  target_table text not null,
  target_id uuid not null,
  attempt_count integer not null default 0,
  scheduled_for timestamptz not null,
  bullmq_job_id text,
  payload jsonb not null default '{}'::jsonb,
  last_error text
);

create table ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  content_item_id uuid references content_items(id) on delete cascade,
  suggestion_type text not null check (
    suggestion_type in ('caption', 'hashtag_set', 'publish_window', 'content_idea')
  ),
  title text not null,
  body text not null,
  model_name text,
  source_job_id uuid
);

create table provider_webhooks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  workspace_id uuid references workspaces(id) on delete cascade,
  platform social_platform not null,
  event_type text not null,
  delivery_id text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('media-assets', 'media-assets', false)
on conflict (id) do nothing;

create index workspace_members_user_idx on workspace_members (user_id, workspace_id);
create index social_accounts_workspace_idx on social_accounts (workspace_id, platform);
create index media_assets_workspace_idx on media_assets (workspace_id, created_at desc);
create index content_items_workspace_idx on content_items (workspace_id, created_at desc);
create index scheduled_posts_workspace_idx on scheduled_posts (workspace_id, scheduled_for);
create index scheduled_posts_status_idx on scheduled_posts (status, scheduled_for);
create index ai_suggestions_workspace_idx on ai_suggestions (workspace_id, created_at desc);
create index approval_tasks_workspace_idx on approval_tasks (workspace_id, status, due_at);
create index job_records_workspace_idx on job_records (workspace_id, status, scheduled_for);
create index provider_webhooks_platform_idx on provider_webhooks (platform, received_at desc);

alter table workspaces enable row level security;
alter table user_profiles enable row level security;
alter table workspace_members enable row level security;
alter table social_accounts enable row level security;
alter table media_assets enable row level security;
alter table content_items enable row level security;
alter table content_item_media enable row level security;
alter table scheduled_posts enable row level security;
alter table ai_suggestions enable row level security;
alter table approval_tasks enable row level security;
alter table job_records enable row level security;
alter table provider_webhooks enable row level security;

create or replace function is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function has_workspace_role(target_workspace_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.role = any(allowed_roles)
  );
$$;

create policy "user_profiles_select_own"
  on user_profiles
  for select
  using (auth.uid() = id);

create policy "user_profiles_update_own"
  on user_profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "user_profiles_insert_self"
  on user_profiles
  for insert
  with check (auth.uid() = id);

create policy "workspaces_select_member"
  on workspaces
  for select
  using (is_workspace_member(id));

create policy "workspaces_insert_owner"
  on workspaces
  for insert
  with check (auth.uid() = owner_user_id);

create policy "workspaces_update_owner_or_editor"
  on workspaces
  for update
  using (has_workspace_role(id, array['owner', 'editor']))
  with check (has_workspace_role(id, array['owner', 'editor']));

create policy "workspace_members_select_member"
  on workspace_members
  for select
  using (is_workspace_member(workspace_id));

create policy "workspace_members_insert_owner"
  on workspace_members
  for insert
  with check (has_workspace_role(workspace_id, array['owner']));

create policy "workspace_members_update_owner"
  on workspace_members
  for update
  using (has_workspace_role(workspace_id, array['owner']))
  with check (has_workspace_role(workspace_id, array['owner']));

create policy "workspace_members_delete_owner"
  on workspace_members
  for delete
  using (has_workspace_role(workspace_id, array['owner']));

create policy "social_accounts_select_member"
  on social_accounts
  for select
  using (is_workspace_member(workspace_id));

create policy "social_accounts_modify_editor"
  on social_accounts
  for all
  using (has_workspace_role(workspace_id, array['owner', 'editor']))
  with check (has_workspace_role(workspace_id, array['owner', 'editor']));

create policy "media_assets_select_member"
  on media_assets
  for select
  using (is_workspace_member(workspace_id));

create policy "media_assets_modify_editor"
  on media_assets
  for all
  using (has_workspace_role(workspace_id, array['owner', 'editor']))
  with check (has_workspace_role(workspace_id, array['owner', 'editor']));

create policy "content_items_select_member"
  on content_items
  for select
  using (is_workspace_member(workspace_id));

create policy "content_items_modify_editor"
  on content_items
  for all
  using (has_workspace_role(workspace_id, array['owner', 'editor']))
  with check (has_workspace_role(workspace_id, array['owner', 'editor']));

create policy "content_item_media_select_member"
  on content_item_media
  for select
  using (
    exists (
      select 1
      from content_items ci
      where ci.id = content_item_media.content_item_id
        and is_workspace_member(ci.workspace_id)
    )
  );

create policy "content_item_media_modify_editor"
  on content_item_media
  for all
  using (
    exists (
      select 1
      from content_items ci
      where ci.id = content_item_media.content_item_id
        and has_workspace_role(ci.workspace_id, array['owner', 'editor'])
    )
  )
  with check (
    exists (
      select 1
      from content_items ci
      where ci.id = content_item_media.content_item_id
        and has_workspace_role(ci.workspace_id, array['owner', 'editor'])
    )
  );

create policy "scheduled_posts_select_member"
  on scheduled_posts
  for select
  using (is_workspace_member(workspace_id));

create policy "scheduled_posts_modify_operator"
  on scheduled_posts
  for all
  using (has_workspace_role(workspace_id, array['owner', 'editor', 'approver']))
  with check (has_workspace_role(workspace_id, array['owner', 'editor', 'approver']));

create policy "ai_suggestions_select_member"
  on ai_suggestions
  for select
  using (is_workspace_member(workspace_id));

create policy "ai_suggestions_modify_operator"
  on ai_suggestions
  for all
  using (has_workspace_role(workspace_id, array['owner', 'editor', 'approver']))
  with check (has_workspace_role(workspace_id, array['owner', 'editor', 'approver']));

create policy "approval_tasks_select_member"
  on approval_tasks
  for select
  using (is_workspace_member(workspace_id));

create policy "approval_tasks_modify_operator"
  on approval_tasks
  for all
  using (has_workspace_role(workspace_id, array['owner', 'editor', 'approver']))
  with check (has_workspace_role(workspace_id, array['owner', 'editor', 'approver']));

create policy "job_records_select_member"
  on job_records
  for select
  using (is_workspace_member(workspace_id));

create policy "job_records_modify_operator"
  on job_records
  for all
  using (has_workspace_role(workspace_id, array['owner', 'editor', 'approver']))
  with check (has_workspace_role(workspace_id, array['owner', 'editor', 'approver']));

create policy "provider_webhooks_select_member"
  on provider_webhooks
  for select
  using (
    workspace_id is not null
    and is_workspace_member(workspace_id)
  );

comment on table workspaces is 'Top-level workspace boundary for a brand or operating team.';
comment on table user_profiles is 'User-level profile and current workspace preference.';
comment on table social_accounts is 'Connected provider accounts with token lifecycle state.';
comment on table scheduled_posts is 'Platform-specific publishing units generated from a content item.';
comment on table job_records is 'Queue-visible background jobs for publishing, AI, retries, and webhook follow-up.';
