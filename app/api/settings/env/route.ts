/**
 * GET /api/settings/env
 *
 * DEVELOPER-ONLY: returns a snapshot of relevant environment variables for
 * debugging the AI router and KB connection. Sensitive values (API keys) are
 * masked — only first 6 + last 4 characters are exposed.
 *
 * Access is gated by:
 *   - NODE_ENV === 'development', OR
 *   - NEXT_PUBLIC_DEV_SETTINGS === 'true' (explicit opt-in)
 *
 * In production with the dev flag off, this route returns 403.
 *
 * Phase 2 will additionally require role=admin once real auth lands.
 */

const NON_SENSITIVE_KEYS = [
  'NODE_ENV',
  'AI_PROVIDER',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_DEMO_MODE',
  'NEXT_PUBLIC_DEV_SETTINGS',
  'NEXT_PUBLIC_UPLOADTHING_APP_ID',
  'CHROMA_URL',
  'SIRMA_BASE_URL',
  'SIRMA_AI_DOMAIN',
  'SIRMA_AGENT_ID',
  'SIRMA_EMBEDDING_MODEL',
  'OPENAI_BASE_URL',
  'OLLAMA_BASE_URL',
  'OLLAMA_ENABLED',
] as const;

const SENSITIVE_KEYS = [
  'SIRMA_API_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_API_KEY',
  'GEMINI_API_KEY',
  'COHERE_API_KEY',
  'UPLOADTHING_SECRET',
] as const;

type EnvEntry = {
  key: string;
  set: boolean;
  value?: string;
  masked?: string;
  length?: number;
  sensitive: boolean;
};

function maskSecret(value: string): string {
  if (value.length <= 10) return '*'.repeat(value.length);
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function isDevAccessAllowed(): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  if (process.env.NEXT_PUBLIC_DEV_SETTINGS === 'true') return true;
  return false;
}

export async function GET() {
  if (!isDevAccessAllowed()) {
    return Response.json(
      { error: 'Developer settings disabled in this environment' },
      { status: 403 },
    );
  }

  const entries: EnvEntry[] = [];

  for (const key of NON_SENSITIVE_KEYS) {
    const value = process.env[key];
    entries.push({
      key,
      set: typeof value === 'string' && value.length > 0,
      value: value ?? undefined,
      sensitive: false,
    });
  }

  for (const key of SENSITIVE_KEYS) {
    const value = process.env[key];
    const set = typeof value === 'string' && value.length > 0;
    entries.push({
      key,
      set,
      masked: set ? maskSecret(value!) : undefined,
      length: set ? value!.length : undefined,
      sensitive: true,
    });
  }

  return Response.json({
    nodeEnv: process.env.NODE_ENV,
    devAccessReason:
      process.env.NODE_ENV === 'development'
        ? 'NODE_ENV=development'
        : 'NEXT_PUBLIC_DEV_SETTINGS=true',
    entries,
  });
}
