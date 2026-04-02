# Phase 4: HTTP Layer and Docker - Research

**Researched:** 2026-04-02
**Domain:** Express 5 controller pattern, TypeScript DI wiring, Docker multi-stage build
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- EthereumController follows existing Controller interface: `register(server, middlewares?)` pattern
- Route: `GET /api/ethereum/:address` — calls EthereumService.getEthereumData(address)
- Wraps response in SuccessEnvelope on success
- Catches ValidationError → 400 with ErrorEnvelope (code: VALIDATION_ERROR)
- Catches EtherscanApiError → 502 with ErrorEnvelope (code: UPSTREAM_ERROR)
- Catches unknown errors → 500 with generic error
- Lives in `src/entrypoint/controller/ethereum-controller.ts`
- Health endpoint: `GET /api/health` returns `{ "status": "ok" }` with HTTP 200
- Dockerfile: multi-stage build (build stage + production stage) using node:24-alpine
- docker-compose.yml: 3 services (api, postgres, redis)
- PostgreSQL: postgres:17-alpine with healthcheck (pg_isready)
- Redis: redis:7-alpine with healthcheck (redis-cli ping)
- API depends_on both with condition: service_healthy
- .env.example updated with all required vars for Docker
- .dockerignore for node_modules, dist, .planning
- wire.ts instantiates EtherscanAdapter, RedisAdapter, TypeOrmBalanceRepository
- wire.ts creates EthereumService with all 3 adapters injected
- wire.ts creates EthereumController with service injected, adds to controllers array
- Controller uses express async error handling (try-catch in route handler)
- Docker Compose exposes port 3000 for the API

### Claude's Discretion

- Exact Dockerfile optimization (layer caching, etc.)
- Docker Compose port mappings
- Whether health endpoint is inline or separate controller

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | `GET /api/health` endpoint returns `{ "status": "ok" }` for Docker/probe checks | Inline route in server.ts is simplest; no new Controller subclass required |
| INFRA-02 | Docker Compose runs full stack (API + PostgreSQL + Redis) with healthchecks | docker-compose v3.8+ `depends_on.condition: service_healthy` pattern verified |
| ARCH-03 | Dependencies are wired via constructor injection in `wire.ts` | All adapter constructors confirmed; wire.ts already has DataSource + Redis created |
</phase_requirements>

---

## Summary

Phase 4 completes the vertical slice: the HTTP layer (EthereumController + health endpoint) is wired to all three adapters via constructor injection in wire.ts, and a Docker Compose file brings up the full stack with proper healthcheck ordering.

The project runs **Express 5.2.1** (confirmed from installed node_modules). Express 5 natively catches rejected promises from async route handlers — the router layer's `handleRequest` calls `ret.then(null, next)` automatically. This means a try-catch block inside the async handler is the correct pattern for mapping specific error types to HTTP status codes, and no `express-async-errors` wrapper package is needed.

All adapter constructors have been confirmed from source: `EtherscanAdapter(baseUrl, apiKey)`, `RedisAdapter(redis: Redis)`, `TypeOrmBalanceRepository(repository: Repository<Balance>)`. The `TypeOrmBalanceRepository` requires `dataSource.getRepository(Balance)` — the TypeORM DataSource is already initialized in wire.ts and the Balance entity is already imported there.

**Primary recommendation:** Write EthereumController as a class with a try-catch in its async handler, wire all adapters in wire.ts using existing DataSource and Redis instances, and build Dockerfile using node:24-alpine with a two-stage build that copies only `package*.json` before `npm ci` for optimal layer caching.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | 5.2.1 | HTTP routing | Already installed; Controller interface targets it |
| TypeScript | 6.0.2 | Type safety | Project-wide, strict mode |
| typeorm | 0.3.28 | PostgreSQL ORM | Already in wire.ts, DataSource pattern in use |
| ioredis | 5.10.1 | Redis client | Already in wire.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:24-alpine | Docker base | Minimal production image | Multi-stage Dockerfile |
| postgres:17-alpine | Docker service | PostgreSQL container | Docker Compose only |
| redis:7-alpine | Docker service | Redis container | Docker Compose only |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline health route in server.ts | Separate HealthController class | Controller adds boilerplate; inline is sufficient for a single route |
| try-catch in handler | Express global error middleware | Error middleware requires 4-arg signature; try-catch gives per-handler control over status codes |

**No new installations required.** All runtime dependencies are present.

---

## Architecture Patterns

