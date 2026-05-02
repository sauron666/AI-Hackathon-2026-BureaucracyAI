/**
 * GET /api/trial — current trial state for the requester.
 * POST /api/trial — consume one trial use.
 *
 * Logged-in users always get { canUse: true, remaining: Infinity }.
 * Anonymous users get rate-limited by hashed IP.
 *
 * Falls back to "always allow" when Supabase is not configured, in which
 * case the localStorage-based client-side trial enforcement remains the
 * only gate.
 */

import { getCurrentUser } from '@/lib/auth/server';
import {
  MAX_FREE_TRIAL_USES,
  checkAnonymousTrial,
  consumeAnonymousTrial,
  getClientIp,
} from '@/lib/trial/server';
import {
  rateLimit,
  rateLimitKey,
  tooManyRequests,
} from '@/lib/security/rate-limit';
import { audit } from '@/lib/security/audit';
import { getRouteLimit } from '@/lib/security/rate-limit-config';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (user) {
    return Response.json({
      canUse: true,
      usedCount: 0,
      remaining: -1, // -1 = unlimited (subject to plan quota in Phase 4)
      backend: 'authenticated',
      authenticated: true,
    });
  }

  const result = await checkAnonymousTrial(getClientIp(req));
  return Response.json({ ...result, authenticated: false, max: MAX_FREE_TRIAL_USES });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();

  // IP-level rate limit on the trial endpoint itself — prevents an attacker
  // from spamming this route to enumerate trial state across IPs.
  const rl = await rateLimit(
    rateLimitKey(req, user?.id),
    getRouteLimit('trial', user?.plan),
  );
  if (!rl.ok) return tooManyRequests(rl);

  if (user) {
    return Response.json({ canUse: true, remaining: -1, authenticated: true });
  }

  const ip = getClientIp(req);
  const before = await checkAnonymousTrial(ip);
  if (!before.canUse) {
    return Response.json(
      {
        canUse: false,
        usedCount: before.usedCount,
        remaining: 0,
        authenticated: false,
        max: MAX_FREE_TRIAL_USES,
      },
      { status: 429 },
    );
  }

  const newCount = await consumeAnonymousTrial(ip);

  void audit({
    event: 'trial.consume',
    userId: null,
    request: req,
    metadata: { count: newCount, max: MAX_FREE_TRIAL_USES },
  });

  return Response.json({
    canUse: newCount < MAX_FREE_TRIAL_USES,
    usedCount: newCount,
    remaining: Math.max(0, MAX_FREE_TRIAL_USES - newCount),
    authenticated: false,
    max: MAX_FREE_TRIAL_USES,
  });
}
