/**
 * Server-side Supabase client. Reads/writes the user session cookie.
 *
 * Use this in API routes, route handlers, server components, and server
 * actions. Returns null when Supabase is not configured.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from './config';

export async function getServerSupabase() {
  if (!isSupabaseConfigured()) return null;

  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll() can throw inside Server Components (read-only context).
          // The middleware handles refresh in that case.
        }
      },
    },
  });
}

/**
 * Returns the authenticated user, or null if no session.
 * Use the helper in `lib/auth/server.ts` for the higher-level abstraction
 * that also reads the localStorage-fallback cookie.
 */
export async function getCurrentSupabaseUser() {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}
