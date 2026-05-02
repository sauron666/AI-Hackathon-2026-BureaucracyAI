/**
 * LemonSqueezy REST API helpers — direct fetch, no SDK.
 *
 * Why LemonSqueezy: handles EU VAT collection + remittance automatically.
 * Critical for a Bulgarian/EU SaaS — Stripe makes you handle VAT yourself.
 *
 * What this module does:
 *   - createCheckoutUrl(): generates a hosted checkout link for a plan
 *   - getCustomerPortalUrl(): one-click "manage subscription" link
 *   - verifyWebhookSignature(): HMAC-SHA256 check for webhook authenticity
 */

import { createHmac, timingSafeEqual } from 'crypto';

const API_BASE = 'https://api.lemonsqueezy.com/v1';

export function isLemonSqueezyConfigured(): boolean {
  return Boolean(
    process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID,
  );
}

interface CheckoutOptions {
  variantId: string;
  email: string;
  /** Foreign key we attach so the webhook can find the user. */
  userId: string;
  /** Where to send the user after success. */
  successRedirect?: string;
}

/** Create a hosted checkout session and return its URL. */
export async function createCheckoutUrl(opts: CheckoutOptions): Promise<string> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!apiKey || !storeId) {
    throw new Error('LemonSqueezy not configured');
  }

  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email: opts.email,
          custom: {
            user_id: opts.userId,
          },
        },
        product_options: opts.successRedirect
          ? { redirect_url: opts.successRedirect }
          : undefined,
        checkout_options: { embed: false },
      },
      relationships: {
        store: { data: { type: 'stores', id: storeId } },
        variant: { data: { type: 'variants', id: opts.variantId } },
      },
    },
  };

  const res = await fetch(`${API_BASE}/checkouts`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/vnd.api+json',
      accept: 'application/vnd.api+json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`LemonSqueezy checkout failed: ${res.status} ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    data: { attributes: { url: string } };
  };
  return data.data.attributes.url;
}

/** Fetch a subscription by id (used to refresh state on demand). */
export async function getSubscription(lsSubscriptionId: string): Promise<unknown> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) throw new Error('LemonSqueezy not configured');

  const res = await fetch(`${API_BASE}/subscriptions/${lsSubscriptionId}`, {
    headers: {
      authorization: `Bearer ${apiKey}`,
      accept: 'application/vnd.api+json',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`LemonSqueezy fetch failed: ${res.status} ${text.slice(0, 300)}`);
  }
  return res.json();
}

/**
 * Verify a webhook signature.
 * LemonSqueezy sends HMAC-SHA256 of the raw body, hex-encoded, in the
 * `x-signature` header. Compare in constant time.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
