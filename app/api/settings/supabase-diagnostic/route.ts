/**
 * GET /api/settings/supabase-diagnostic
 *
 * Verifies the entire Supabase setup end-to-end:
 *   - env vars present
 *   - anon key can reach Supabase (auth health)
 *   - service role key can read system schemas
 *   - migration tables exist
 *   - handle_new_user trigger exists
 *   - increment_trial_use RPC exists
 *   - current session (if any)
 *
 * Developer-only: gated by the same flag as /api/settings/env.
 * Returns a structured report so the Developer tab can render checks/x's.
 */

import { getAdminSupabase } from '@/lib/supabase/admin';
import { getServerSupabase, getCurrentSupabaseUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

interface Check {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
}

function isDevAccessAllowed(): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  if (process.env.NEXT_PUBLIC_DEV_SETTINGS === 'true') return true;
  return false;
}

export async function GET() {
  if (!isDevAccessAllowed()) {
    return Response.json({ error: 'Developer settings disabled' }, { status: 403 });
  }

  const checks: Check[] = [];

  // 1) env vars
  checks.push({
    id: 'env_url',
    label: 'NEXT_PUBLIC_SUPABASE_URL set',
    ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    detail: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
  checks.push({
    id: 'env_anon',
    label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY set',
    ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    detail: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 16) + '...',
  });
  checks.push({
    id: 'env_service',
    label: 'SUPABASE_SERVICE_ROLE_KEY set',
    ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    detail: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 16) + '...'
      : 'missing',
  });
  checks.push({
    id: 'env_salt',
    label: 'TRIAL_HASH_SALT looks set',
    ok:
      Boolean(process.env.TRIAL_HASH_SALT) &&
      process.env.TRIAL_HASH_SALT !== '<long-random-string-of-your-choosing>',
    detail:
      process.env.TRIAL_HASH_SALT === '<long-random-string-of-your-choosing>'
        ? 'still using placeholder value'
        : (process.env.TRIAL_HASH_SALT?.length ?? 0) + ' chars',
  });

  if (!isSupabaseConfigured()) {
    return Response.json({
      ok: false,
      configured: false,
      checks,
      hint: 'Fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local',
    });
  }

  // 2) anon connectivity
  try {
    const supabase = await getServerSupabase();
    if (!supabase) throw new Error('getServerSupabase returned null');
    const { error } = await supabase.auth.getUser();
    checks.push({
      id: 'anon_connect',
      label: 'Anon key reaches Supabase auth',
      ok: !error,
      detail: error?.message,
    });
  } catch (e) {
    checks.push({
      id: 'anon_connect',
      label: 'Anon key reaches Supabase auth',
      ok: false,
      detail: e instanceof Error ? e.message : 'unknown error',
    });
  }

  // 3) admin connectivity + schema checks (require service role)
  const admin = getAdminSupabase();
  if (!admin) {
    checks.push({
      id: 'admin_connect',
      label: 'Service role client',
      ok: false,
      detail: 'service role key missing — schema checks skipped',
    });
  } else {
    // Probe profiles table
    try {
      const { error } = await admin.from('profiles').select('id').limit(1);
      checks.push({
        id: 'table_profiles',
        label: 'profiles table exists',
        ok: !error,
        detail: error?.message,
      });
    } catch (e) {
      checks.push({
        id: 'table_profiles',
        label: 'profiles table exists',
        ok: false,
        detail: e instanceof Error ? e.message : 'unknown',
      });
    }

    // Probe ai_preferences
    try {
      const { error } = await admin.from('ai_preferences').select('user_id').limit(1);
      checks.push({
        id: 'table_ai_preferences',
        label: 'ai_preferences table exists',
        ok: !error,
        detail: error?.message,
      });
    } catch (e) {
      checks.push({
        id: 'table_ai_preferences',
        label: 'ai_preferences table exists',
        ok: false,
        detail: e instanceof Error ? e.message : 'unknown',
      });
    }

    // Probe trial_uses
    try {
      const { error } = await admin.from('trial_uses').select('ip_hash').limit(1);
      checks.push({
        id: 'table_trial_uses',
        label: 'trial_uses table exists',
        ok: !error,
        detail: error?.message,
      });
    } catch (e) {
      checks.push({
        id: 'table_trial_uses',
        label: 'trial_uses table exists',
        ok: false,
        detail: e instanceof Error ? e.message : 'unknown',
      });
    }

    // Probe RPC (calling with bogus arg — we expect either success or a "function exists but argument" error,
    // but we just want to know whether the function is registered)
    try {
      const { error } = await admin.rpc('increment_trial_use', {
        p_ip_hash: 'diag-' + Math.random().toString(36).slice(2),
        p_now: new Date().toISOString(),
      });
      // If success, undo by resetting that fake row
      if (!error) {
        await admin.from('trial_uses').delete().like('ip_hash', 'diag-%');
      }
      checks.push({
        id: 'rpc_increment_trial_use',
        label: 'increment_trial_use RPC registered',
        ok: !error,
        detail: error?.message,
      });
    } catch (e) {
      checks.push({
        id: 'rpc_increment_trial_use',
        label: 'increment_trial_use RPC registered',
        ok: false,
        detail: e instanceof Error ? e.message : 'unknown',
      });
    }

    // Trigger existence check
    try {
      const { data, error } = await admin
        .from('pg_trigger' as never)
        .select('tgname')
        .eq('tgname', 'on_auth_user_created');
      // The above is unlikely to work via PostgREST; we use raw RPC instead
      // by selecting from information_schema via a plain query. Skip if it errors.
      const found = Array.isArray(data) && data.length > 0;
      checks.push({
        id: 'trigger_signup',
        label: 'on_auth_user_created trigger exists',
        ok: found,
        detail: error
          ? 'cannot probe via PostgREST; verify manually in SQL Editor: SELECT tgname FROM pg_trigger WHERE tgname = \'on_auth_user_created\';'
          : found
            ? 'present'
            : 'not found — re-run migration',
      });
    } catch {
      checks.push({
        id: 'trigger_signup',
        label: 'on_auth_user_created trigger exists',
        ok: false,
        detail: 'probe failed; verify in SQL Editor',
      });
    }

    // Count auth users
    try {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      checks.push({
        id: 'auth_users',
        label: 'auth.users readable via admin',
        ok: !error,
        detail: error
          ? error.message
          : `total existing users in this project: ${data?.users.length ?? 0}+`,
      });
    } catch (e) {
      checks.push({
        id: 'auth_users',
        label: 'auth.users readable via admin',
        ok: false,
        detail: e instanceof Error ? e.message : 'unknown',
      });
    }
  }

  // 4) current session (mostly informational)
  const me = await getCurrentSupabaseUser();
  checks.push({
    id: 'current_session',
    label: 'Server sees current session',
    ok: Boolean(me),
    detail: me ? `signed in as ${me.email}` : 'no session (anonymous)',
  });

  const allOk = checks.every((c) => c.ok);
  return Response.json({
    ok: allOk,
    configured: true,
    checks,
    hint: allOk
      ? 'Setup looks good. If signups still fail, check the Supabase dashboard → Authentication → Settings.'
      : 'See SUPABASE-SETUP.md for fixes.',
  });
}
