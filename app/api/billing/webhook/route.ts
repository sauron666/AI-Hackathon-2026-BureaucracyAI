/**
 * POST /api/billing/webhook
 *
 * LemonSqueezy webhook handler.
 *
 * - HMAC-SHA256 signature verification (rejects forged calls).
 * - Idempotent: every event is appended to billing_events; only the
 *   subscriptions row is updated.
 * - Handles: subscription_created, subscription_updated, subscription_cancelled,
 *   subscription_resumed, subscription_expired, order_created, order_refunded.
 *
 * IMPORTANT: this route is exempt from CSRF (it's a server-to-server call).
 * The exemption is in lib/security/csrf.ts → isCsrfExempt list.
 *
 * Configure in LemonSqueezy → Settings → Webhooks:
 *   URL:    https://yourdomain.com/api/billing/webhook
 *   Secret: paste into LEMONSQUEEZY_WEBHOOK_SECRET env var
 *   Events: subscription_*, order_created, order_refunded
 */

import { getAdminSupabase } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { verifyWebhookSignature } from '@/lib/billing/lemonsqueezy';
import { sendEmail } from '@/lib/email/resend';
import { planChangedEmail } from '@/lib/email/templates';

// Disable body parsing — we need the raw bytes for signature verification.
export const dynamic = 'force-dynamic';

interface WebhookMeta {
  event_name: string;
  custom_data?: { user_id?: string };
}

interface SubscriptionAttributes {
  product_id?: number | string;
  variant_id?: number | string;
  customer_id?: number | string;
  order_id?: number | string;
  status: string;
  trial_ends_at?: string | null;
  renews_at?: string | null;
  ends_at?: string | null;
  created_at?: string;
  updated_at?: string;
  user_email?: string;
  urls?: {
    customer_portal?: string;
    update_payment_method?: string;
  };
  first_subscription_item?: {
    price_id?: number;
  };
}

interface OrderAttributes {
  customer_id?: number | string;
  user_email?: string;
  total?: number;
  currency?: string;
  status?: string;
  first_order_item?: {
    variant_id?: number | string;
    product_id?: number | string;
    product_name?: string;
  };
}

function planFromVariantId(variantId: string | number | null | undefined): 'pro' | 'business' | null {
  if (variantId === undefined || variantId === null) return null;
  const idStr = String(variantId);
  if (idStr === process.env.LEMONSQUEEZY_VARIANT_ID_PRO) return 'pro';
  if (idStr === process.env.LEMONSQUEEZY_VARIANT_ID_BUSINESS) return 'business';
  return null;
}

