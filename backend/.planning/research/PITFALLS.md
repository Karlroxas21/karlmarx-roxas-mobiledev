# Pitfalls Research: Ethereum Address API

**Date:** 2026-04-02
**Confidence:** MEDIUM-HIGH (codebase analysis HIGH, API specifics MEDIUM)

## Critical Pitfalls

### 1. Missing `reflect-metadata` (CODEBASE ISSUE — EXISTS NOW)

**Risk:** TypeORM entity decorators (`@Entity`, `@Column`, `@PrimaryGeneratedColumn`) compile successfully but fail silently at runtime. Tables are never created, queries return undefined.

**Warning signs:** TypeORM queries return `undefined` or empty arrays despite correct SQL. No error thrown.

**Prevention:**
1. `npm install reflect-metadata`
2. Add `import 'reflect-metadata'` as **first line** of `src/index.ts`
3. Add `experimentalDecorators: true` and `emitDecoratorMetadata: true` to `tsconfig.json`

**Phase:** Must be fixed before any TypeORM entity code.

### 2. Etherscan Returns HTTP 200 for Errors

**Risk:** Etherscan returns `200 OK` with error in response body (e.g., rate limit, invalid key). Checking only HTTP status misses all API errors.

**Warning signs:** Data appears to succeed but contains error messages like `"NOTOK"` or `"Max rate limit reached"`.

**Prevention:**
```typescript
// WRONG
const { data } = await axios.get(url);
return data.result; // might be an error string

// RIGHT
const { data } = await axios.get(url);
if (data.status !== '1') {
    throw new EtherscanApiError(data.message, data.result);
}
return data.result;
```

**Phase:** Etherscan adapter implementation.

### 3. BigInt JSON Serialization Crash

**Risk:** Ethereum balances are in Wei (up to 10^18+). If any value becomes a JavaScript `bigint`, `JSON.stringify()` throws `TypeError: Do not know how to serialize a BigInt`.

**Warning signs:** Unhandled error when serializing response.

**Prevention:**
- Keep all values as **strings** from Etherscan through to response. Etherscan returns strings by default — don't convert to `number` or `bigint`.
- Add a `balanceInEth` formatted field for readability.

**Phase:** DTO/response model design.

### 4. TypeORM `synchronize: true` Without Guard

**Risk:** `synchronize: true` in TypeORM DataSource options auto-drops and recreates tables on schema change. Safe in development, **destroys data in production**.

**Warning signs:** Data disappears after entity changes.

**Prevention:**
```typescript
const dataSource = new DataSource({
    synchronize: process.env.NODE_ENV !== 'production',
    // OR better: always false, use migrations
});
```

**Phase:** Database setup.

### 5. Redis Connection Failure Crashes App

**Risk:** `ioredis` emits an `'error'` event on connection failure. Without a handler, Node.js treats it as an unhandled exception and crashes.

**Warning signs:** App crashes on startup when Redis is unavailable.

**Prevention:**
```typescript
const redis = new Redis(config.redisUrl);
redis.on('error', (err) => {
    logger.warn('Redis connection error — caching disabled', { error: err.message });
});
```
Service layer must also wrap all cache calls in try-catch.

**Phase:** Redis client setup.

### 6. Async DataSource Initialization in wire.ts

**Risk:** TypeORM's `DataSource.initialize()` is async. If you create repositories before initialization completes, queries fail with `DataSource is not initialized`.

**Warning signs:** `QueryFailedError: Connection is not established` on first request.

**Prevention:** `wire.ts` already returns `Promise<Server>` — await `dataSource.initialize()` before creating any repositories or services.

**Phase:** Infrastructure setup.

### 7. Ethereum Address Case Inconsistency

**Risk:** Ethereum addresses can be lowercase (`0xabc...`), checksummed (`0xAbC...`), or uppercase. Storing/caching without normalization causes:
- Cache misses (same address, different case)
- Duplicate DB rows

**Warning signs:** Same address appears multiple times in database. Cache hit rate is unexpectedly low.

**Prevention:** Normalize all addresses to lowercase (or EIP-55 checksum) at controller entry point, before passing to service.

**Phase:** Controller/request validation.

### 8. Docker `depends_on` Without Healthcheck

**Risk:** `depends_on` only waits for container start, not service readiness. Backend starts before PostgreSQL/Redis accept connections.

**Warning signs:** Intermittent connection errors on first startup, works on retry.

**Prevention:**
```yaml
services:
  backend:
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
  postgres:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 5s
      timeout: 5s
      retries: 5
  redis:
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
```

**Phase:** Docker Compose setup.

### 9. No Environment Validation at Startup

**Risk:** Missing `ETHERSCAN_API_KEY` or `DATABASE_URL` causes cryptic runtime errors instead of clear startup failure.

**Warning signs:** Unclear error messages deep in library code.

**Prevention:** Validate all required env vars in `config.ts` at import time. Fail fast with descriptive error.

```typescript
if (!process.env.ETHERSCAN_API_KEY) {
    throw new Error('ETHERSCAN_API_KEY is required');
}
```

**Phase:** Configuration setup (early phase).

## Priority Matrix

| Pitfall | Severity | When to Fix |
|---------|----------|-------------|
| #1 reflect-metadata | CRITICAL | Before any TypeORM code |
| #2 Etherscan 200 errors | HIGH | During adapter implementation |
| #3 BigInt serialization | HIGH | During DTO design |
| #4 synchronize: true | HIGH | During DataSource config |
| #5 Redis error handler | HIGH | During Redis setup |
| #6 Async DataSource | MEDIUM | During wire.ts update |
| #7 Address normalization | MEDIUM | During controller implementation |
| #8 Docker healthchecks | MEDIUM | During Docker Compose setup |
| #9 Env validation | MEDIUM | Early — config phase |

---
*Pitfalls research: 2026-04-02*
