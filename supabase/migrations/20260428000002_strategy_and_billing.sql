alter table profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists subscription_cancel_at_period_end boolean not null default false;

create index if not exists profiles_stripe_customer_id_idx
  on profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists profiles_stripe_subscription_id_idx
  on profiles (stripe_subscription_id)
  where stripe_subscription_id is not null;

create table if not exists user_strategy_profiles (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  identity_type       text,
  goals               text[] not null default '{}',
  voice_attributes    text[] not null default '{}',
  platform_priorities jsonb not null default '{}'::jsonb,
  content_pillars     text[] not null default '{}',
  audience_notes      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table user_strategy_profiles enable row level security;

create policy "user_strategy_profiles_own"
  on user_strategy_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