export async function POST(req: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json(
      { error: 'LEMONSQUEEZY_WEBHOOK_SECRET not set' },
      { status: 503 },
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-signature');

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return Response.json(
      { error: 'Supabase not configured' },
      { status: 503 },
    );
  }
  const admin = getAdminSupabase();
  if (!admin) {
    return Response.json({ error: 'Service role missing' }, { status: 503 });
  }

  let payload: {
    meta: WebhookMeta;
    data: { id: string; type: string; attributes: Record<string, unknown> };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventName = payload.meta.event_name;
  const userId = payload.meta.custom_data?.user_id ?? null;
  const lsId = payload.data.id;

  // 1) Append to billing_events (forensic log)
  await admin.from('billing_events').insert({
    user_id: userId,
    ls_subscription_id: payload.data.type === 'subscriptions' ? lsId : null,
    ls_order_id: payload.data.type === 'orders' ? lsId : null,
    event_name: eventName,
    raw_payload: payload,
    signature_valid: true,
  });

  // 2) Process based on event type
  try {
    if (eventName.startsWith('subscription_')) {
      await handleSubscriptionEvent(admin, eventName, lsId, payload.data.attributes as unknown as SubscriptionAttributes, userId);
    } else if (eventName === 'order_created') {
      await handleOrderCreated(admin, lsId, payload.data.attributes as unknown as OrderAttributes, userId);
    } else if (eventName === 'order_refunded') {
      await handleOrderRefunded(admin, lsId);
    } else {
      // Unknown event — already logged in billing_events, ignore.
    }
  } catch (err) {
    console.error(`Webhook handler ${eventName} failed:`, err);
    // Return 200 so LemonSqueezy doesn't retry forever — we have the event
    // in billing_events and can replay manually.
    return Response.json({ ok: false, processed: false });
  }

  return Response.json({ ok: true });
}

async function handleSubscriptionEvent(
  admin: ReturnType<typeof getAdminSupabase> & object,
  eventName: string,
  lsSubscriptionId: string,
  attrs: SubscriptionAttributes,
  userId: string | null,
): Promise<void> {
  const variantId = attrs.variant_id !== undefined ? String(attrs.variant_id) : null;
  const plan = planFromVariantId(variantId);
  const status = attrs.status;
  const cancelled = ['cancelled', 'expired'].includes(status);

  if (!userId) {
    console.warn(`Subscription ${lsSubscriptionId} has no user_id in custom_data — skipping profile update`);
    return;
  }

  // Upsert subscription row
  await admin.from('subscriptions').upsert(
    {
      user_id: userId,
      ls_subscription_id: lsSubscriptionId,
      ls_customer_id: attrs.customer_id ? String(attrs.customer_id) : null,
      ls_order_id: attrs.order_id ? String(attrs.order_id) : null,
      ls_variant_id: variantId,
      plan: plan ?? 'pro',
      status: status as
        | 'on_trial' | 'active' | 'past_due' | 'paused' | 'unpaid' | 'cancelled' | 'expired',
      current_period_end: attrs.renews_at ?? null,
      cancel_at: attrs.ends_at ?? null,
      cancelled_at: cancelled ? new Date().toISOString() : null,
      customer_portal_url: attrs.urls?.customer_portal ?? null,
      update_payment_method_url: attrs.urls?.update_payment_method ?? null,
    },
    { onConflict: 'ls_subscription_id' },
  );

  // Mirror plan onto profiles for fast lookups
  const newProfilePlan =
    cancelled || status === 'expired' ? 'free' : plan ?? 'pro';
  await admin
    .from('profiles')
    .update({ plan: newProfilePlan, plan_renews_at: attrs.renews_at ?? null })
    .eq('id', userId);

  // Notify the user on key transitions
  if (
    eventName === 'subscription_created' ||
    eventName === 'subscription_resumed' ||
    eventName === 'subscription_cancelled'
  ) {
    if (attrs.user_email) {
      void sendEmail({
        to: attrs.user_email,
        ...planChangedEmail(
          { email: attrs.user_email },
          { newPlan: newProfilePlan, renewsAt: attrs.renews_at ?? undefined },
        ),
        tag: 'plan-changed',
        idempotencyKey: `${lsSubscriptionId}-${eventName}`,
      });
    }
  }
}

async function handleOrderCreated(
  admin: ReturnType<typeof getAdminSupabase> & object,
  lsOrderId: string,
  attrs: OrderAttributes,
  userId: string | null,
): Promise<void> {
  // Pay-per-document analysis: check whether this is a one-time SKU.
  const oneTimeVariantId = process.env.LEMONSQUEEZY_VARIANT_ID_DOCUMENT_CREDIT;
  const variantId = attrs.first_order_item?.variant_id !== undefined
    ? String(attrs.first_order_item.variant_id)
    : null;

  if (!oneTimeVariantId || variantId !== oneTimeVariantId) {
    // Subscription order — handled via subscription_created instead.
    return;
  }

  await admin.from('one_time_purchases').upsert(
    {
      user_id: userId,
      email: attrs.user_email ?? null,
      ls_order_id: lsOrderId,
      product: 'document_analysis',
      amount_cents: typeof attrs.total === 'number' ? attrs.total : 0,
      currency: attrs.currency ?? 'EUR',
      credits: 1,
      credits_remaining: 1,
    },
    { onConflict: 'ls_order_id' },
  );
}

async function handleOrderRefunded(
  admin: ReturnType<typeof getAdminSupabase> & object,
  lsOrderId: string,
): Promise<void> {
  // Zero out remaining credits on refund.
  await admin
    .from('one_time_purchases')
    .update({ credits_remaining: 0 })
    .eq('ls_order_id', lsOrderId);
}
