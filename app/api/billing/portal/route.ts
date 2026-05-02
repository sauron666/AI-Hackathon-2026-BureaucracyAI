/**
 * GET /api/billing/portal
 *
 * Returns the LemonSqueezy customer portal URL for the current user
 * (cached on the subscriptions row, populated by the webhook handler).
 *
 * The frontend redirects the user to this URL to manage their subscription
 * — change plan, update payment method, cancel.
 */

import { getCurrentUser } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Auth required' }, { status: 401 });

  const supabase = await getServerSupabase();
  if (!supabase) {
    return Response.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('customer_portal_url, update_payment_method_url, status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data?.customer_portal_url) {
    return Response.json(
      { error: 'No active subscription found' },
      { status: 404 },
    );
  }

  return Response.json({
    url: data.customer_portal_url,
    updatePaymentMethodUrl: data.update_payment_method_url,
    status: data.status,
  });
}
