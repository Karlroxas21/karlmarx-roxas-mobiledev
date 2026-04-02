# Phase 3: Adapters - Research

**Researched:** 2026-04-02
**Domain:** TypeORM entity, ioredis, axios HTTP, Etherscan API response parsing
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Balance Entity (TypeORM)**
- Table name: `balance_history`
- Columns: `id` (PK auto-increment), `address` (varchar, indexed), `balanceWei` (varchar), `fetchedAt` (timestamp, default now)
- Entity lives in `src/infrastructure/postgres/` — not in the component layer

**Etherscan Adapter**
- Uses `ProposeGasPrice` field from gasoracle endpoint for gas price
- Parses hex block number to decimal string: `parseInt(hex, 16).toString()`
- Converts gas price from Gwei to Wei before returning (service expects Wei)
- Checks `data.status !== '1'` on every response — throws `EtherscanApiError` if status is not '1'
- Uses axios@1.14.0 (pinned exactly, no caret)

**Redis Adapter**
- Every `get`/`set` call wrapped in try-catch — returns `null`/void on failure with warning log
- Cache values stored as plain strings
- Graceful degradation in the adapter layer, not the service

### Claude's Discretion
- Internal method decomposition within adapters
- Exact Etherscan URL construction patterns
- Redis key serialization details

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ETH-02 | Etherscan response validation checks `status !== "1"` (not just HTTP status) | Confirmed: Etherscan always returns HTTP 200; `status` field in body is the error signal. Must check on gasoracle, eth_blockNumber (via jsonrpc result), and balance endpoints. |
| CACHE-01 | Gas price and block number are cached in Redis with ~15s TTL | ioredis `set(key, value, 'EX', ttl)` syntax confirmed. CACHE_TTL_SECONDS=15 already defined in constants.ts. |
| CACHE-02 | Cache hit skips Etherscan calls for gas/block (balance always fetched live) | Implemented in service.ts already; adapter just needs to return correct types from `get()`. |
| CACHE-03 | Redis failure degrades gracefully — fallback to live fetch, not 500 | try-catch in adapter returning null on get failure; void on set failure. Service treats null as cache miss. |
| DB-01 | Account balance stored in PostgreSQL on each request (historical log, not upsert) | TypeORM entity with auto-increment PK ensures insert, never update. |
| DB-02 | Database insert is non-blocking (fire-and-forget) | Already handled in service.ts with `void this.repository.save(...).catch(...)`. Adapter just calls `repository.save()`. |
| DB-03 | PostgreSQL failure degrades gracefully | Adapter's `save()` must throw normally (no swallowing) — the service's fire-and-forget catch handles the warning log. |
| ARCH-02 | Infrastructure adapters implement port interfaces | Three adapter classes: EtherscanAdapter implements IEthereumProvider, RedisAdapter implements ICacheStore, TypeOrmBalanceRepository implements IBalanceRepository. |
</phase_requirements>

---

## Summary

Phase 3 implements three concrete adapter classes that fulfil the port interfaces already defined in Phase 2. The adapters are standalone infrastructure wrappers — each isolates one external dependency (Etherscan HTTP API, Redis, PostgreSQL) and maps that dependency's failure modes to the contract the service layer expects.

The Etherscan adapter is the most logic-heavy: it calls three different endpoint shapes (gasoracle, eth_blockNumber proxy, account balance) and must translate each response into the single string-of-Wei format the service expects. The key conversion is gas price: Etherscan's gasoracle returns decimal Gwei strings such as `"0.496840168"`, which must be multiplied by 1e9 and floored to produce the Wei string. The hex block number from the proxy endpoint uses a straightforward `parseInt(hex, 16).toString()` conversion.

The Redis adapter is a thin wrapper with blanket try-catch. ioredis `set` uses the `'EX'` option for TTL. The TypeORM adapter is the simplest: one `INSERT` via the repository pattern, relying on the service's fire-and-forget pattern for graceful degradation. The Balance entity must be added to `wire.ts`'s `entities: []` array for TypeORM's `synchronize` to create the `balance_history` table on boot.

