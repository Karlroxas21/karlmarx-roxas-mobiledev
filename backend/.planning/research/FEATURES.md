# Feature Research

**Domain:** Ethereum Data REST API (learning/interview project)
**Researched:** 2026-04-02
**Confidence:** HIGH — scope is tightly defined in PROJECT.md and corroborated by ethereum-api-plan.md

## Context Note

This is a subsequent milestone on an existing Express/TypeScript backend. The scope is fixed:
three Ethereum data points (gas price, block number, balance) via a single endpoint. The
interview/learning purpose is the lens for every prioritization call — clean code and
demonstrated patterns matter as much as functional correctness.

---

## Feature Landscape

### Table Stakes (Users Expect These)

"Users" here means: the frontend API client at `api-client.ts`, and an interviewer reviewing
the project. Missing any of these makes the API feel incomplete or unprofessional.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| `GET /api/ethereum/:address` returning gas price, block number, and balance | Core contract — the frontend already points to localhost:3000 expecting this shape | LOW | Path param over query param is clean REST style; already decided in PROJECT.md |
| Dual-unit values (wei + gwei for gas, wei + eth for balance) | Ethereum consumers always need human-readable units alongside raw wei; returning wei-only forces callers to do conversion | LOW | `gasPrice: { wei, gwei }` and `balance: { wei, eth }` — matches ethereum-api-plan.md response shape |
| Ethereum address validation (format) | Calling Etherscan with a malformed address wastes an API call and returns a confusing upstream error | LOW | Use `ethers.isAddress()` + `ethers.getAddress()` for checksum normalization |
| 400 response with structured error body for invalid address | API consumers need machine-readable errors, not raw 500s | LOW | `{ "error": { "message": "...", "code": "VALIDATION_ERROR" } }` pattern |
| 502/503 response for upstream Etherscan failures | Etherscan is a third-party dependency; callers need to distinguish their errors from ours | LOW | Custom AppError class with statusCode; centralized error middleware |
| `GET /api/health` endpoint | Standard probe for Docker Compose health checks and manual verification | LOW | `{ "status": "ok", "timestamp": "..." }` — essential for containerization story |
| Structured JSON responses (consistent envelope) | REST APIs should have a predictable response envelope; inconsistency is a red flag in code review | LOW | `{ "data": { ... } }` for success; `{ "error": { ... } }` for failures |
| Environment variable configuration for API keys and network | No hardcoded secrets; demonstrates production hygiene | LOW | `ETHERSCAN_API_KEY`, `ETHEREUM_NETWORK` (mainnet default), `DATABASE_URL`, `REDIS_URL` |

### Differentiators (Competitive Advantage)

