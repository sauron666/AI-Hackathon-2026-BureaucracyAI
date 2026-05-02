import { z } from 'zod';
import { runAIRouter } from '@/lib/ai/router';
import {
  AIProviderError,
  listConfiguredProviders,
} from '@/lib/ai/providers';
import {
  SupportedCountryInputSchema,
  SupportedLanguageInputSchema,
} from '@/lib/ai/request-schemas';
import { COUNTRY_NAMES } from '@/lib/types';
import {
  rateLimit,
  rateLimitKey,
  tooManyRequests,
} from '@/lib/security/rate-limit';
import { audit } from '@/lib/security/audit';
import { getCurrentUser } from '@/lib/auth/server';
import { getRouteLimit } from '@/lib/security/rate-limit-config';

export const maxDuration = 60;

const providerIdSchema = z.enum([
  'sirma',
  'anthropic',
  'openai',
  'google',
  'cohere',
  'ollama',
]);

const chatRequestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  language: SupportedLanguageInputSchema.default('en'),
  country: SupportedCountryInputSchema.default('DE'),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  providerOverride: providerIdSchema.optional(),
  modelOverride: z.string().min(1).max(120).optional(),
});

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const rl = await rateLimit(
      rateLimitKey(req, currentUser?.id),
      getRouteLimit('chat', currentUser?.plan),
    );
    if (!rl.ok) {
      void audit({
        event: 'rate_limit.exceeded',
        userId: currentUser?.id ?? null,
        request: req,
        metadata: { route: '/api/chat' },
      });
      return tooManyRequests(rl);
    }

    const payload = chatRequestSchema.safeParse(await req.json());
    if (!payload.success) {
      return Response.json(
        {
          error: 'Invalid request payload',
          details: payload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const {
      question,
      language,
      country,
      sessionId,
      userId,
      providerOverride,
      modelOverride,
    } = payload.data;

    if (listConfiguredProviders().length === 0) {
      return Response.json(
        {
          error: 'No AI provider configured',
          details:
            'Set at least one of SIRMA_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, COHERE_API_KEY, or OLLAMA_ENABLED in .env.local',
        },
        { status: 500 },
      );
    }

    const enhancedMessage = `[${language.toUpperCase()}] Country: ${country} (${COUNTRY_NAMES[country] || country})

User question: ${question}

Note: Respond in ${language} language and reference ${COUNTRY_NAMES[country] || country} procedures when relevant.`;

    try {
      const result = await runAIRouter(
        {
          message: enhancedMessage,
          sessionId,
          userId,
          timeoutMs: 60_000,
        },
        {
          provider: providerOverride,
          model: modelOverride,
        },
      );

      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(result.content));
          controller.close();
        },
      });

      void audit({
        event: 'ai.request',
        userId: currentUser?.id ?? null,
        request: req,
        metadata: {
          route: '/api/chat',
          provider: result.provider,
          model: result.model,
          usedFallback: result.usedFallback,
          country,
          language,
          tokens: result.usage?.totalTokens,
          latencyMs: result.latencyMs,
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'X-Ai-Provider': result.provider,
          'X-Ai-Model': result.model,
          'X-Ai-Used-Fallback': String(result.usedFallback),
          ...(result.runId ? { 'X-Sirma-Run-Id': result.runId } : {}),
        },
      });
    } catch (error) {
      const providerInfo =
        error instanceof AIProviderError
          ? ` [${error.providerId}${error.statusCode ? ` ${error.statusCode}` : ''}]`
          : '';
      console.error(`AI router chat error${providerInfo}:`, error);
      return Response.json(
        {
          error: 'Failed to run AI provider',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Chat route error:', error);
    return Response.json(
      { error: 'Failed to process chat request' },
      { status: 500 },
    );
  }
}