### Controller Structure (established by project)

The project defines the Controller interface in `src/server.ts`:

```typescript
export interface Controller {
    register(
        server: Express,
        middlewares?: Record<string, RequestHandler>,
    ): void;
}
```

Controllers are instantiated in `src/wire.ts`, pushed into the `controllers: Controller[]` array, and passed to `new Server(app, controllers, ...)`. The Server constructor iterates them and calls `c.register(this.instance, this.middlewares)`.

### Pattern 1: Async Route Handler with Error Mapping

**What:** async handler inside `register()` with a try-catch that maps domain errors to HTTP responses.

**When to use:** Whenever a route calls an async service method that can throw typed domain errors.

**Why no wrapper library needed:** Express 5 router (`router` npm package v2+) already does `ret.then(null, next)` on any returned promise. A try-catch inside the handler is used to map ValidationError/EtherscanApiError to specific HTTP codes *before* Express's default error handler would produce a 500.

```typescript
// Source: confirmed via node_modules/router/lib/layer.js lines 142-166
register(server: Express): void {
    server.get('/api/ethereum/:address', async (req, res) => {
        try {
            const data = await this.service.getEthereumData(req.params.address);
            const body: SuccessEnvelope<EthereumDataDto> = { data };
            res.status(200).json(body);
        } catch (err) {
            if (err instanceof ValidationError) {
                const body: ErrorEnvelope = {
                    error: { message: err.message, code: 'VALIDATION_ERROR' },
                };
                res.status(400).json(body);
            } else if (err instanceof EtherscanApiError) {
                const body: ErrorEnvelope = {
                    error: { message: err.message, code: 'UPSTREAM_ERROR' },
                };
                res.status(502).json(body);
            } else {
                res.status(500).json({
                    error: { message: 'Internal server error' },
                });
            }
        }
    });
}
```

### Pattern 2: wire.ts Wiring Order

**What:** Infrastructure first, then services, then controllers. All async initialization (DataSource) completes before any service/controller is constructed.

**When to use:** Every time a new adapter is added.

```typescript
// Infrastructure (already in wire.ts)
await dataSource.initialize();
const redis = new Redis(config.redisUrl);

// Adapters — construct from already-initialized infra
const etherscanAdapter = new EtherscanAdapter(
    config.etherscanBaseUrl,
    config.etherscanApiKey,
);
const redisAdapter = new RedisAdapter(redis);
const balanceRepository = new TypeOrmBalanceRepository(
    dataSource.getRepository(Balance),
);

// Service
const ethereumService = new EthereumService(
    etherscanAdapter,
    redisAdapter,
    balanceRepository,
);

// Controller
const ethereumController = new EthereumController(ethereumService);

const controllers: Controller[] = [ethereumController];
```

### Pattern 3: Health Endpoint (inline in server.ts)

**What:** Single GET route registered before controller loop, returns a hardcoded JSON body.

**When to use:** When the health probe is infrastructure-level and does not depend on any injected service.

```typescript
// In Server constructor, before the controllers.forEach loop:
instance.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
});
```

### Pattern 4: Docker Multi-Stage Build (node:24-alpine)

**What:** Two stages — `build` compiles TypeScript to `dist/`, `production` copies only `dist/` and production node_modules.

**When to use:** All Node.js TypeScript services intended to run in Docker.

**Layer caching key insight:** Copy `package*.json` and run `npm ci --only=production` *before* copying source files. This way the dependency layer is only invalidated when package-lock.json changes, not on every source edit.

```dockerfile
# Stage 1: build
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 2: production
FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Pattern 5: Docker Compose with service_healthy depends_on

**What:** Services declare healthchecks; the API service uses `depends_on` with `condition: service_healthy` to delay startup until dependencies pass.

**When to use:** Any multi-service compose file where the API would crash on startup if the database or cache is not ready.

```yaml
# docker-compose.yml (Compose file format v3.8+)
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ethereum_api
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    ports:
      - "6379:6379"

  api:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
