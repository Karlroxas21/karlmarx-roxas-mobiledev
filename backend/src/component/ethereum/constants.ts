export const CACHE_TTL_SECONDS = 15;

export const CACHE_KEYS = {
    GAS_PRICE: 'ethereum:gasPrice',
    BLOCK_NUMBER: 'ethereum:blockNumber',
} as const;

export const cacheKey = (field: keyof typeof CACHE_KEYS): string =>
    CACHE_KEYS[field];