**Primary recommendation:** Implement adapters in `src/infrastructure/` with strict interface typing; handle all failure modes in the adapter layer so the service stays clean.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| axios | 1.14.0 (pinned exact) | HTTP calls to Etherscan | Already installed; supply chain safety (1.14.1 compromised) |
| ioredis | ^5.10.1 | Redis get/set with TTL | Already installed; full TypeScript support, handles reconnect |
| typeorm | ^0.3.28 | PostgreSQL entity + repository | Already installed; DataSource already initialised in wire.ts |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| winston logger | (from config.ts) | Warning logs on adapter failure | Import `logger` from `../../config` in each adapter |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| axios | node-fetch / got | axios already installed and pinned; no reason to add another HTTP client |
| ioredis raw commands | redis (node-redis) | ioredis already wired in wire.ts; changing clients is out of scope |
| TypeORM @CreateDateColumn | @Column default CURRENT_TIMESTAMP | Both work; @CreateDateColumn is the idiomatic TypeORM approach and avoids a SQL string default |

**Installation:** No new packages needed. All three libraries are in `package.json` already.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── component/ethereum/        # (complete) ports and service
│   ├── interfaces.ts          # IEthereumProvider, ICacheStore, IBalanceRepository
│   ├── errors.ts              # EtherscanApiError, ValidationError
│   └── constants.ts           # CACHE_TTL_SECONDS, CACHE_KEYS
└── infrastructure/
    ├── etherscan/
    │   └── EtherscanAdapter.ts   # implements IEthereumProvider
    ├── redis/
    │   └── RedisAdapter.ts       # implements ICacheStore
    └── postgres/
        ├── Balance.entity.ts     # TypeORM @Entity
        └── TypeOrmBalanceRepository.ts  # implements IBalanceRepository
```

### Pattern 1: Etherscan Adapter — Three Endpoint Shapes

**What:** One class implements all three `IEthereumProvider` methods, each calling a different Etherscan endpoint with different response shapes. Every method validates `status !== '1'` and throws `EtherscanApiError` on failure.

**Endpoint shapes:**

| Method | module | action | Response path | Format |
|--------|--------|--------|---------------|--------|
| `getGasPrice()` | gastracker | gasoracle | `result.ProposeGasPrice` | Decimal Gwei string, e.g. `"0.496840"` |
| `getBlockNumber()` | proxy | eth_blockNumber | `result` | JSON-RPC hex string, e.g. `"0x1661760"` — **no status field** |
| `getBalance(address)` | account | balance | `result` | Wei string, e.g. `"172774397764084972158218"` |

**Critical note on eth_blockNumber:** The proxy endpoint returns a JSON-RPC 2.0 envelope (`{ jsonrpc, id, result }`) — there is no `status` field. Validate by checking `result` is a string starting with `"0x"`, not by checking `status`.

**Gwei-to-Wei conversion for gas price:**

```typescript
// ProposeGasPrice is a decimal Gwei string like "0.496840168"
// Multiply by 1e9 and floor to get Wei as a BigInt, then stringify
const gweiFloat = parseFloat(result.ProposeGasPrice);
const weiString = BigInt(Math.floor(gweiFloat * 1e9)).toString();
```

**When to use:** All Etherscan HTTP calls go through this one adapter class.

**Example — getGasPrice:**
```typescript
// Source: Etherscan API docs https://docs.etherscan.io/api-reference/endpoint/gasoracle
async getGasPrice(): Promise<string> {
    const response = await axios.get<GasOracleResponse>(this.baseUrl, {
        params: {
            module: 'gastracker',
            action: 'gasoracle',
            apikey: this.apiKey,
        },
    });
    const data = response.data;
    if (data.status !== '1') {
        throw new EtherscanApiError(
            `Etherscan gasoracle error: ${data.message}`,
        );
    }
    const gweiFloat = parseFloat(data.result.ProposeGasPrice);
    return BigInt(Math.floor(gweiFloat * 1e9)).toString();
}
```

**Example — getBlockNumber:**
```typescript
// Source: Etherscan API docs https://docs.etherscan.io/api-reference/endpoint/ethblocknumber
// JSON-RPC envelope — no status field, result is hex string
async getBlockNumber(): Promise<string> {
    const response = await axios.get<BlockNumberResponse>(this.baseUrl, {
        params: {
            module: 'proxy',
            action: 'eth_blockNumber',
            apikey: this.apiKey,
        },
    });
    const hex = response.data.result;
    if (!hex || !hex.startsWith('0x')) {
        throw new EtherscanApiError('Etherscan blockNumber: unexpected response');
    }
    return parseInt(hex, 16).toString();
}
```

### Pattern 2: Redis Adapter — Blanket try-catch

**What:** Every public method is wrapped in try-catch. On error, log a warning and return the null/void value that signals cache miss to the service. The service treats `null` from `get()` as a cache miss and falls through to Etherscan.

**ioredis set with TTL:**
```typescript
// Source: https://github.com/redis/ioredis
// redis.set(key, value, 'EX', ttlSeconds) → Promise<'OK'>
await this.redis.set(key, value, 'EX', ttlSeconds);
```

**ioredis get:**
```typescript
// redis.get(key) → Promise<string | null>
// Returns null when key doesn't exist or has expired
const result = await this.redis.get(key);
```

**When to use:** All Redis reads and writes in the application go through this adapter.

### Pattern 3: TypeORM Balance Entity

**What:** A plain TypeORM entity class that maps to `balance_history`. Uses `@PrimaryGeneratedColumn()` for auto-increment, `@Index()` on `address` for query performance, `@CreateDateColumn()` for `fetchedAt`.

```typescript
// Source: https://typeorm.io/docs/entity/entities/ and https://typeorm.io/docs/help/decorator-reference/
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('balance_history')
export class Balance {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ type: 'varchar' })
    address: string;

    @Column({ type: 'varchar' })
    balanceWei: string;

    @CreateDateColumn()
    fetchedAt: Date;
}
```

**wire.ts registration — add entity to DataSource:**
```typescript
// In wire.ts, add to the entities array:
import { Balance } from './infrastructure/postgres/Balance.entity';

