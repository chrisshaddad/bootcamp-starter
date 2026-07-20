import { registerAs } from '@nestjs/config';

/** Fallback Redis URL — the repo's docker-compose Redis for local dev. */
export const DEFAULT_REDIS_URL = 'redis://127.0.0.1:6380';

/**
 * Redis connection for BullMQ (notifications queue). Local dev points at the
 * repo's docker-compose Redis on 127.0.0.1:6380 by default; override with
 * REDIS_URL in production (own instance / own port — never the shared infra).
 */
export const redisConfig = registerAs('redis', () => ({
  url: process.env.REDIS_URL ?? DEFAULT_REDIS_URL,
}));

/** Connection options accepted by BullMQ / ioredis. */
export interface RedisConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  retryStrategy: (times: number) => number;
}

/**
 * Parse a `redis[s]://` URL into a BullMQ/ioredis connection object. Single
 * source of truth so the queue root, the dead-letter QueueEvents listener and
 * the health indicator all connect the same way. Reconnects with backoff
 * instead of crashing when Redis is briefly unavailable.
 */
export function buildRedisConnection(
  url: string = DEFAULT_REDIS_URL,
): RedisConnectionOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    retryStrategy: (times: number) => Math.min(times * 500, 5000),
  };
}
