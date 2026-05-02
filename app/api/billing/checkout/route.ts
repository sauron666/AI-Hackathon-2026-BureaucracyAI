/**
 * POST /api/billing/checkout
 *
 * Body: { plan: "pro" | "business" }
 *
 * Creates a LemonSqueezy hosted checkout session for the chosen plan
 * and returns its URL. The frontend then redirects the user there.
 *
 * Auth required. The user_id is attached as custom data so the webhook
 * handler can find the right account when the subscription is created.
 */

import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/server';
import {
  createCheckoutUrl,
  isLemonSqueezyConfigured,
} from '@/lib/billing/lemonsqueezy';
import { getVariantId, type PlanId } from '@/lib/billing/plans';
import {
  rateLimit,
  rateLimitKey,
  tooManyRequests,
} from '@/lib/security/rate-limit';
import { audit } from '@/lib/security/audit';
import { getRouteLimit } from '@/lib/security/rate-limit-config';

const requestSchema = z.object({
  plan: z.enum(['pro', 'business']),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Auth required' }, { status: 401 });

  const rl = await rateLimit(
    rateLimitKey(req, user.id),
    getRouteLimit('checkout', user.plan),
  );
  if (!rl.ok) return tooManyRequests(rl);

  if (!isLemonSqueezyConfigured()) {
    return Response.json(
      { error: 'Billing not configured. Set LEMONSQUEEZY_API_KEY and LEMONSQUEEZY_STORE_ID.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const variantId = getVariantId(parsed.data.plan as PlanId);
  if (!variantId) {
    return Response.json(
      { error: `Variant id not configured for plan "${parsed.data.plan}"` },
      { status: 500 },
    );
  }

  try {
    const url = await createCheckoutUrl({
      variantId,
      email: user.email,
      userId: user.id,
      successRedirect: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?tab=billing&checkout=success`,
    });

    void audit({
      event: 'billing.checkout_created',
      userId: user.id,
      request: req,
      metadata: { plan: parsed.data.plan, variantId },
    });

    return Response.json({ url });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Checkout failed' },
      { status: 502 },
    );
  }
}