```

### Recommended Project Structure (after Phase 4)

```
src/
├── entrypoint/
│   ├── controller/
│   │   └── ethereum-controller.ts     # NEW: EthereumController
│   └── middleware/                    # existing (empty)
├── component/ethereum/                # existing
├── infrastructure/                    # existing
├── config.ts                          # existing
├── server.ts                          # MODIFIED: add health route
├── wire.ts                            # MODIFIED: wire adapters + controller
└── index.ts                           # unchanged
Dockerfile                             # NEW
docker-compose.yml                     # NEW
.dockerignore                          # NEW
.env.example                           # MODIFIED: add Docker-compatible values
```

### Anti-Patterns to Avoid

- **instanceof check on Error subclasses without `Object.setPrototypeOf`:** Already handled — both ValidationError and EtherscanApiError call `Object.setPrototypeOf(this, X.prototype)` in their constructors. The instanceof checks in the controller will work correctly in CJS.
- **Registering the health route after controllers:** The health route should be registered first (or at least in the Server constructor before controller iteration) so it is never accidentally blocked by a middleware a controller might install.
- **`npm install` in the production Docker stage:** Use `npm ci --only=production` — deterministic, fast, skips devDependencies.
- **`COPY . .` before `npm ci` in Dockerfile:** This invalidates the layer cache on every source change. Always copy `package*.json` first.
- **Using `synchronize: true` in production TypeORM config:** wire.ts already gates this on `NODE_ENV !== 'production'`. The Dockerfile sets `NODE_ENV=production`.
- **Not setting `NODE_ENV=production` in the Dockerfile ENV instruction:** TypeScript `tsc` output must be present in `dist/`; the production stage starts `node dist/index.js`, not ts-node.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async error forwarding in Express 5 | Custom promise wrapper middleware | Native Express 5 behavior | router/lib/layer.js already calls `ret.then(null, next)` |
| Container startup ordering | Shell sleep loops | `depends_on` + `condition: service_healthy` | Compose native; sleep is flaky |
| TypeScript compilation in Docker | Runtime ts-node in production | `tsc` in build stage, `node dist/` in prod stage | ts-node adds ~100MB overhead and is slower |

**Key insight:** Express 5 eliminated the need for `express-async-errors` or wrapper functions. The try-catch in the handler is for *mapping* domain errors to HTTP codes, not for catching unhandled rejections.

---

## Common Pitfalls

### Pitfall 1: `instanceof` Failing Across Module Boundaries

**What goes wrong:** `err instanceof ValidationError` returns false even though the error was thrown as a ValidationError.

**Why it happens:** In CommonJS, if a module is loaded twice (e.g., due to a Jest transform or circular require), there are two copies of the class. `Object.setPrototypeOf` in the constructor mitigates this for runtime code.

**How to avoid:** Both error classes already use `Object.setPrototypeOf`. Do not remove it. Keep the error module import path consistent (no aliasing).

**Warning signs:** Error falls through all catch branches and returns 500 when ValidationError was thrown.

### Pitfall 2: `dataSource.getRepository(Balance)` Called Before `initialize()`

**What goes wrong:** TypeORM throws "DataSource is not initialized" at wire-time.

**Why it happens:** `getRepository` is synchronous but requires the DataSource to be connected.

**How to avoid:** The wire.ts already `await dataSource.initialize()` before the Services section. Adapter instantiation must stay after that `await`. Do not hoist adapter construction before the DataSource await.

**Warning signs:** `DataSource is not initialized` error on startup, even before any HTTP request.

### Pitfall 3: Health Endpoint After Controller Registration Causes 404

**What goes wrong:** A controller accidentally mounts middleware that intercepts all routes before the health route is matched.

**Why it happens:** Express applies middleware in registration order. If a controller installs a catch-all before `/api/health` is registered, health requests are consumed.

**How to avoid:** Register the health route in `Server` constructor before the `controllers.forEach` loop, or ensure no controller installs a catch-all middleware.

### Pitfall 4: Docker Compose `.env` vs. `env_file`

**What goes wrong:** Environment variables are not available inside the container at runtime, causing the `config.ts` startup validation to throw.

**Why it happens:** `.env` file is automatically read by Compose for variable substitution in the YAML, but is NOT automatically injected into container environment unless `env_file:` is specified.

**How to avoid:** Use `env_file: .env` on the api service in docker-compose.yml. Keep `.env.example` updated with all keys from `REQUIRED_ENV_VARS` in config.ts plus Docker-network-aware values (`DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ethereum_api`, `REDIS_URL=redis://redis:6379`).

**Warning signs:** "Missing required environment variables" on `docker compose up`.

### Pitfall 5: `HOSTNAME` env var collides with system variable

**What goes wrong:** `process.env.HOSTNAME` is set by the Linux kernel to the container's hostname, so `config.hostname` resolves to a random container ID rather than `0.0.0.0`.

