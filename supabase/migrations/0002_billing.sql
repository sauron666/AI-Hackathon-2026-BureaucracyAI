-- ============================================================
-- FormWise / BureaucracyAI — Billing Schema (Phase 4)
-- ============================================================
--
-- Adds:
--   - subscriptions: one row per active LemonSqueezy subscription
--   - billing_events: append-only log of webhook payloads
--   - one_time_purchases: pay-per-document analyses
--
-- Apply via Supabase SQL Editor or `supabase db push`.

create extension if not exists "pgcrypto";

-- ============================================================
-- subscriptions
-- ============================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- LemonSqueezy identifiers (the source of truth)
  ls_subscription_id text not null,
  ls_customer_id text,
  ls_order_id text,
  ls_variant_id text,
  ls_product_id text,
  -- Plan + lifecycle
  plan text not null check (plan in ('pro', 'business')),
  status text not null check (status in (
    'on_trial','active','past_due','paused','unpaid','cancelled','expired'
  )),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  cancelled_at timestamptz,
  -- Pricing snapshot (for receipts + audit)
  price_cents int,
  currency text default 'EUR',
  interval text check (interval in ('month','year')),
  -- Customer-portal links (returned by LS, cached for UI)
  customer_portal_url text,
  update_payment_method_url text,
  -- Bookkeeping
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ls_subscription_id)
);

create index if not exists subscriptions_user_idx
  on public.subscriptions(user_id, status);

-- ============================================================
-- billing_events
-- Every webhook hit gets appended here. We never UPDATE — only INSERT.
-- This gives us a forensic trail for refund disputes.
-- ============================================================
create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  ls_subscription_id text,
  ls_order_id text,
  event_name text not null,           -- e.g. "subscription_created"
  raw_payload jsonb not null,         -- the full body LS sent us
  signature_valid boolean not null default true,
  received_at timestamptz not null default now()
);

create index if not exists billing_events_user_idx
  on public.billing_events(user_id, received_at desc);
create index if not exists billing_events_event_idx
  on public.billing_events(event_name, received_at desc);

-- ============================================================
-- one_time_purchases
-- Used for pay-per-document analysis (no subscription needed).
-- ============================================================
create table if not exists public.one_time_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  -- Anonymous fallback: tie to email if user not signed in at purchase
  email text,
  ls_order_id text not null,
  product text not null,              -- e.g. "document_analysis"
  amount_cents int not null,
  currency text default 'EUR',
  /** Number of credits granted by this purchase (e.g. 1 doc analysis). */
  credits int not null default 1,
  /** Decremented as the user consumes credits. */
  credits_remaining int not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (ls_order_id)
);

create index if not exists one_time_purchases_user_idx
  on public.one_time_purchases(user_id, credits_remaining);

-- ============================================================
-- Triggers
-- ============================================================
drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.one_time_purchases enable row level security;

-- subscriptions: read-own. Writes via service role only.
drop policy if exists "subscriptions_self_read" on public.subscriptions;
create policy "subscriptions_self_read" on public.subscriptions
  for select using (auth.uid() = user_id);

-- billing_events: read-own. Writes via service role only.
drop policy if exists "billing_events_self_read" on public.billing_events;
create policy "billing_events_self_read" on public.billing_events
  for select using (auth.uid() = user_id);

-- one_time_purchases: read-own.
drop policy if exists "one_time_purchases_self_read" on public.one_time_purchases;
create policy "one_time_purchases_self_read" on public.one_time_purchases
  for select using (auth.uid() = user_id);

-- ============================================================
-- RPC: atomic quota increment.
-- Bumps usage_quotas for the current month, creating the row if absent.
-- Returns the post-increment count for the requested column.
-- ============================================================
create or replace function public.increment_usage(
  p_user_id uuid,
  p_column text,
  p_amount int default 1
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_period_start date := date_trunc('month', now())::date;
  v_period_end date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
  v_result int;
begin
  if p_column not in ('ask_count','analyze_count','journey_count','compare_count') then
    raise exception 'invalid column: %', p_column;
  end if;

  insert into public.usage_quotas (user_id, period_start, period_end)
  values (p_user_id, v_period_start, v_period_end)
  on conflict (user_id, period_start) do nothing;

  execute format(
    'update public.usage_quotas
       set %1$I = %1$I + $1
     where user_id = $2 and period_start = $3
     returning %1$I',
    p_column
  ) into v_result using p_amount, p_user_id, v_period_start;

  return v_result;
end;
$$;

-- ============================================================
-- RPC: atomic credit decrement for one_time_purchases.
-- ============================================================
create or replace function public.consume_purchase_credit(
  p_user_id uuid,
  p_product text
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_purchase_id uuid;
begin
  -- Find oldest purchase with credits remaining
  select id into v_purchase_id
  from public.one_time_purchases
  where user_id = p_user_id
    and product = p_product
    and credits_remaining > 0
    and (expires_at is null or expires_at > now())
  order by created_at asc
  limit 1
  for update skip locked;

  if v_purchase_id is null then
    return false;
  end if;

  update public.one_time_purchases
     set credits_remaining = credits_remaining - 1
   where id = v_purchase_id;

  return true;
end;
$$;
