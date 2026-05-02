/**
 * Audit log helper.
 *
 * Append-only record of sensitive events. Writes via the service-role
 * Supabase client so the row exists even when no user is authenticated
 * (e.g. failed login attempts).
 *
 * Common events (use these names for consistency in queries):
 *   - "auth.login_success"
 *   - "auth.login_failure"
 *   - "auth.logout"
 *   - "auth.signup"
 *   - "account.delete"
 *   - "preferences.update"
 *   - "ai.request"          (only metadata: provider, model, usage)
 *   - "trial.consume"
 *   - "rate_limit.exceeded"
 *   - "security.csp_violation"
 *
 * The `metadata` jsonb column is sanitized through PII redaction before
 * insert.
 */

import { createHash } from 'crypto';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getClientIp } from '@/lib/trial/server';
import { redactObject } from './redact';

export interface AuditEntry {
  event: string;
  userId?: string | null;
  request?: Request;
  metadata?: Record<string, unknown>;
}

function hashIP(ip: string): string {
  const salt = process.env.TRIAL_HASH_SALT || 'formwise-default-trial-salt';
  return createHash('sha256').update(`${salt}|${ip}`).digest('hex');
}

/**
 * Write an audit entry. Best-effort: failures are logged but never thrown,
 * because losing an audit row should not break the user's request.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const admin = getAdminSupabase();
  if (!admin) return;

  const ip = entry.request ? getClientIp(entry.request) : null;
  const userAgent = entry.request?.headers.get('user-agent') ?? null;

  const row = {
    user_id: entry.userId ?? null,
    event: entry.event,
    ip_hash: ip ? hashIP(ip) : null,
    user_agent: userAgent ? userAgent.slice(0, 500) : null,
    metadata: entry.metadata ? redactObject(entry.metadata) : {},
  };

  try {
    await admin.from('audit_log').insert(row);
  } catch (err) {
    // Don't escalate — caller should not care if audit write fails.
    console.warn('audit_log insert failed:', err);
  }
}
