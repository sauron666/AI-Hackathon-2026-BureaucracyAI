/**
 * Quota tracking + paywall enforcement.
 *
 * Server-side checks on every billable AI request.
 *   - checkQuota(user, route): looks at the current month's usage and
 *     returns whether the user can make another request.
 *   - consumeQuota(user, route): increments the counter atomically via
 *     the increment_usage RPC.
 *
 * When Supabase isn't configured, both are no-ops that return ok=true —
 * preserving the unauthenticated demo flow.
 */

import { getAdminSupabase } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getQuota, type PlanId } from './plans';

export type BillableRoute = 'ask' | 'analyze' | 'journey' | 'compare';

const COLUMN_BY_ROUTE: Record<BillableRoute, string> = {
  ask: 'ask_count',
  analyze: 'analyze_count',
  journey: 'journey_count',
  compare: 'compare_count',
};

export interface QuotaState {
  ok: boolean;
  used: number;
  limit: number;
  remaining: number;
  plan: PlanId;
  /** When true, request can proceed even though limit is reached
   *  (e.g. unlimited plan or user has spare one-time credits). */
  unlimited: boolean;
}

function periodStart(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0]!;
}

/** Return current usage state for the user + route. Read-only. */
export async function checkQuota(
  user: { id: string; plan?: string | null },
  route: BillableRoute,
): Promise<QuotaState> {
  const plan = (user.plan ?? 'free') as PlanId;
  const quota = getQuota(plan);
  const limitKey =
    route === 'ask' ? 'askPerMonth' :
    route === 'analyze' ? 'analyzePerMonth' :
    route === 'journey' ? 'journeyPerMonth' :
    'comparePerMonth';
  const limit = quota[limitKey];
  const unlimited = !Number.isFinite(limit);

  if (unlimited) {
    return { ok: true, used: 0, limit: Number.POSITIVE_INFINITY, remaining: Number.POSITIVE_INFINITY, plan, unlimited: true };
  }

  if (!isSupabaseConfigured()) {
    // Stateless demo mode — never block.
    return { ok: true, used: 0, limit, remaining: limit, plan, unlimited: false };
  }

  const admin = getAdminSupabase();
  if (!admin) {
    return { ok: true, used: 0, limit, remaining: limit, plan, unlimited: false };
  }

  const { data } = await admin
    .from('usage_quotas')
    .select(COLUMN_BY_ROUTE[route])
    .eq('user_id', user.id)
    .eq('period_start', periodStart())
    .maybeSingle();

  const used = (data?.[COLUMN_BY_ROUTE[route] as keyof typeof data] as number) ?? 0;
  const remaining = Math.max(0, limit - used);

  return {
    ok: used < limit,
    used,
    limit,
    remaining,
    plan,
    unlimited: false,
  };
}

/** Atomically bump the user's usage. Returns the new count. */
export async function consumeQuota(
  user: { id: string; plan?: string | null },
  route: BillableRoute,
): Promise<number> {
  const quota = getQuota(user.plan);
  const limitKey =
    route === 'ask' ? 'askPerMonth' :
    route === 'analyze' ? 'analyzePerMonth' :
    route === 'journey' ? 'journeyPerMonth' :
    'comparePerMonth';
  if (!Number.isFinite(quota[limitKey])) return 0; // unlimited — skip counter

  if (!isSupabaseConfigured()) return 0;
  const admin = getAdminSupabase();
  if (!admin) return 0;

  const { data, error } = await admin.rpc('increment_usage', {
    p_user_id: user.id,
    p_column: COLUMN_BY_ROUTE[route],
    p_amount: 1,
  });

  if (error) {
    console.warn('quota increment failed:', error.message);
    return 0;
  }
  return (data as number | null) ?? 0;
}

/** Try to consume one one-time credit (e.g. for /api/analyze pay-per-doc). */
export async function consumeOneTimeCredit(
  user: { id: string },
  product: 'document_analysis',
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const admin = getAdminSupabase();
  if (!admin) return false;

  const { data, error } = await admin.rpc('consume_purchase_credit', {
    p_user_id: user.id,
    p_product: product,
  });
  if (error) {
    console.warn('credit consume failed:', error.message);
    return false;
  }
  return Boolean(data);
}

/** Build a 402 Payment Required response. */
export function paymentRequired(state: QuotaState, plan: PlanId): Response {
  return Response.json(
    {
      error: 'Quota exceeded',
      details: `You used ${state.used}/${state.limit} ${plan === 'free' ? 'free tier' : plan} requests this month.`,
      plan: state.plan,
      used: state.used,
      limit: state.limit,
      upgradeUrl: '/settings?tab=billing',
    },
    {
      status: 402,
      headers: {
        'X-Quota-Limit': String(state.limit),
        'X-Quota-Remaining': String(state.remaining),
        'X-Quota-Plan': state.plan,
      },
    },
  );
}
