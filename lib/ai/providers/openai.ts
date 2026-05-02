/**
 * OpenAI provider — uses the openai SDK already in dependencies.
 */

import OpenAI from 'openai';
import {
  AIProvider,
  AIProviderError,
  AIProviderHealth,
  AIProviderRequest,
  AIProviderResponse,
  AIProviderUnconfiguredError,
} from './types';

let cachedClient: OpenAI | null = null;
function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL });
  }
  return cachedClient;
}

export const openaiProvider: AIProvider = {
  id: 'openai',
  displayName: 'OpenAI (GPT)',
  defaultModel: 'gpt-4o',
  availableModels: [
    { id: 'gpt-4o', label: 'GPT-4o (recommended)' },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini (fast, cheap)' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { id: 'o1-mini', label: 'o1-mini (reasoning, slower)' },
  ],

  isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  },

  async checkHealth(): Promise<AIProviderHealth> {
    if (!process.env.OPENAI_API_KEY) {
      return {
        status: 'unconfigured',
        configured: false,
        reachable: false,
        reason: 'OPENAI_API_KEY missing',
      };
    }
    return { status: 'ok', configured: true, reachable: true };
  },

  async run(req: AIProviderRequest): Promise<AIProviderResponse> {
    const client = getClient();
    if (!client) {
      throw new AIProviderUnconfiguredError('openai', 'OPENAI_API_KEY missing');
    }

    const model = req.model || this.defaultModel;
    const startedAt = Date.now();

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    if (req.systemPrompt) messages.push({ role: 'system', content: req.systemPrompt });
    if (req.history?.length) messages.push(...req.history);
    messages.push({ role: 'user', content: req.message });

    try {
      const completion = await client.chat.completions.create(
        {
          model,
          messages,
          temperature: req.temperature,
          max_tokens: req.maxTokens,
        },
        req.timeoutMs ? { timeout: req.timeoutMs } : undefined,
      );

      const choice = completion.choices[0];
      const text = choice?.message?.content ?? '';

      return {
        content: text,
        provider: 'openai',
        model: completion.model || model,
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
        latencyMs: Date.now() - startedAt,
      };
    } catch (err: unknown) {
      const status =
        err && typeof err === 'object' && 'status' in err
          ? Number((err as { status: number }).status)
          : undefined;
      throw new AIProviderError(
        err instanceof Error ? err.message : 'OpenAI request failed',
        'openai',
        status,
        err,
      );
    }
  },
};
