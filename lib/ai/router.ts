/**
 * Server-side AI router.
 *
 * Resolution priority (first wins):
 *   1. Explicit per-request override (`override.provider` / `override.model`)
 *   2. User preferences from cookie/DB
 *   3. Env default (AI_PROVIDER)
 *   4. First configured provider in registry order
 *
 * On provider failure, walks the user's fallbackChain (or env-derived chain)
 * before surfacing the error.
 *
 * IMPORTANT: this module is server-only. Do not import from client code.
 */

import {
  AIProvider,
  AIProviderError,
  AIProviderId,
  AIProviderRequest,
  AIProviderResponse,
  allProviders,
  getProvider,
} from './providers';
import {
  AIPreferences,
  getEnvDefaultProvider,
  getUserAIPreferences,
} from './user-preferences';

export interface RouterOverride {
  provider?: AIProviderId;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface RouterRunResult extends AIProviderResponse {
  /** Diagnostics: each provider attempted, in order. */
  trace: Array<{
    providerId: AIProviderId;
    model: string;
    outcome: 'ok' | 'error';
    error?: string;
    latencyMs?: number;
  }>;
  /** True if a fallback was used. */
  usedFallback: boolean;
}

function resolveProviderChain(
  override: RouterOverride | undefined,
  prefs: AIPreferences,
): AIProviderId[] {
  const chain: AIProviderId[] = [];
  const push = (id: AIProviderId | undefined) => {
    if (!id) return;
    if (chain.includes(id)) return;
    chain.push(id);
  };

  push(override?.provider);
  push(prefs.provider);
  push(getEnvDefaultProvider());
  if (prefs.fallbackChain) {
    for (const id of prefs.fallbackChain) push(id);
  }
  // Tail: every other configured provider, in registry order.
  for (const p of allProviders) {
    if (p.isConfigured()) push(p.id);
  }
  return chain;
}

function resolveModel(
  provider: AIProvider,
  override: RouterOverride | undefined,
  prefs: AIPreferences,
): string {
  if (override?.provider === provider.id && override.model) return override.model;
  if (prefs.provider === provider.id && prefs.model) return prefs.model;
  return provider.defaultModel;
}

/**
 * Run a request through the router. Honors override → prefs → env → fallback.
 * Throws AIProviderError only after every candidate fails.
 */
export async function runAIRouter(
  req: Omit<AIProviderRequest, 'model'> & { model?: string },
  override?: RouterOverride,
): Promise<RouterRunResult> {
  const prefs = await getUserAIPreferences();
  const candidates = resolveProviderChain(override, prefs);

  if (candidates.length === 0) {
    throw new AIProviderError(
      'No AI providers configured. Set at least one provider key in .env.local.',
      'sirma', // arbitrary id for the error wrapper
    );
  }

  const trace: RouterRunResult['trace'] = [];
  let lastError: AIProviderError | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const id = candidates[i];
    const provider = getProvider(id);
    if (!provider) continue;
    if (!provider.isConfigured()) {
      trace.push({
        providerId: id,
        model: provider.defaultModel,
        outcome: 'error',
        error: 'unconfigured',
      });
      continue;
    }

    const model = resolveModel(provider, override, prefs);
    const providerReq: AIProviderRequest = {
      ...req,
      model,
      systemPrompt: override?.systemPrompt ?? req.systemPrompt ?? prefs.systemPromptOverride,
      temperature: override?.temperature ?? req.temperature ?? prefs.temperature,
      maxTokens: override?.maxTokens ?? req.maxTokens ?? prefs.maxTokens,
    };

    try {
      const response = await provider.run(providerReq);
      trace.push({
        providerId: id,
        model,
        outcome: 'ok',
        latencyMs: response.latencyMs,
      });
      return {
        ...response,
        trace,
        usedFallback: i > 0,
      };
    } catch (err) {
      lastError =
        err instanceof AIProviderError
          ? err
          : new AIProviderError(
              err instanceof Error ? err.message : 'Unknown error',
              id,
              undefined,
              err,
            );
      trace.push({
        providerId: id,
        model,
        outcome: 'error',
        error: lastError.message,
      });
      // Continue to next candidate
    }
  }

  // Every candidate failed
  throw new AIProviderError(
    `All AI providers failed. Last error from "${lastError?.providerId}": ${lastError?.message}`,
    lastError?.providerId ?? 'sirma',
    lastError?.statusCode,
    lastError,
  );
}

/**
 * Convenience: run with simple message + system, defaulting to user prefs.
 * Most callers should use this.
 */
export async function runAI(
  message: string,
  options: {
    systemPrompt?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    sessionId?: string;
    userId?: string;
    override?: RouterOverride;
    timeoutMs?: number;
  } = {},
): Promise<RouterRunResult> {
  return runAIRouter(
    {
      message,
      systemPrompt: options.systemPrompt,
      history: options.history,
      sessionId: options.sessionId,
      userId: options.userId,
      timeoutMs: options.timeoutMs,
    },
    options.override,
  );
}
