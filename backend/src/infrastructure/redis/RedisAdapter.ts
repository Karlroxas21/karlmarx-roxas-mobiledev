import { Redis } from 'ioredis';
import { ICacheStore } from '../../component/ethereum/interfaces';
import { logger } from '../../config';

export class RedisAdapter implements ICacheStore {
    constructor(private readonly redis: Redis) {}

    async get(key: string): Promise<string | null> {
        try {
            return await this.redis.get(key);
        } catch (err: unknown) {
            logger.warn('Redis get failed', {
                key,
                error: err instanceof Error ? err.message : String(err),
            });
            return null;
        }
    }

    async set(key: string, value: string, ttlSeconds: number): Promise<void> {
        try {
            await this.redis.set(key, value, 'EX', ttlSeconds);
        } catch (err: unknown) {
            logger.warn('Redis set failed', {
                key,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
}