const dataSource = new DataSource({
    // ...existing options...
    entities: [Balance],
});
```

### Pattern 4: TypeOrmBalanceRepository

**What:** Wraps the TypeORM `Repository<Balance>` obtained from `dataSource.getRepository(Balance)`. Implements `IBalanceRepository.save()` — no try-catch inside the adapter; the service's fire-and-forget `.catch()` handles DB failures (DB-03).

```typescript
// Source: https://typeorm.io/docs/entity/entities/
async save(data: BalanceSaveDto): Promise<void> {
    const entity = this.repository.create({
        address: data.address,
        balanceWei: data.balanceWei,
        fetchedAt: data.fetchedAt,
    });
    await this.repository.save(entity);
}
```

**Constructor receives `Repository<Balance>` injected from wire.ts:**
```typescript
constructor(private readonly repository: Repository<Balance>) {}
```

### Anti-Patterns to Avoid

- **Swallowing errors in TypeOrmBalanceRepository:** The service uses fire-and-forget; if the repo swallows the error, the service's `.catch()` warning log never fires and DB failures become invisible.
- **Status check on eth_blockNumber:** The proxy endpoint returns JSON-RPC format without a `status` field. Checking `data.status !== '1'` on this endpoint will always throw. Validate the `result` field shape instead.
- **Floating-point Gwei conversion without flooring:** `parseFloat("0.496840168") * 1e9` yields `496840168.00000006` in IEEE 754. Using `Math.floor` before `BigInt()` is required to prevent a `SyntaxError` from fractional BigInt input.
- **Bare axios call without typed generic:** Use `axios.get<ResponseType>(url, config)` so TypeScript enforces the shape of `response.data`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Redis TTL management | Custom expiry polling | ioredis `set(key, val, 'EX', ttl)` | Atomic server-side expiry; no race condition |
| PostgreSQL timestamp default | Manual `new Date()` assignment in repo | TypeORM `@CreateDateColumn()` | DB-level default; correct even if app clock drifts |
| HTTP query string serialisation | Manual URL string concatenation | axios `params` object | Handles encoding, avoids injection, readable |
| TypeORM table creation | Raw SQL `CREATE TABLE` | `synchronize: true` (non-production) + entity registration | DataSource already configured for sync in wire.ts |

---

## Common Pitfalls

### Pitfall 1: eth_blockNumber Has No `status` Field

**What goes wrong:** Applying the same `data.status !== '1'` guard to the proxy endpoint causes the adapter to always throw `EtherscanApiError`, because the JSON-RPC envelope has no `status` key (it returns `undefined`, which is `!== '1'`).

**Why it happens:** Three Etherscan endpoints have three different response shapes. The gasoracle and account/balance endpoints use the `{ status, message, result }` envelope. The proxy/eth_blockNumber endpoint uses the JSON-RPC 2.0 envelope `{ jsonrpc, id, result }`.

**How to avoid:** Check the `result` field for eth_blockNumber. Validate that it is a string and starts with `"0x"`.

**Warning signs:** `getBlockNumber()` always throws even with a valid API key during integration testing.

### Pitfall 2: Gwei Float-to-BigInt Conversion Without Flooring

**What goes wrong:** `BigInt(parseFloat("0.496840168") * 1e9)` throws `SyntaxError: Cannot convert 496840168.00000006 to a BigInt` because BigInt() cannot accept a fractional number.

**Why it happens:** IEEE 754 float multiplication introduces sub-integer precision. The Etherscan gasoracle returns values like `"0.496840168"` which have many decimal places.

**How to avoid:** Always `Math.floor()` before `BigInt()`:
```typescript
BigInt(Math.floor(parseFloat(gweiString) * 1e9)).toString()
```

**Warning signs:** `TypeError` or `SyntaxError` in `getGasPrice()` at runtime; unit tests with round Gwei values (e.g. `"20"`) pass while tests with decimal values fail.

### Pitfall 3: Balance Entity Not Registered in DataSource

**What goes wrong:** TypeORM does not know about the entity — `synchronize: true` does not create the `balance_history` table, and all `save()` calls throw `EntityMetadataNotFoundError`.

**Why it happens:** TypeORM requires entities to be explicitly listed in the `entities` array in `DataSource` options, or matched by glob. The current `wire.ts` has `entities: []`.

**How to avoid:** Import the `Balance` entity class and add it to the array: `entities: [Balance]`. This is done in `wire.ts` as part of this phase.

**Warning signs:** Error on first `repository.save()` call: `No metadata for "Balance" was found.`

### Pitfall 4: Redis try-catch Must Not Re-Throw

**What goes wrong:** If the Redis try-catch logs the error but re-throws it (or forgets the catch), cache failure propagates up to the service, which has no cache-failure handling. The response returns 500 for a Redis outage.

**Why it happens:** CACHE-03 requires graceful degradation. The adapter is the only layer with this responsibility.

**How to avoid:** In `RedisAdapter.get()` return `null` on catch. In `RedisAdapter.set()` return `void` (implicitly) on catch. The service treats `null` from `get()` as a cache miss.

### Pitfall 5: `balanceWei` Column Type Must Be varchar, Not bigint

**What goes wrong:** If `balanceWei` is stored as a PostgreSQL `bigint`, TypeORM returns it as a JavaScript `number`, which loses precision for large Ethereum balances (> `Number.MAX_SAFE_INTEGER`).

**Why it happens:** Ethereum balances can exceed 2^53. PostgreSQL `bigint` is 64-bit but Node.js serialises it as `number`.

**How to avoid:** Use `@Column({ type: 'varchar' })` for `balanceWei`. The value is stored and retrieved as a string without precision loss.

---

## Code Examples

### EtherscanAdapter — Response Types

```typescript
// Internal response shape types (not exported)
interface EtherscanEnvelope<T> {
    status: string;
    message: string;
    result: T;
}

