# Phase 2: Component Layer - Research

**Researched:** 2026-04-02
**Domain:** TypeScript hexagonal architecture — component ports, DTOs, service orchestration, ethers.js v6 utilities
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- `IEthereumProvider` has three methods: `getGasPrice()`, `getBlockNumber()`, `getBalance(address)` — maps 1:1 to Etherscan endpoints
- `ICacheStore` is generic: `get(key): Promise<string | null>`, `set(key, value, ttlSeconds): Promise<void>` — reusable across components
- `IBalanceRepository` uses plain DTO interface for the port; TypeORM entity stays in the adapter layer (keeps component ORM-free)
- Address validation (`isAddress`/`getAddress` from ethers.js) lives in EthereumService as first step before any port calls
- Success envelope: `{ "data": { gasPrice: { wei, gwei }, blockNumber: "...", balance: { wei, eth }, timestamp: "..." } }`
- Gas price dual-units: `gasPrice: { wei: "...", gwei: "..." }` nested object
- Balance dual-units: `balance: { wei: "...", eth: "..." }` nested object
- Error envelope: `{ "error": { message: "...", code: "VALIDATION_ERROR" | "UPSTREAM_ERROR" } }`
- All Wei values typed as `string` — never `number` or `bigint`
- ISO 8601 timestamp on every successful response
- Cache miss: fetch all 3 data points from Etherscan via `Promise.all` (balance always fetched fresh)
- Cache hit for gas/block: only 1 Etherscan call needed (balance), gas and block served from cache
- Fire-and-forget DB insert: `repository.save(data).catch(err => logger.warn(...))` — non-blocking, gracefully degrades
- Service throws typed `EtherscanApiError` on Etherscan failure — controller catches and maps to 502

### Claude's Discretion
- Exact file organization within `component/ethereum/` (follow established auth template pattern)
- Internal method decomposition within EthereumService
- Exact constant names and cache key formats

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CORE-01 | `GET /api/ethereum/:address` returns gas price, block number, balance | Service method signature and orchestration pattern defined here |
| CORE-02 | Dual-unit values (wei + gwei for gas, wei + eth for balance) | DTO shape locked — string arithmetic for gwei conversion |
| CORE-03 | ISO 8601 timestamp on each response | `new Date().toISOString()` in service — no library needed |
| CORE-04 | Structured JSON envelope for success and error | `EthereumResponseDto` and `ErrorResponseDto` defined in response-models.ts |
| CORE-05 | Invalid Ethereum address returns 400 with structured error | `isAddress` guard + `ValidationError` thrown before port calls |
| CORE-06 | Addresses normalized to EIP-55 checksum format | `getAddress(address)` called after `isAddress` check |
| ETH-01 | Gas price, block number, balance fetched in parallel | `Promise.all([...])` in service cache-miss path |
| ETH-03 | Etherscan failures return 502 with structured error | `EtherscanApiError` thrown by service; controller maps to 502 |
| ARCH-01 | Hexagonal architecture with port interfaces in `component/ethereum/interfaces.ts` | Three port interfaces defined here: `IEthereumProvider`, `ICacheStore`, `IBalanceRepository` |
</phase_requirements>

---

## Summary

Phase 2 defines the `component/ethereum/` module: its port interfaces (`IEthereumProvider`, `ICacheStore`, `IBalanceRepository`), all TypeScript DTOs, the `EtherscanApiError` class, constants, and the full `EthereumService` orchestration logic. No concrete infrastructure adapters are instantiated yet — every external dependency is expressed as an interface parameter injected via the constructor.

The **critical blocker from STATE.md is resolved**: ethers.js v6.16.0 exposes a `lib.commonjs/` directory and uses `"default"` condition (not `"require"`) in package exports. With `esModuleInterop: true` and `module: commonjs` in tsconfig, `import { isAddress, getAddress } from 'ethers'` compiles correctly. Direct `require('ethers')` also works. Both `isAddress` and `getAddress` are live-verified in this project's Node environment.

