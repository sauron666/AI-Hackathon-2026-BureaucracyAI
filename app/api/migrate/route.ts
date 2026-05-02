/**
 * POST /api/migrate
 *
 * One-shot bulk import of localStorage data into Supabase. Called by the
 * client right after a user logs in for the first time.
 *
 * Idempotent: re-running with the same payload only inserts rows that
 * don't already exist (checked by stable id where present).
 *
 * Returns a per-table count so the UI can show "Imported N questions, M
 * processes from this device".
 */

import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

// We only validate the shape loosely — the LS data may include legacy fields
// from older versions of the app. We extract what we need and ignore extras.
const historyItemSchema = z
  .object({
    id: z.string().optional(),
    threadId: z.string().nullable().optional(),
    contextId: z.string().nullable().optional(),
    fullQuestion: z.string().min(1).max(8000),
    title: z.string().max(8000).optional(),
    response: z.record(z.unknown()).nullable().optional(),
    country: z.string().max(8).optional(),
    language: z.string().max(8).optional(),
    timestamp: z.number().int().optional(),
    documentAnalysis: z.boolean().optional(),
  })
  .passthrough();

const processSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1).max(200),
    status: z.string().max(40).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    nextStep: z.string().max(500).nullable().optional(),
    location: z.string().max(200).nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
    sourceQuestionId: z.string().nullable().optional(),
    origin: z.string().max(40).optional(),
    createdAt: z.number().int().optional(),
    updatedAt: z.number().int().optional(),
    type: z.string().max(40).optional(),
    steps: z.array(z.unknown()).optional(),
    documents: z.array(z.unknown()).optional(),
  })
  .passthrough();

const migrateSchema = z.object({
  history: z.array(historyItemSchema).max(500).default([]),
  processes: z.array(processSchema).max(200).default([]),
});

function normalizeProcessStatus(s: string | undefined): string {
  if (!s) return 'in_progress';
  return s === 'in-progress' ? 'in_progress' : s;
}

function uuidIsh(id: string | undefined): string | null {
  if (!id) return null;
  // Only accept proper UUID format. Otherwise let DB assign one.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Auth required' }, { status: 401 });

  const supabase = await getServerSupabase();
  if (!supabase) {
    return Response.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = migrateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid migration payload', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { history, processes } = parsed.data;

  // Map history items to question_history rows
  const historyRows = history
    .filter((item) => !!item.fullQuestion)
    .map((item) => {
      const created = item.timestamp ? new Date(item.timestamp).toISOString() : undefined;
      const id = uuidIsh(item.id);
      return {
        ...(id ? { id } : {}),
        user_id: user.id,
        thread_id: item.threadId ?? null,
        context_id: item.contextId ?? null,
        question: item.fullQuestion,
        display_question: item.title ?? null,
        response: item.response ?? null,
        country: item.country ?? null,
        language: item.language ?? null,
        is_document_analysis: Boolean(item.documentAnalysis),
        temporary: false,
        ...(created ? { created_at: created } : {}),
      };
    });

  // Map processes
  const processRows = processes.map((p) => {
    const id = uuidIsh(p.id);
    const created = p.createdAt ? new Date(p.createdAt).toISOString() : undefined;
    const updated = p.updatedAt ? new Date(p.updatedAt).toISOString() : undefined;
    const meta: Record<string, unknown> = {};
    if (p.type) meta.type = p.type;
    if (p.location) meta.location = p.location;
    if (Array.isArray(p.steps)) meta.steps = p.steps;
    if (Array.isArray(p.documents)) meta.documents = p.documents;
    return {
      ...(id ? { id } : {}),
      user_id: user.id,
      name: p.name,
      status: normalizeProcessStatus(p.status),
      progress: typeof p.progress === 'number' ? p.progress : 0,
      next_step: p.nextStep ?? null,
      notes: p.notes ?? null,
      source_question_id: uuidIsh(p.sourceQuestionId ?? undefined) ?? null,
      origin: p.origin === 'auto' ? 'auto' : 'manual',
      metadata: meta,
      ...(created ? { created_at: created } : {}),
      ...(updated ? { updated_at: updated } : {}),
    };
  });

  let historyInserted = 0;
  let processesInserted = 0;
  const errors: string[] = [];

  if (historyRows.length) {
    const { data, error } = await supabase
      .from('question_history')
      .upsert(historyRows, { onConflict: 'id', ignoreDuplicates: true })
      .select('id');
    if (error) errors.push(`history: ${error.message}`);
    historyInserted = data?.length ?? 0;
  }

  if (processRows.length) {
    const { data, error } = await supabase
      .from('processes')
      .upsert(processRows, { onConflict: 'id', ignoreDuplicates: true })
      .select('id');
    if (error) errors.push(`processes: ${error.message}`);
    processesInserted = data?.length ?? 0;
  }

  if (errors.length) {
    return Response.json(
      {
        ok: false,
        historyInserted,
        processesInserted,
        errors,
      },
      { status: 207 },
    );
  }

  return Response.json({
    ok: true,
    historyInserted,
    processesInserted,
  });
}
