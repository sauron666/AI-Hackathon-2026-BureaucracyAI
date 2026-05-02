/**
 * GET    /api/processes      — list user's processes
 * POST   /api/processes      — upsert (create or update) a process
 * PATCH  /api/processes?id=x — partial update of a process
 * DELETE /api/processes?id=x — delete one (or all when no id)
 */

import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

const processSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  status: z
    .enum(['processing', 'in_progress', 'in-progress', 'waiting', 'completed', 'cancelled'])
    .optional(),
  country: z.string().max(8).nullable().optional(),
  source_question_id: z.string().uuid().nullable().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  next_step: z.string().max(500).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  origin: z.enum(['manual', 'auto']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const partialProcessSchema = processSchema.partial();

function normalizeStatus(status: string | undefined): string {
  if (!status) return 'in_progress';
  // The client uses "in-progress"; the DB enum uses "in_progress".
  return status === 'in-progress' ? 'in_progress' : status;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Auth required' }, { status: 401 });

  const supabase = await getServerSupabase();
  if (!supabase) return Response.json({ error: 'Supabase not configured' }, { status: 503 });

  const { data, error } = await supabase
    .from('processes')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Auth required' }, { status: 401 });

  const supabase = await getServerSupabase();
  if (!supabase) return Response.json({ error: 'Supabase not configured' }, { status: 503 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = processSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid process', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const row = {
    user_id: user.id,
    name: parsed.data.name,
    status: normalizeStatus(parsed.data.status),
    country: parsed.data.country ?? null,
    source_question_id: parsed.data.source_question_id ?? null,
    progress: parsed.data.progress ?? 0,
    next_step: parsed.data.next_step ?? null,
    notes: parsed.data.notes ?? null,
    origin: parsed.data.origin ?? 'manual',
    metadata: parsed.data.metadata ?? {},
    ...(parsed.data.id ? { id: parsed.data.id } : {}),
  };

  const { data, error } = await supabase
    .from('processes')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ item: data });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Auth required' }, { status: 401 });

  const supabase = await getServerSupabase();
  if (!supabase) return Response.json({ error: 'Supabase not configured' }, { status: 503 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = partialProcessSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid update', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = { ...parsed.data };
  if (typeof parsed.data.status === 'string') {
    updates.status = normalizeStatus(parsed.data.status);
  }

  const { data, error } = await supabase
    .from('processes')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ item: data });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Auth required' }, { status: 401 });

  const supabase = await getServerSupabase();
  if (!supabase) return Response.json({ error: 'Supabase not configured' }, { status: 503 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  let query = supabase.from('processes').delete().eq('user_id', user.id);
  if (id) query = query.eq('id', id);

  const { error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
