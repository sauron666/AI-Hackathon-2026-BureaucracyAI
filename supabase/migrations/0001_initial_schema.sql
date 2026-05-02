-- ============================================================
-- FormWise / BureaucracyAI — Initial Database Schema (Phase 2)
-- ============================================================
--
-- Run this in Supabase SQL Editor or via supabase CLI:
--   supabase db reset
-- or paste into the SQL Editor in your project dashboard.
--
-- This file is idempotent: re-running drops nothing, but uses
-- IF NOT EXISTS / CREATE OR REPLACE wherever possible.

-- Enable required extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ============================================================
-- profiles: extends auth.users with our app-specific fields.
-- The PK matches auth.users.id 1:1, so deletes cascade properly.
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  plan_renews_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles(email);

-- ============================================================
-- ai_preferences: per-user AI router config.
-- One row per user. Mirrors the Phase 1 cookie schema.
-- ============================================================
create table if not exists public.ai_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  provider text check (provider in ('sirma','anthropic','openai','google','cohere','ollama')),
  model text,
  temperature real check (temperature >= 0 and temperature <= 2),
  max_tokens int check (max_tokens > 0 and max_tokens <= 32000),
  system_prompt_override text,
  fallback_chain text[] default '{}'::text[],
  updated_at timestamptz not null default now()
);

-- ============================================================
-- usage_quotas: monthly usage counters per user.
-- One row per (user, period_start). Period rolls monthly.
-- ============================================================
create table if not exists public.usage_quotas (
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  ask_count int not null default 0,
  analyze_count int not null default 0,
  journey_count int not null default 0,
  compare_count int not null default 0,
  total_tokens bigint not null default 0,
  total_cost_cents int not null default 0,
  primary key (user_id, period_start)
);

create index if not exists usage_quotas_user_period_idx
  on public.usage_quotas(user_id, period_start desc);

-- ============================================================
-- trial_uses: anonymous trial tracking, keyed by hashed IP.
-- We never store the raw IP — only sha256 hex.
-- ============================================================
create table if not exists public.trial_uses (
  ip_hash text primary key,
  count int not null default 0,
  first_used_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

-- ============================================================
-- question_history: per-user saved questions and responses.
-- ============================================================
create table if not exists public.question_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  thread_id text,
  context_id text,
  question text not null,
  display_question text,
  response jsonb,
  country text,
  language text,
  is_document_analysis boolean not null default false,
  temporary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists question_history_user_idx
  on public.question_history(user_id, created_at desc);
create index if not exists question_history_thread_idx
  on public.question_history(user_id, thread_id, created_at desc);

-- ============================================================
-- processes: ongoing bureaucratic procedures the user is tracking.
-- ============================================================
create table if not exists public.processes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  status text not null default 'in_progress'
    check (status in ('processing','in_progress','waiting','completed','cancelled')),
  country text,
  source_question_id uuid references public.question_history(id) on delete set null,
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  next_step text,
  notes text,
  origin text default 'manual' check (origin in ('manual','auto')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists processes_user_status_idx
  on public.processes(user_id, status, updated_at desc);

-- ============================================================
-- audit_log: append-only record of sensitive events.
-- Used by Phase 3 security audit + Phase 4 billing reconciliation.
-- ============================================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event text not null,
  ip_hash text,
  user_agent text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_user_idx
  on public.audit_log(user_id, created_at desc);
create index if not exists audit_log_event_idx
  on public.audit_log(event, created_at desc);

-- ============================================================
-- RPC: atomic increment for anonymous trial counter.
-- Used by lib/trial/server.ts to avoid TOCTOU races.
-- ============================================================
create or replace function public.increment_trial_use(
  p_ip_hash text,
  p_now timestamptz
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  insert into public.trial_uses (ip_hash, count, first_used_at, last_used_at)
  values (p_ip_hash, 1, p_now, p_now)
  on conflict (ip_hash) do update
    set count = public.trial_uses.count + 1,
        last_used_at = excluded.last_used_at
  returning count into v_count;
  return v_count;
end;
$$;

-- ============================================================
-- Triggers: keep updated_at fresh.
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists ai_preferences_touch on public.ai_preferences;
create trigger ai_preferences_touch before update on public.ai_preferences
  for each row execute function public.touch_updated_at();

drop trigger if exists processes_touch on public.processes;
create trigger processes_touch before update on public.processes
  for each row execute function public.touch_updated_at();

-- ============================================================
-- Auto-create profile when a new auth.users row appears.
-- Triggered on signup. Service role can override.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Row-Level Security (RLS)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.ai_preferences enable row level security;
alter table public.usage_quotas enable row level security;
alter table public.question_history enable row level security;
alter table public.processes enable row level security;
alter table public.audit_log enable row level security;
-- trial_uses stays without RLS — accessed only via service role.

-- profiles: users can read/update their own, admins can read all.
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_admin_select" on public.profiles;
create policy "profiles_admin_select" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ai_preferences: full ownership.
drop policy if exists "ai_preferences_owner" on public.ai_preferences;
create policy "ai_preferences_owner" on public.ai_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- usage_quotas: read-own, writes via service role only.
drop policy if exists "usage_quotas_self_read" on public.usage_quotas;
create policy "usage_quotas_self_read" on public.usage_quotas
  for select using (auth.uid() = user_id);

-- question_history: full ownership.
drop policy if exists "question_history_owner" on public.question_history;
create policy "question_history_owner" on public.question_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- processes: full ownership.
drop policy if exists "processes_owner" on public.processes;
create policy "processes_owner" on public.processes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- audit_log: read-own only. Inserts via service role.
drop policy if exists "audit_log_self_read" on public.audit_log;
create policy "audit_log_self_read" on public.audit_log
  for select using (auth.uid() = user_id);
