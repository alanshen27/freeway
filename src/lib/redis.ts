import IORedis, { type Redis } from "ioredis";
import { env } from "./env";

const globalForRedis = globalThis as unknown as { redis?: Redis };

/**
 * Shared ioredis connection for BullMQ. Returns null when REDIS_URL is unset,
 * in which case the pipeline runs inline (see lib/queue.ts).
 */
export function getRedis(): Redis | null {
  if (!env.redisUrl) return null;
  if (!globalForRedis.redis) {
    globalForRedis.redis = new IORedis(env.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return globalForRedis.redis;
}