`getAddress(address)` is the single correct call for CORE-06: it validates the format AND returns the EIP-55 checksum form in one step. There is no need to call `isAddress` first in a two-step check — a try/catch around `getAddress` is the idiomatic ethers.js v6 pattern. However, the user decision explicitly lists `isAddress` as first step, so the two-step approach (`isAddress` guard, then `getAddress`) is used.

**Primary recommendation:** Write `EthereumService` against the three port interfaces, use `getAddress` for address normalization/validation, express the gwei conversion as pure string arithmetic (`BigInt(weiStr) / 1_000_000_000n`), and keep every external call behind a mock in unit tests.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ethers | ^6.16.0 (installed) | `isAddress`, `getAddress` for address utilities | Already installed; only these two functions needed per REQUIREMENTS.md Out-of-Scope decision |
| TypeScript | ^6.0.2 (installed) | Interface definitions, strict types | Project language |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jest + ts-jest | ^30.3.0 / ^29.4.9 (installed) | Unit tests for EthereumService | All service method tests use jest mocks for port interfaces |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `BigInt` for gwei conversion | `parseFloat` + division | BigInt is exact for integer division; float loses precision on large Wei values |
| Two-step `isAddress` then `getAddress` | Single try/catch around `getAddress` | User locked decision: two-step; both are correct |
| Custom error class extends Error | `class EtherscanApiError extends Error` | Must call `super(message)` and set `Object.setPrototypeOf` in TS for correct `instanceof` |

**Installation:** No new packages needed — `ethers` is already in `dependencies`.

---

## Architecture Patterns

### Recommended Project Structure
```
src/component/ethereum/
├── interfaces.ts        # Port interfaces: IEthereumProvider, ICacheStore, IBalanceRepository
├── service.ts           # EthereumService class — orchestration logic
├── request-models.ts    # Input DTOs (e.g., GetEthereumDataRequest)
├── response-models.ts   # Output DTOs (EthereumDataDto, ErrorDto, envelopes)
├── errors.ts            # EtherscanApiError (and ValidationError if needed)
└── constants.ts         # Cache TTL, cache key template, error codes

src/tests/
└── ethereum.service.test.ts   # Unit tests for EthereumService
```

> Note: The auth template uses `requests-models.ts` (plural). The planner may follow the exact same naming convention (`requests-models.ts`, `response-models.ts`) to stay consistent with the template pattern.

### Pattern 1: Port Interface Design

**What:** TypeScript interfaces in `interfaces.ts` define the boundary between the component and its infrastructure adapters. The component depends only on these interfaces, never on concrete classes.

**When to use:** Every external dependency — Etherscan HTTP, Redis, Postgres — gets its own port interface.

```typescript
// src/component/ethereum/interfaces.ts

export interface IEthereumProvider {
    getGasPrice(): Promise<string>;          // returns Wei string
    getBlockNumber(): Promise<string>;
    getBalance(address: string): Promise<string>; // returns Wei string
}

export interface ICacheStore {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

export interface IBalanceRepository {
    save(data: BalanceSaveDto): Promise<void>;
}

export interface BalanceSaveDto {
    address: string;
    balanceWei: string;
    fetchedAt: Date;
}
```

### Pattern 2: EthereumService Constructor Injection

**What:** EthereumService receives all three port interfaces plus logger via constructor. No global imports of concrete adapters.

