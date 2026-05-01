import { checkChromaHealth, getCollectionStats } from '@/lib/rag';

/**
 * GET /api/health
 * Health check endpoint for monitoring infrastructure status
 */
export async function GET() {
  const chromaHealthy = await checkChromaHealth();
  const stats = await getCollectionStats();

  const status = {
    status: chromaHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      chromadb: {
        status: chromaHealthy ? 'up' : 'down',
        url: process.env.CHROMA_URL || 'http://localhost:8000',
        stats,
      },
    },
  };

  return Response.json(status, {
    status: chromaHealthy ? 200 : 503,
  });
}
