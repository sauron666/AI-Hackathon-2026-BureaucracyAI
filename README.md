# FormWise — AI Bureaucracy Navigator

> AI-powered assistant that helps anyone navigate government bureaucracy in any
> European country (and beyond). Ask questions, upload documents for risk
> analysis, plan international relocations, compare countries — all grounded in
> official sources. Originally built for the Sirma AI Hackathon 2026 (winner)
> and now growing into a production SaaS.

[![Build](https://img.shields.io/badge/build-passing-success)](#)
[![Vulnerabilities](https://img.shields.io/badge/vulnerabilities-0-success)](#)
[![Security](https://img.shields.io/badge/security-CSP%20%2B%20HSTS%20%2B%20CSRF-blue)](SECURITY.md)
[![Plans](https://img.shields.io/badge/plans-Free%20%7C%20Pro%20%E2%82%AC9%20%7C%20Business%20%E2%82%AC29-purple)](#monetization)

---

## Quick start

```bash
# 1. Install deps
npm install

# 2. Configure env
cp .env.local.example .env.local
# Open .env.local and fill in at least ONE AI provider key
#   (or keep using Sirma — the hackathon default).

# 3. Run
npm run dev
```

Open <http://localhost:3000>. Register → land on the dashboard → ask a question.

The app gracefully degrades: without Supabase, it falls back to localStorage
auth and trial counter. Without LemonSqueezy, the Billing tab shows the plan
picker but checkout is disabled. **Each integration is opt-in.**

---

## Features

### For users
- **Ask** any bureaucracy question → get structured step-by-step guidance with
  legal foundation, costs, timeline, office info, warnings, and follow-ups.
- **Upload a document** (lease, contract, official letter) → AI risk analysis
  with severity-graded clause flagging.
- **Plan a relocation** between any two countries with a phased roadmap.
- **Compare countries** side-by-side for the same procedure.
- **Browse procedures** by category and country (RAG-backed catalog).
- **Track processes** — turn an answer into an active checklist with progress.
- **Multilingual UI** — English, Bulgarian, German.
- **PDF export** of any answer (browser print, branded).
- **Calendar export** (.ics) of process steps and deadlines.
- **Installable PWA** — add to home screen on mobile, basic offline shell.

### For developers
- **Provider-agnostic AI router** — Sirma / Anthropic / OpenAI / Google Gemini /
  Cohere / local Ollama. Switch per-account via `/settings → AI Models`.
- **Settings page** with dev tab exposing env diagnostics, force-fail testing,
  and Supabase setup verification.
- **Full TypeScript with strict build** (`ignoreBuildErrors: false`).

### Security
- HSTS preload + strict CSP + COOP/COEP + frame-ancestors none
- Double-submit-cookie CSRF on all mutating routes
- Per-route, per-plan rate limits (in-memory + optional Upstash Redis)
- PII redaction in logs (email, phone, IBAN, EGN, JWT, API keys)
- Append-only audit log for sensitive ops
- Row-Level Security (RLS) on every public Supabase table
- Server-side hashed-IP trial counter (no raw IPs stored)
- 0 known dependency vulnerabilities

### Monetization
- 3 plans: **Free** (5 questions / 1 doc per month), **Pro €9** (200 / unlimited),
  **Business €29** (1000 per seat / API access / 5 seats)
- Pay-per-document analysis (€2 one-time) for non-subscribers
- LemonSqueezy as merchant of record — handles EU VAT collection automatically
- Customer portal redirect for self-service plan changes

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Next.js 16 (App Router, Turbopack, React 19)                │
│  ├─ proxy.ts          Supabase session refresh + CSRF gate   │
│  ├─ Providers         Auth · i18n · Theme · DataSync · CSRF  │
│  └─ Routes                                                    │
│     ├─ /                     Landing                          │
│     ├─ /(auth)/login,        Email + password                 │
│     │  /register             (OAuth coming)                   │
│     └─ /(app)/               Authenticated shell              │
│        ├─ /dashboard         Stats + priorities + activity    │
│        ├─ /ask               Q&A with RAG + chat threads      │
│        ├─ /browse            Procedure catalog                │
│        ├─ /history           Saved questions                  │
│        └─ /settings          AI · Billing · Account · Privacy │
│                              · Notifications · Developer      │
├──────────────────────────────────────────────────────────────┤
│  API routes (server functions)                                │
│  ├─ /api/ask, chat, analyze, compare, journey  AI router      │
│  ├─ /api/billing/*           checkout · portal · webhook · usage │
│  ├─ /api/history, processes  CRUD on user data                │
│  ├─ /api/migrate             localStorage → DB on first login │
│  ├─ /api/trial               Anonymous quota by hashed IP     │
│  ├─ /api/account/delete      Cascade-delete via service role  │
│  └─ /api/settings/*          prefs · providers · env diag     │
├──────────────────────────────────────────────────────────────┤
│  lib/                                                         │
│  ├─ ai/                AI abstraction                         │
│  │  ├─ providers/      sirma · anthropic · openai · google ·  │
│  │  │                  cohere · ollama (unified interface)    │
│  │  ├─ router.ts       Priority chain + fallback              │
│  │  ├─ json-mode.ts    Provider-agnostic structured output    │
│  │  └─ user-preferences.ts  DB-backed when auth, cookie else  │
│  ├─ supabase/          Browser · server · admin clients       │
│  ├─ auth/              Server + client auth helpers           │
│  ├─ billing/           plans · lemonsqueezy · quota           │
│  ├─ security/          rate-limit · csrf · redact · audit     │
│  ├─ email/             Resend client + templates              │
│  ├─ analytics/         PostHog (no SDK, no autocapture)       │
│  ├─ export/            PDF (browser print) · ICS calendar     │
│  ├─ sync/              localStorage → DB migration hook       │
│  └─ trial/             Server + client trial state            │
├──────────────────────────────────────────────────────────────┤
│  External services                                            │
│  ├─ Supabase           Postgres + Auth + RLS                  │
│  ├─ Upstash Redis      Distributed rate limiting (optional)   │
│  ├─ LemonSqueezy       Billing + EU VAT (optional, Phase 4)   │
│  ├─ Resend             Transactional email (optional)         │
│  ├─ UploadThing        File uploads                           │
│  ├─ ChromaDB           Vector store for RAG                   │
│  └─ AI providers       Sirma + Anthropic + OpenAI + Google +  │
│                        Cohere + local Ollama                  │
└──────────────────────────────────────────────────────────────┘
```

---

## Setup guides

| Goal | Document |
|---|---|
| Apply Supabase schema + configure auth | [SUPABASE-SETUP.md](SUPABASE-SETUP.md) |
| Deploy to Vercel | [VERCEL-DEPLOYMENT.md](VERCEL-DEPLOYMENT.md) |
| Report a security issue | [SECURITY.md](SECURITY.md) |
| Raw env var template | [.env.local.example](.env.local.example) |
| Database migrations | [supabase/migrations/](supabase/migrations/) |

### Minimum viable setup (5 minutes, no real services)

You can run the app with **only** the AI provider configured. Auth falls back
to localStorage, trial counter to localStorage, billing tab is dormant.

```bash
# .env.local
SIRMA_API_KEY=...           # or ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.
SIRMA_AGENT_ID=...
NEXT_PUBLIC_DEV_SETTINGS=true
```

### Production setup (real services)

1. **Supabase** — apply both migrations:
   - [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql) (profiles, prefs, history, processes, audit, RLS)
   - [`supabase/migrations/0002_billing.sql`](supabase/migrations/0002_billing.sql) (subscriptions, billing_events, RPCs)
2. **Upstash Redis** — for cross-instance rate limiting on serverless.
3. **LemonSqueezy** — store + 2 subscription products + webhook endpoint.
4. **Resend** — verified sender domain for transactional emails.
5. **Vercel** — paste env vars, deploy. See [VERCEL-DEPLOYMENT.md](VERCEL-DEPLOYMENT.md).

---

## Available commands

```bash
npm run dev          # Start dev server on :3000
npm run build        # Production build (strict TS check)
npm start            # Start production server
npm run lint         # ESLint
npx tsc --noEmit     # Standalone type check
npm audit            # Should report 0 vulnerabilities
```

### Sirma KB helper (legacy — kept for hackathon reproducibility)

```powershell
npx tsx scripts/sirma-kb.ts providers
npx tsx scripts/sirma-kb.ts list
npx tsx scripts/sirma-kb.ts create --project-id 295 --name "Dev1 KB" --llm-config-id 1611 --embedding-model-id gemini-embedding-001
npx tsx scripts/sirma-kb.ts upload --vector-store-id <ID> --file path/to/data.md
```

### AI route smoke tests

```bash
pip install -r requirements.txt
npm run dev
python scripts/run_dev2_routes.py
pytest tests/test_dev2_routes.py
```

---

## Tech stack

- **Framework:** Next.js 16 + React 19 + TypeScript 5.7
- **UI:** Tailwind CSS 4 + shadcn/ui + Radix primitives + Motion (framer)
- **Database / Auth:** Supabase (Postgres + Auth + RLS)
- **AI:** Provider-agnostic router (Sirma / Anthropic / OpenAI / Gemini / Cohere / Ollama)
- **Vector DB:** ChromaDB
- **Billing:** LemonSqueezy (EU VAT included)
- **Rate limit:** Upstash Redis (with in-memory fallback)
- **Email:** Resend
- **Telemetry:** PostHog (custom client, no SDK, opt-out aware)
- **Hosting:** Vercel-friendly (also runs on any Node 20+ platform)

---

## Project status

| Phase | Scope | Status |
|---|---|---|
| 1 | Multi-provider AI router + Settings page | ✅ Done |
| 2 | Real backend auth + DB-backed prefs + history sync | ✅ Done |
| 3 | Security hardening (CSP, CSRF, rate limit, PII redaction, audit) | ✅ Done |
| 4 | Monetization (LemonSqueezy + plans + paywall + customer portal) | ✅ Done |
| 5 | Plan-aware limits, full i18n for new UI, PDF/ICS export, PWA, PostHog | ✅ Done |
| 6 | Streaming UI, wizard mode, OAuth, 2FA, team seats, A/B testing | 🔜 Planned |

See individual setup guides for what's required vs optional in each phase.

---



## License

Proprietary — all rights reserved. © FormWise contributors.
