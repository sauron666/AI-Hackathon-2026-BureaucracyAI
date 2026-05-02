/**
 * Server-side trial counter.
 *
 * Anonymous users get N free questions before being asked to sign up.
 * The counter is keyed by sha256(ip + salt) so we never store the raw IP.
 *
 * Logged-in users bypass the trial entirely — they hit usage_quotas instead.
 *
 * Falls back to a stateless "always allow" mode when Supabase is not
 * configured, so the existing localStorage-based trial keeps working in
 * the browser without breaking the server.
 */

import { createHash } from 'crypto';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const MAX_FREE_TRIAL_USES = Number(process.env.TRIAL_MAX_USES ?? 1);

/** Hash an IP with the project salt. Never log or return the raw IP. */
function hashIP(ip: string): string {
  const salt = process.env.TRIAL_HASH_SALT || 'formwise-default-trial-salt';
  return createHash('sha256').update(`${salt}|${ip}`).digest('hex');
}

/** Best-effort IP from common proxy headers. Falls back to "unknown". */
export function getClientIp(req: Request): string {
  const headers = req.headers;
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return (
    headers.get('x-real-ip') ??
    headers.get('cf-connecting-ip') ??
    headers.get('x-client-ip') ??
    'unknown'
  );
}

export interface TrialCheckResult {
  canUse: boolean;
  usedCount: number;
  remaining: number;
  backend: 'supabase' | 'unconfigured';
}

/**
 * Read-only check: how many free uses has this IP consumed?
 * Returns canUse=true if Supabase is unconfigured (server-side trial off).
 */
export async function checkAnonymousTrial(ip: string): Promise<TrialCheckResult> {
  if (!isSupabaseConfigured()) {
    return {
      canUse: true,
      usedCount: 0,
      remaining: MAX_FREE_TRIAL_USES,
      backend: 'unconfigured',
    };
  }

  const admin = getAdminSupabase();
  if (!admin) {
    return {
      canUse: true,
      usedCount: 0,
      remaining: MAX_FREE_TRIAL_USES,
      backend: 'unconfigured',
    };
  }

  const ip_hash = hashIP(ip);
  const { data } = await admin
    .from('trial_uses')
    .select('count')
    .eq('ip_hash', ip_hash)
    .maybeSingle();

  const usedCount = data?.count ?? 0;
  const remaining = Math.max(0, MAX_FREE_TRIAL_USES - usedCount);
  return {
    canUse: remaining > 0,
    usedCount,
    remaining,
    backend: 'supabase',
  };
}

/**
 * Atomically increment the trial counter for this IP.
 * Returns the post-increment count. If we hit the limit before incrementing,
 * still increments — the gate is enforced separately by the caller.
 */
export async function consumeAnonymousTrial(ip: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const admin = getAdminSupabase();
  if (!admin) return 0;

  const ip_hash = hashIP(ip);
  const now = new Date().toISOString();

  // Upsert + atomic increment via raw SQL to avoid race conditions.
  // (Two concurrent calls would otherwise both read 0 and write 1.)
  const { data, error } = await admin.rpc('increment_trial_use', {
    p_ip_hash: ip_hash,
    p_now: now,
  });

  if (error) {
    // Fall back to non-atomic upsert if RPC missing.
    const { data: row } = await admin
      .from('trial_uses')
      .select('count')
      .eq('ip_hash', ip_hash)
      .maybeSingle();
    const next = (row?.count ?? 0) + 1;
    await admin
      .from('trial_uses')
      .upsert(
        {
          ip_hash,
          count: next,
          first_used_at: row ? undefined : now,
          last_used_at: now,
        },
        { onConflict: 'ip_hash' },
      );
    return next;
  }

  return (data as number | null) ?? 0;
}
