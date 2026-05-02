/**
 * Server-side auth helpers.
 *
 * Use these in API routes / server components to check the current user.
 * Returns null in local-fallback mode (Supabase not configured) — call
 * sites should treat that as "anonymous user".
 */

import { getCurrentSupabaseUser, getServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export interface ServerUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  plan: 'free' | 'pro' | 'business';
}

/**
 * Returns the authenticated user with profile data, or null if anonymous.
 * Throws only on unexpected DB errors.
 */
export async function getCurrentUser(): Promise<ServerUser | null> {
  if (!isSupabaseConfigured()) return null;

  const authUser = await getCurrentSupabaseUser();
  if (!authUser) return null;

  const supabase = await getServerSupabase();
  if (!supabase) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, name, role, plan')
    .eq('id', authUser.id)
    .single();

  if (!profile) {
    // The new-user trigger should have created the row. If not, fall back
    // to auth fields and let the next request retry the trigger.
    return {
      id: authUser.id,
      email: authUser.email ?? '',
      name:
        (authUser.user_metadata?.name as string | undefined) ??
        authUser.email?.split('@')[0] ??
        '',
      role: 'user',
      plan: 'free',
    };
  }

  return profile as ServerUser;
}

export async function requireUser(): Promise<ServerUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthRequiredError();
  }
  return user;
}

export class AuthRequiredError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthRequiredError';
  }
}
