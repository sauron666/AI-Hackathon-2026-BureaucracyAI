/**
 * GET /api/billing/usage
 *
 * Returns the current month's usage + the user's plan + plan limits.
 * Used by the Settings → Billing tab to render the quota bar.
 */

import { getCurrentUser } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getPlan } from '@/lib/billing/plans';

function periodStart(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0]!;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Auth required' }, { status: 401 });

  const supabase = await getServerSupabase();
  const plan = getPlan(user.plan);

  let usage = {
    ask_count: 0,
    analyze_count: 0,
    journey_count: 0,
    compare_count: 0,
    period_start: periodStart(),
  };

  if (supabase) {
    const { data } = await supabase
      .from('usage_quotas')
      .select('ask_count, analyze_count, journey_count, compare_count, period_start')
      .eq('user_id', user.id)
      .eq('period_start', periodStart())
      .maybeSingle();
    if (data) usage = { ...usage, ...data };
  }

  // Look up the active subscription (for portal/manage links)
  let subscription: {
    status: string;
    current_period_end: string | null;
    customer_portal_url: string | null;
  } | null = null;
  if (supabase) {
    const { data } = await supabase
      .from('subscriptions')
      .select('status, current_period_end, customer_portal_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    subscription = data;
  }

  return Response.json({
    plan: plan.id,
    planName: plan.name,
    quota: {
      ask: { used: usage.ask_count, limit: limitValue(plan.quota.askPerMonth) },
      analyze: { used: usage.analyze_count, limit: limitValue(plan.quota.analyzePerMonth) },
      journey: { used: usage.journey_count, limit: limitValue(plan.quota.journeyPerMonth) },
      compare: { used: usage.compare_count, limit: limitValue(plan.quota.comparePerMonth) },
    },
    period: { start: usage.period_start, end: nextMonthFirst() },
    subscription,
  });
}

function limitValue(n: number): number | 'unlimited' {
  return Number.isFinite(n) ? n : 'unlimited';
}

function nextMonthFirst(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0]!;
}
