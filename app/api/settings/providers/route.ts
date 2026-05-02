/**
 * GET /api/settings/providers
 *
 * Returns metadata about every AI provider (id, display name, available models,
 * configured/health status). Used by the Settings → AI Models tab to
 * populate dropdowns and show which providers are ready to use.
 *
 * Never returns actual API keys.
 */

import { allProviders } from '@/lib/ai/providers';
import { getEnvDefaultProvider } from '@/lib/ai/user-preferences';

export async function GET() {
  const providers = await Promise.all(
    allProviders.map(async (p) => ({
      id: p.id,
      displayName: p.displayName,
      defaultModel: p.defaultModel,
      availableModels: p.availableModels,
      configured: p.isConfigured(),
      health: await p.checkHealth(),
    })),
  );

  return Response.json({
    envDefault: getEnvDefaultProvider(),
    providers,
  });
}
