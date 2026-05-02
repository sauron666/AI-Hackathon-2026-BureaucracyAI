/**
 * Local Ollama provider — connects to a self-hosted Ollama instance.
 * Useful for development without cloud API costs and for self-hosted deploys.
 */

import {
  AIProvider,
  AIProviderError,
  AIProviderHealth,
  AIProviderRequest,
  AIProviderResponse,
  AIProviderUnconfiguredError,
} from './types';

function getBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '');
}

export const ollamaProvider: AIProvider = {
  id: 'ollama',
  displayName: 'Ollama (local)',
  defaultModel: 'llama3.1',
  availableModels: [
    { id: 'llama3.1', label: 'Llama 3.1 8B' },
    { id: 'llama3.1:70b', label: 'Llama 3.1 70B (large)' },
    { id: 'mistral', label: 'Mistral 7B' },
    { id: 'qwen2.5', label: 'Qwen 2.5' },
    { id: 'gemma2', label: 'Gemma 2' },
  ],

  isConfigured(): boolean {
    // Ollama is "configured" if explicitly enabled. The default is OFF
    // because we don't want to silently route to a non-existent local server.
    return process.env.OLLAMA_ENABLED === 'true';
  },

  async checkHealth(): Promise<AIProviderHealth> {
    if (!this.isConfigured()) {
      return {
        status: 'unconfigured',
        configured: false,
        reachable: false,
        reason: 'OLLAMA_ENABLED not set to "true"',
      };
    }
    try {
      const res = await fetch(`${getBaseUrl()}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) {
        return {
          status: 'unreachable',
          configured: true,
          reachable: false,
          reason: `Ollama returned HTTP ${res.status}`,
        };
      }
      return { status: 'ok', configured: true, reachable: true };
    } catch (err) {
      return {
        status: 'unreachable',
        configured: true,
        reachable: false,
        reason: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },

  async run(req: AIProviderRequest): Promise<AIProviderResponse> {
    if (!this.isConfigured()) {
      throw new AIProviderUnconfiguredError('ollama', 'OLLAMA_ENABLED not "true"');
    }

    const model = req.model || this.defaultModel;
    const startedAt = Date.now();

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    if (req.systemPrompt) messages.push({ role: 'system', content: req.systemPrompt });
    if (req.history?.length) messages.push(...req.history);
    messages.push({ role: 'user', content: req.message });

    const body: Record<string, unknown> = { model, messages, stream: false };
    const options: Record<string, unknown> = {};
    if (typeof req.temperature === 'number') options.temperature = req.temperature;
    if (req.maxTokens) options.num_predict = req.maxTokens;
    if (Object.keys(options).length) body.options = options;

    let response: Response;
    try {
      response = await fetch(`${getBaseUrl()}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: req.timeoutMs ? AbortSignal.timeout(req.timeoutMs) : undefined,
      });
    } catch (err) {
      throw new AIProviderError(
        err instanceof Error ? err.message : 'Network error',
        'ollama',
        undefined,
        err,
      );
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      throw new AIProviderError(
        `Ollama error ${response.status}: ${errText.slice(0, 500)}`,
        'ollama',
        response.status,
      );
    }

    const data = (await response.json()) as {
      message?: { content?: string };
      eval_count?: number;
      prompt_eval_count?: number;
    };

    return {
      content: data.message?.content ?? '',
      provider: 'ollama',
      model,
      usage: {
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      latencyMs: Date.now() - startedAt,
    };
  },
};
