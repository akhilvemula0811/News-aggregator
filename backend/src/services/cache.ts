import { createClient } from 'redis';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

type RedisClientType = ReturnType<typeof createClient>;

class CacheService {
  private redisClient: RedisClientType | null = null;
  private memoryCache: NodeCache | null = null;
  private isRedisConnected = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      console.log('[Cache] Redis URL found. Attempting to connect...');
      this.redisClient = createClient({ url: redisUrl });
      
      this.redisClient.on('error', (err) => {
        console.error('[Cache] Redis error, falling back to memory cache:', err.message);
        this.isRedisConnected = false;
        this.initMemoryCache();
      });

      this.redisClient.on('connect', () => {
        console.log('[Cache] Redis client connected successfully.');
        this.isRedisConnected = true;
      });

      this.redisClient.connect().catch((err) => {
        console.error('[Cache] Failed to connect to Redis, using memory cache fallback:', err.message);
        this.isRedisConnected = false;
        this.initMemoryCache();
      });
    } else {
      console.log('[Cache] No Redis URL configured. Using in-memory cache.');
      this.initMemoryCache();
    }
  }

  private initMemoryCache() {
    if (!this.memoryCache) {
      // Default TTL of 1 hour, check period of 2 minutes
      this.memoryCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });
      console.log('[Cache] In-memory cache initialized.');
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isRedisConnected && this.redisClient) {
        const val = await this.redisClient.get(key);
        return val ? JSON.parse(val) : null;
      } else {
        this.initMemoryCache();
        const val = this.memoryCache!.get<T>(key);
        return val !== undefined ? val : null;
      }
    } catch (error) {
      console.error(`[Cache] Error getting key "${key}":`, error);
      return null;
    }
  }

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Cache value (serializable)
   * @param ttlSeconds Time-to-live in seconds (default 3600 / 1 hour)
   */
  async set(key: string, value: any, ttlSeconds = 3600): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.set(key, serialized, { EX: ttlSeconds });
        return true;
      } else {
        this.initMemoryCache();
        return this.memoryCache!.set(key, value, ttlSeconds);
      }
    } catch (error) {
      console.error(`[Cache] Error setting key "${key}":`, error);
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<boolean> {
    try {
      if (this.isRedisConnected && this.redisClient) {
        const response = await this.redisClient.del(key);
        return response > 0;
      } else {
        this.initMemoryCache();
        this.memoryCache!.del(key);
        return true;
      }
    } catch (error) {
      console.error(`[Cache] Error deleting key "${key}":`, error);
      return false;
    }
  }

  /**
   * Flush/clear cache contents
   */
  async flush(): Promise<boolean> {
    try {
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.flushAll();
        console.log('[Cache] Redis cache flushed.');
        return true;
      } else {
        this.initMemoryCache();
        this.memoryCache!.flushAll();
        console.log('[Cache] In-memory cache flushed.');
        return true;
      }
    } catch (error) {
      console.error('[Cache] Error flushing cache:', error);
      return false;
    }
  }
}

export const cache = new CacheService();