"Competitive advantage" in interview context means: things that show engineering depth
beyond a naive implementation. These are what turn a passing grade into a strong one.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Redis caching for gas price and block number (15s TTL) | Demonstrates awareness of Etherscan free-tier rate limits (5 req/s) and shared data optimization; shows caching layer design | MEDIUM | Gas price and block number are global — same value for all users — so cache once. Balance is per-address, so do not cache it. |
| Graceful Redis degradation (cache miss = fallback to Etherscan, not 500) | Shows resilience thinking — infrastructure failures should not cascade to user-facing errors | LOW | If Redis is unavailable, log a warning and proceed with live fetch |
| PostgreSQL persistence of balance fetches (historical log) | Demonstrates TypeORM entity design, database integration, and trade-off reasoning (why store balance but not gas/block) | MEDIUM | Insert on every request — not an upsert — to build a fetch history. Non-blocking: DB failure logs warning but does not fail the response |
| Hexagonal architecture compliance (port/adapter pattern for Etherscan and Redis) | Demonstrates that the Ethereum component follows the same structural contract as the rest of the codebase — shows architectural consistency rather than ad-hoc wiring | MEDIUM | EtherscanClient and CachePort as interfaces in `component/ethereum/interfaces.ts`; implementations in `infrastructure/` |
| Input normalization (EIP-55 checksum address) | Shows knowledge of Ethereum address format subtleties; `ethers.getAddress()` normalizes mixed-case input to checksum form before storage and external calls | LOW | Prevents duplicate DB rows for same address in different cases |
| `timestamp` in response | Lets the caller know when the data was fetched, which matters given TTL-based caching — caller can reason about data freshness | LOW | ISO 8601 string; include in every successful response |
| Parallel Etherscan calls via `Promise.all` | Demonstrates async optimization — gas price, block number, and balance are independent fetches; sequential would be 3x slower | LOW | Etherscan has separate endpoints for each; all three can be in-flight simultaneously |
| Docker Compose for full stack (API + PostgreSQL + Redis) | Demonstrates containerization and makes the project runnable in a single command — strong interview signal | MEDIUM | Single `docker-compose.yml` with three services; `depends_on` with health checks |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Balance caching in Redis | "Cache everything" is a common instinct for performance | Balance is per-address and changes with each transaction; a stale cached balance is worse than a slow fresh one. Also undercuts the database persistence story. | Fetch balance live from Etherscan every time; persist to PostgreSQL for history |
| WebSocket / real-time balance updates | "Real-time" sounds better than polling | Adds significant complexity (ws library, connection management, reconnection logic) that is out of scope. The frontend already uses a `refreshTrigger` pattern via pull-to-refresh. | REST polling is sufficient; document in API response that consumers should re-fetch on user action |
| Transaction history endpoint | Natural extension of an Ethereum address API | Etherscan transaction list API requires pagination, type filtering (normal/internal/ERC20), and directional tagging. Doubles the scope. The frontend already handles this directly against Etherscan. | Document as v2 scope; the frontend's direct Etherscan call is already working |
| Multiple address support (batch endpoint) | "Could be useful" | Complicates address validation, response shape, partial failure handling, and caching strategy. Not needed by the frontend. | Single-address endpoint covers all current requirements |
| Authentication / API key middleware | "APIs should be secured" | Out of scope per PROJECT.md; adds setup friction for the demo. CORS restriction is sufficient for a learning project. | Note the gap in CORS configuration concerns; add as explicit out-of-scope item |
| `synchronize: true` in TypeORM for production | Convenient in development | Auto-synchronization drops and recreates columns without warning; data loss risk. | Use `synchronize: true` only in development; document that production requires migrations |
| Ethers.js v6 as the Etherscan HTTP client | ethers.js is available and familiar | ethers.js is a full Ethereum library — using it as an HTTP client for Etherscan REST endpoints is over-engineering. Etherscan's API is plain REST/JSON, not JSON-RPC. The balance can come from either; gas price and block number come from Etherscan's dedicated endpoints. | Use `node-fetch` or the native `fetch` (Node 18+) for Etherscan HTTP calls; keep ethers.js only for `isAddress()` and `getAddress()` utilities |

---

## Feature Dependencies

```
Address validation (isAddress + getAddress)
    └──required by──> GET /api/ethereum/:address handler
                          └──required by──> Balance fetch (Etherscan)
                          └──required by──> Gas price fetch (Etherscan, cached)
                          └──required by──> Block number fetch (Etherscan, cached)
                          └──required by──> Balance DB insert

Redis cache layer
    └──enhances──> Gas price fetch (cache-first, fallback to Etherscan)
    └──enhances──> Block number fetch (cache-first, fallback to Etherscan)
    └──must degrade gracefully──> If Redis unavailable, fetch live

PostgreSQL + TypeORM
    └──required by──> Balance history insert
    └──must degrade gracefully──> If DB unavailable, return response without inserting

Docker Compose
    └──requires──> PostgreSQL service healthy
    └──requires──> Redis service healthy
    └──requires──> API service depends_on both

Health endpoint
    └──enhances──> Docker Compose (health check target)
```

### Dependency Notes

- **Address validation requires being first:** Every subsequent action (Etherscan calls, DB insert) depends on a normalized, valid address. Validation must be the first step in the handler.
- **Redis and PostgreSQL must degrade gracefully:** Both are infrastructure dependencies. The core value (returning Ethereum data) must not fail when either is unavailable. This is explicitly decided in PROJECT.md.
- **Parallel fetch requires all three Etherscan calls to be independent:** Gas price, block number, and balance have no data dependency on each other. `Promise.all` is safe.
- **Docker Compose depends on health endpoint:** The `healthcheck` in the API service definition needs a working `/api/health` route. Health endpoint should be built before Docker Compose is wired.

---

## MVP Definition

### Launch With (v1)

Minimum set to validate the concept and satisfy the interview brief.

