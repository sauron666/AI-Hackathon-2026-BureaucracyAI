"use client"

import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from './config';

let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Browser-side Supabase client. Lazy-initialized once per app load.
 * Returns null when Supabase is not configured — callers should handle
 * the fallback (typically: localStorage auth path).
 */
export function getBrowserSupabase() {
  if (!isSupabaseConfigured()) return null;
  if (cachedClient) return cachedClient;
  cachedClient = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
  return cachedClient;
}
