create table if not exists provider_oauth_states (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform social_platform not null,
  state_hash text not null unique,
  code_verifier_encrypted text,
  redirect_path text not null default '/accounts',
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index if not exists provider_oauth_states_user_idx
  on provider_oauth_states (user_id, platform, created_at desc);

create index if not exists provider_oauth_states_unconsumed_idx
  on provider_oauth_states (expires_at)
  where consumed_at is null;

alter table provider_oauth_states enable row level security;

drop policy if exists "provider_oauth_states_own" on provider_oauth_states;
create policy "provider_oauth_states_own"
  on provider_oauth_states for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
