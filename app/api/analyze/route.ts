import { z } from 'zod';
import { runSirmaAgent } from '@/lib/sirma-agent';
import { getSirmaConfig, isSirmaConfigured } from '@/lib/sirma-config';
import { extractTextFromUrl } from '@/lib/extract';
import {
  SupportedCountryInputSchema,
  SupportedLanguageInputSchema,
  normalizeDocumentType,
} from '@/lib/ai/request-schemas';
import { COUNTRY_NAMES } from '@/lib/types';
import { scrapeGovernmentInfo, formatGovernmentFallback, extractGovernmentOffice } from '@/lib/government-sources';

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
  })
  .refine((data) => Boolean(data.text || data.file_url), {
    message: 'Either text or file_url is required',
    path: ['text'],
  });

export async function POST(req: Request) {
  try {
    const payload = analyzeRequestSchema.safeParse(await req.json());
    if (!payload.success) {
      return Response.json(
        {
          error: 'Invalid request payload',
          details: payload.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { text, file_url, document_type, country, language } = payload.data;

    let documentText = text;
    if (!documentText && file_url) {
      documentText = await extractTextFromUrl(file_url);
    }

    if (!documentText) {
      return Response.json(
        { error: 'No document text provided' },
        { status: 400 }
      );
    }

    if (!isSirmaConfigured()) {
      return Response.json(
        {
          error: 'Sirma not configured',
          details: 'SIRMA_AGENT_ID is missing',
        },
        { status: 500 }
      );
    }

    const config = getSirmaConfig();
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
      const result = await runSirmaAgent(config.agentId, message);

      // Parse JSON response from agent
      let parsedResponse;
      try {
        // Find JSON in the response (might be wrapped in markdown code blocks)
        let jsonStr = result.content;
        
        // Remove markdown code block markers if present
        jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        jsonStr = jsonStr.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
        
        // Try to find JSON object in the text
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
        
        parsedResponse = JSON.parse(jsonStr);
        
        // Validate required fields exist
        if (!parsedResponse.risk_level) {
          throw new Error('Missing risk_level');
        }
      } catch {
        // If parsing fails, return the raw content with a fallback structure
        parsedResponse = {
          risk_level: 'unknown',
          summary: result.content.slice(0, 500),
          risks: [],
          missing_clauses: [],
          positive_points: [],
          verdict: 'Please review the full analysis below',
          _rawContent: result.content, // Include raw content for display
        };
      }

      return Response.json(parsedResponse);
    } catch (error) {
      console.error('Sirma analyze error:', error);
      
      // Try web scraping fallback for government sources
      try {
        const procedure = `document analysis ${document_type} ${countryName}`;
        const { sources, scrapedContent, success } = await scrapeGovernmentInfo(
          country,
          procedure,
          { maxSources: 2 }
        );
        
        if (success && scrapedContent) {
          const fallbackContent = formatGovernmentFallback(procedure, scrapedContent, sources);
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
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Analyze route error:', error);
    return Response.json(
      { error: 'Failed to analyze document' },
      { status: 500 }
    );
  }
}
