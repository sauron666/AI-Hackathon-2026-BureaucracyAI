import { generateObject } from 'ai';
import { z } from 'zod';
import { getModelId } from '@/lib/ai/providers';
import { finalizeRelocationJourney } from '@/lib/ai/grounding';
import { t } from '@/lib/i18n';
import {
  SupportedCountryInputSchema,
  SupportedLanguageInputSchema,
} from '@/lib/ai/request-schemas';
import { buildJourneySystemPrompt } from '@/lib/prompts';
import { retrieveContext, getConfidence } from '@/lib/rag';
import { RelocationJourneySchema, COUNTRY_NAMES } from '@/lib/types';

const journeyRequestSchema = z.object({
  from_country: z.string().trim().min(2).max(100).default('unknown'),
  to_country: SupportedCountryInputSchema.default('DE'),
  nationality: z.string().trim().min(2).max(100).optional(),
  purpose: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .transform((value) => value.toLowerCase())
    .default('work'),
  language: SupportedLanguageInputSchema.default('en'),
});

type JourneyRetrievalPlan = {
  label: string;
  category?: string;
  query: string;
  topK: number;
};

type JourneyContextEntry = {
  label: string;
  chunk: string;
  source: string;
  category: string;
  procedureId: string | null;
  title: string | null;
};

function normalizePurposeTokens(purpose: string): string[] {
  return purpose
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
}

function buildJourneyRetrievalPlan(
  toCountry: string,
  purpose: string,
): JourneyRetrievalPlan[] {
  const countryName = COUNTRY_NAMES[toCountry] || toCountry;
  const purposeTokens = normalizePurposeTokens(purpose);
  const plans: JourneyRetrievalPlan[] = [
    {
      label: 'Entry and residence requirements',
      category: 'residence_permit',
      query: `${countryName} ${purpose} residence permit visa required documents`,
      topK: 2,
    },
    {
      label: 'Arrival registration',
      category: 'address',
      query: `${countryName} address registration after moving municipal registration office`,
      topK: 2,
    },
    {
      label: 'Tax setup',
      category: 'tax',
      query: `${countryName} tax registration tax number for new residents`,
      topK: 1,
    },
    {
      label: 'Banking setup',
      category: 'banking',
      query: `${countryName} bank account opening for new residents required documents`,
      topK: 1,
    },
    {
      label: 'General newcomer procedures',
      query: `${countryName} move newcomer registration permits banking tax health insurance`,
      topK: 2,
    },
  ];

  if (purposeTokens.some((token) => ['work', 'job', 'employment'].includes(token))) {
    plans.unshift({
      label: 'Work authorization',
      category: 'work_permit',
      query: `${countryName} work permit employment authorization required documents`,
      topK: 2,
    });
  }

  if (
    purposeTokens.some((token) =>
      ['family', 'spouse', 'partner', 'child', 'reunification'].includes(token),
    )
  ) {
    plans.unshift({
      label: 'Family reunification',
      category: 'family',
      query: `${countryName} family reunification residence permit required documents`,
      topK: 2,
    });
  }

  if (
    purposeTokens.some((token) =>
      ['study', 'student', 'university', 'education'].includes(token),
    )
  ) {
    plans.unshift({
      label: 'Study and education setup',
      category: 'education',
      query: `${countryName} student residence permit university enrollment registration`,
      topK: 2,
    });
  }

  if (purposeTokens.some((token) => ['retire', 'retirement', 'pension'].includes(token))) {
    plans.unshift({
      label: 'Retirement residency requirements',
      category: 'retirement',
      query: `${countryName} retirement residence permit pensioner required documents`,
      topK: 2,
    });
  }

  if (
    purposeTokens.some((token) =>
      ['nomad', 'freelance', 'freelancer', 'remote', 'digital'].includes(token),
    )
  ) {
    plans.unshift({
      label: 'Remote work and nomad requirements',
      category: 'digital_nomad',
      query: `${countryName} digital nomad visa remote work residence requirements`,
      topK: 2,
    });
  }

  if (
    purposeTokens.some((token) =>
      ['business', 'startup', 'company', 'entrepreneur', 'self', 'selfemployed'].includes(
        token,
      ),
    )
  ) {
    plans.unshift({
      label: 'Business registration',
      category: 'business',
      query: `${countryName} business registration self employed permit required documents`,
      topK: 2,
    });
  }

  return plans;
}

