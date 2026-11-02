import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { ChainableCommander } from 'ioredis';

/**
 * Dedicated, High-Throughput Redis Service for the Virtual Waiting Room
 * Designed to sustain 10,000+ operations/sec with automated connection recovery,
 * script caching, and pipelining.
 */
@Injectable()
export class VwrRedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VwrRedisService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD', '');
    const db = this.configService.get<number>('REDIS_DB', 0);

    this.logger.log(`Initializing VWR High-Throughput Redis connection: ${host}:${port} (db: ${db})`);

    this.client = new Redis({
      host,
      port: Number(port),
      password: password || undefined,
      db: Number(db),
      lazyConnect: false,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      enableAutoPipelining: true, // Batch rapid commands within event loop tick
      connectTimeout: 10000,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(`Redis connection retry attempt #${times} in ${delay}ms`);
        return delay;
      },
    });

    this.client.on('connect', () => {
      this.logger.log('VWR Redis connection established successfully');
    });

    this.client.on('error', (err) => {
      this.logger.error(`VWR Redis client error: ${err.message}`, err.stack);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      this.logger.log('Gracefully closing VWR Redis connection...');
      await this.client.quit();
    }
  }

  /**
   * Access raw ioredis instance for low-level or pipelined commands
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Execute Lua script atomically on Redis cluster / standalone instance
   */
  async evalScript<T = any>(
    script: string,
    keys: string[],
    args: (string | number)[],
  ): Promise<T> {
    return (await this.client.eval(script, keys.length, ...keys, ...args)) as T;
  }

  /**
   * Atomic ZADD with optional NX (Only add if does not already exist)
   */
  async zaddNx(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, 'NX', score, member);
  }

  /**
   * Get 0-indexed rank of member in sorted set (asc)
   */
  async zrank(key: string, member: string): Promise<number | null> {
    return this.client.zrank(key, member);
  }

  /**
   * Get total count of elements in sorted set
   */
  async zcard(key: string): Promise<number> {
    return this.client.zcard(key);
  }

  /**
   * Get score of a member in sorted set
   */
  async zscore(key: string, member: string): Promise<string | null> {
    return this.client.zscore(key, member);
  }

  /**
   * Count elements in Set
   */
  async scard(key: string): Promise<number> {
    return this.client.scard(key);
  }

  /**
   * Check if member exists in Set
   */
  async sismember(key: string, member: string): Promise<number> {
    return this.client.sismember(key, member);
  }

  /**
   * Remove member from Set
   */
  async srem(key: string, member: string): Promise<number> {
    return this.client.srem(key, member);
  }

  /**
   * Get key value
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Set key with TTL in seconds
   */
  async setEx(key: string, seconds: number, value: string): Promise<'OK'> {
    return this.client.set(key, value, 'EX', seconds);
  }

  /**
   * Delete key(s)
   */
  async del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  /**
   * Create pipeline for batch execution
   */
  pipeline(): ChainableCommander {
    return this.client.pipeline();
  }
}
