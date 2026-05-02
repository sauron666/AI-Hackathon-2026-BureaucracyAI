import { z } from 'zod';
import { runAIRouter } from '@/lib/ai/router';
import {
  AIProviderError,
  listConfiguredProviders,
} from '@/lib/ai/providers';
import { extractTextFromUrl } from '@/lib/extract';
import {
  SupportedCountryInputSchema,
  SupportedLanguageInputSchema,
  normalizeDocumentType,
} from '@/lib/ai/request-schemas';
import { COUNTRY_NAMES } from '@/lib/types';
import {
  scrapeGovernmentInfo,
  formatGovernmentFallback,
} from '@/lib/government-sources';
import {
  rateLimit,
  rateLimitHeaders,
  rateLimitKey,
  tooManyRequests,
} from '@/lib/security/rate-limit';
import { audit } from '@/lib/security/audit';
import { getCurrentUser } from '@/lib/auth/server';
import {
  checkQuota,
  consumeQuota,
  consumeOneTimeCredit,
  paymentRequired,
} from '@/lib/billing/quota';
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

const analyzeRequestSchema = z
  .object({
    text: z.string().trim().min(1).optional(),
    file_url: z.string().url().optional(),
    document_type: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .transform(normalizeDocumentType)
      .default('contract'),
    country: SupportedCountryInputSchema.default('DE'),
    language: SupportedLanguageInputSchema.default('en'),
    providerOverride: providerIdSchema.optional(),
    modelOverride: z.string().min(1).max(120).optional(),
  })
  .refine((data) => Boolean(data.text || data.file_url), {
    message: 'Either text or file_url is required',
    path: ['text'],
  });

export async function POST(req: Request) {
  try {
    // Document analysis is more expensive than chat — tighter limit.
    const currentUser = await getCurrentUser();
    const rl = await rateLimit(
      rateLimitKey(req, currentUser?.id),
      getRouteLimit('analyze', currentUser?.plan),
    );
    if (!rl.ok) {
      void audit({
        event: 'rate_limit.exceeded',
        userId: currentUser?.id ?? null,
        request: req,
        metadata: { route: '/api/analyze' },
      });
      return tooManyRequests(rl);
    }

    // Plan-based quota check. If exceeded, try a one-time credit
    // (pay-per-document analysis at €2 — falls through to 402 if none).
    let usedOneTimeCredit = false;
    if (currentUser) {
      const quota = await checkQuota(currentUser, 'analyze');
      if (!quota.ok) {
        const credited = await consumeOneTimeCredit(currentUser, 'document_analysis');
        if (!credited) {
          void audit({
            event: 'quota.exceeded',
            userId: currentUser.id,
            request: req,
            metadata: { route: '/api/analyze', plan: quota.plan, used: quota.used, limit: quota.limit },
          });
          return paymentRequired(quota, quota.plan);
        }
        usedOneTimeCredit = true;
      }
    }

    const payload = analyzeRequestSchema.safeParse(await req.json());
    if (!payload.success) {
      return Response.json(
        {
          error: 'Invalid request payload',
          details: payload.error.flatten(),
        },
        { status: 400, headers: rateLimitHeaders(rl) },
      );
    }

    const {
      text,
      file_url,
      document_type,
      country,
      language,
      providerOverride,
      modelOverride,
    } = payload.data;

    let documentText = text;
    if (!documentText && file_url) {
      documentText = await extractTextFromUrl(file_url);
    }

    if (!documentText) {
      return Response.json(
        { error: 'No document text provided' },
        { status: 400 },
      );
    }

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

    const countryName = COUNTRY_NAMES[country] || country;

    const message = `[${language.toUpperCase()}] Analyze this ${document_type} document for ${countryName} jurisdiction.

Please analyze the following document and provide a structured risk analysis:

Document Type: ${document_type}
Country: ${countryName}
Language: ${language}

Document Content:
${documentText.slice(0, 15000)}

IMPORTANT: Format your response as a valid JSON object with EXACTLY this structure:
{
  "risk_level": "low" | "medium" | "high",
  "summary": "Brief overview of the document risks (2-3 sentences)",
  "risks": [
    {
      "clause": "The problematic clause text",
      "risk": "Description of the risk",
      "severity": "low" | "medium" | "high",
      "recommendation": "What to do about this"
    }
  ],
  "missing_clauses": ["Standard clauses that should be present"],
  "positive_points": ["Well-drafted or beneficial clauses"],
  "verdict": "Final recommendation in one sentence"
}

Return ONLY the JSON, no explanations before or after.`;

    try {
      const result = await runAIRouter(
        {
          message,
          timeoutMs: 60_000,
        },
        {
          provider: providerOverride,
          model: modelOverride,
        },
      );

      let parsedResponse: Record<string, unknown>;
      try {
        let jsonStr = result.content;
        jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        jsonStr = jsonStr.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonStr = jsonMatch[0];

        parsedResponse = JSON.parse(jsonStr);
        if (!parsedResponse.risk_level) throw new Error('Missing risk_level');
      } catch {
        parsedResponse = {
          risk_level: 'unknown',
          summary: result.content.slice(0, 500),
          risks: [],
          missing_clauses: [],
          positive_points: [],
          verdict: 'Please review the full analysis below',
          _rawContent: result.content,
        };
      }

      // AI router diagnostics for the client.
      parsedResponse._aiProvider = result.provider;
      parsedResponse._aiModel = result.model;
      if (result.usedFallback) parsedResponse._aiUsedFallback = true;

      // Increment monthly usage (skip if a one-time credit was used,
      // since the credit already reduced their available pool).
      if (currentUser && !usedOneTimeCredit) {
        void consumeQuota(currentUser, 'analyze');
      }

      void audit({
        event: 'ai.request',
        userId: currentUser?.id ?? null,
        request: req,
        metadata: {
          route: '/api/analyze',
          provider: result.provider,
          model: result.model,
          usedFallback: result.usedFallback,
          country,
          language,
          documentType: document_type,
          tokens: result.usage?.totalTokens,
          latencyMs: result.latencyMs,
          usedOneTimeCredit,
        },
      });

      return Response.json(parsedResponse);
    } catch (error) {
      const providerInfo =
        error instanceof AIProviderError
          ? ` [${error.providerId}${error.statusCode ? ` ${error.statusCode}` : ''}]`
          : '';
      console.error(`AI router analyze error${providerInfo}:`, error);

      // Government scrape fallback (unchanged from previous behavior).
      try {
        const procedure = `document analysis ${document_type} ${countryName}`;
        const { sources, scrapedContent, success } = await scrapeGovernmentInfo(
          country,
          procedure,
          { maxSources: 2 },
        );

        if (success && scrapedContent) {
          const fallbackContent = formatGovernmentFallback(
            procedure,
            scrapedContent,
            sources,
          );
          return Response.json({
            risk_level: 'unknown',
            summary: `Information retrieved from official government sources for ${document_type} analysis.`,
            risks: [],
            missing_clauses: [],
            positive_points: [],
            verdict: 'Please review the official information below.',
            _rawContent: fallbackContent,
            _fallbackSource: 'government_scrape',
          });
        }
      } catch (scrapeError) {
        console.warn('Government scrape fallback also failed:', scrapeError);
      }

      return Response.json(
        {
          error: 'Failed to analyze document',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Analyze route error:', error);
    return Response.json(
      { error: 'Failed to analyze document' },
      { status: 500 },
    );
  }
}
