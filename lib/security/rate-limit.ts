/**
 * Rate limiting helper.
 *
 * Two backends:
 *   - in-memory token bucket (default; per-process, resets on cold start)
 *   - Upstash Redis (optional; survives cold starts, works across instances)
 *
 * Identify the bucket key by IP + (optional) user-id. For anonymous routes,
 * IP alone is fine. For authenticated, prefer `user:<id>` so a single user
 * behind NAT doesn't get rate-limited by their neighbor's traffic.
 */

import { getClientIp } from '@/lib/trial/server';

export interface RateLimitConfig {
  /** Max requests in the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
  /** Optional bucket prefix (defaults to "rl"). Use this to keep separate
   *  counters for /api/ask vs /api/analyze etc. */
  prefix?: string;
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // unix ms
  backend: 'memory' | 'upstash';
}

// ---------------------------------------------------------------------------
// In-memory backend (per Node process)
// ---------------------------------------------------------------------------

interface Bucket {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, Bucket>();

function memoryHit(key: string, cfg: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = cfg.windowSeconds * 1000;
  let bucket = memoryStore.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + windowMs };
  }
  bucket.count += 1;
  memoryStore.set(key, bucket);

  // Best-effort cleanup so the map doesn't grow forever.
  if (memoryStore.size > 5000) {
    for (const [k, v] of memoryStore) {
      if (v.resetAt < now) memoryStore.delete(k);
    }
  }

  return {
    ok: bucket.count <= cfg.limit,
    limit: cfg.limit,
    remaining: Math.max(0, cfg.limit - bucket.count),
    resetAt: bucket.resetAt,
    backend: 'memory',
  };
}

// ---------------------------------------------------------------------------
// Upstash backend (optional)
// ---------------------------------------------------------------------------

async function upstashHit(
  key: string,
  cfg: RateLimitConfig,
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  // Atomic increment + expire-if-new via Upstash REST.
  // Two round trips: INCR then TTL/EXPIRE. Safe for our purposes.
  try {
    const incrRes = await fetch(`${url}/incr/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    });
    if (!incrRes.ok) return null;
    const { result: count } = await incrRes.json();

    if (count === 1) {
      // First hit in this window — set expiry.
      await fetch(
        `${url}/expire/${encodeURIComponent(key)}/${cfg.windowSeconds}`,
        { method: 'POST', headers: { authorization: `Bearer ${token}` } },
      );
    }

    const ttlRes = await fetch(`${url}/ttl/${encodeURIComponent(key)}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const { result: ttlSeconds } = await ttlRes.json();
    const resetAt = Date.now() + Math.max(0, ttlSeconds) * 1000;

    return {
      ok: (count as number) <= cfg.limit,
      limit: cfg.limit,
      remaining: Math.max(0, cfg.limit - (count as number)),
      resetAt,
      backend: 'upstash',
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Hit the rate limiter for `key`. Returns ok=false if the limit was exceeded.
 * Caller should respond with HTTP 429 and the headers from `rateLimitHeaders`.
 */
export async function rateLimit(
  key: string,
  cfg: RateLimitConfig,
): Promise<RateLimitResult> {
  const fullKey = `${cfg.prefix ?? 'rl'}:${key}`;
  const upstash = await upstashHit(fullKey, cfg);
  if (upstash) return upstash;
  return memoryHit(fullKey, cfg);
}

/** Build standard rate-limit response headers. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
}

/** Build a key from an authenticated user id, falling back to client IP. */
export function rateLimitKey(req: Request, userId?: string | null): string {
  if (userId) return `user:${userId}`;
  return `ip:${getClientIp(req)}`;
}

/** Convenience wrapper: 429 response with proper headers. */
export function tooManyRequests(result: RateLimitResult): Response {
  return Response.json(
    {
      error: 'Too many requests',
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((result.resetAt - Date.now()) / 1000),
      ),
    },
    { status: 429, headers: rateLimitHeaders(result) },
  );
}
