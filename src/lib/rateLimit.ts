// In-memory rate limiting
declare global {
  // eslint-disable-next-line no-var
  var __darktalkRateLimit: Map<string, { count: number; resetAt: number }> | undefined;
}

function getRateLimitStore(): Map<string, { count: number; resetAt: number }> {
  if (!globalThis.__darktalkRateLimit) {
    globalThis.__darktalkRateLimit = new Map();
  }
  return globalThis.__darktalkRateLimit;
}

interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  session: { limit: 3, windowSeconds: 3600 },
  message: { limit: 30, windowSeconds: 10 },
  invite: { limit: 10, windowSeconds: 3600 },
  upload: { limit: 5, windowSeconds: 3600 },
  presign: { limit: 20, windowSeconds: 60 },
  payment_create: { limit: 5, windowSeconds: 3600 },
  room_access: { limit: 30, windowSeconds: 60 },
};

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(
  identifier: string,
  action: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[action];
  if (!config) {
    return { allowed: true, remaining: Infinity, resetAt: 0 };
  }

  const key = `${identifier}:${action}`;
  const now = Date.now();
  const windowStart = now - config.windowSeconds * 1000;

  let record = getRateLimitStore().get(key);

  // Reset if window expired
  if (!record || record.resetAt < now) {
    record = { count: 0, resetAt: now + config.windowSeconds * 1000 };
  }

  record.count++;
  getRateLimitStore().set(key, record);

  // Cleanup old entries periodically
  if (getRateLimitStore().size > 10000) {
    for (const [k, v] of getRateLimitStore().entries()) {
      if (v.resetAt < now) {
        getRateLimitStore().delete(k);
      }
    }
  }

  const allowed = record.count <= config.limit;
  const remaining = Math.max(0, config.limit - record.count);
  const resetAt = record.resetAt;

  return { allowed, remaining, resetAt };
}

export async function getRateLimitStatus(
  identifier: string,
  action: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[action];
  if (!config) {
    return { allowed: true, remaining: Infinity, resetAt: 0 };
  }

  const key = `${identifier}:${action}`;
  const now = Date.now();

  const record = getRateLimitStore().get(key);
  if (!record || record.resetAt < now) {
    return { allowed: true, remaining: config.limit, resetAt: now + config.windowSeconds * 1000 };
  }

  const allowed = record.count < config.limit;
  const remaining = Math.max(0, config.limit - record.count);
  const resetAt = record.resetAt;

  return { allowed, remaining, resetAt };
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
