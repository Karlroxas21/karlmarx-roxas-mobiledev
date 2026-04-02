# Project Research Summary

**Project:** Ethereum Address Data REST API
**Domain:** Ethereum data aggregation REST API (learning/interview project)
**Researched:** 2026-04-02
**Confidence:** HIGH

## Executive Summary

This is a focused REST API that proxies three Ethereum data points — gas price, current block number, and ETH balance — from the Etherscan v2 API. The project lives on top of an existing Express/TypeScript backend with hexagonal architecture already in place. The correct build strategy is to extend that existing structure by adding a single `ethereum` component with three clean port interfaces (`IEthereumProvider`, `ICacheStore`, `IBalanceRepository`) and corresponding adapters in `infrastructure/`. No new architectural patterns are needed — the patterns are already established; this milestone tests whether you can follow them consistently.

The recommended approach is a strict dependency-graph build order: infrastructure foundations first (TypeORM DataSource, Redis client, `reflect-metadata`, config validation), then the component layer (interfaces, DTOs, service), then adapters, then the HTTP controller and wiring. This order matters because several pitfalls — TypeORM decorator failures, async `DataSource.initialize()` timing, Redis crash-on-error — are only preventable if the foundational setup is correct before higher layers are built on top of it.

The primary risks are operational, not architectural. Etherscan returns HTTP 200 for API errors, meaning every response body must be explicitly checked for `status !== "1"`. Redis and PostgreSQL must both degrade gracefully — their unavailability should log a warning but never block the core response. BigInt serialization is a silent crash risk if any Wei value is converted from string to number or bigint before JSON serialization. Address case inconsistency causes cache misses and duplicate database rows unless normalization is applied at the controller entry point. All of these are well-understood and have direct prevention strategies documented in PITFALLS.md.

## Key Findings

### Recommended Stack

The existing stack (TypeScript 6, Express 5, Node 24, Winston) requires no changes. Five runtime dependencies must be added: `axios` for Etherscan HTTP calls (ships own types, timeout/interceptor support), `ioredis` for Redis caching (already a TypeORM peer dependency — promoting to direct avoids version conflicts), `pg` as the TypeORM PostgreSQL driver, `reflect-metadata` for TypeORM decorator support (currently missing and CRITICAL), and `dotenv` for environment variable loading.

Two `tsconfig.json` flags are also currently missing and required: `experimentalDecorators: true` and `emitDecoratorMetadata: true`. Without these, TypeORM decorators compile without error but fail silently at runtime — one of the harder bugs to diagnose. ESM-only libraries (`viem`) and over-engineered Ethereum libraries (`ethers.js`, `web3.js`) are explicitly out. `ethers.js` is appropriate only for its `isAddress()` and `getAddress()` utilities; it should not be used as the Etherscan HTTP client.

**Core technologies:**
- `axios` 1.14.0: Etherscan HTTP client — own types, interceptors, timeout config; preferred over native fetch
- `ioredis` 5.10.1: Redis client — already a TypeORM peer dep; consolidating avoids version conflicts
- `pg` 8.20.0: PostgreSQL driver — required peer dep for TypeORM postgres dialect
- `reflect-metadata` 0.2.2: Decorator metadata — CRITICAL, must be first import in `index.ts`
- `dotenv` 17.4.0: Environment loading — no hardcoded secrets

### Expected Features

The scope is fixed by PROJECT.md and the existing frontend contract: one endpoint (`GET /api/ethereum/:address`) returning gas price, block number, and balance. The interview context means clean code and demonstrated patterns are evaluated as much as functional correctness.

Gas price and block number are global values — cache them in Redis with a 15-second TTL. Balance is per-address and changes with transactions — fetch it live every time, but persist each fetch to PostgreSQL as a historical log. Both infrastructure dependencies must degrade gracefully; the core response must succeed even if Redis or PostgreSQL is unavailable.

**Must have (table stakes):**
- `GET /api/ethereum/:address` returning gas price, block number, and balance with dual units (wei + gwei/eth)
- Address format validation with structured 400 error before any Etherscan calls
- Parallel Etherscan calls via `Promise.all` for all three data points
- Structured error envelope (`{ "data": ... }` / `{ "error": ... }`) for all responses
- 502/503 for Etherscan upstream failures
- `GET /api/health` endpoint (required for Docker Compose health checks)
- Environment variable configuration — no hardcoded keys

**Should have (competitive — interview differentiators):**
- Redis caching for gas price and block number (15s TTL, graceful degradation if Redis unavailable)
- PostgreSQL balance history insert via TypeORM (non-blocking, fire-and-forget; graceful degradation if DB unavailable)
- Hexagonal architecture compliance — port interfaces in component layer, adapters in infrastructure
- EIP-55 checksum address normalization at controller entry point
- `timestamp` in every successful response (signals data freshness given TTL caching)

