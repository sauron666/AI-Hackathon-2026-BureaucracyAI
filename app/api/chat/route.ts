import { z } from 'zod';
import { runSirmaAgent } from '@/lib/sirma-agent';
import { getSirmaConfig, isSirmaConfigured } from '@/lib/sirma-config';
import {
  SupportedCountryInputSchema,
  SupportedLanguageInputSchema,
} from '@/lib/ai/request-schemas';
import { COUNTRY_NAMES } from '@/lib/types';

export const maxDuration = 30;

const chatRequestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  language: SupportedLanguageInputSchema.default('en'),
  country: SupportedCountryInputSchema.default('DE'),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const payload = chatRequestSchema.safeParse(await req.json());
    if (!payload.success) {
      return Response.json(
        {
          error: 'Invalid request payload',
          details: payload.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { question, language, country, sessionId, userId } = payload.data;

    // Check if Sirma is configured
    if (!isSirmaConfigured()) {
      return Response.json(
        {
          error: 'Sirma not configured',
          details: 'SIRMA_AGENT_ID is missing. Please configure your Sirma agent in .env.local',
        },
        { status: 500 }
      );
    }

    const config = getSirmaConfig();

    // Build context message with user preferences
    const enhancedMessage = `[${language.toUpperCase()}] Country: ${country} (${COUNTRY_NAMES[country] || country})

User question: ${question}

Note: Respond in ${language} language and reference ${COUNTRY_NAMES[country] || country} procedures when relevant.`;

    try {
      // Run Sirma agent (without user_id for simplicity - Sirma creates temp user)
      const result = await runSirmaAgent(config.agentId, enhancedMessage, {
        sessionId: sessionId,
      });

      // Return as plain text stream
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(result.content));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'X-Sirma-Agent': config.agentId,
          'X-Sirma-Run-Id': result.runId,
        },
      });

    } catch (error) {
      console.error('Sirma agent error:', error);
      return Response.json(
        {
          error: 'Failed to run Sirma agent',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Chat route error:', error);
    return Response.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
