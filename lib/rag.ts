import { ChromaClient, IncludeEnum, type Where } from "chromadb";
import { embedText } from "./embed";

let chromaInstance: ChromaClient | null = null;

/**
 * Type for ChromaDB metadata
 */
export interface ProcedureChunkMetadata {
  country?: string;
  category?: string;
  source_url?: string;
  language?: string;
  procedure_id?: string;
  title?: string;
  difficulty?: string;
}

export interface RetrievedContext {
  chunks: string[];
  sources: string[];
  distances: number[];
  metadata: ProcedureChunkMetadata[];
}

const PROCEDURES_COLLECTION = "procedures";

const QUERY_INCLUDE = [
  IncludeEnum.Documents,
  IncludeEnum.Metadatas,
  IncludeEnum.Distances,
] as const;

export const GET_INCLUDE = [IncludeEnum.Metadatas] as const;

/**
 * Get or create the ChromaDB singleton instance
 * Supports both local (docker) and remote (Railway) URLs
 */
export function getChromaClient(): ChromaClient {
  if (!chromaInstance) {
    const chromaUrl = process.env.CHROMA_URL || "http://localhost:8000";

    chromaInstance = new ChromaClient({
      path: chromaUrl,
    });
  }
  return chromaInstance;
}

/**
 * Get the current ChromaDB URL being used
 */
export function getChromaUrl(): string {
  return process.env.CHROMA_URL || "http://localhost:8000";
}

/**
 * Check if ChromaDB is configured for local development
 */
export function isLocalChroma(): boolean {
  const url = getChromaUrl();
  return url.includes("localhost") || url.includes("127.0.0.1");
}

/**
 * Get or create the procedures collection
 */
export async function getProceduresCollection() {
  const chroma = getChromaClient();

  return chroma.getOrCreateCollection({
    name: PROCEDURES_COLLECTION,
    metadata: { "hnsw:space": "cosine" },
  });
}

function buildProcedureWhere(country: string, category?: string): Where {
  if (!category) {
    return {
      country: { $eq: country },
    };
  }

  return {
    $and: [{ country: { $eq: country } }, { category: { $eq: category } }],
  };
}

/**
 * Retrieve relevant context chunks from ChromaDB for a question
 */
export async function retrieveContext(
  question: string,
  country: string,
  topK = 6,
  category?: string,
): Promise<RetrievedContext> {
  const collection = await getProceduresCollection();
  const embedding = await embedText(question);

  const results = await collection.query({
    queryEmbeddings: [embedding],
    nResults: topK,
    where: buildProcedureWhere(country, category),
    include: [...QUERY_INCLUDE],
  });

  const metadata = (results.metadatas?.[0] ||
    []) as (ProcedureChunkMetadata | null)[];

  return {
    chunks: ((results.documents?.[0] || []).filter(Boolean) as string[]) || [],
    sources: metadata.map((item) => item?.source_url || ""),
    distances: (results.distances?.[0] || []) as number[],
    metadata: metadata.map((item) => item || {}),
  };
}

/**
 * Build context string from chunks and sources for LLM prompt
 */
export function buildContext(
  chunks: string[],
  sources: string[],
  metadata: ProcedureChunkMetadata[] = [],
): string {
  if (!chunks.length) {
    return "No relevant context found in the knowledge base.";
  }

  return chunks
    .map((chunk, index) => {
      const item = metadata[index];
      const heading = [
        item?.title ? `[Procedure: ${item.title}]` : null,
        item?.category ? `[Category: ${item.category}]` : null,
        sources[index] ? `[Source: ${sources[index]}]` : "[Source: Unknown]",
      ]
        .filter(Boolean)
        .join("\n");

      return `${heading}\n${chunk}`;
    })
    .join("\n\n---\n\n");
}

export function getConfidence(distances: number[]): number {
  if (!distances.length) {
    return 0;
  }

  const best = 1 - Math.min(...distances);
  return Math.max(0, Math.min(1, best));
}

export async function checkChromaHealth(): Promise<boolean> {
  try {
    const chroma = getChromaClient();
    await chroma.heartbeat();
    return true;
  } catch {
    return false;
  }
}

export async function getCollectionStats() {
  try {
    const collection = await getProceduresCollection();
    return {
      name: collection.name,
      dimension: collection.metadata?.dimension as number | undefined,
      count: collection.metadata?.numElements as number | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Reset ChromaDB connection (useful when URL changes)
 */
export function resetChromaClient(): void {
  chromaInstance = null;
}
