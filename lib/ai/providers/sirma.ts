/**
 * Sirma provider — wraps the existing lib/sirma-agent.ts client.
 * Sirma is unique because it routes through a pre-trained agent, not a raw model call.
 */

import { runSirmaAgent, SirmaAgentError } from '@/lib/sirma-agent';
import {
  getSirmaConfig,
  isSirmaConfigured as checkSirmaEnv,
} from '@/lib/sirma-config';
import {
  AIProvider,
  AIProviderError,
  AIProviderHealth,
  AIProviderRequest,
  AIProviderResponse,
  AIProviderUnconfiguredError,
} from './types';

export const sirmaProvider: AIProvider = {
  id: 'sirma',
  displayName: 'Sirma AI',
  defaultModel: 'sirma-agent',
  availableModels: [
    {
      id: 'sirma-agent',
      label: 'Sirma Agent (configured)',
      notes:
        'Uses the agent ID from SIRMA_AGENT_ID. Model selection happens inside the Sirma platform.',
    },
  ],

  isConfigured(): boolean {
    return checkSirmaEnv();
  },

  async checkHealth(): Promise<AIProviderHealth> {
    if (!checkSirmaEnv()) {
      return {
        status: 'unconfigured',
        configured: false,
        reachable: false,
        reason: 'SIRMA_API_KEY or SIRMA_AGENT_ID missing',
      };
    }
    // Don't burn a real run for a health check. Trust env + lazy fail.
    return { status: 'ok', configured: true, reachable: true };
  },

  async run(req: AIProviderRequest): Promise<AIProviderResponse> {
    if (!checkSirmaEnv()) {
      throw new AIProviderUnconfiguredError(
        'sirma',
        'SIRMA_API_KEY or SIRMA_AGENT_ID missing',
      );
    }

    const config = getSirmaConfig();
    const startedAt = Date.now();

    try {
      const result = await runSirmaAgent(config.agentId, req.message, {
        sessionId: req.sessionId,
        userId: req.userId,
      });

      return {
        content: result.content,
        provider: 'sirma',
        model: 'sirma-agent',
        sessionId: result.sessionId,
        runId: result.runId,
        latencyMs: Date.now() - startedAt,
      };
    } catch (err) {
      if (err instanceof SirmaAgentError) {
        throw new AIProviderError(err.message, 'sirma', err.statusCode, err);
      }
      throw new AIProviderError(
        err instanceof Error ? err.message : 'Unknown Sirma error',
        'sirma',
        undefined,
        err,
      );
    }
  },
};
