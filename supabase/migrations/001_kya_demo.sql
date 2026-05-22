-- Run in Supabase SQL editor if not using `npx prisma db push`

create table if not exists kya_entities (
  id text not null,
  collection text not null,
  data jsonb not null,
  mode text not null default 'demo',
  "updatedAt" timestamptz not null default now(),
  primary key (id),
  unique (collection, id)
);

create index if not exists kya_entities_collection_idx on kya_entities (collection);

create table if not exists kya_kv (
  namespace text not null,
  key text not null,
  value jsonb not null,
  mode text not null default 'demo',
  "updatedAt" timestamptz not null default now(),
  primary key (namespace, key)
);

create table if not exists kya_counters (
  prefix text primary key,
  value integer not null default 0,
  mode text not null default 'demo'
);

create table if not exists kya_audit_events (
  id text primary key,
  type text not null,
  actor text not null,
  subject_id text not null,
  case_id text,
  input_hash text not null,
  output_hash text not null,
  policy_version text,
  previous_event_hash text,
  created_at timestamptz not null,
  event_hash text not null,
  payload jsonb,
  mode text not null default 'demo'
);

create index if not exists kya_audit_events_subject_id_idx on kya_audit_events (subject_id);
create index if not exists kya_audit_events_created_at_idx on kya_audit_events (created_at);

create table if not exists kya_live_feed_events (
  id text primary key default gen_random_uuid()::text,
  at timestamptz not null default now(),
  agent_slug text not null,
  agent_name text not null,
  phase text not null,
  message text,
  llm jsonb,
  payment jsonb,
  decision jsonb,
  receipt jsonb,
  "case" jsonb,
  obeyed boolean,
  mode text not null default 'demo'
);

create index if not exists kya_live_feed_events_at_idx on kya_live_feed_events (at desc);

create table if not exists kya_api_keys (
  id text primary key default gen_random_uuid()::text,
  label text not null,
  key_prefix text not null,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz,
  mode text not null default 'demo'
);

create table if not exists kya_status_snapshot (
  id text primary key default 'global',
  audit_chain_valid boolean not null default true,
  total_audit_events integer not null default 0,
  total_decisions integer not null default 0,
  last_cron_at timestamptz,
  last_cron_agent text,
  "updatedAt" timestamptz not null default now()
);
