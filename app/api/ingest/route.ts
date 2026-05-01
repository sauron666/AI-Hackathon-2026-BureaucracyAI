import { getChromaClient } from '@/lib/rag';
import { extractTextFromUrl } from '@/lib/extract';
import { chunkText } from '@/lib/chunk';
import { embedBatch } from '@/lib/embed';

/**
 * POST /api/ingest
 * Ingest a document into ChromaDB for RAG
 * 
 * Body:
 *   file_url?: string - URL to fetch and extract text from
 *   text_override?: string - Direct text to ingest
 *   metadata?: object - Optional metadata fields:
 *     country, category, source_url, language, procedure_id, title, difficulty
 */
export async function POST(req: Request) {
  const { file_url, text_override, metadata } = await req.json();

  const text = text_override ?? (file_url ? await extractTextFromUrl(file_url) : null);
  if (!text) return Response.json({ error: 'No text provided' }, { status: 400 });

  const chunks = chunkText(text);
  if (chunks.length === 0) return Response.json({ error: 'No content extracted' }, { status: 400 });

  // Generate embeddings with retry logic (in embed.ts)
  const embeddings = await embedBatch(chunks);

  // Use singleton ChromaDB client from rag.ts
  const chroma = getChromaClient();
  
  const collection = await chroma.getOrCreateCollection({
    name: 'procedures',
    metadata: { 'hnsw:space': 'cosine' },
  });

  const ts = Date.now();
  const pid = metadata?.procedure_id || `doc-${ts}`;
  const ids = chunks.map((_, i) => `${pid}-${i}-${ts}`);
  const metadatas = chunks.map(() => ({
    country:       metadata?.country      || 'DE',
    category:      metadata?.category     || 'general',
    source_url:    metadata?.source_url   || file_url || '',
    language:      metadata?.language     || 'en',
    procedure_id:  pid,
    title:         metadata?.title        || '',
    difficulty:    metadata?.difficulty   || 'moderate',
  }));

  await collection.upsert({ ids, documents: chunks, embeddings, metadatas });

  return Response.json({ 
    chunks_created: chunks.length, 
    procedure_id: pid,
    timestamp: new Date().toISOString(),
  });
}

/**
 * DELETE /api/ingest
 * Delete a procedure from ChromaDB by procedure_id
 */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const procedureId = searchParams.get('procedure_id');

  if (!procedureId) {
    return Response.json({ error: 'procedure_id is required' }, { status: 400 });
  }

  const chroma = getChromaClient();
  const collection = await chroma.getOrCreateCollection({
    name: 'procedures',
    metadata: { 'hnsw:space': 'cosine' },
  });

  // Delete all chunks belonging to this procedure
  await collection.delete({
    where: { procedure_id: procedureId },
  });

  return Response.json({ deleted: procedureId });
}
