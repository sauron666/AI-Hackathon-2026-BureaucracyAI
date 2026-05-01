import { generateObject } from 'ai';
import { z } from 'zod';
import { getModelId } from '@/lib/ai/providers';
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

const compareRequestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  countries: z
    .array(SupportedCountryInputSchema)
    .min(1)
    .max(6)
    .default(['DE', 'NL', 'PT', 'ES']),
  language: SupportedLanguageInputSchema.default('en'),
});

export async function POST(req: Request) {
  try {
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

    const { question, language } = payload.data;

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
        (country) => `=== ${country.name} (${country.code}) ===\n${country.context}`,
      )
      .join('\n\n');

    const { object } = await generateObject({
      model: getModelId(),
      schema: CountryComparisonSchema,
      system: buildCompareSystemPrompt(language),
      prompt: `Comparison question: ${question}

Countries to compare: ${groundedCountries
        .map((country) => country.code)
        .join(', ')}
${omittedCountries.length ? `\nCountries with insufficient official context: ${omittedCountries.map((country) => country.code).join(', ')}` : ''}

Context from official sources per country:
${contextBlock}`,
    });

    const finalized = finalizeCountryComparison(object, {
      question,
      language,
      groundedCountries: groundedCountries.map((country) => ({
        code: country.code,
        name: country.name,
      })),
      omittedCountries: omittedCountries.map((country) => country.code),
    });

    if (finalized.countries.length === 0) {
      return Response.json({
        question_interpreted: finalized.question_interpreted,
        countries: [],
        recommendation: finalized.recommendation,
      });
    }

    return Response.json(finalized);
  } catch (error) {
    console.error('Compare route error:', error);
    return Response.json(
      { error: 'Failed to compare countries' },
      { status: 500 },
    );
  }
}
