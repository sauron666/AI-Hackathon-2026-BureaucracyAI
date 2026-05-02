/**
 * JSON-structured output helper.
 *
 * Replaces `generateObject` from the `ai` SDK with a provider-agnostic
 * implementation that works through our router. Used by routes that need
 * the model to produce a Zod-validated object: analyze, compare, journey.
 *
 * Strategy:
 *   1. Append explicit JSON-only instructions to the system prompt.
 *   2. Run via router (any configured provider).
 *   3. Clean markdown fences, extract first {...} block, parse.
 *   4. Validate against the supplied Zod schema. Throw on mismatch.
 */

import type { z } from 'zod';
import { runAIRouter, type RouterOverride } from './router';
import type { RouterRunResult } from './router';

const JSON_INSTRUCTION_SUFFIX = `

CRITICAL OUTPUT FORMAT:
- Respond with ONE JSON object only.
- No prose before or after.
- No markdown code fences.
- No comments inside the JSON.
- All strings must be valid JSON (escape backslashes, newlines, and quotes).`;

export interface JSONModeRequest {
  systemPrompt: string;
  userPrompt: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  override?: RouterOverride;
  timeoutMs?: number;
}

export interface JSONModeResult<T> {
  data: T;
  raw: string;
  routerResult: RouterRunResult;
}

export class JSONModeParseError extends Error {
  constructor(
    message: string,
    public readonly raw: string,
    public readonly routerResult: RouterRunResult,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'JSONModeParseError';
  }
}

/**
 * Run a prompt and validate the response against a Zod schema.
 * Throws JSONModeParseError if extraction or validation fails.
 */
export async function runJSONMode<T extends z.ZodTypeAny>(
  schema: T,
  request: JSONModeRequest,
): Promise<JSONModeResult<z.infer<T>>> {
  const systemWithInstructions = request.systemPrompt + JSON_INSTRUCTION_SUFFIX;

  const routerResult = await runAIRouter(
    {
      message: request.userPrompt,
      systemPrompt: systemWithInstructions,
      history: request.history,
      timeoutMs: request.timeoutMs ?? 60_000,
    },
    request.override,
  );

  const raw = routerResult.content;
  const extracted = extractJSON(raw);
  if (extracted === null) {
    throw new JSONModeParseError(
      'Model response did not contain a JSON object',
      raw,
      routerResult,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extracted);
  } catch (err) {
    throw new JSONModeParseError(
      'Model response was not valid JSON',
      raw,
      routerResult,
      err,
    );
  }

  const validation = schema.safeParse(parsed);
  if (!validation.success) {
    throw new JSONModeParseError(
      `Model output did not match schema: ${validation.error.message}`,
      raw,
      routerResult,
      validation.error,
    );
  }

  return { data: validation.data as z.infer<T>, raw, routerResult };
}

/**
 * Strip markdown fences and return the first balanced {...} substring.
 * Returns null if no JSON object is found.
 */
function extractJSON(text: string): string | null {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = firstBrace; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return cleaned.slice(firstBrace, i + 1);
    }
  }
  return null;
}
