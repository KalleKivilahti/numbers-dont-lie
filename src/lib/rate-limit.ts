type Bucket = { n: number; reset: number };
const store = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

/**
 * Fixed-window rate limiter (in-memory; suitable for single Node instance / Docker).
 */
export function consumeRateLimit(
  key: string,
  max: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  let b = store.get(key);
  if (!b || now >= b.reset) {
    store.set(key, { n: 1, reset: now + windowMs });
    return { ok: true };
  }
  if (b.n >= max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((b.reset - now) / 1000)),
    };
  }
  b.n += 1;
  return { ok: true };
}

export function rateLimitKey(
  req: Request,
  userId: string | undefined,
  action: string
): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  return `${action}:${userId ?? ip}`;
}