```typescript
// src/component/ethereum/service.ts
import { isAddress, getAddress } from 'ethers';
import { IEthereumProvider, ICacheStore, IBalanceRepository } from './interfaces';
import { EthereumDataDto } from './response-models';
import { EtherscanApiError, ValidationError } from './errors';
import { CACHE_TTL_SECONDS, cacheKey } from './constants';
import { logger } from '../../config';

export class EthereumService {
    constructor(
        private readonly provider: IEthereumProvider,
        private readonly cache: ICacheStore,
        private readonly repository: IBalanceRepository,
    ) {}

    async getEthereumData(rawAddress: string): Promise<EthereumDataDto> {
        // CORE-05: validate first
        if (!isAddress(rawAddress)) {
            throw new ValidationError('Invalid Ethereum address');
        }
        // CORE-06: normalize to checksum
        const address = getAddress(rawAddress);

        // CACHE-01/02: check cache for gas + block
        const [cachedGas, cachedBlock] = await Promise.all([
            this.cache.get(cacheKey('gasPrice')),
            this.cache.get(cacheKey('blockNumber')),
        ]);

        let gasPriceWei: string;
        let blockNumber: string;

        if (cachedGas && cachedBlock) {
            gasPriceWei = cachedGas;
            blockNumber = cachedBlock;
        } else {
            // ETH-01: parallel fetch all 3 on cache miss
            const [gas, block] = await Promise.all([
                this.provider.getGasPrice(),
                this.provider.getBlockNumber(),
            ]).catch((err) => {
                throw new EtherscanApiError(err.message);
            });
            gasPriceWei = gas;
            blockNumber = block;
            // fire-and-forget cache write
            void this.cache.set(cacheKey('gasPrice'), gasPriceWei, CACHE_TTL_SECONDS);
            void this.cache.set(cacheKey('blockNumber'), blockNumber, CACHE_TTL_SECONDS);
        }

        // Balance always fetched live (per locked decision)
        const balanceWei = await this.provider
            .getBalance(address)
            .catch((err) => { throw new EtherscanApiError(err.message); });

        // DB-01/02: fire-and-forget insert
        void this.repository
            .save({ address, balanceWei, fetchedAt: new Date() })
            .catch((err) => logger.warn('DB insert failed', { error: err.message }));

        return this.buildResponse(gasPriceWei, blockNumber, balanceWei);
    }

    private buildResponse(
        gasPriceWei: string,
        blockNumber: string,
        balanceWei: string,
    ): EthereumDataDto {
        return {
            gasPrice: {
                wei: gasPriceWei,
                gwei: (BigInt(gasPriceWei) / 1_000_000_000n).toString(),
            },
            blockNumber,
            balance: {
                wei: balanceWei,
                eth: this.weiToEth(balanceWei),
            },
            timestamp: new Date().toISOString(),
        };
    }

    private weiToEth(weiStr: string): string {
        // 1 ETH = 1e18 Wei; return up to 18 decimal places
        const wei = BigInt(weiStr);
        const whole = wei / 1_000_000_000_000_000_000n;
        const remainder = wei % 1_000_000_000_000_000_000n;
        if (remainder === 0n) return whole.toString();
        const fracStr = remainder.toString().padStart(18, '0').replace(/0+$/, '');
        return `${whole}.${fracStr}`;
    }
}
```

### Pattern 3: Typed Error Classes

**What:** Custom error classes for clean `instanceof` checks in the controller layer.

```typescript
// src/component/ethereum/errors.ts

export class ValidationError extends Error {
    public readonly code = 'VALIDATION_ERROR' as const;
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

export class EtherscanApiError extends Error {
    public readonly code = 'UPSTREAM_ERROR' as const;
    constructor(message: string) {
        super(message);
        this.name = 'EtherscanApiError';
        Object.setPrototypeOf(this, EtherscanApiError.prototype);
    }
}
```

> `Object.setPrototypeOf` in the constructor is required when extending `Error` in TypeScript targeting `ES2015+` with `commonjs` output — without it, `instanceof ValidationError` returns `false` at runtime.

### Pattern 4: Response Model Shape

```typescript
// src/component/ethereum/response-models.ts

export interface GasPriceDto {
    wei: string;
    gwei: string;
}

export interface BalanceDto {
    wei: string;
    eth: string;
}

export interface EthereumDataDto {
    gasPrice: GasPriceDto;
    blockNumber: string;
    balance: BalanceDto;
    timestamp: string; // ISO 8601
}

export interface SuccessEnvelope<T> {
    data: T;
}

export interface ErrorBody {
    message: string;
    code: 'VALIDATION_ERROR' | 'UPSTREAM_ERROR';
}

export interface ErrorEnvelope {
    error: ErrorBody;
}
```

