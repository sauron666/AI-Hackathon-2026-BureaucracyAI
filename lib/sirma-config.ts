/**
 * Sirma configuration helpers.
 * Provides typed access to Sirma environment variables.
 */

export interface SirmaConfig {
  apiKey: string;
  baseUrl: string;
  aiDomain: string;
  embeddingModel: string;
  agentId: string;
}

/**
 * Get Sirma configuration from environment variables.
 * Uses sensible defaults from .env.local.
 */
export function getSirmaConfig(): SirmaConfig {
  return {
    apiKey: requiredEnv('SIRMA_API_KEY'),
    baseUrl: getSirmaBaseUrl(),
    aiDomain: process.env.SIRMA_AI_DOMAIN || 'https://stage.sirma.ai',
    embeddingModel: process.env.SIRMA_EMBEDDING_MODEL || 'text-embedding-3-small',
    agentId: requiredEnv('SIRMA_AGENT_ID'),
  };
}

/**
 * Check if Sirma is properly configured.
 */
export function isSirmaConfigured(): boolean {
  return Boolean(
    process.env.SIRMA_API_KEY &&
    (process.env.SIRMA_BASE_URL || process.env.SIRMA_AI_DOMAIN) &&
    process.env.SIRMA_AGENT_ID
  );
}

/**
 * Get Sirma base URL with fallback chain.
 */
export function getSirmaBaseUrl(): string {
  const explicit = process.env.SIRMA_BASE_URL?.replace(/\/+$/, '');
  if (explicit) return explicit;

  const domain = process.env.SIRMA_AI_DOMAIN?.replace(/\/+$/, '');
  if (domain) return `${domain}/client/api/v1`;

  throw new Error('Missing SIRMA_BASE_URL or SIRMA_AI_DOMAIN.');
}

/**
 * Validate required environment variables for Sirma.
 * Call this at startup to fail fast on missing config.
 */
export function validateSirmaEnv(): void {
  const missing: string[] = [];

  if (!process.env.SIRMA_API_KEY) missing.push('SIRMA_API_KEY');
  if (!process.env.SIRMA_BASE_URL && !process.env.SIRMA_AI_DOMAIN) {
    missing.push('SIRMA_BASE_URL or SIRMA_AI_DOMAIN');
  }
  if (!process.env.SIRMA_AGENT_ID) missing.push('SIRMA_AGENT_ID');

  if (missing.length > 0) {
    throw new Error(
      `Missing required Sirma environment variables: ${missing.join(', ')}. ` +
      'Please set them in .env.local'
    );
  }
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}