function buildJourneyContext(entries: JourneyContextEntry[]): string {
  if (!entries.length) {
    return 'No relevant official relocation procedure context found in the knowledge base.';
  }

  return entries
    .map((entry) =>
      [
        `[Area: ${entry.label}]`,
        `[Category: ${entry.category}]`,
        `[Procedure: ${entry.title || entry.procedureId || 'Unknown procedure'}]`,
        `[Source: ${entry.source || 'Unknown'}]`,
        entry.chunk,
      ].join('\n'),
    )
    .join('\n\n---\n\n');
}

export async function POST(req: Request) {
  try {
    const payload = journeyRequestSchema.safeParse(await req.json());
    if (!payload.success) {
      return Response.json(
        {
          error: 'Invalid request payload',
          details: payload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { from_country, to_country, nationality, purpose, language } =
      payload.data;

    const retrievalPlan = buildJourneyRetrievalPlan(to_country, purpose);
    const retrievalResults = await Promise.all(
      retrievalPlan.map(async (plan) => {
        const result = await retrieveContext(
          plan.query,
          to_country,
          plan.topK,
          plan.category,
        );

        return {
          ...plan,
          ...result,
          confidence: getConfidence(result.distances),
        };
      }),
    );

    const groundedAreas = retrievalResults
      .filter((result) => result.chunks.length > 0 && result.confidence >= 0.2)
      .map((result) => result.label);

    const missingAreas = retrievalPlan
      .map((plan) => plan.label)
      .filter((label) => !groundedAreas.includes(label));

    const seenChunks = new Set<string>();
    const chunksPerProcedure = new Map<string, number>();
    const contextEntries: JourneyContextEntry[] = [];

    for (const result of retrievalResults) {
      result.chunks.forEach((chunk, index) => {
        const metadata = result.metadata[index];
        const source = result.sources[index] || '';
        const procedureId = metadata?.procedure_id || null;
        const title = metadata?.title || null;
        const category = metadata?.category || result.category || 'general';
        const dedupeKey = `${procedureId || source || result.label}:${chunk.slice(0, 160)}`;

        if (seenChunks.has(dedupeKey)) {
          return;
        }

        const procedureKey = procedureId || source || `${result.label}:${category}`;
        const procedureChunkCount = chunksPerProcedure.get(procedureKey) || 0;
        if (procedureChunkCount >= 2) {
          return;
        }

        seenChunks.add(dedupeKey);
        chunksPerProcedure.set(procedureKey, procedureChunkCount + 1);
        contextEntries.push({
          label: result.label,
          chunk,
          source,
          category,
          procedureId,
          title,
        });
      });
    }

    const context = buildJourneyContext(contextEntries.slice(0, 10));

    if (contextEntries.length === 0) {
      return Response.json({
        title: `Relocation plan for ${COUNTRY_NAMES[to_country] || to_country}`,
        phases: [],
        warnings: [
          t(language, 'journeyLimitedInfo', {
            country: COUNTRY_NAMES[to_country] || to_country,
          }),
          t(language, 'journeyMissingCoverage', {
            areas: retrievalPlan.map((plan) => plan.label).join(', '),
          }),
          t(language, 'journeyVerifyRequirements'),
        ],
        estimated_total_cost: null,
      });
    }

    const { object } = await generateObject({
      model: getModelId(),
      schema: RelocationJourneySchema,
      system: buildJourneySystemPrompt(to_country, language),
      prompt: `Relocating from: ${from_country}
Nationality: ${nationality || 'not specified'}
Destination: ${COUNTRY_NAMES[to_country] || to_country}
Purpose: ${purpose}
Grounded procedure areas: ${
        groundedAreas.length ? groundedAreas.join(', ') : 'none'
      }
Areas with limited official context: ${
        missingAreas.length ? missingAreas.join(', ') : 'none'
      }

Context from ${COUNTRY_NAMES[to_country] || to_country} official sources:
${context}`,
    });

    return Response.json(
      finalizeRelocationJourney(object, {
        language,
        countryName: COUNTRY_NAMES[to_country] || to_country,
        groundedAreas,
        missingAreas,
      }),
    );
  } catch (error) {
    console.error('Journey route error:', error);
    return Response.json(
      { error: 'Failed to generate relocation journey' },
      { status: 500 },
    );
  }
}
