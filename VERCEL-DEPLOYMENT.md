# Vercel Deployment

This guide walks you from a working local setup to a production deployment
on Vercel. Estimated time: 15 minutes.

## Prerequisites

Before starting:
- ✅ Supabase project up and migration applied (see [SUPABASE-SETUP.md](SUPABASE-SETUP.md))
- ✅ Upstash Redis database created (see step 2 below)
- ✅ Resend account with verified sender domain
- ✅ Optional: LemonSqueezy store set up (for billing — Phase 4)

## 1. Push to GitHub

Vercel deploys from a Git repository.

```bash
git init  # if not already a repo
git add -A
git commit -m "ready for deploy"
git remote add origin git@github.com:<your-user>/<your-repo>.git
git push -u origin main
```

⚠️ Make sure `.env.local` is in `.gitignore` (it already is). Never commit secrets.

## 2. Create the Upstash Redis database

1. Go to <https://upstash.com> → "Create database".
2. Region: pick the same region as your Vercel deployment (Frankfurt for EU).
3. Type: **Regional** (not Global) for fastest writes.
4. After creation → "REST API" tab → copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

## 3. Import to Vercel

1. <https://vercel.com/new> → "Import Git Repository" → pick your repo.
2. Framework: **Next.js** (auto-detected).
3. Root directory: `.` (default).
4. Build command: `next build` (default).
5. Output: `.next` (default).
6. Install command: `npm install`.
7. **Don't deploy yet** — set env vars first (next step).

## 4. Set environment variables

In the Vercel project settings → **Environment Variables**, add each row.
Use **Production** for the live site; tick **Preview** if you want them
in preview deployments too.

Required:

| Key | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_…` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_…` | **Sensitive** — production env only |
| `TRIAL_HASH_SALT` | 32+ random chars | Generate fresh, never share |
| `TRIAL_MAX_USES` | `1` | Or `3` if you want to be more generous |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` | Your production URL |
| `AI_PROVIDER` | `sirma` (or whichever) | Default for the router |
| `SIRMA_API_KEY` | (your key) | If using Sirma |
| `SIRMA_AGENT_ID` | (your id) | If using Sirma |
| `ANTHROPIC_API_KEY` | (your key) | If using Claude |
| `OPENAI_API_KEY` | (your key) | If using GPT or embeddings |
| `GOOGLE_API_KEY` | (your key) | If using Gemini |
| `COHERE_API_KEY` | (your key) | If using Cohere |
| `UPLOADTHING_SECRET` | `sk_live_…` | File uploads |
| `NEXT_PUBLIC_UPLOADTHING_APP_ID` | (your id) | Public, OK in client |
| `UPSTASH_REDIS_REST_URL` | `https://xxx.upstash.io` | Distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | (your token) | **Sensitive** |
| `RESEND_API_KEY` | `re_…` | Transactional email |
| `RESEND_FROM_EMAIL` | `FormWise <noreply@yourdomain.com>` | Verified sender |
| `RESEND_REPLY_TO` | `support@yourdomain.com` | Optional |

Optional (Phase 4):

| Key | Value |
|---|---|
| `LEMONSQUEEZY_API_KEY` | (your key) |
| `LEMONSQUEEZY_STORE_ID` | (your store id) |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | (your webhook secret) |
| `LEMONSQUEEZY_VARIANT_ID_PRO` | Pro plan variant id |
| `LEMONSQUEEZY_VARIANT_ID_BUSINESS` | Business plan variant id |

⚠️ Never set `NEXT_PUBLIC_DEV_SETTINGS=true` in production. The Developer
tab exposes env metadata to logged-in users; in prod it must remain off.

## 5. Configure Supabase for the production URL

Once you have the Vercel URL (e.g. `https://your-app.vercel.app` or your
custom domain):

1. Supabase dashboard → **Authentication → URL Configuration**:
   - Site URL: `https://your-domain.com`
   - Redirect URLs: add `https://your-domain.com/**`
2. **Authentication → Providers → Email**: re-enable "Confirm email" for
   production (you may have turned it off for local testing).
3. **Authentication → SMTP Settings**: connect Resend so confirmation
   emails actually deliver.
   - Host: `smtp.resend.com`
   - Port: `465` (SSL) or `587` (TLS)
   - Username: `resend`
   - Password: your `RESEND_API_KEY`
   - Sender: `noreply@yourdomain.com` (must be verified in Resend)

## 6. Deploy

Click **Deploy** in Vercel. First build takes ~2 minutes.

When it's green:
- Visit `https://your-app.vercel.app/api/health` — should return 200 with chromadb status.
- Visit `https://your-app.vercel.app/.well-known/security.txt` — should return your security.txt.
- Sign up with a real email; confirm via inbox.
- Open `/settings → Developer → Run diagnostic` (only if `NEXT_PUBLIC_DEV_SETTINGS` is on; off in prod).

## 7. Custom domain

In Vercel → **Settings → Domains** → add your domain. Vercel will give
you DNS records to point at their nameservers. After DNS propagates, the
SSL cert is auto-provisioned via Let's Encrypt.

Update `NEXT_PUBLIC_APP_URL` env var to the new domain and re-deploy.

## 8. Background tasks (optional)

Some flows need a cron schedule:
- Daily deadline reminders → Vercel Cron Jobs (`vercel.json`).
- Weekly digest → Vercel Cron at `0 9 * * 1`.

Add a `vercel.json` at repo root:

```json
{
  "crons": [
    { "path": "/api/cron/deadline-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/weekly-digest", "schedule": "0 9 * * 1" }
  ]
}
```

These endpoints will be wired up in a later phase. For now they don't exist.

## 9. Production hardening checklist

Before announcing the launch:

- [ ] All API keys rotated since the last time they appeared in any chat / commit / Slack
- [ ] `NEXT_PUBLIC_DEV_SETTINGS` is **unset** or `false` in production env
- [ ] `TRIAL_HASH_SALT` is unique and kept private
- [ ] Supabase Confirm Email is **on**
- [ ] Resend sender domain is verified
- [ ] `SECURITY.md` and `security.txt` reference a real email you monitor
- [ ] DNS HSTS preload submitted at <https://hstspreload.org>
- [ ] CSP tested with [csp-evaluator.withgoogle.com](https://csp-evaluator.withgoogle.com)
- [ ] You can sign up + log in via the production URL
- [ ] Rate limit returns HTTP 429 after 31 rapid `/api/ask` POSTs
- [ ] CSRF returns HTTP 403 on POST without `x-csrf-token` header
- [ ] Vercel Analytics enabled in production builds (already wired)

## Troubleshooting

**"Module not found: '@/lib/...'"** — `tsconfig.json` paths are correct,
but Vercel uses a clean install. Run `npm install` locally and commit
`package-lock.json` so Vercel resolves the same versions.

**Build OOM** — Next 16 with Turbopack can spike to 4GB on large pages.
Vercel free tier limit is 8GB during build, so this rarely matters in
practice. If it does, switch to webpack via `next.config.mjs` (`turbopack: false`).

**"Function timeout (10s)"** — The free Vercel tier has a 10s function
limit. Our AI routes use `maxDuration = 60` which requires the Pro plan.
If you stay on Free tier, set `maxDuration = 10` on `/api/ask`,
`/api/analyze`, `/api/chat`, `/api/compare`, `/api/journey`.

**Supabase RLS blocks reads** — Confirm the user actually has a session
on the deployed domain (not just localhost). Vercel preview deployments
have unique URLs that need to be in Supabase's allowed redirect URL list.
