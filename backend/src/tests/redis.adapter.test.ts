jest.mock('../config', () => ({
    logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import { RedisAdapter } from '../infrastructure/redis/RedisAdapter';
import { logger } from '../config';

const mockRedis = {
    get: jest.fn() as jest.Mock,
    set: jest.fn() as jest.Mock,
};

let adapter: RedisAdapter;

beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adapter = new RedisAdapter(mockRedis as any);
    jest.clearAllMocks();
});

describe('RedisAdapter', () => {
    describe('get()', () => {
        it('get() returns cached value when key exists', async () => {
            mockRedis.get.mockResolvedValueOnce('20000000000');

            const result = await adapter.get('ethereum:gasPrice');

            expect(result).toBe('20000000000');
        });

        it('get() returns null when key does not exist', async () => {
            mockRedis.get.mockResolvedValueOnce(null);

            const result = await adapter.get('ethereum:gasPrice');

            expect(result).toBeNull();
        });

        it('get() returns null and logs warning on Redis error (CACHE-03)', async () => {
            mockRedis.get.mockRejectedValueOnce(
                new Error('Connection refused'),
            );

            const result = await adapter.get('ethereum:gasPrice');

            expect(result).toBeNull();
            expect(
                (logger.warn as jest.Mock).mock.calls.length,
            ).toBeGreaterThan(0);
            const warnMessage = (logger.warn as jest.Mock).mock.calls[0][0];
            expect(warnMessage).toContain('Redis get failed');
        });
    });

    describe('set()', () => {
        it('set() calls redis.set with EX and TTL (CACHE-01)', async () => {
            mockRedis.set.mockResolvedValueOnce('OK');

            await adapter.set('ethereum:gasPrice', '20000000000', 15);

            expect(mockRedis.set).toHaveBeenCalledWith(
                'ethereum:gasPrice',
                '20000000000',
                'EX',
                15,
            );
        });

        it('set() logs warning on Redis error without throwing (CACHE-03)', async () => {
            mockRedis.set.mockRejectedValueOnce(
                new Error('Connection refused'),
            );

            await expect(
                adapter.set('ethereum:gasPrice', '20000000000', 15),
            ).resolves.toBeUndefined();

            expect(
                (logger.warn as jest.Mock).mock.calls.length,
            ).toBeGreaterThan(0);
        });
    });
});
