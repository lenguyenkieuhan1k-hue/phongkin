import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  client.on('error', (err) => {
    console.warn('Redis connection error (non-fatal):', err.message);
  });

  client.on('connect', () => {
    console.log('Redis connected');
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export default redis;

// Redis key patterns
export const REDIS_KEYS = {
  session: (token: string) => `session:${token}`,
  presence: (darkId: string) => `presence:${darkId}`,
  darkIdToSession: (darkId: string) => `darkId:${darkId}`,
  roomMeta: (roomId: string) => `room:${roomId}:meta`,
  roomRecent: (roomId: string) => `room:${roomId}:recent`,
  roomTyping: (roomId: string) => `room:${roomId}:typing`,
  invite: (darkId: string) => `invite:${darkId}`,
  rateLimit: (token: string, action: string) => `rl:${token}:${action}`,
} as const;

// Session TTL: 2 hours
export const SESSION_TTL = 2 * 60 * 60;

// Presence TTL: 30 seconds (refreshed by heartbeat)
export const PRESENCE_TTL = 30;

// Typing indicator TTL: 10 seconds
export const TYPING_TTL = 10;

// Invite TTL: 30 minutes
export const INVITE_TTL = 30 * 60;
