/**
 * Anthropic Claude provider — direct Messages API via fetch.
 * Avoids dependency on ai-sdk versions that may conflict with the project's `ai` package.
 */

import {
  AIProvider,
  AIProviderError,
  AIProviderHealth,
  AIProviderRequest,
  AIProviderResponse,
  AIProviderUnconfiguredError,
} from './types';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

export const anthropicProvider: AIProvider = {
  id: 'anthropic',
  displayName: 'Anthropic (Claude)',
  defaultModel: 'claude-sonnet-4-5',
  availableModels: [
    { id: 'claude-opus-4-5', label: 'Claude Opus 4.5 (most capable)' },
    { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (balanced, recommended)' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (fastest, cheapest)' },
    {
      id: 'claude-sonnet-4-20250514',
      label: 'Claude Sonnet 4 (legacy)',
      notes: 'Original hackathon model — kept for reproducibility.',
    },
  ],

  isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  },

  async checkHealth(): Promise<AIProviderHealth> {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        status: 'unconfigured',
        configured: false,
        reachable: false,
        reason: 'ANTHROPIC_API_KEY missing',
      };
    }
    return { status: 'ok', configured: true, reachable: true };
  },

  async run(req: AIProviderRequest): Promise<AIProviderResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new AIProviderUnconfiguredError('anthropic', 'ANTHROPIC_API_KEY missing');
    }

    const model = req.model || this.defaultModel;
    const startedAt = Date.now();

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (req.history?.length) {
      messages.push(...req.history);
    }
    messages.push({ role: 'user', content: req.message });

    const body: Record<string, unknown> = {
      model,
      max_tokens: req.maxTokens ?? 4096,
      messages,
    };
    if (req.systemPrompt) body.system = req.systemPrompt;
    if (typeof req.temperature === 'number') body.temperature = req.temperature;

    const controller = new AbortController();
    const timeoutId = req.timeoutMs
      ? setTimeout(() => controller.abort(), req.timeoutMs)
      : null;

    let response: Response;
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': API_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      throw new AIProviderError(
        err instanceof Error ? err.message : 'Network error',
        'anthropic',
        undefined,
        err,
      );
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      throw new AIProviderError(
        `Anthropic API error ${response.status}: ${errText.slice(0, 500)}`,
        'anthropic',
        response.status,
      );
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
      model?: string;
    };

    const text =
      data.content
        ?.filter((block) => block.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text!)
        .join('\n') ?? '';

    return {
      content: text,
      provider: 'anthropic',
      model: data.model || model,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens:
              (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
          }
        : undefined,
      latencyMs: Date.now() - startedAt,
    };
  },
};
