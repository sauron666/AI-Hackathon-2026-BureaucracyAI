/**
 * GET    /api/history       — list current user's question history
 * POST   /api/history       — append one history item
 * DELETE /api/history?id=x  — delete one item, or DELETE /api/history (no query) to clear all
 *
 * Authentication required. Returns 401 when anonymous (the localStorage
 * fallback in the client hooks handles that case without server help).
 */

import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

const historyItemSchema = z.object({
  id: z.string().uuid().optional(),
  thread_id: z.string().max(120).nullable().optional(),
  context_id: z.string().max(120).nullable().optional(),
  question: z.string().min(1).max(8000),
  display_question: z.string().max(8000).nullable().optional(),
  response: z.record(z.unknown()).nullable().optional(),
  country: z.string().max(8).nullable().optional(),
  language: z.string().max(8).nullable().optional(),
  is_document_analysis: z.boolean().optional(),
  temporary: z.boolean().optional(),
  created_at: z.string().datetime().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return Response.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('question_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

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

  const parsed = historyItemSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid item', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Skip temporary items entirely — they are by definition not persisted.
  if (parsed.data.temporary) {
    return Response.json({ skipped: 'temporary' });
  }

  const row = {
    user_id: user.id,
    thread_id: parsed.data.thread_id ?? null,
    context_id: parsed.data.context_id ?? null,
    question: parsed.data.question,
    display_question: parsed.data.display_question ?? null,
    response: parsed.data.response ?? null,
    country: parsed.data.country ?? null,
    language: parsed.data.language ?? null,
    is_document_analysis: parsed.data.is_document_analysis ?? false,
    temporary: false,
    ...(parsed.data.id ? { id: parsed.data.id } : {}),
  };

  const { data, error } = await supabase
    .from('question_history')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ item: data });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return Response.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  let query = supabase.from('question_history').delete().eq('user_id', user.id);
  if (id) query = query.eq('id', id);

  const { error } = await query;
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
