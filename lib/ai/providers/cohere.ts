/**
 * Cohere provider — uses the cohere-ai SDK already in dependencies.
 */

import {
  AIProvider,
  AIProviderError,
  AIProviderHealth,
  AIProviderRequest,
  AIProviderResponse,
  AIProviderUnconfiguredError,
} from './types';

const API_URL = 'https://api.cohere.ai/v2/chat';

export const cohereProvider: AIProvider = {
  id: 'cohere',
  displayName: 'Cohere',
  defaultModel: 'command-r-plus-08-2024',
  availableModels: [
    { id: 'command-r-plus-08-2024', label: 'Command R+ 08-2024 (recommended)' },
    { id: 'command-r-08-2024', label: 'Command R 08-2024' },
    { id: 'command-r-plus', label: 'Command R+ (legacy)' },
    { id: 'command-r', label: 'Command R (legacy)' },
  ],

  isConfigured(): boolean {
    return Boolean(process.env.COHERE_API_KEY);
  },

  async checkHealth(): Promise<AIProviderHealth> {
    if (!process.env.COHERE_API_KEY) {
      return {
        status: 'unconfigured',
        configured: false,
        reachable: false,
        reason: 'COHERE_API_KEY missing',
      };
    }
    return { status: 'ok', configured: true, reachable: true };
  },

  async run(req: AIProviderRequest): Promise<AIProviderResponse> {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      throw new AIProviderUnconfiguredError('cohere', 'COHERE_API_KEY missing');
    }

    const model = req.model || this.defaultModel;
    const startedAt = Date.now();

    type CohereMessage = { role: 'system' | 'user' | 'assistant'; content: string };
    const messages: CohereMessage[] = [];
    if (req.systemPrompt) messages.push({ role: 'system', content: req.systemPrompt });
    if (req.history?.length) messages.push(...req.history);
    messages.push({ role: 'user', content: req.message });

    const body: Record<string, unknown> = { model, messages };
    if (typeof req.temperature === 'number') body.temperature = req.temperature;
    if (req.maxTokens) body.max_tokens = req.maxTokens;

    const controller = new AbortController();
    const timeoutId = req.timeoutMs
      ? setTimeout(() => controller.abort(), req.timeoutMs)
      : null;

    let response: Response;
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      throw new AIProviderError(
        err instanceof Error ? err.message : 'Network error',
        'cohere',
        undefined,
        err,
      );
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      throw new AIProviderError(
        `Cohere API error ${response.status}: ${errText.slice(0, 500)}`,
        'cohere',
        response.status,
      );
    }

    const data = (await response.json()) as {
      message?: { content?: Array<{ type: string; text?: string }> };
      usage?: {
        billed_units?: { input_tokens?: number; output_tokens?: number };
        tokens?: { input_tokens?: number; output_tokens?: number };
      };
    };

    const text =
      data.message?.content
        ?.filter((c) => c.type === 'text' && typeof c.text === 'string')
        .map((c) => c.text!)
        .join('\n') ?? '';

    const tokens = data.usage?.tokens || data.usage?.billed_units;

    return {
      content: text,
      provider: 'cohere',
      model,
      usage: tokens
        ? {
            promptTokens: tokens.input_tokens,
            completionTokens: tokens.output_tokens,
            totalTokens: (tokens.input_tokens || 0) + (tokens.output_tokens || 0),
          }
        : undefined,
      latencyMs: Date.now() - startedAt,
    };
  },
};
