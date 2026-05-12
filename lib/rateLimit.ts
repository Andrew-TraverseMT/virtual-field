/**
 * lib/rateLimit.ts
 *
 * Simple in-memory rate limiter.
 * Works correctly for single-process deployments (local dev, single-instance).
 * On Vercel serverless each function instance has its own memory — limits are
 * per-instance rather than global. See SETUP.md for upgrading to Vercel KV.
 */

const store = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000  // 15 minutes
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterSec: 0 }
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { ok: true, retryAfterSec: 0 }
}

/** Extract the most useful client IP from request headers. */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    'unknown'
  )
}
