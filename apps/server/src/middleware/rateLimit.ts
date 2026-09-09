// ============================================================
// CulinaryOS — PIN brute-force throttling
// In-memory per-process rate limiting for PIN-guessing endpoints.
// Counts FAILED attempts per (route, client IP); after 5 consecutive
// failures the client is locked out with exponential backoff
// (60s doubling, capped at 15 min). A successful attempt resets.
//
// NOTE: this is per-process state. For multi-instance deployments,
// replace with a shared store (e.g. Redis) behind the same interface.
// ============================================================

import type { Context, Next } from 'hono';

const MAX_FAILURES_BEFORE_LOCKOUT = 5;
const BASE_LOCKOUT_MS = 60_000; // 1 minute, doubling per additional failure
const MAX_LOCKOUT_MS = 15 * 60_000;
const MAX_BUCKETS = 20_000; // bound memory; sweep oldest-idle when exceeded

interface Bucket {
  failures: number;
  lockedUntil: number;
  lastSeen: number;
}

const buckets = new Map<string, Bucket>();

function bucketKey(c: Context): string {
  const fwd = c.req.header('x-forwarded-for');
  const ip = (fwd ? fwd.split(',')[0] : (c.req.header('x-real-ip') ?? 'unknown')).trim() || 'unknown';
  return `${c.req.path}::${ip}`;
}

function sweep(now: number): void {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, b] of buckets) {
    if (b.lockedUntil <= now && now - b.lastSeen > MAX_LOCKOUT_MS) buckets.delete(key);
    if (buckets.size <= MAX_BUCKETS) break;
  }
}

/**
 * Throttle brute-force PIN guessing on /pin-login and /verify-manager-pin.
 * Handlers must set `c.set('pinAuthFailed', true)` on a failed PIN attempt;
 * any other outcome (success, validation error) clears the counter.
 */
export async function pinRateLimit(c: Context, next: Next) {
  const now = Date.now();
  sweep(now);
  const key = bucketKey(c);
  const bucket = buckets.get(key);

  if (bucket && bucket.lockedUntil > now) {
    const retryAfter = Math.ceil((bucket.lockedUntil - now) / 1000);
    c.header('Retry-After', String(retryAfter));
    return c.json(
      {
        ok: false,
        error: {
          code: 'RATE_LIMITED',
          message: `Too many failed PIN attempts. Try again in ${retryAfter} seconds.`,
        },
      },
      429
    );
  }

  await next();

  if (c.get('pinAuthFailed') === true) {
    const b = buckets.get(key) ?? { failures: 0, lockedUntil: 0, lastSeen: now };
    b.failures += 1;
    b.lastSeen = now;
    if (b.failures >= MAX_FAILURES_BEFORE_LOCKOUT) {
      const over = b.failures - MAX_FAILURES_BEFORE_LOCKOUT;
      b.lockedUntil = now + Math.min(BASE_LOCKOUT_MS * 2 ** over, MAX_LOCKOUT_MS);
    }
    buckets.set(key, b);
  } else {
    // Success, validation error, or any non-auth-failure outcome clears the counter.
    buckets.delete(key);
  }
}
