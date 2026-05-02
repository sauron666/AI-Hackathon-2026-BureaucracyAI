import {
  AIPreferencesSchema,
  clearUserAIPreferences,
  getUserAIPreferences,
  saveUserAIPreferences,
} from '@/lib/ai/user-preferences';

export async function GET() {
  const prefs = await getUserAIPreferences();
  return Response.json({ preferences: prefs });
}

export async function PUT(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = AIPreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid preferences', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const saved = await saveUserAIPreferences(parsed.data);
  return Response.json({ preferences: saved });
}

export async function DELETE() {
  await clearUserAIPreferences();
  return Response.json({ ok: true });
}
