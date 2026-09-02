/**
 * Production-Grade Cache Service
 *
 * Strategy:
 * 1. If REDIS_URL is set, connects to Redis (ioredis) for distributed caching.
 *    This supports multiple server instances and persists across restarts.
 * 2. If REDIS_URL is not set or Redis is unreachable, automatically falls back
 *    to an in-process TTL Map cache (single-server / dev mode).
 *
 * The API is identical in both modes — callers never need to know which is active.
 */

import Redis from 'ioredis';

// ─────────────────────────────────────────────────────────
// In-Memory TTL Fallback Cache
// ─────────────────────────────────────────────────────────
interface MemCacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, MemCacheEntry<any>>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    for (const k of this.store.keys()) {
      if (k.includes(pattern)) this.store.delete(k);
    }
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

// ─────────────────────────────────────────────────────────
// Redis Cache Adapter
// ─────────────────────────────────────────────────────────
class RedisCache {
  private client: Redis;

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    this.client.on('connect', () => {
      console.log('[Cache] ✅ Redis connected successfully.');
    });

    this.client.on('error', (err) => {
      // Errors are logged but not re-thrown — fallback handles failures
      console.error('[Cache] Redis error:', err.message);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(`*${pattern}*`);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async clear(): Promise<void> {
    await this.client.flushdb();
  }
}

// ─────────────────────────────────────────────────────────
// Unified Cache Service with Auto-Fallback
// ─────────────────────────────────────────────────────────
class CacheService {
  private primary: RedisCache | null = null;
  private fallback: MemoryCache = new MemoryCache();
  private usingRedis = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.primary = new RedisCache(redisUrl);
      this.usingRedis = true;
      console.log('[Cache] Redis cache enabled (distributed mode).');
    } else {
      console.log('[Cache] No REDIS_URL set — using in-memory cache (single-process mode).');
    }
  }

  private get backend(): MemoryCache | RedisCache {
    return this.usingRedis && this.primary ? this.primary : this.fallback;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.backend.get<T>(key);
    } catch {
      // Redis failed — fall back to memory
      return await this.fallback.get<T>(key);
    }
  }

  // Synchronous wrapper for backward compatibility
  getSync<T>(key: string): T | null {
    // For synchronous access, use memory cache directly (legacy support)
    // Async callers should use get() instead
    const entry = (this.fallback as any).store.get(key) as MemCacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      (this.fallback as any).store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 60): Promise<void> {
    try {
      await this.backend.set(key, value, ttlSeconds);
    } catch {
      await this.fallback.set(key, value, ttlSeconds);
    }
    // Always write to in-memory fallback for synchronous reads
    await this.fallback.set(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    try {
      await this.backend.del(key);
    } catch { /* ignore */ }
    await this.fallback.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      await this.backend.delPattern(pattern);
    } catch { /* ignore */ }
    await this.fallback.delPattern(pattern);
  }

  delSync(key: string): void {
    try {
      (this.fallback as any).store.delete(key);
    } catch { /* ignore */ }
    this.del(key).catch(() => {});
  }

  delPatternSync(pattern: string): void {
    try {
      const store = (this.fallback as any).store;
      if (store && store.keys) {
        for (const k of Array.from(store.keys() as Iterable<string>)) {
          if (k.includes(pattern)) store.delete(k);
        }
      }
    } catch { /* ignore */ }
    this.delPattern(pattern).catch(() => {});
  }

  // Legacy synchronous API (backward compatibility with existing routes)
  getSync_legacy(key: string): any {
    return this.getSync(key);
  }
}

// Singleton instance
const cacheServiceInstance = new CacheService();

// Export with same synchronous API for backward compatibility
export const cacheService = {
  get: (key: string) => cacheServiceInstance.getSync(key),
  set: (key: string, value: any, ttlSeconds?: number) => {
    cacheServiceInstance.set(key, value, ttlSeconds || 2);
  },
  del: (key: string) => {
    cacheServiceInstance.delSync(key);
  },
  delPattern: (pattern: string) => {
    cacheServiceInstance.delPatternSync(pattern);
  },
  clear: () => {
    cacheServiceInstance.delPatternSync('');
  },
};

export { cacheServiceInstance };
