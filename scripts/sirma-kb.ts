/**
 * Sirma Knowledge Base helper CLI.
 *
 * Usage examples:
 *   npx tsx scripts/sirma-kb.ts providers
 *   npx tsx scripts/sirma-kb.ts list
 *   npx tsx scripts/sirma-kb.ts create --project-id 295 --name "Dev1 KB" --llm-config-id 1611 --embedding-model-id gemini-embedding-001
 *   npx tsx scripts/sirma-kb.ts upload --vector-store-id <id> --file C:\path\doc.md
 *   npx tsx scripts/sirma-kb.ts files --vector-store-id <id>
 */

import { access, readFile } from 'fs/promises';
import path from 'path';

type Headers = Record<string, string>;
type ArgMap = Record<string, string | boolean>;

async function main() {
  await loadEnvFile(path.join(process.cwd(), '.env.local'));

  const [command, ...rawArgs] = process.argv.slice(2);
  if (!command) {
    printUsage();
    process.exit(1);
  }

  const args = parseArgs(rawArgs);
  const apiKey = requiredEnv('SIRMA_API_KEY');
  const baseUrl = getSirmaBaseUrl();

  switch (command) {
    case 'providers':
      await getJson(`${baseUrl}/storage-resources/llm-providers`, apiKey);
      return;

    case 'list':
      await getJson(`${baseUrl}/storage-resources`, apiKey);
      return;

    case 'create':
      await createStorageResource(baseUrl, apiKey, args);
      return;

    case 'upload':
      await uploadFiles(baseUrl, apiKey, args);
      return;

    case 'files':
      await listFiles(baseUrl, apiKey, args);
      return;

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

async function createStorageResource(baseUrl: string, apiKey: string, args: ArgMap) {
  const projectId = requiredArg(args, 'project-id');
  const name = requiredArg(args, 'name');
  const llmConfigId = Number(requiredArg(args, 'llm-config-id'));
  const embeddingModelId = requiredArg(args, 'embedding-model-id');

  const body = {
    name,
    llmConfigId,
    embeddingModelId,
    searchConfig: { search_type: 'hybrid', hybrid_search_alpha: 0.5 },
  };

  await postJson(`${baseUrl}/storage-resources?project_id=${projectId}`, apiKey, body);
}

async function uploadFiles(baseUrl: string, apiKey: string, args: ArgMap) {
  const vectorStoreId = requiredArg(args, 'vector-store-id');
  const files = collectFiles(args);
  if (files.length === 0) {
    throw new Error('Missing file input. Use --file <path> or --files <a,b,c>.');
  }

  const form = new FormData();
  for (const filePath of files) {
    await access(filePath);
    const bytes = await readFile(filePath);
    const blob = new Blob([bytes]);
    form.append('files', blob, path.basename(filePath));
  }

  const chunkingStrategy = optionalArg(args, 'chunking-strategy');
  if (chunkingStrategy) form.append('chunkingStrategy', chunkingStrategy);

  const chunkingConfig = optionalArg(args, 'chunking-config');
  if (chunkingConfig) {
    JSON.parse(chunkingConfig);
    form.append('chunkingConfig', chunkingConfig);
  }

  const metadata = optionalArg(args, 'metadata');
  if (metadata) {
    JSON.parse(metadata);
    form.append('metadata', metadata);
  }

  const res = await fetch(`${baseUrl}/storage-resources/${vectorStoreId}/files`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: form,
  });

  await printResponse(res);
}

async function listFiles(baseUrl: string, apiKey: string, args: ArgMap) {
  const vectorStoreId = requiredArg(args, 'vector-store-id');
  await getJson(`${baseUrl}/storage-resources/${vectorStoreId}/files`, apiKey);
}

function collectFiles(args: ArgMap): string[] {
  const single = optionalArg(args, 'file');
  const multi = optionalArg(args, 'files');
  const out: string[] = [];

  if (single) out.push(single);
  if (multi) {
    for (const item of multi.split(',')) {
      const trimmed = item.trim();
      if (trimmed) out.push(trimmed);
    }
  }

  return out;
}

async function getJson(url: string, apiKey: string) {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...authHeaders(apiKey),
      'Content-Type': 'application/json',
    },
  });
  await printResponse(res);
}

async function postJson(url: string, apiKey: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeaders(apiKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  await printResponse(res);
}

function authHeaders(apiKey: string): Headers {
  return {
    'x-api-key': apiKey,
    'api-key': apiKey,
    Authorization: `Bearer ${apiKey}`,
  };
}

async function printResponse(res: Response) {
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Keep raw text as-is for non-JSON responses.
  }

  if (!res.ok) {
    console.error(JSON.stringify({ status: res.status, body: parsed }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(parsed, null, 2));
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function getSirmaBaseUrl(): string {
  const explicit = process.env.SIRMA_BASE_URL?.replace(/\/+$/, '');
  if (explicit) return explicit;

  const domain = process.env.SIRMA_AI_DOMAIN?.replace(/\/+$/, '');
  if (domain) return `${domain}/client/api/v1`;

  throw new Error('Missing SIRMA_BASE_URL or SIRMA_AI_DOMAIN.');
}

function parseArgs(rawArgs: string[]): ArgMap {
  const args: ArgMap = {};
  for (let i = 0; i < rawArgs.length; i++) {
    const token = rawArgs[i];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const next = rawArgs[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i++;
  }
  return args;
}

function requiredArg(args: ArgMap, key: string): string {
  const value = args[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing required argument: --${key}`);
  }
  return value;
}

function optionalArg(args: ArgMap, key: string): string | undefined {
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
}

async function loadEnvFile(filePath: string) {
  try {
    const content = await readFile(filePath, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;

      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.local is optional here.
  }
}

function printUsage() {
  console.log(`Sirma KB CLI

Commands:
  providers
  list
  create --project-id <id> --name <name> --llm-config-id <id> --embedding-model-id <id>
  upload --vector-store-id <id> --file <path> [--chunking-strategy recursive] [--chunking-config '{"chunkSize":1000,"chunkOverlap":200}'] [--metadata '{"country":"DE"}']
  files --vector-store-id <id>
`);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
