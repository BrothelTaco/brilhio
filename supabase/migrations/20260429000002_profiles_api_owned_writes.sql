drop policy if exists "profiles_update_own" on profiles;

comment on table profiles is 'User profile and billing state. Browser clients may read their own row; writes are API/service-role owned.';