**Defer (v2+):**
- Docker Compose — builds on confirmed-working API; add as final step
- TypeORM migrations — only relevant beyond `synchronize: true` (dev only)
- Transaction history endpoint — doubles scope, frontend already handles it directly

### Architecture Approach

The new `ethereum` component slots directly into the existing hexagonal structure with no structural changes needed. Three port interfaces are defined in `component/ethereum/interfaces.ts`; three adapters in `infrastructure/` implement them. Cache-or-fetch decision logic belongs in `EthereumService`, not in the Etherscan adapter — the adapter is a pure HTTP translator. Balance persistence is fire-and-forget: the service awaits the DB write but does not block the response if it fails. `wire.ts` must become async to `await dataSource.initialize()` before constructing any repositories; this is safe because `index.ts` already awaits `createServer()`.

**Major components:**
1. `EthereumController` (`entrypoint/`) — validates address, calls service, formats HTTP response
2. `EthereumService` (`component/ethereum/`) — orchestrates cache checks, parallel Etherscan calls, DB insert
3. `EtherscanAdapter` (`infrastructure/etherscan/`) — pure HTTP translator for Etherscan REST API
4. `RedisAdapter` (`infrastructure/redis/`) — get/set with TTL; emits warning on error, never throws to caller
5. `TypeOrmBalanceRepository` (`infrastructure/postgres/`) — inserts balance fetch records; never blocks response

### Critical Pitfalls

1. **Missing `reflect-metadata`** — Add as the first import in `index.ts` and add both decorator flags to `tsconfig.json` before writing any TypeORM entity code. Failure is silent and produces no useful error.
2. **Etherscan HTTP 200 errors** — Always check `data.status !== '1'` in the adapter; never rely on HTTP status code alone. Etherscan returns 200 for rate limits, invalid keys, and invalid addresses.
3. **BigInt JSON serialization crash** — Keep all Wei values as strings from Etherscan through to the response DTO. Never convert to `number` or `bigint`.
4. **Redis unhandled error event** — Attach a `redis.on('error', ...)` handler immediately after client creation. Without it, a Redis connection failure crashes the Node process.
5. **TypeORM `synchronize: true` without NODE_ENV guard** — Gate behind `process.env.NODE_ENV !== 'production'`. Auto-sync drops and recreates columns, causing silent data loss on schema changes.

## Implications for Roadmap

Based on the dependency graph across all four research files, a four-phase structure is the clearest path:

### Phase 1: Infrastructure Foundations

**Rationale:** All higher layers depend on a correctly initialized infrastructure. The two most dangerous silent-failure pitfalls (`reflect-metadata` and async DataSource) must be resolved here before any entity or service code exists. Config validation also belongs here — failing fast at startup is better than cryptic errors later.

**Delivers:** Working TypeORM DataSource connected to PostgreSQL, ioredis client with error handler, environment config module with validation, and `reflect-metadata` + `tsconfig.json` patched.

**Addresses:** Environment variable configuration, PostgreSQL and Redis connectivity.

**Avoids:** Pitfall #1 (reflect-metadata), Pitfall #4 (Redis error handler), Pitfall #5 (synchronize guard), Pitfall #6 (async DataSource), Pitfall #9 (env validation).

### Phase 2: Component Layer (Interfaces, DTOs, Service Logic)

**Rationale:** Port interfaces must be defined before adapters can implement them. Service logic — including cache-or-fetch orchestration and fire-and-forget DB insert — should be written against the interfaces, not the concrete adapters, to preserve the hexagonal pattern.

**Delivers:** `interfaces.ts` (three ports), `requests-models.ts`, `response-models.ts` (with BigInt-safe string types), `constants.ts`, and `EthereumService` with full business logic.

**Addresses:** Dual-unit response values, parallel Etherscan call design, graceful degradation logic, `timestamp` in response.

**Avoids:** Pitfall #3 (BigInt — fixed at DTO design time), Pitfall #7 (address normalization — established in request model).

### Phase 3: Adapters

**Rationale:** With interfaces defined and the service written, adapters become pure implementation details that can be tested against the contracts already established. Etherscan adapter must implement the 200-error-check pattern. Redis adapter must wrap all calls in try-catch and never propagate errors to the service.

**Delivers:** `EtherscanAdapter` (with `status !== "1"` check), `RedisAdapter` (with error suppression), `TypeOrmBalanceRepository` (balance entity + insert).

**Addresses:** Etherscan integration, Redis caching with graceful fallback, PostgreSQL balance history.

**Avoids:** Pitfall #2 (Etherscan 200 errors — enforced in adapter), Pitfall #4 (Redis error handler — in adapter constructor).

