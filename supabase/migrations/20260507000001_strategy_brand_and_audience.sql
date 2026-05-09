alter table user_strategy_profiles
  add column if not exists brand_description text,
  add column if not exists audience_description text;
