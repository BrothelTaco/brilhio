-- 7-digit numeric ID generator, collision-safe
create or replace function generate_profile_id()
returns text
language plpgsql
as $$
declare
  new_id    text;
  id_exists boolean;
begin
  loop
    new_id := lpad(floor(random() * 9000000 + 1000000)::text, 7, '0');
    select exists(select 1 from profiles where id = new_id) into id_exists;
    exit when not id_exists;
  end loop;
  return new_id;
end;
$$;

-- One profile per auth user
create table if not exists profiles (
  id                  text        primary key default generate_profile_id(),
  user_id             uuid        not null unique references auth.users(id) on delete cascade,
  email               text        not null,
  stripe_customer_id  text,
  created_at          timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own"
  on profiles for select
  using (auth.uid() = user_id);

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-create profile the moment a user signs up via Supabase Auth
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (user_id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
