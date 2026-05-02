# Security Policy

We take security of FormWise / BureaucracyAI seriously. This page describes
how to report vulnerabilities and what to expect in response.

## Reporting a vulnerability

**Please do not file public GitHub issues for security bugs.**

Email: **security@formwise.example** *(replace with your real address before
launch)*

For maximum protection, encrypt your report with our PGP key
([keys/security.asc](keys/security.asc) — *to be added*).

Include:

- A clear description of the issue.
- Steps to reproduce (PoC code where possible).
- Affected URL / route / version (commit SHA helps).
- Your suggested impact / severity rating.
- Whether you'd like public credit.

## What we promise

- **Acknowledgement within 72 hours** (often much faster).
- An initial triage assessment within 7 days.
- Regular updates while we investigate.
- Public disclosure coordinated with you, typically 90 days after fix.
- For high-severity issues fixed, public credit in our security
  acknowledgements (with your permission).

## Scope

In scope:
- The FormWise web app (any route under our production domain).
- Our public API endpoints (`/api/*`).
- Authentication, authorization, session handling.
- Data isolation between users (RLS, server-side checks).
- Server-side prompt injection or model output handling that could
  leak data across users.

Out of scope:
- Issues already publicly disclosed by third-party providers (Supabase,
  Anthropic, OpenAI, Google, Cohere, Sirma, UploadThing).
- Reports from automated scanners without manual verification.
- Self-XSS that requires the user to paste attacker-supplied text into
  their own browser console.
- Brute-force / DoS attacks against rate-limited endpoints (we already
  rate-limit; please don't help us discover the limits empirically).
- Missing security headers on third-party CDN responses outside our
  control.
- Findings that depend on a compromised user device or already-installed
  malware.

## Bug bounty

We're in pre-launch and do not yet offer monetary rewards. We do offer:

- Public credit on this page.
- Swag (T-shirt or stickers) once we have it.
- A glowing reference letter for security researchers building a portfolio.

Once we exit beta we plan to launch a paid bounty via HackerOne.

## Hardening summary (Phase 3)

To save you time when assessing the app:

- HTTPS-only via HSTS preload (max-age=2y).
- Strict CSP with no inline scripts in production.
- X-Frame-Options: DENY + frame-ancestors 'none' — no embeds anywhere.
- COOP / CORP set to same-origin / same-site.
- Permissions-Policy blocks camera, mic, geolocation, payment, USB.
- CSRF: double-submit cookie pattern on all mutating /api/ routes.
- Rate limits: per-route limits via in-memory token bucket (Upstash Redis
  in production for cross-instance enforcement).
- All auth via Supabase (Argon2id hashing; we never see raw passwords).
- Server-side trial limit by hashed IP (we never store raw IPs).
- PII redaction in logs: emails, phones, IBAN, EGN, credit cards,
  JWT/API tokens.
- RLS policies on every public table; service-role key isolated to
  server-only modules.
- Append-only audit_log captures auth, AI request, and rate-limit
  events.

## Known limitations (we know — please report new findings only)

- Anonymous trial counter is bypassable via VPN / IP rotation. By design.
- No 2FA yet — Phase 5 work.
- No client-side prompt-injection detector — rely on output schema
  validation downstream.

Thank you for helping us keep FormWise users safe.
