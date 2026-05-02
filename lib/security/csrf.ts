/**
 * CSRF protection using the double-submit cookie pattern.
 *
 * How it works:
 *   1. The proxy (proxy.ts) ensures every response sets a non-HttpOnly
 *      cookie `fw_csrf` containing a random 32-byte hex token.
 *   2. The browser reads that cookie via JS and echoes its value in the
 *      `x-csrf-token` request header on every state-changing request.
 *   3. This module compares the cookie and the header. If they match, the
 *      request is from our origin (because cross-origin JS cannot read our
 *      cookie). If they don't match, return 403.
 *
 * Why this is safer than no CSRF token:
 *   - SameSite=Lax cookies still leak via top-level navigation POSTs in
 *     some browsers/configs.
 *   - Defense in depth: even if SameSite is bypassed, the attacker can't
 *     read our cookie to put it in the header.
 *
 * Exempt routes:
 *   - GET, HEAD, OPTIONS — by spec, never state-changing.
 *   - Webhook endpoints (none yet, will add for Phase 4 LemonSqueezy).
 *   - File upload routes that auth via their own signed URL (UploadThing).
 */

import { randomBytes } from 'crypto';

const CSRF_COOKIE = 'fw_csrf';
const CSRF_HEADER = 'x-csrf-token';
const TOKEN_BYTES = 32;

/** Generate a fresh random token. */
export function generateCsrfToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex');
}

export const CSRF_COOKIE_NAME = CSRF_COOKIE;
export const CSRF_HEADER_NAME = CSRF_HEADER;

/**
 * Returns true when the request is exempt from CSRF checks.
 * GET/HEAD/OPTIONS are never state-changing per HTTP spec.
 */
export function isCsrfExempt(method: string, pathname: string): boolean {
  const m = method.toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return true;

  // Webhook endpoints have their own signature verification.
  const exemptPaths = [
    '/api/uploadthing',     // server-to-server callback
    '/api/billing/webhook', // LemonSqueezy webhook (HMAC-verified)
  ];
  return exemptPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/** Compare the cookie value to the request header. Returns true on match. */
export function verifyCsrfFromRequest(req: Request): boolean {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookieToken = parseCookie(cookieHeader, CSRF_COOKIE);
  const headerToken = req.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;

  // Constant-time compare via Buffer
  return safeEqual(cookieToken, headerToken);
}

function parseCookie(header: string, name: string): string | null {
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
