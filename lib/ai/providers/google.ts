/**
 * Google Gemini provider — direct REST API via fetch.
 * Endpoint: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 */

import {
  AIProvider,
  AIProviderError,
  AIProviderHealth,
  AIProviderRequest,
  AIProviderResponse,
  AIProviderUnconfiguredError,
} from './types';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export const googleProvider: AIProvider = {
  id: 'google',
  displayName: 'Google (Gemini)',
  defaultModel: 'gemini-2.0-flash',
  availableModels: [
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (fast, cheap)' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { id: 'gemini-exp-1206', label: 'Gemini Experimental 1206' },
  ],

  isConfigured(): boolean {
    return Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
  },

  async checkHealth(): Promise<AIProviderHealth> {
    if (!this.isConfigured()) {
      return {
        status: 'unconfigured',
        configured: false,
        reachable: false,
        reason: 'GOOGLE_API_KEY (or GEMINI_API_KEY) missing',
      };
    }
    return { status: 'ok', configured: true, reachable: true };
  },

  async run(req: AIProviderRequest): Promise<AIProviderResponse> {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AIProviderUnconfiguredError(
        'google',
        'GOOGLE_API_KEY (or GEMINI_API_KEY) missing',
      );
    }

    const model = req.model || this.defaultModel;
    const startedAt = Date.now();

    type GeminiPart = { text: string };
    type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] };

    const contents: GeminiContent[] = [];
    if (req.history?.length) {
      for (const h of req.history) {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        });
      }
    }
    contents.push({ role: 'user', parts: [{ text: req.message }] });

    const body: Record<string, unknown> = { contents };
    if (req.systemPrompt) {
      body.systemInstruction = { role: 'user', parts: [{ text: req.systemPrompt }] };
    }
    const generationConfig: Record<string, unknown> = {};
    if (typeof req.temperature === 'number') generationConfig.temperature = req.temperature;
    if (req.maxTokens) generationConfig.maxOutputTokens = req.maxTokens;
    if (Object.keys(generationConfig).length) body.generationConfig = generationConfig;

    const url = `${API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(
      apiKey,
    )}`;

    const controller = new AbortController();
    const timeoutId = req.timeoutMs
      ? setTimeout(() => controller.abort(), req.timeoutMs)
      : null;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      throw new AIProviderError(
        err instanceof Error ? err.message : 'Network error',
        'google',
        undefined,
        err,
      );
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      throw new AIProviderError(
        `Gemini API error ${response.status}: ${errText.slice(0, 500)}`,
        'google',
        response.status,
      );
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .filter(Boolean)
        .join('\n') ?? '';

    return {
      content: text,
      provider: 'google',
      model,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          }
        : undefined,
      latencyMs: Date.now() - startedAt,
    };
  },
};