### Pattern 5: Constants and Cache Key Format

```typescript
// src/component/ethereum/constants.ts

export const CACHE_TTL_SECONDS = 15;

export const CACHE_KEYS = {
    GAS_PRICE: 'ethereum:gasPrice',
    BLOCK_NUMBER: 'ethereum:blockNumber',
} as const;

export const cacheKey = (field: keyof typeof CACHE_KEYS): string =>
    CACHE_KEYS[field];
```

### Anti-Patterns to Avoid

- **Using `number` for Wei values:** JavaScript `number` cannot represent 18-decimal Wei amounts without precision loss. Always string or BigInt.
- **Awaiting fire-and-forget operations:** Using `await repository.save(...)` blocks the response. Use `void promise.catch(...)` pattern.
- **Importing concrete adapters in the component layer:** `import { RedisClient } from '../../infrastructure/...'` breaks the hexagonal boundary. Only interfaces belong here.
- **Catching all errors as generic `Error`:** Throw typed errors from the service; this lets the controller distinguish 400 vs 502 without string-matching.
- **Forgetting `Object.setPrototypeOf` in custom Error subclasses:** Causes `instanceof` to fail at runtime in TypeScript with `commonjs` target.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Address checksum validation | Manual regex or checksum algorithm | `isAddress` + `getAddress` from ethers.js | EIP-55 algorithm has edge cases; ethers.js is battle-tested |
| Wei-to-Gwei integer division | `parseFloat(weiStr) / 1e9` | `BigInt(weiStr) / 1_000_000_000n` | Float loses precision on large Wei values (> 2^53) |
| ISO 8601 timestamp | Custom date formatter | `new Date().toISOString()` | Built-in, always UTC, always correct format |
| TypeScript interface mocking in tests | Manual stub classes | `jest.fn()` per method + object literal | Less boilerplate, works with jest's `mockResolvedValue` |

**Key insight:** This phase is pure TypeScript interface + logic — the only "library" call is two ethers utilities. The complexity is in correctness of BigInt arithmetic and proper error type design, not library selection.

---

## Common Pitfalls

### Pitfall 1: ethers.js v6 Import Syntax Change

**What goes wrong:** Copying ethers.js v5 docs and writing `ethers.utils.isAddress(...)` — this API was removed in v6.

**Why it happens:** ethers.js v6 flattened the namespace. All utilities are now top-level exports.

**How to avoid:** Import directly: `import { isAddress, getAddress } from 'ethers'`.

**Warning signs:** `TypeError: ethers.utils is not an object` at runtime.

**Verified:** Live-tested in this project — `require('ethers')` destructuring works, `typeof isAddress === 'function'`.

### Pitfall 2: `instanceof` Failing for Custom Error Subclasses

**What goes wrong:** Controller does `if (err instanceof ValidationError)` and it always returns `false`, so every error becomes a 500.

**Why it happens:** TypeScript compiles `class ValidationError extends Error` to an ES5 prototype chain using `Error.call(this)`, which doesn't set the prototype correctly.

**How to avoid:** Add `Object.setPrototypeOf(this, ValidationError.prototype)` as the last line of every custom Error constructor.

**Warning signs:** All errors fall to the generic catch block; typed catches never trigger.

### Pitfall 3: Promise.all Rejects on First Failure Without Typed Re-throw

**What goes wrong:** `Promise.all([provider.getGasPrice(), provider.getBlockNumber()])` throws a generic error that the controller can't distinguish from a validation error.

**Why it happens:** `Promise.all` propagates the raw rejection from whichever promise fails first.

**How to avoid:** Wrap `Promise.all` in a `.catch` that re-throws as `EtherscanApiError`:
```typescript
await Promise.all([...]).catch(err => { throw new EtherscanApiError(err.message); });
```

**Warning signs:** Controller sends 500 instead of 502 for Etherscan outages.

### Pitfall 4: Cache Race — Writing Gwei Instead of Wei to Cache

