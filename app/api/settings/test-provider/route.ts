/**
 * POST /api/settings/test-provider
 *
 * Sends a tiny smoke-test prompt to a chosen provider and returns the
 * round-trip latency + first 200 characters of the response. Used by the
 * Settings → AI Models tab to verify a provider works.
 *
 * Body: { providerId: string, model?: string }
 */

import { z } from 'zod';
import { getProvider, AIProviderError } from '@/lib/ai/providers';

const requestSchema = z.object({
  providerId: z.enum(['sirma', 'anthropic', 'openai', 'google', 'cohere', 'ollama']),
  model: z.string().min(1).max(120).optional(),
});

const TEST_PROMPT =
  'Reply with exactly the word "pong" and nothing else. This is a connectivity smoke test.';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const provider = getProvider(parsed.data.providerId);
  if (!provider) {
    return Response.json({ error: 'Unknown provider' }, { status: 404 });
  }

  if (!provider.isConfigured()) {
    return Response.json(
      {
        ok: false,
        error: 'Provider is not configured (missing API key in environment)',
      },
      { status: 200 },
    );
  }

  const startedAt = Date.now();
  try {
    const response = await provider.run({
      message: TEST_PROMPT,
      model: parsed.data.model,
      maxTokens: 32,
      temperature: 0,
      timeoutMs: 15000,
    });

    return Response.json({
      ok: true,
      providerId: provider.id,
      model: response.model,
      latencyMs: response.latencyMs ?? Date.now() - startedAt,
      preview: response.content.slice(0, 200),
      usage: response.usage,
    });
  } catch (err) {
    if (err instanceof AIProviderError) {
      return Response.json({
        ok: false,
        providerId: provider.id,
        error: err.message,
        statusCode: err.statusCode,
        latencyMs: Date.now() - startedAt,
      });
    }
    return Response.json({
      ok: false,
      providerId: provider.id,
      error: err instanceof Error ? err.message : 'Unknown error',
      latencyMs: Date.now() - startedAt,
    });
  }
}