- [ ] `GET /api/ethereum/:address` — core contract with gas price, block number, and balance
- [ ] Address validation with structured 400 error
- [ ] Etherscan integration with parallel calls for all three data points
- [ ] Dual-unit response values (wei + human-readable)
- [ ] Timestamp in response
- [ ] Structured error envelope for upstream failures (502)
- [ ] `GET /api/health` endpoint
- [ ] Environment variable configuration (no hardcoded keys)
- [ ] Hexagonal architecture compliance (follows existing codebase patterns)

### Add After Core Works (v1.x)

- [ ] Redis caching for gas price and block number — add once the live-fetch path is verified working
- [ ] PostgreSQL balance history insert — add once TypeORM DataSource is configured and tested
- [ ] Input normalization (EIP-55 checksum) — small addition after address validation exists

### Future Consideration (v2+)

- [ ] Docker Compose — builds on top of a working API; add as final step after all services confirmed working
- [ ] Transaction history endpoint — significant scope increase; defer or omit
- [ ] TypeORM migrations — only relevant if moving beyond development `synchronize: true`

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `GET /api/ethereum/:address` (core endpoint) | HIGH | LOW | P1 |
| Address validation + 400 error | HIGH | LOW | P1 |
| Etherscan integration (3 parallel calls) | HIGH | LOW | P1 |
| Dual-unit values in response | HIGH | LOW | P1 |
| `GET /api/health` | MEDIUM | LOW | P1 |
| Structured error envelope | HIGH | LOW | P1 |
| Redis caching (gas + block) | HIGH | MEDIUM | P1 |
| PostgreSQL balance history | MEDIUM | MEDIUM | P1 |
| Hexagonal architecture compliance | HIGH (interview) | MEDIUM | P1 |
| Input normalization (EIP-55) | MEDIUM | LOW | P2 |
| Docker Compose | MEDIUM | MEDIUM | P2 |
| Graceful degradation (Redis + DB) | HIGH | LOW | P1 |
| Timestamp in response | LOW | LOW | P2 |

**Priority key:**
- P1: Must have — core value or interview differentiator
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Etherscan API Behavior Notes

These are from training data (HIGH confidence on stable, long-standing API endpoints) — verified
against the project's prior ethereum-api-plan.md which reflects direct API research.

**Endpoints used:**

| Data | Etherscan endpoint | Notes |
|------|--------------------|-------|
| ETH balance | `?module=account&action=balance&address={addr}&tag=latest` | Returns balance in Wei as a string |
| Gas price | `?module=gastracker&action=gasoracle` | Returns SafeGasPrice, ProposeGasPrice, FastGasPrice in Gwei; also returns `suggestBaseFee` |
| Block number | `?module=proxy&action=eth_blockNumber` | Returns current block as hex string (JSON-RPC proxy) |

**Rate limits:** Free tier allows 5 calls/second. `Promise.all` fires 3 calls simultaneously per
request — at low traffic this is fine. At moderate traffic, Redis caching ensures gas price and
block number only hit Etherscan every 15 seconds regardless of request volume.

**Response envelope:** Etherscan wraps all responses in `{ "status": "1", "message": "OK", "result": ... }`.
Status `"0"` with an error message in `result` indicates failure (e.g., invalid API key, invalid
address). The service layer must check `status !== "1"` and surface an appropriate error — not
just check HTTP status code (Etherscan returns 200 for most errors).

**Address validation gotcha:** Etherscan silently returns `"0"` balance for addresses that fail
its validation, rather than an error. Validate address format before calling Etherscan.

---

## Sources

- `PROJECT.md` — confirmed scope, constraints, and key decisions (Etherscan provider, Redis/PostgreSQL roles)
- `ethereum-api-plan.md` — prior implementation research including response shape, caching strategy, and error handling approach
- `frontend/src/lib/api-client.ts` — defines the consumer contract (expects `response.ok` HTTP semantics, parses as JSON)
- `frontend/src/features/wallet/hooks/use-balance.ts` — shows the frontend already fetches balance directly via Infura RPC; the backend balance is for persistence, not as the frontend's primary balance source
- `frontend/INTERVIEW_QUESTIONS.md` — reveals the interview evaluation criteria; backend must demonstrate clean architecture, error handling, and testable service boundaries
- `codebase/CONCERNS.md` — flags no input validation library, no health check endpoint, `process.exit` in server constructor — all directly inform feature requirements
- Etherscan API documentation (training data, HIGH confidence for these stable v2 endpoints)

---

*Feature research for: Ethereum Address Data REST API*
*Researched: 2026-04-02*
