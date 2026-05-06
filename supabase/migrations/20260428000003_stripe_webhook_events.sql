create table if not exists stripe_webhook_events (
  stripe_event_id text primary key,
  event_type      text not null,
  processed_at    timestamptz not null default now()
);

comment on table stripe_webhook_events is 'Processed Stripe webhook event ids used to make billing webhook handling idempotent.';
