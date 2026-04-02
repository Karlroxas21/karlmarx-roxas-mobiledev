# Requirements: Ethereum Address API

**Defined:** 2026-04-02
**Core Value:** Given an Ethereum address, return accurate gas price, block number, and balance in a single clean JSON response.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Core Endpoint

- [x] **CORE-01**: User can call `GET /api/ethereum/:address` and receive gas price, block number, and balance in JSON
- [x] **CORE-02**: Response includes dual-unit values (wei + gwei for gas, wei + eth for balance)
- [x] **CORE-03**: Response includes ISO 8601 timestamp indicating when data was fetched
- [x] **CORE-04**: Response uses structured JSON envelope (`{ "data": { ... } }` for success, `{ "error": { ... } }` for failure)
- [x] **CORE-05**: Invalid Ethereum address returns 400 with structured error body
- [x] **CORE-06**: Ethereum addresses are normalized to EIP-55 checksum format before processing

### Etherscan Integration

- [x] **ETH-01**: Gas price, block number, and balance are fetched from Etherscan API in parallel via `Promise.all`
- [ ] **ETH-02**: Etherscan response validation checks `status !== "1"` (not just HTTP status)
- [x] **ETH-03**: Etherscan failures return 502 with structured error to client
- [x] **ETH-04**: Etherscan API key and base URL are configured via environment variables

### Caching

- [ ] **CACHE-01**: Gas price and block number are cached in Redis with ~15s TTL
- [ ] **CACHE-02**: Cache hit skips Etherscan calls for gas/block (balance always fetched live)
- [ ] **CACHE-03**: Redis failure degrades gracefully — fallback to live Etherscan fetch, not 500

### Database

- [ ] **DB-01**: Account balance is stored in PostgreSQL on each request (historical log, not upsert)
- [ ] **DB-02**: Database insert is non-blocking (fire-and-forget, does not slow response)
- [ ] **DB-03**: PostgreSQL failure degrades gracefully — response still returned, insert skipped with warning log

### Architecture

- [x] **ARCH-01**: Ethereum component follows hexagonal architecture with port interfaces in `component/ethereum/interfaces.ts`
- [ ] **ARCH-02**: Infrastructure adapters (Etherscan, Redis, PostgreSQL) implement port interfaces
- [ ] **ARCH-03**: Dependencies are wired via constructor injection in `wire.ts`

### Infrastructure

- [ ] **INFRA-01**: `GET /api/health` endpoint returns `{ "status": "ok" }` for Docker/probe checks
- [ ] **INFRA-02**: Docker Compose runs full stack (API + PostgreSQL + Redis) with healthchecks
- [x] **INFRA-03**: Application validates required environment variables at startup and fails fast with descriptive error

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Extended Data

- **EXT-01**: Transaction history endpoint for a given address
- **EXT-02**: Multiple address batch endpoint

### Operations

- **OPS-01**: TypeORM migrations for production schema management
- **OPS-02**: Rate limiting middleware
- **OPS-03**: API authentication/key middleware

## Out of Scope

| Feature | Reason |
|---------|--------|
| Frontend/UI | API-only project |
| Authentication/authorization | Not needed for learning/interview scope |
| Multiple blockchain support | Ethereum only |
| WebSocket/real-time updates | REST polling sufficient; frontend uses pull-to-refresh |
| Balance caching in Redis | Per-address, stale quickly, undercuts DB persistence story |
| Production deployment | Docker for local development only |
| ethers.js as HTTP client | Over-engineering; Etherscan is plain REST, use axios@1.14.0 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 2 | Complete |
| CORE-02 | Phase 2 | Complete |
| CORE-03 | Phase 2 | Complete |
| CORE-04 | Phase 2 | Complete |
| CORE-05 | Phase 2 | Complete |
| CORE-06 | Phase 2 | Complete |
| ETH-01 | Phase 2 | Complete |
| ETH-02 | Phase 3 | Pending |
| ETH-03 | Phase 2 | Complete |
| ETH-04 | Phase 1 | Complete |
| CACHE-01 | Phase 3 | Pending |
| CACHE-02 | Phase 3 | Pending |
| CACHE-03 | Phase 3 | Pending |
| DB-01 | Phase 3 | Pending |
| DB-02 | Phase 3 | Pending |
| DB-03 | Phase 3 | Pending |
| ARCH-01 | Phase 2 | Complete |
| ARCH-02 | Phase 3 | Pending |
| ARCH-03 | Phase 4 | Pending |
| INFRA-01 | Phase 4 | Pending |
| INFRA-02 | Phase 4 | Pending |
| INFRA-03 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 after roadmap creation*
