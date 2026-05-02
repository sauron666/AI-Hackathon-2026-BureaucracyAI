/**
 * Service-role Supabase client. Bypasses RLS — use ONLY on the server,
 * for admin tasks (writing usage_quotas, audit_log, trial_uses).
 *
 * Never import this from client code. The service role key is one of the
 * most sensitive secrets in the project.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  getSupabaseServiceKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from './config';

let cachedAdmin: SupabaseClient | null = null;

export function getAdminSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  if (cachedAdmin) return cachedAdmin;
  cachedAdmin = createClient(getSupabaseUrl(), getSupabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAdmin;
}
