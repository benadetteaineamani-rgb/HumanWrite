/**
 * Minimal in-memory rate limiter (§20). Adequate for a single instance and
 * staging; replace with a shared store (Upstash/Redis) for multi-instance
 * production. Fails open on its own errors so it never blocks legitimate work
 * incorrectly.
 */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = 30, windowMs = 60_000): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true };
  }
  if (b.count >= limit) return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  b.count++;
  return { ok: true };
}
