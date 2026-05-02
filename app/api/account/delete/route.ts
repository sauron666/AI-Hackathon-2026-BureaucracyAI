/**
 * DELETE /api/account/delete
 *
 * Deletes the currently authenticated user from Supabase Auth. The schema's
 * `on delete cascade` foreign keys remove the profile row and all owned
 * data (preferences, history, processes, audit log).
 *
 * Returns 204 on success. Returns 503 when running in local-fallback mode
 * (the client then deletes its own localStorage record).
 */

import { getCurrentSupabaseUser } from '@/lib/supabase/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import {
  rateLimit,
  rateLimitKey,
  tooManyRequests,
} from '@/lib/security/rate-limit';
import { audit } from '@/lib/security/audit';
import { getRouteLimit } from '@/lib/security/rate-limit-config';

export async function DELETE(req: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json(
      { error: 'Supabase not configured — fall back to local cleanup' },
      { status: 503 },
    );
  }

  const user = await getCurrentSupabaseUser();
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Tight rate limit — account deletion is a sensitive op. The plan-aware
  // helper still gates this conservatively (3/hour for free, scaling up).
  const rl = await rateLimit(
    rateLimitKey(req, user.id),
    getRouteLimit('account-delete', null),
  );
  if (!rl.ok) return tooManyRequests(rl);

  const admin = getAdminSupabase();
  if (!admin) {
    return Response.json(
      { error: 'Service role key missing — cannot delete users from server' },
      { status: 500 },
    );
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('Account delete error:', error);
    void audit({
      event: 'account.delete_failed',
      userId: user.id,
      request: req,
      metadata: { reason: error.message },
    });
    return Response.json(
      { error: 'Failed to delete account', details: error.message },
      { status: 500 },
    );
  }

  void audit({
    event: 'account.delete',
    userId: user.id,
    request: req,
    metadata: { email: user.email },
  });

  return new Response(null, { status: 204 });
}
