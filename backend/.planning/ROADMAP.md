# Roadmap: Ethereum Address API

## Overview

Build a clean `GET /api/ethereum/:address` endpoint on top of the existing Express/TypeScript hexagonal architecture. The work proceeds in dependency order: infrastructure foundations first (TypeORM, Redis, config), then the component layer (port interfaces, DTOs, service logic), then infrastructure adapters (Etherscan, Redis, PostgreSQL), and finally the HTTP controller, wiring, and Docker Compose. Each phase delivers a verifiable capability that the next phase builds on.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Infrastructure Foundations** - Dependencies installed, TypeORM and Redis clients initialized, env config validated at startup (completed 2026-04-02)
- [x] **Phase 2: Component Layer** - Port interfaces, response/request DTOs, and EthereumService with full business logic (completed 2026-04-02)
- [ ] **Phase 3: Adapters** - EtherscanAdapter, RedisAdapter, and TypeOrmBalanceRepository implementing their port interfaces
- [ ] **Phase 4: HTTP Layer and Docker** - EthereumController, async wire.ts, health endpoint, and Docker Compose

## Phase Details

### Phase 1: Infrastructure Foundations
**Goal**: Infrastructure dependencies are installed, TypeORM DataSource connects to PostgreSQL, ioredis client initializes with an error handler, and the app fails fast with a descriptive error on missing env vars
**Depends on**: Nothing (first phase)
**Requirements**: ETH-04, INFRA-03
**Success Criteria** (what must be TRUE):
  1. `npm run dev` starts without errors when all required env vars are present
  2. App refuses to start and prints a descriptive error listing the missing variable(s) when a required env var is absent
  3. TypeORM DataSource connects to PostgreSQL and `synchronize: true` is gated behind a `NODE_ENV !== 'production'` guard
  4. Redis client initializes without crashing the process when Redis is unreachable (error event is handled)
  5. `reflect-metadata` is the first import in `index.ts` and `experimentalDecorators`/`emitDecoratorMetadata` are set in `tsconfig.json`
**Plans:** 1/1 plans complete
Plans:
- [x] 01-01-PLAN.md — Install deps, env var validation, TypeORM + Redis initialization

### Phase 2: Component Layer
**Goal**: The ethereum component's port interfaces, DTOs, and EthereumService are defined — the service orchestrates cache-check, parallel Etherscan calls, and fire-and-forget DB insert, all against interfaces (no concrete adapters yet)
**Depends on**: Phase 1
**Requirements**: CORE-01, CORE-02, CORE-03, CORE-04, CORE-05, CORE-06, ETH-01, ETH-03, ARCH-01
**Success Criteria** (what must be TRUE):
  1. `component/ethereum/interfaces.ts` defines three port interfaces: `IEthereumProvider`, `ICacheStore`, and `IBalanceRepository`
  2. Response DTO carries dual units (wei + gwei for gas price, wei + eth for balance) and all Wei values are typed as `string` — never `number` or `bigint`
  3. Response DTO includes an ISO 8601 `timestamp` field on every successful response
  4. All responses (success and error) use the structured envelope `{ "data": ... }` / `{ "error": ... }`
  5. `EthereumService` fetches gas price and block number in parallel via `Promise.all` on cache miss; balance is always fetched live after the cache check; service API surface is finalized (method signatures settled)
**Plans:** 2/2 plans complete
Plans:
- [x] 02-01-PLAN.md — Port interfaces, DTOs, error classes, constants, and Wave 0 test scaffold
- [x] 02-02-PLAN.md — EthereumService implementation with full business logic

### Phase 3: Adapters
**Goal**: EtherscanAdapter, RedisAdapter, and TypeOrmBalanceRepository implement their respective port interfaces — each adapter handles its own failure mode without propagating errors to the service
**Depends on**: Phase 2
**Requirements**: ETH-02, CACHE-01, CACHE-02, CACHE-03, DB-01, DB-02, DB-03, ARCH-02
**Success Criteria** (what must be TRUE):
  1. EtherscanAdapter checks `data.status !== '1'` on every Etherscan response and throws an upstream error — never relies on HTTP status code alone
  2. Redis cache stores gas price and block number with a 15-second TTL; a cache hit skips the corresponding Etherscan calls
  3. Redis failure (connection error, timeout) logs a warning and the service falls back to live Etherscan fetch — no 500 returned to the caller
  4. Balance insert writes to PostgreSQL as a historical append (not upsert); the insert is fire-and-forget and does not delay the response
  5. PostgreSQL insert failure logs a warning and the response is still returned — the missing insert does not cause a 500
**Plans:** 3 plans
Plans:
- [ ] 03-01-PLAN.md — Wave 0 test scaffolds for all three adapters
- [ ] 03-02-PLAN.md — EtherscanAdapter implementing IEthereumProvider
- [ ] 03-03-PLAN.md — RedisAdapter, Balance entity, TypeOrmBalanceRepository, and wire.ts entity registration

### Phase 4: HTTP Layer and Docker
**Goal**: EthereumController is registered, wire.ts is async, the health endpoint exists, and Docker Compose runs the full stack with health checks
**Depends on**: Phase 3
**Requirements**: INFRA-01, INFRA-02, ARCH-03
**Success Criteria** (what must be TRUE):
  1. `GET /api/ethereum/:address` with a valid mainnet address returns gas price, block number, and balance in the structured envelope with dual units and a timestamp
  2. `GET /api/ethereum/invalid-address` returns HTTP 400 with a structured error body — no Etherscan calls are made
  3. `GET /api/health` returns HTTP 200 with `{ "status": "ok" }`
  4. `docker compose up` starts API, PostgreSQL, and Redis; the API container passes its health check and is reachable at the mapped port
**Plans:** 2 plans
Plans:
- [ ] 04-01-PLAN.md — EthereumController, health endpoint, and wire.ts full dependency wiring
- [ ] 04-02-PLAN.md — Dockerfile, docker-compose.yml, .dockerignore, and .env.example

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure Foundations | 1/1 | Complete   | 2026-04-02 |
| 2. Component Layer | 2/2 | Complete   | 2026-04-02 |
| 3. Adapters | 0/3 | In progress | - |
| 4. HTTP Layer and Docker | 0/2 | Not started | - |
