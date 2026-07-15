// Rate limiting via Redis (for multi-instance deployments)
// Drop-in replacement for src/lib/rateLimit.ts
//
// Uses a fixed-window counter in Redis. Atomic increment via INCR.
//
// OLD: in-memory Map (lost on restart, doesn't share between instances)
// NEW: Redis (persistent, shared, scales horizontally)

import { redis, REDIS_KEYS } from './redis';

interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  session: { limit: 3, windowSeconds: 3600 },
  message: { limit: 30, windowSeconds: 10 },
  invite: { limit: 10, windowSeconds: 3600 },
  upload: { limit: 5, windowSeconds: 3600 },
  presign: { limit: 20, windowSeconds: 60 },
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check + consume rate limit quota for (identifier, action).
 * Atomic via Redis INCR.
 *
 * Falls back to "allow" if Redis is unavailable (fail-open).
 */
export async function checkRateLimit(
  identifier: string,
  action: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[action];
  if (!config) {
    return { allowed: true, remaining: Infinity, resetAt: 0 };
  }

  const key = REDIS_KEYS.rateLimit(identifier, action);

  try {
    const count = await redis.incr(key);

    if (count === 1) {
      // First request in window - set TTL
      await redis.expire(key, config.windowSeconds);
    }

    const ttl = await redis.ttl(key);
    const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : 0);
    const allowed = count <= config.limit;
    const remaining = Math.max(0, config.limit - count);

    return { allowed, remaining, resetAt };
  } catch (err) {
    console.warn('[rateLimit] Redis unavailable, fail-open:', (err as Error).message);
    return { allowed: true, remaining: config.limit, resetAt: Date.now() + config.windowSeconds * 1000 };
  }
}

/**
 * Check rate limit WITHOUT consuming (for status display).
 */
export async function getRateLimitStatus(
  identifier: string,
  action: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[action];
  if (!config) {
    return { allowed: true, remaining: Infinity, resetAt: 0 };
  }

  const key = REDIS_KEYS.rateLimit(identifier, action);

  try {
    const [count, ttl] = await Promise.all([
      redis.get(key),
      redis.ttl(key),
    ]);

    const currentCount = count ? parseInt(count, 10) : 0;
    const remaining = Math.max(0, config.limit - currentCount);
    const resetAt = ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + config.windowSeconds * 1000;
    const allowed = currentCount < config.limit;

    return { allowed, remaining, resetAt };
  } catch {
    return {
      allowed: true,
      remaining: config.limit,
      resetAt: Date.now() + config.windowSeconds * 1000,
    };
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return '127.0.0.1';
}
