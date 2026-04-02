# Phase 4: HTTP Layer and Docker - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Create EthereumController implementing the Controller interface, wire all adapters into EthereumService in wire.ts, add a health endpoint, and create Dockerfile + Docker Compose for the full stack (API + PostgreSQL + Redis with healthchecks).

</domain>

<decisions>
## Implementation Decisions

### EthereumController
- Follows existing Controller interface: `register(server, middlewares?)` pattern
- Route: `GET /api/ethereum/:address` — calls EthereumService.getAccountData(address)
- Wraps response in SuccessEnvelope on success
- Catches ValidationError → 400 with ErrorEnvelope (code: VALIDATION_ERROR)
- Catches EtherscanApiError → 502 with ErrorEnvelope (code: UPSTREAM_ERROR)
- Catches unknown errors → 500 with generic error
- Lives in `src/entrypoint/controller/ethereum-controller.ts`

### Health Endpoint
- Route: `GET /api/health`
- Returns `{ "status": "ok" }` with HTTP 200
- Can be a simple inline route in server.ts or a separate HealthController — Claude's discretion
- Used as Docker healthcheck target

### wire.ts Updates
- Instantiate EtherscanAdapter, RedisAdapter, TypeOrmBalanceRepository
- Create EthereumService with all 3 adapters injected
- Create EthereumController with service injected
- Add to controllers array

### Docker
- Dockerfile: multi-stage build (build stage + production stage) using node:24-alpine
- docker-compose.yml: 3 services (api, postgres, redis)
- PostgreSQL: postgres:17-alpine with healthcheck (pg_isready)
- Redis: redis:7-alpine with healthcheck (redis-cli ping)
- API depends_on both with condition: service_healthy
- .env.example updated with all required vars for Docker
- .dockerignore for node_modules, dist, .planning

### Claude's Discretion
- Exact Dockerfile optimization (layer caching, etc.)
- Docker Compose port mappings
- Whether health endpoint is inline or separate controller

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/server.ts` — Controller interface, server class with middleware pipeline
- `src/wire.ts` — composition root with DataSource + Redis already initialized
- `src/component/ethereum/service.ts` — EthereumService ready for injection
- `src/component/ethereum/response-models.ts` — SuccessEnvelope, ErrorEnvelope types
- `src/component/ethereum/errors.ts` — ValidationError, EtherscanApiError

### Established Patterns
- Controllers implement `Controller` interface and self-register routes
- Manual DI in wire.ts
- Winston logger for structured logging

### Integration Points
- `src/wire.ts` — instantiate adapters + service + controller, add to controllers array
- `src/server.ts` — registers controllers via `c.register(this.instance, this.middlewares)`

</code_context>

<specifics>
## Specific Ideas

- Controller should use express async error handling (try-catch in route handler)
- Docker Compose should expose port 3000 for the API
- .dockerignore should exclude .planning/, node_modules/, dist/

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
