-- Recommended publishing slots: opaque calendar placeholders proposed by the
-- AI build-calendar job. Each slot has a time + platform + content-type hint
-- but no media yet; once the user attaches media, the slot is promoted into
-- a real scheduled_posts row and marked 'filled'.

create type recommended_slot_status as enum (
  'open',
  'filled',
  'dismissed'
);

create table recommended_slots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  suggested_for timestamptz not null,
  platform social_platform not null,
  content_type_hint text not null,
  rationale text,
  status recommended_slot_status not null default 'open',
  scheduled_post_id uuid references scheduled_posts(id) on delete set null
);

create index recommended_slots_user_idx
  on recommended_slots (user_id, suggested_for);

create index recommended_slots_open_idx
  on recommended_slots (user_id, suggested_for)
  where status = 'open';

alter table recommended_slots enable row level security;

create policy "recommended_slots_own"
  on recommended_slots for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
