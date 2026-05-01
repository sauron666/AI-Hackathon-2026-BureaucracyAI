import type { Where } from 'chromadb';
import type { ProcedureSummary } from '@/lib/types';
import { getProceduresCollection, GET_INCLUDE } from '@/lib/rag';

/**
 * GET /api/procedures
 * List all procedures from ChromaDB, optionally filtered by country/category
 * 
 * Query params:
 *   country?: string - Filter by country code (e.g., 'DE', 'NL')
 *   category?: string - Filter by category
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get('country');
  const category = searchParams.get('category');

  const collection = await getProceduresCollection();

  let where: Where | undefined;
  if (country && category) {
    where = {
      $and: [
        { country: { $eq: country } },
        { category: { $eq: category } },
      ],
    };
  } else if (country) {
    where = { country: { $eq: country } };
  } else if (category) {
    where = { category: { $eq: category } };
  }

  const results = await collection.get({
    where,
    include: [...GET_INCLUDE],
    limit: 500,
  });

  // Deduplicate by procedure_id, keep one entry per procedure
  const seen = new Map<string, ProcedureSummary>();
  ((results.metadatas || []) as any[]).forEach(m => {
    if (m?.procedure_id && !seen.has(m.procedure_id)) {
      seen.set(m.procedure_id, {
        procedure_id: m.procedure_id,
        title: m.title || '',
        category: m.category || '',
        country: m.country || '',
        source_url: m.source_url || '',
        difficulty: m.difficulty || 'moderate',
      });
    }
  });

  return Response.json(Array.from(seen.values()));
}