**Why it happens:** config.ts reads `process.env.HOSTNAME || '0.0.0.0'`. Inside a Docker container, the kernel exports `HOSTNAME` automatically.

**How to avoid:** Either remove `HOSTNAME` from the config and hardcode `'0.0.0.0'` as the default, or explicitly set `HOSTNAME=0.0.0.0` in the `environment:` block of docker-compose.yml (or the .env file). The server already defaults to `0.0.0.0` — the real risk is the env var being set to something else.

**Warning signs:** Server starts but is unreachable from the host despite port mapping.

---

## Code Examples

### EthereumController — full class skeleton

```typescript
// src/entrypoint/controller/ethereum-controller.ts
import { Express, Request, Response } from 'express';
import { Controller } from '../../server';
import { EthereumService } from '../../component/ethereum/service';
import {
    SuccessEnvelope,
    ErrorEnvelope,
    EthereumDataDto,
} from '../../component/ethereum/response-models';
import {
    ValidationError,
    EtherscanApiError,
} from '../../component/ethereum/errors';
import { logger } from '../../config';

export class EthereumController implements Controller {
    constructor(private readonly service: EthereumService) {}

    register(server: Express): void {
        server.get(
            '/api/ethereum/:address',
            async (req: Request, res: Response) => {
                try {
                    const data = await this.service.getEthereumData(
                        req.params.address,
                    );
                    const body: SuccessEnvelope<EthereumDataDto> = { data };
                    res.status(200).json(body);
                } catch (err) {
                    if (err instanceof ValidationError) {
                        const body: ErrorEnvelope = {
                            error: {
                                message: err.message,
                                code: 'VALIDATION_ERROR',
                            },
                        };
                        res.status(400).json(body);
                    } else if (err instanceof EtherscanApiError) {
                        const body: ErrorEnvelope = {
                            error: {
                                message: err.message,
                                code: 'UPSTREAM_ERROR',
                            },
                        };
                        res.status(502).json(body);
                    } else {
                        logger.error('Unhandled controller error', {
                            error: err,
                        });
                        res.status(500).json({
                            error: { message: 'Internal server error' },
                        });
                    }
                }
            },
        );
    }
}
```

### wire.ts — complete updated form

```typescript
// Key additions to existing wire.ts (after Redis creation, before controllers array)
import { EtherscanAdapter } from './infrastructure/etherscan/EtherscanAdapter';
import { RedisAdapter } from './infrastructure/redis/RedisAdapter';
import { TypeOrmBalanceRepository } from './infrastructure/postgres/TypeOrmBalanceRepository';
import { EthereumService } from './component/ethereum/service';
import { EthereumController } from './entrypoint/controller/ethereum-controller';

// Adapters
const etherscanAdapter = new EtherscanAdapter(
    config.etherscanBaseUrl,
    config.etherscanApiKey,
);
const redisAdapter = new RedisAdapter(redis);
const balanceRepository = new TypeOrmBalanceRepository(
    dataSource.getRepository(Balance),
);

// Services
const ethereumService = new EthereumService(
    etherscanAdapter,
    redisAdapter,
    balanceRepository,
);

// Controllers
const controllers: Controller[] = [
    new EthereumController(ethereumService),
];
```

### .env.example — Docker-compatible additions

