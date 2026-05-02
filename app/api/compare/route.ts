import { z } from 'zod';
import { runJSONMode, JSONModeParseError } from '@/lib/ai/json-mode';
import {
  AIProviderError,
  listConfiguredProviders,
} from '@/lib/ai/providers';
import { finalizeCountryComparison } from '@/lib/ai/grounding';
import {
  SupportedCountryInputSchema,
  SupportedLanguageInputSchema,
} from '@/lib/ai/request-schemas';
import { t } from '@/lib/i18n';
import { buildCompareSystemPrompt } from '@/lib/prompts';
import { retrieveContext, buildContext, getConfidence } from '@/lib/rag';
import {
  CountryComparisonSchema,
  COUNTRY_NAMES,
  type Country,
} from '@/lib/types';
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

const compareRequestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  countries: z
    .array(SupportedCountryInputSchema)
    .min(1)
    .max(6)
    .default(['DE', 'NL', 'PT', 'ES']),
  language: SupportedLanguageInputSchema.default('en'),
  providerOverride: providerIdSchema.optional(),
  modelOverride: z.string().min(1).max(120).optional(),
});

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const rl = await rateLimit(
      rateLimitKey(req, currentUser?.id),
      getRouteLimit('compare', currentUser?.plan),
    );
    if (!rl.ok) {
      void audit({
        event: 'rate_limit.exceeded',
        userId: currentUser?.id ?? null,
        request: req,
        metadata: { route: '/api/compare' },
      });
      return tooManyRequests(rl);
    }

    const payload = compareRequestSchema.safeParse(await req.json());
    if (!payload.success) {
      return Response.json(
        {
          error: 'Invalid request payload',
          details: payload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const normalizedCountries = Array.from(
      new Set(payload.data.countries),
    ) as Country[];

    const { question, language, providerOverride, modelOverride } = payload.data;

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

    const contextByCountry = await Promise.all(
      normalizedCountries.map(async (code) => {
        const { chunks, sources, distances } = await retrieveContext(
          question,
          code,
          3,
        );
        return {
          code,
          name: COUNTRY_NAMES[code] || code,
          context: buildContext(chunks, sources),
          confidence: getConfidence(distances),
          hasContext: chunks.length > 0,
        };
      }),
    );

    const groundedCountries = contextByCountry.filter(
      (country) => country.hasContext && country.confidence >= 0.2,
    );
    const omittedCountries = contextByCountry.filter(
      (country) => !country.hasContext || country.confidence < 0.2,
    );

    if (groundedCountries.length === 0) {
      return Response.json({
        question_interpreted: question,
        countries: [],
        recommendation: t(language, 'compareInsufficientContext'),
      });
    }

    const contextBlock = groundedCountries
      .map(
        (country) =>
          `=== ${country.name} (${country.code}) ===\n${country.context}`,
      )
      .join('\n\n');

    const userPrompt = `Comparison question: ${question}

Countries to compare: ${groundedCountries.map((c) => c.code).join(', ')}
${
  omittedCountries.length
    ? `\nCountries with insufficient official context: ${omittedCountries
        .map((c) => c.code)
        .join(', ')}`
    : ''
}

Context from official sources per country:
${contextBlock}`;

    try {
      const { data: object, routerResult } = await runJSONMode(
        CountryComparisonSchema,
        {
          systemPrompt: buildCompareSystemPrompt(language),
          userPrompt,
          override: {
            provider: providerOverride,
            model: modelOverride,
          },
        },
      );

      const finalized = finalizeCountryComparison(object, {
        question,
        language,
        groundedCountries: groundedCountries.map((c) => ({
          code: c.code,
          name: c.name,
        })),
        omittedCountries: omittedCountries.map((c) => c.code),
      });

      void audit({
        event: 'ai.request',
        userId: currentUser?.id ?? null,
        request: req,
        metadata: {
          route: '/api/compare',
          provider: routerResult.provider,
          model: routerResult.model,
          usedFallback: routerResult.usedFallback,
          countries: groundedCountries.map((c) => c.code),
          language,
          tokens: routerResult.usage?.totalTokens,
          latencyMs: routerResult.latencyMs,
        },
      });

      if (finalized.countries.length === 0) {
        return Response.json({
          question_interpreted: finalized.question_interpreted,
          countries: [],
          recommendation: finalized.recommendation,
          _aiProvider: routerResult.provider,
          _aiModel: routerResult.model,
        });
      }

      return Response.json({
        ...finalized,
        _aiProvider: routerResult.provider,
        _aiModel: routerResult.model,
        ...(routerResult.usedFallback ? { _aiUsedFallback: true } : {}),
      });
    } catch (err) {
      if (err instanceof JSONModeParseError) {
        console.error(
          `Compare JSON parse error from ${err.routerResult.provider}/${err.routerResult.model}:`,
          err.message,
        );
        return Response.json(
          {
            error: 'Model response was not valid JSON',
            details: err.message,
          },
          { status: 502 },
        );
      }
      throw err;
    }
  } catch (error) {
    const providerInfo =
      error instanceof AIProviderError
        ? ` [${error.providerId}${error.statusCode ? ` ${error.statusCode}` : ''}]`
        : '';
    console.error(`Compare route error${providerInfo}:`, error);
    return Response.json(
      { error: 'Failed to compare countries' },
      { status: 500 },
    );
  }
}
