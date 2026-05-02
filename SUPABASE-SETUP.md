# Supabase Setup (Phase 2)

This guide gets you from zero to a fully working Supabase backend in ~10 minutes.
Until you complete it, the app keeps using its localStorage auth fallback (so it
still works for demos), but you do not get real auth, server-side sessions, or
DB-backed preferences.

## 1. Create a Supabase project

1. Go to <https://supabase.com> → "New project".
2. Pick a region close to your users (e.g. Frankfurt for EU).
3. Save the database password somewhere safe — you can't see it again.
4. Wait ~2 minutes for provisioning.

## 2. Apply the schema

Two options:

### Option A: SQL Editor (fastest)

1. In your Supabase project dashboard → **SQL Editor** → "New query".
2. Open `supabase/migrations/0001_initial_schema.sql` from this repo.
3. Paste its full contents into the editor.
4. Click "Run". You should see `Success. No rows returned`.

### Option B: Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

## 3. Copy your keys

In the Supabase dashboard:

- **Project Settings → API** → copy:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ The `service_role` key bypasses Row-Level Security. Never commit it,
never log it, never expose it to the browser. Only put it in `.env.local`.

## 4. Configure auth

In the Supabase dashboard:

1. **Authentication → Providers** → Email is enabled by default. Good.
2. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (dev) or your production domain
   - Redirect URLs: add `http://localhost:3000/**` and your production domain
3. **Authentication → Email Templates** (optional): customize the
   confirmation email branding.

For Google / GitHub OAuth (planned for Phase 2 follow-up):

1. Create OAuth credentials in the provider's developer console.
2. Authentication → Providers → enable Google / GitHub, paste credentials.

## 5. Update `.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
TRIAL_MAX_USES=1
TRIAL_HASH_SALT=<long-random-string-of-your-choosing>
```

Restart the dev server after editing `.env.local`.

## 6. Verify

1. Start the dev server: `npm run dev`
2. Register a new account at `/register`. The auth backend now uses Supabase.
3. In Supabase dashboard → **Table Editor → profiles** → you should see
   your new profile row, auto-created by the `on_auth_user_created` trigger.
4. Open `/settings → AI Models`, change a setting, click Save. Look at
   **Table Editor → ai_preferences** — your preferences appear there.
5. Open in an incognito window, ask a question. Look at **Table Editor →
   trial_uses** — you'll see one row with a hashed IP and count=1.

## How fallback works

The app gracefully runs without Supabase configured:

| Capability | With Supabase | Without Supabase |
|---|---|---|
| Auth | Real users in `auth.users` + `profiles` | localStorage |
| Sessions | HttpOnly cookies, server-validated | localStorage |
| AI preferences | DB-backed | HttpOnly cookie |
| Trial counter | Server-side, IP-hashed | localStorage (bypassable) |
| History / processes | localStorage (Phase 2E migration pending) | localStorage |
| Account deletion | `/api/account/delete` calls Supabase admin | localStorage cleanup only |

## Troubleshooting

**"Auth session missing!" on signup** — your project URL or anon key is
wrong. Re-copy them from Project Settings → API.

**Profile row not created on signup** — check that the
`on_auth_user_created` trigger ran. Re-apply migration 0001.

**RLS policy violations when reading own data** — the user is not
authenticated server-side. Confirm `proxy.ts` is at the project root
(Next.js 16 renamed middleware.ts → proxy.ts). Restart dev server.

**Trial counter never increments** — verify `SUPABASE_SERVICE_ROLE_KEY`
is set; the trial endpoint requires service role to write across users.
Check the browser network tab for `/api/trial` POST responses.
