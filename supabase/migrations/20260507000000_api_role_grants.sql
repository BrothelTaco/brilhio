-- PostgREST needs both table privileges and RLS policies.
-- RLS decides which rows client roles can see; GRANT decides whether those
-- roles can access the table at all.

grant usage on schema public to anon, authenticated, service_role;

grant usage on type social_platform to authenticated, service_role;
grant usage on type social_account_status to authenticated, service_role;
grant usage on type media_asset_kind to authenticated, service_role;
grant usage on type content_stage to authenticated, service_role;
grant usage on type scheduled_post_status to authenticated, service_role;
grant usage on type approval_task_status to authenticated, service_role;
grant usage on type job_type to authenticated, service_role;
grant usage on type job_status to authenticated, service_role;
grant usage on type recommended_slot_status to authenticated, service_role;

grant select on table profiles to authenticated;
grant select on table social_accounts to authenticated;
grant select on table media_assets to authenticated;
grant select on table content_items to authenticated;
grant select on table content_item_media to authenticated;
grant select on table scheduled_posts to authenticated;
grant select on table ai_suggestions to authenticated;
grant select on table approval_tasks to authenticated;
grant select on table job_records to authenticated;
grant select on table user_strategy_profiles to authenticated;
grant select on table recommended_slots to authenticated;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

alter default privileges in schema public
  grant all privileges on tables to service_role;

alter default privileges in schema public
  grant all privileges on sequences to service_role;
