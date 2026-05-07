alter table user_strategy_profiles
  add column if not exists brand_type text,
  add column if not exists primary_goal text,
  add column if not exists posting_frequency text;