### Phase 4: Wiring, HTTP Layer, and Docker Compose

**Rationale:** Controller and wiring come last because they depend on a fully constructed service. `wire.ts` async migration is straightforward once DataSource and Redis client exist. Docker Compose with health checks is the final step since it depends on a working `/api/health` endpoint.

**Delivers:** `EthereumController`, updated `wire.ts` (async), `GET /api/health` endpoint, `docker-compose.yml` with health checks for all three services.

**Addresses:** HTTP contract, address validation at entry point, Docker Compose, health endpoint.

**Avoids:** Pitfall #7 (address normalization — at controller entry), Pitfall #8 (Docker healthchecks).

### Phase Ordering Rationale

- Infrastructure before component layer: TypeORM `DataSource.initialize()` must `await` before any repository is constructed. The component layer imports infrastructure types.
- Component interfaces before adapters: Hexagonal architecture requires port contracts to precede adapter implementations. Writing adapters without interfaces leads to coupling.
- Service before controller: `EthereumService` is the controller's only dependency; the controller cannot be written until the service API is settled.
- Docker Compose last: Depends on a working health endpoint and confirmed-running services. Adding Docker Compose before the API works locally only adds noise.

### Research Flags

Phases with standard patterns (skip research-phase):
- **Phase 1 (Infrastructure Foundations):** TypeORM DataSource setup, ioredis client initialization, and dotenv config are well-documented, established patterns. The specific `tsconfig.json` flags are documented in STACK.md.
- **Phase 2 (Component Layer):** Hexagonal port/adapter interface design follows existing codebase conventions exactly. No novel patterns.
- **Phase 3 (Adapters):** Etherscan REST API endpoints and response format are documented in FEATURES.md (Etherscan API Behavior Notes section). No additional research needed.
- **Phase 4 (Wiring and HTTP):** Express controller registration pattern is established in `CLAUDE.md`. Docker Compose with health checks is standard.

No phase in this roadmap requires a `research-phase` step. Research is complete and covers all implementation decisions.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified via npm registry; explicit rationale for each inclusion/exclusion |
| Features | HIGH | Scope fixed by PROJECT.md and existing frontend contract; Etherscan API endpoints corroborated by ethereum-api-plan.md |
| Architecture | HIGH | Derived from direct codebase analysis; extends existing patterns rather than introducing new ones |
| Pitfalls | MEDIUM-HIGH | Codebase-specific pitfalls (reflect-metadata, async wire.ts) are HIGH confidence from static analysis; Etherscan 200-error behavior is MEDIUM (training data, not live API test) |

**Overall confidence:** HIGH

### Gaps to Address

- **Etherscan response shape for `gasoracle`:** Research identifies `SafeGasPrice`, `ProposeGasPrice`, `FastGasPrice`, and `suggestBaseFee` as the response fields. The exact field to use for the primary `gasPrice` in the response DTO (and how to present multiple price tiers) should be confirmed against the actual API response during Phase 3 adapter implementation. The existing `ethereum-api-plan.md` suggests `ProposeGasPrice` as the default.
- **TypeORM entity for balance history:** The Balance entity schema (columns, indexes) is implied by the research but not fully specified. During Phase 1 or 2, decide on the exact schema: at minimum `address`, `balanceWei`, `fetchedAt`, and optionally `blockNumber` at time of fetch.
- **`viem` ESM incompatibility confirmed but not tested:** Research identifies `viem` as ESM-only and incompatible with the project's `"type": "commonjs"`. This is noted as a hard blocker. The decision to use `ethers.js` utilities only for address validation is the correct workaround — confirm during Phase 2 that `ethers.isAddress()` and `ethers.getAddress()` are available as named imports from the CJS bundle.

## Sources

### Primary (HIGH confidence)
- `PROJECT.md` — project scope, constraints, Etherscan provider decision, Redis/PostgreSQL roles
- `CLAUDE.md` — architecture conventions, controller contract, wiring pattern
- `ethereum-api-plan.md` — prior implementation research: response shape, caching strategy, Etherscan endpoint selection
- `frontend/src/lib/api-client.ts` — consumer contract definition
- `frontend/INTERVIEW_QUESTIONS.md` — evaluation criteria for interview context
- `codebase/CONCERNS.md` — existing gaps (no input validation, no health endpoint, `process.exit` in server constructor)
- npm registry (2026-04-02) — dependency versions

### Secondary (MEDIUM confidence)
- Etherscan API documentation (training data) — endpoint paths, response envelope format, rate limits
- `frontend/src/features/wallet/hooks/use-balance.ts` — confirms frontend fetches balance directly via Infura; backend balance is for persistence, not primary display

---
*Research completed: 2026-04-02*
*Ready for roadmap: yes*