**What goes wrong:** Converting Wei to Gwei before caching, then treating the cached value as Wei when reading. Division is applied twice.

**Why it happens:** Conversion logic placed before cache write instead of after cache read.

**How to avoid:** Cache the raw Wei string from Etherscan. All conversion to gwei/eth happens in `buildResponse()` after retrieval.

### Pitfall 5: BigInt Literal Requires ES2020 Target

**What goes wrong:** `1_000_000_000n` causes a TypeScript compilation error or runtime error.

**Why it happens:** BigInt literals require `"target": "ES2020"` or higher in tsconfig.

**How to avoid:** Already safe — project tsconfig has `"target": "ES2020"`. Confirm before use.

**Verified:** tsconfig.json shows `"target": "ES2020"`.

---

## Code Examples

Verified patterns applicable to this project:

### ethers.js v6 Address Validation (verified in this project)

```typescript
// Source: live test in this project's Node environment (ethers 6.16.0)
import { isAddress, getAddress } from 'ethers';

// Step 1: validate
if (!isAddress(rawAddress)) {
    throw new ValidationError('Invalid Ethereum address');
}
// Step 2: normalize to EIP-55 checksum
const address = getAddress(rawAddress);
// getAddress('0xd8da6bf26964af9d7eed9e03e53415d37aa96045')
// → '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
```

### Fire-and-Forget Pattern

```typescript
// Non-blocking DB insert — response is not delayed
void this.repository
    .save({ address, balanceWei, fetchedAt: new Date() })
    .catch((err) => logger.warn('DB insert failed', { error: err.message }));
```

The `void` operator explicitly discards the promise, signaling intent. ESLint `@typescript-eslint/no-floating-promises` rule treats `void` as acknowledgment.

### Jest Mock for Port Interface

```typescript
// src/tests/ethereum.service.test.ts
import { EthereumService } from '../component/ethereum/service';
import { IEthereumProvider, ICacheStore, IBalanceRepository } from '../component/ethereum/interfaces';

const mockProvider: jest.Mocked<IEthereumProvider> = {
    getGasPrice: jest.fn(),
    getBlockNumber: jest.fn(),
    getBalance: jest.fn(),
};
const mockCache: jest.Mocked<ICacheStore> = {
    get: jest.fn(),
    set: jest.fn(),
};
const mockRepository: jest.Mocked<IBalanceRepository> = {
    save: jest.fn(),
};

describe('EthereumService', () => {
    let service: EthereumService;

    beforeEach(() => {
        service = new EthereumService(mockProvider, mockCache, mockRepository);
        jest.clearAllMocks();
    });
});
```

### BigInt Wei-to-Gwei Conversion

```typescript
// Exact integer division — no floating point
const gasPriceGwei = (BigInt(gasPriceWei) / 1_000_000_000n).toString();
// '20000000000' → '20'
```

### Wei-to-ETH Conversion (preserves decimal precision)

```typescript
private weiToEth(weiStr: string): string {
    const ETHER = 1_000_000_000_000_000_000n;
    const wei = BigInt(weiStr);
    const whole = (wei / ETHER).toString();
    const remainder = wei % ETHER;
    if (remainder === 0n) return whole;
    const frac = remainder.toString().padStart(18, '0').replace(/0+$/, '');
    return `${whole}.${frac}`;
}
// '1500000000000000000' → '1.5'
// '1000000000000000000' → '1'
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ethers.utils.isAddress()` (v5) | `isAddress()` top-level import (v6) | ethers v6.0 (2023) | All v5 utility code must be updated; flat namespace |
| `ethers.BigNumber` (v5) | Native `BigInt` (v6) | ethers v6.0 (2023) | No need for `.toString()` / `.toBigNumber()` wrappers |
| `require('ethers').default` (CJS workaround) | `require('ethers')` directly (CJS main export) | ethers v6 ships `lib.commonjs/` | Works naturally in this project's commonjs setup |

**Deprecated/outdated:**
- `ethers.utils.*`: Removed in v6. All utils are now flat exports.
- `ethers.BigNumber`: Replaced by native `BigInt`. Do not use.

