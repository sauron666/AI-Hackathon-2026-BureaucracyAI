/**
 * Per-route, per-plan rate limit configuration.
 *
 * Why per-plan: a Business team might share a single corporate proxy IP.
 * The router uses `user:<id>` keys when authenticated so different users
 * behind the same proxy don't collide — but the *limit* itself should
 * scale with what they paid for. A 30 req/min cap on Business is too
 * aggressive when a single seat may need bursts.
 *
 * The base numbers below are sized for free-tier individuals. Pro doubles
 * them; Business multiplies by 5.
 */

import type { PlanId } from '@/lib/billing/plans';

export type RateLimitedRoute =
  | 'ask'
  | 'analyze'
  | 'chat'
  | 'compare'
  | 'journey'
  | 'trial'
  | 'checkout'
  | 'account-delete';

interface RouteLimit {
  base: number;
  windowSeconds: number;
}

const ROUTE_BASE: Record<RateLimitedRoute, RouteLimit> = {
  ask: { base: 30, windowSeconds: 60 },
  analyze: { base: 10, windowSeconds: 60 },
  chat: { base: 30, windowSeconds: 60 },
  compare: { base: 10, windowSeconds: 60 },
  journey: { base: 8, windowSeconds: 60 },
  trial: { base: 20, windowSeconds: 60 },
  checkout: { base: 10, windowSeconds: 60 },
  'account-delete': { base: 3, windowSeconds: 3600 },
};

const PLAN_MULTIPLIER: Record<PlanId, number> = {
  free: 1,
  pro: 2,
  business: 5,
};

/**
 * Resolve the rate-limit config for a route + plan.
 * For anonymous requests pass plan=undefined → free-tier limits apply.
 */
export function getRouteLimit(
  route: RateLimitedRoute,
  plan: PlanId | string | null | undefined,
): { limit: number; windowSeconds: number; prefix: string } {
  const base = ROUTE_BASE[route];
  const planId = (plan ?? 'free') as PlanId;
  const multiplier = PLAN_MULTIPLIER[planId] ?? 1;
  return {
    limit: Math.ceil(base.base * multiplier),
    windowSeconds: base.windowSeconds,
    prefix: route,
  };
}
