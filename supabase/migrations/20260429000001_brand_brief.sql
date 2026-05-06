alter table user_strategy_profiles
  add column if not exists brand_brief text,
  add column if not exists brand_brief_generated_at timestamptz;