```bash
HOSTNAME=0.0.0.0
PORT=3000
LOG_LEVEL=info
NODE_ENV=development
# Local development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ethereum_api
REDIS_URL=redis://localhost:6379
# Docker (use service names as hostnames)
# DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ethereum_api
# REDIS_URL=redis://redis:6379
ETHERSCAN_API_KEY=your_api_key_here
ETHERSCAN_BASE_URL=https://api.etherscan.io/api
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `express-async-errors` patch | Native Express 5 async handling | Express 5.0 (2024) | No wrapper package needed |
| `docker-compose` v1 CLI | `docker compose` v2 plugin | Docker Desktop 3.x+ | Use `docker compose up`, not `docker-compose up` |
| `npm install` in Dockerfile | `npm ci` | npm 5.7+ | Deterministic, uses lockfile exactly |

**Deprecated/outdated:**
- `express-async-errors` package: Not needed in Express 5. The router already handles promise rejection.
- `--production` flag for npm: Replaced by `--only=production` (or `--omit=dev` in npm 7+). Use `--omit=dev` for npm 7+ compatibility, but `--only=production` still works.

---

## Open Questions

1. **`HOSTNAME` collision with kernel-set env var**
   - What we know: Linux sets `HOSTNAME` in the container environment automatically.
   - What's unclear: Whether the current value `0.0.0.0` in .env.example will override the kernel value inside the container.
   - Recommendation: Explicitly set `HOSTNAME=0.0.0.0` in docker-compose.yml `environment:` block, or remove HOSTNAME from config.ts and hardcode `'0.0.0.0'` as the listen address (safest choice since the server should always listen on all interfaces inside Docker).

2. **TypeORM `synchronize: true` with Docker on first run**
   - What we know: `synchronize` is gated on `NODE_ENV !== 'production'`. The Dockerfile sets `NODE_ENV=production`.
   - What's unclear: Developer may want local Docker development with auto-schema sync.
   - Recommendation: For Docker Compose development use, the .env file should set `NODE_ENV=development` so `synchronize: true` runs and creates the `balance_history` table on first boot. The Dockerfile `ENV NODE_ENV=production` acts as a production-safe default that the env_file overrides.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 with ts-jest 29.4.9 |
| Config file | `jest.config.ts` (module.exports, commonjs) |
| Quick run command | `npm test -- --testPathPattern=ethereum-controller` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARCH-03 | Adapters wired via constructor injection in wire.ts | unit | `npm test -- --testPathPattern=wire` | ❌ Wave 0 |
| INFRA-01 | GET /api/health returns `{ status: 'ok' }` with 200 | unit | `npm test -- --testPathPattern=ethereum-controller` | ❌ Wave 0 |
| INFRA-02 | Docker Compose starts all 3 services with healthchecks | manual-only | N/A — requires Docker daemon | manual |

**INFRA-02 justification:** Docker Compose bring-up cannot be automated in Jest. Verified manually via `docker compose up` and observing health status with `docker compose ps`.

### Sampling Rate
- **Per task commit:** `npm test -- --testPathPattern=ethereum-controller`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/tests/ethereum-controller.test.ts` — covers INFRA-01 (health route 200 response) and ARCH-03 (integration: correct error → HTTP status mapping)
- [ ] `src/tests/wire.test.ts` — covers ARCH-03 (wire.ts exports a constructed Server with EthereumController registered) — optional if controller test suffices

**Pattern for controller test (no HTTP server needed):**
```typescript
// Use a mock Express instance to test register() wiring
const mockApp = { get: jest.fn() } as unknown as Express;
const controller = new EthereumController(mockService);
controller.register(mockApp);
expect(mockApp.get).toHaveBeenCalledWith(
    '/api/ethereum/:address',
    expect.any(Function),
);
```

---

## Sources

### Primary (HIGH confidence)
- Inspected `node_modules/router/lib/layer.js` — confirmed Express 5 catches async rejections natively via `ret.then(null, next)`
- Inspected `src/server.ts` — confirmed Controller interface signature
- Inspected `src/wire.ts` — confirmed existing DataSource + Redis initialization pattern
- Inspected `src/infrastructure/etherscan/EtherscanAdapter.ts` — confirmed constructor `(baseUrl, apiKey)`
- Inspected `src/infrastructure/redis/RedisAdapter.ts` — confirmed constructor `(redis: Redis)`
- Inspected `src/infrastructure/postgres/TypeOrmBalanceRepository.ts` — confirmed constructor `(repository: Repository<Balance>)`
- Inspected `src/component/ethereum/errors.ts` — confirmed `Object.setPrototypeOf` is present on both error classes
- Inspected `src/component/ethereum/response-models.ts` — confirmed SuccessEnvelope, ErrorEnvelope, ErrorBody shapes
- Inspected `package.json` — express 5.2.1, TypeScript 6.0.2, no new dependencies required

### Secondary (MEDIUM confidence)
- Docker Compose `depends_on.condition: service_healthy` — standard Compose v3.8+ feature; `pg_isready` and `redis-cli ping` are the canonical healthcheck commands for those images
- node:24-alpine + multi-stage build — standard Node.js Docker best practice; matches Node 24.12.0 currently installed on host

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies inspected from installed node_modules
- Architecture: HIGH — Controller interface and server wiring confirmed from source
- Pitfalls: HIGH — HOSTNAME collision and TypeORM init order verified from source; async error handling confirmed from Express 5 router source
- Docker patterns: MEDIUM — canonical patterns, not project-specific; verified from Docker documentation conventions

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable dependencies; Docker image tags are pinned)
