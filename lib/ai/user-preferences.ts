/**
 * User AI preferences — provider, model, sampling parameters.
 *
 * Phase 2: DB-backed when the user is signed in (Supabase). Falls back to
 * an HttpOnly cookie when the user is anonymous or Supabase is unconfigured.
 *
 * The shape returned by getUserAIPreferences() is identical in both modes,
 * so the router code does not need to know which backend is in use.
 */

import { cookies } from 'next/headers';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import type { AIProviderId } from './providers/types';

const COOKIE_NAME = 'fw_ai_prefs';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

export const AIPreferencesSchema = z.object({
  provider: z
    .enum(['sirma', 'anthropic', 'openai', 'google', 'cohere', 'ollama'])
    .optional(),
  model: z.string().min(1).max(120).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(32000).optional(),
  systemPromptOverride: z.string().max(8000).optional(),
  fallbackChain: z
    .array(z.enum(['sirma', 'anthropic', 'openai', 'google', 'cohere', 'ollama']))
    .max(6)
    .optional(),
});

export type AIPreferences = z.infer<typeof AIPreferencesSchema>;

/** Read prefs. Tries DB first (logged-in user), falls back to cookie. */
export async function getUserAIPreferences(): Promise<AIPreferences> {
  // 1) Try DB (logged-in user)
  const user = await getCurrentUser();
  if (user) {
    const supabase = await getServerSupabase();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('ai_preferences')
          .select('provider, model, temperature, max_tokens, system_prompt_override, fallback_chain')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          return {
            provider: (data.provider as AIProviderId | null) ?? undefined,
            model: data.model ?? undefined,
            temperature: data.temperature ?? undefined,
            maxTokens: data.max_tokens ?? undefined,
            systemPromptOverride: data.system_prompt_override ?? undefined,
            fallbackChain:
              (data.fallback_chain as AIProviderId[] | null) ?? undefined,
          };
        }
      } catch (err) {
        console.warn('Failed to read ai_preferences from DB; falling back to cookie:', err);
      }
    }
  }

  // 2) Cookie fallback
  try {
    const store = await cookies();
    const raw = store.get(COOKIE_NAME)?.value;
    if (!raw) return {};
    const decoded = JSON.parse(decodeURIComponent(raw));
    const parsed = AIPreferencesSchema.safeParse(decoded);
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

/** Write prefs. DB if logged in, cookie otherwise. */
export async function saveUserAIPreferences(
  prefs: AIPreferences,
): Promise<AIPreferences> {
  const validated = AIPreferencesSchema.parse(prefs);

  const user = await getCurrentUser();
  if (user) {
    const supabase = await getServerSupabase();
    if (supabase) {
      const { error } = await supabase.from('ai_preferences').upsert(
        {
          user_id: user.id,
          provider: validated.provider ?? null,
          model: validated.model ?? null,
          temperature: validated.temperature ?? null,
          max_tokens: validated.maxTokens ?? null,
          system_prompt_override: validated.systemPromptOverride ?? null,
          fallback_chain: validated.fallbackChain ?? [],
        },
        { onConflict: 'user_id' },
      );
      if (error) {
        console.error('Failed to save ai_preferences to DB:', error);
        throw new Error(`Failed to save preferences: ${error.message}`);
      }
      return validated;
    }
  }

  // Cookie fallback
  const store = await cookies();
  store.set(COOKIE_NAME, encodeURIComponent(JSON.stringify(validated)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return validated;
}

export async function clearUserAIPreferences(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    const supabase = await getServerSupabase();
    if (supabase) {
      await supabase.from('ai_preferences').delete().eq('user_id', user.id);
      return;
    }
  }
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Resolve the env-default provider. Used when the user has no preference. */
export function getEnvDefaultProvider(): AIProviderId {
  const envValue = (process.env.AI_PROVIDER || '').toLowerCase().trim();
  switch (envValue) {
    case 'anthropic':
    case 'openai':
    case 'google':
    case 'cohere':
    case 'sirma':
    case 'ollama':
      return envValue;
    default:
      return 'sirma';
  }
}