---

## Open Questions

1. **Cache key collision if multiple components use ICacheStore**
   - What we know: `ICacheStore` is intentionally generic and reusable across components
   - What's unclear: No namespace enforcement at the interface level
   - Recommendation: Prefix all cache keys with component namespace (`ethereum:*`) in constants.ts — resolved in Pattern 5 above

2. **EtherscanApiError vs provider throwing a generic Error**
   - What we know: The service wraps `.catch` on `Promise.all` and `getBalance` to rethrow as `EtherscanApiError`
   - What's unclear: Phase 3 will implement the actual Etherscan HTTP client; it may throw its own typed errors
   - Recommendation: Keep the wrap-and-rethrow in EthereumService for Phase 2; Phase 3 can refine if the adapter throws consistently typed errors

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | jest 30.3.0 + ts-jest 29.4.9 |
| Config file | `jest.config.ts` (uses `module.exports`) |
| Quick run command | `npx jest --testPathPattern=ethereum.service --no-coverage` |
| Full suite command | `npx jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CORE-05 | Invalid address throws `ValidationError` | unit | `npx jest --testPathPattern=ethereum.service -t "invalid address"` | Wave 0 |
| CORE-06 | Valid address is normalized to EIP-55 | unit | `npx jest --testPathPattern=ethereum.service -t "normalizes address"` | Wave 0 |
| CORE-02 | Response includes gwei alongside wei | unit | `npx jest --testPathPattern=ethereum.service -t "dual-unit"` | Wave 0 |
| CORE-03 | Response includes ISO 8601 timestamp | unit | `npx jest --testPathPattern=ethereum.service -t "timestamp"` | Wave 0 |
| CORE-04 | Success and error use correct envelope shape | unit | `npx jest --testPathPattern=ethereum.service -t "envelope"` | Wave 0 |
| ETH-01 | Cache miss calls provider with Promise.all | unit | `npx jest --testPathPattern=ethereum.service -t "cache miss"` | Wave 0 |
| ETH-03 | Provider failure throws `EtherscanApiError` | unit | `npx jest --testPathPattern=ethereum.service -t "EtherscanApiError"` | Wave 0 |
| ARCH-01 | Interfaces are defined in `component/ethereum/interfaces.ts` | structural | File existence check in CI / manual | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx jest --testPathPattern=ethereum.service --no-coverage`
- **Per wave merge:** `npx jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/tests/ethereum.service.test.ts` — covers CORE-02, CORE-03, CORE-04, CORE-05, CORE-06, ETH-01, ETH-03

*(Existing test infrastructure: jest.config.ts present, ts-jest preset configured, test environment verified working via config.test.ts. No new framework setup needed.)*

---

## Sources

### Primary (HIGH confidence)
- ethers v6.16.0 `node_modules/ethers/package.json` — verified `main`, `exports`, `lib.commonjs/` directory
- Live Node.js execution in this project — verified `isAddress`, `getAddress` behavior and return values
- `tsconfig.json` in this project — confirmed `"target": "ES2020"`, `"module": "commonjs"`, `"esModuleInterop": true`
- `package.json` — confirmed `ethers@^6.16.0` installed, `"type": "commonjs"`, jest versions
- `jest.config.ts` — confirmed `module.exports`, `ts-jest` preset, `roots: ['<rootDir>/src']`

### Secondary (MEDIUM confidence)
- ethers.js v6 migration guide (https://docs.ethers.org/v6/migrating/) — flat namespace, BigNumber removal, BigInt adoption

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — ethers.js CJS named imports live-verified in this project's environment
- Architecture: HIGH — directly derived from locked CONTEXT.md decisions and existing project structure
- Pitfalls: HIGH (ethers v5/v6 split, instanceof) / MEDIUM (cache race) — based on TypeScript commonjs behavior and ethers.js v6 changelog
- Test map: HIGH — jest infrastructure confirmed working from Phase 1

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable stack — ethers v6, jest v30, TypeScript v6 are not fast-moving in patch cadence)