interface GasOracleResult {
    LastBlock: string;
    SafeGasPrice: string;
    ProposeGasPrice: string;
    FastGasPrice: string;
    suggestBaseFee: string;
    gasUsedRatio: string;
}

interface JsonRpcResult {
    jsonrpc: string;
    id: number;
    result: string;
}
```

### RedisAdapter — Full Class Shape

```typescript
// Source: https://github.com/redis/ioredis
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
```

### Balance Entity — Full Class

```typescript
// Source: https://typeorm.io/docs/entity/entities/
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

@Entity('balance_history')
export class Balance {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ type: 'varchar' })
    address: string;

    @Column({ type: 'varchar' })
    balanceWei: string;

    @CreateDateColumn()
    fetchedAt: Date;
}
```

### wire.ts — Registering the Entity

```typescript
import { Balance } from './infrastructure/postgres/Balance.entity';

const dataSource = new DataSource({
    type: 'postgres',
    url: config.databaseUrl,
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
    entities: [Balance],   // <-- add here
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| TypeORM `createConnection()` | TypeORM `new DataSource()` | TypeORM 0.3 (2022) | wire.ts already uses DataSource; no migration needed |
| ioredis `redis.set(key, val); redis.expire(key, ttl)` (two commands) | `redis.set(key, val, 'EX', ttl)` (atomic) | ioredis v4+ | Use single-command form; no race window between set and expire |

**Deprecated/outdated:**
- `typeorm.createConnection()`: Removed in 0.3. Already using `DataSource` in wire.ts.
- `redis.setex(key, ttl, val)`: Works but `set` with `'EX'` option is the modern equivalent and matches ioredis TypeScript overloads cleanly.

---

## Open Questions

1. **ProposeGasPrice blocker (from STATE.md)**
   - What we know: Etherscan gasoracle officially returns `ProposeGasPrice` as the "standard" tier recommendation. Official API reference example confirms the field exists with that exact name. Value is in Gwei.
   - What's unclear: Whether the field name ever returns as an empty string or zero for certain network conditions (e.g., very low congestion periods).
   - Recommendation: The blocker from STATE.md can be resolved — `ProposeGasPrice` is confirmed by the official Etherscan API reference. Treat the blocker as resolved. Add a guard: if `ProposeGasPrice` is `"0"` or empty, throw `EtherscanApiError` with a descriptive message.

2. **Etherscan error response shape**
   - What we know: `status: "0"` signals an error, `message` contains the error reason (e.g. `"NOTOK"`).
   - What's unclear: The exact `message` and `result` values for common failure cases (invalid API key, rate limit).
   - Recommendation: Check `status !== '1'` and include `data.message` in the thrown `EtherscanApiError` message for debuggability.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 + ts-jest 29.4.9 |
| Config file | `jest.config.ts` (CommonJS export, roots: `['<rootDir>/src']`) |
| Quick run command | `npm test -- --testPathPattern=adapters` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ETH-02 | EtherscanAdapter throws EtherscanApiError when status !== '1' | unit | `npm test -- --testPathPattern=etherscan.adapter` | Wave 0 |
| ETH-02 | EtherscanAdapter does NOT apply status check to eth_blockNumber (JSON-RPC shape) | unit | `npm test -- --testPathPattern=etherscan.adapter` | Wave 0 |
| CACHE-01 | RedisAdapter.set calls redis.set with 'EX' and correct TTL | unit | `npm test -- --testPathPattern=redis.adapter` | Wave 0 |
| CACHE-03 | RedisAdapter.get returns null on Redis error, does not throw | unit | `npm test -- --testPathPattern=redis.adapter` | Wave 0 |
| CACHE-03 | RedisAdapter.set returns void on Redis error, does not throw | unit | `npm test -- --testPathPattern=redis.adapter` | Wave 0 |
| DB-01 | TypeOrmBalanceRepository.save calls repository.save with correct entity | unit | `npm test -- --testPathPattern=balance.repository` | Wave 0 |
| DB-03 | TypeOrmBalanceRepository.save throws on DB error (not swallowed) | unit | `npm test -- --testPathPattern=balance.repository` | Wave 0 |
| ARCH-02 | All three adapters satisfy their interface shape (TypeScript compile check) | compile | `npm run build` | existing |

### Sampling Rate

- **Per task commit:** `npm test -- --testPathPattern=<adapter-under-test>`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/tests/etherscan.adapter.test.ts` — covers ETH-02 (status check, JSON-RPC shape, Gwei→Wei conversion)
- [ ] `src/tests/redis.adapter.test.ts` — covers CACHE-01, CACHE-03 (graceful degradation)
- [ ] `src/tests/balance.repository.test.ts` — covers DB-01, DB-03 (save delegates to TypeORM, errors propagate)

No framework changes needed — Jest and ts-jest already configured.

---

## Sources

### Primary (HIGH confidence)

- Etherscan API Reference — gasoracle endpoint: https://docs.etherscan.io/api-reference/endpoint/gasoracle
- Etherscan API Reference — account balance: https://docs.etherscan.io/api-reference/endpoint/balance
- Etherscan API Reference — eth_blockNumber: https://docs.etherscan.io/api-reference/endpoint/ethblocknumber
- TypeORM Entities docs: https://typeorm.io/docs/entity/entities/
- TypeORM Decorator Reference: https://typeorm.io/docs/help/decorator-reference/
- ioredis GitHub README: https://github.com/redis/ioredis

### Secondary (MEDIUM confidence)

- ioredis npm page — set with EX option confirmed via WebSearch cross-referenced with official repo
- Etherscan gas tracker UI — confirms ProposeGasPrice is the "standard" tier displayed on main gas tracker page

### Tertiary (LOW confidence)

None — all critical claims verified against official docs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in package.json, versions confirmed
- Architecture: HIGH — port interfaces read directly from source; Etherscan endpoint shapes confirmed from official API reference
- Pitfalls: HIGH — Gwei/BigInt and JSON-RPC shape issues confirmed from API docs; entity registration is a known TypeORM requirement
- Validation architecture: HIGH — jest.config.ts read directly; test patterns match existing ethereum.service.test.ts

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (Etherscan API field names stable; TypeORM 0.3.x patch updates unlikely to break entity patterns)
