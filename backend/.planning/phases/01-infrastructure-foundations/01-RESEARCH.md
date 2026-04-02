# Phase 1: Infrastructure Foundations - Research

**Researched:** 2026-04-02
**Domain:** TypeORM DataSource (PostgreSQL), ioredis, env var validation, tsconfig decorators
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- axios must be pinned to exactly "1.14.0" (no caret) due to supply chain attack on 1.14.1
- ioredis preferred over node-redis (TypeORM peer dependency alignment)
- reflect-metadata must be first import in index.ts
- synchronize: true must be gated behind NODE_ENV !== 'production'

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ETH-04 | Etherscan API key and base URL are configured via environment variables | env var validation pattern in `config.ts`; ETHERSCAN_API_KEY and ETHERSCAN_BASE_URL added to required vars list |
| INFRA-03 | Application validates required environment variables at startup and fails fast with descriptive error | manual guard pattern in `config.ts` throws `Error` listing missing vars; `wire.ts` `.catch` → `process.exit(1)` already handles shutdown |
</phase_requirements>

## Summary

Phase 1 installs the runtime dependencies that subsequent phases rely on (ioredis, pg, reflect-metadata, ethers, axios@1.14.0), patches `tsconfig.json` for TypeORM decorator support, wires a TypeORM `DataSource` and an ioredis `Redis` client in `wire.ts`, and extends `config.ts` with env var validation that fails fast on startup.

The project already has TypeORM 0.3.28 and reflect-metadata 0.2.2 installed as transitive deps. dotenv 16.6.1 is also already present (pulled in by TypeORM itself). The packages that still need explicit installation are: `ioredis`, `pg`, `@types/pg`, `ethers`, and `axios` (pinned to exactly `1.14.0`). The TypeORM peer dependency manifest confirms `ioredis ^5.0.4` and `pg ^8.5.1` as expected versions.

**Primary recommendation:** Extend `config.ts` with env validation and new vars, add `import 'reflect-metadata'` as the first line of `index.ts`, patch `tsconfig.json` for decorators, then initialize `DataSource` and `Redis` inside the `// Infra` block of `wire.ts`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| typeorm | 0.3.28 (already installed) | ORM / DataSource for PostgreSQL | Already in package.json; project CLAUDE.md confirms it |
| reflect-metadata | 0.2.2 (already installed) | TypeScript decorator metadata at runtime | TypeORM hard dependency; must be side-effect imported before any entity |
| pg | ^8.16 (latest 8.x) | PostgreSQL driver | TypeORM peer dep; `pg ^8.5.1` required |
| ioredis | ^5.x | Redis client | TypeORM peer dep `ioredis ^5.0.4`; project constraint prefers over node-redis |
| dotenv | 16.6.1 (already installed) | Load .env into process.env | Already pulled in by TypeORM; call `dotenv.config()` explicitly early |
| ethers | ^6.x | `isAddress` / `getAddress` for EIP-55 (Phase 2) | Already decided in STATE.md; install now so Phase 2 can import it |
| axios | exactly "1.14.0" | HTTP client for Etherscan | Supply chain constraint: 1.14.1 is compromised — pin with no caret |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/pg | ^8.x | TypeScript types for pg | Install alongside pg (pg has no bundled types) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ioredis | node-redis | node-redis would conflict with TypeORM peer dep alignment |
| manual env guard | envalid / zod | Adds a dependency for what is a one-time 10-line guard; overkill here |

**Installation (packages not yet in package.json):**
```bash
npm install ioredis pg @types/pg ethers
npm install axios@1.14.0 --save-exact
```

## Architecture Patterns

### Recommended Project Structure (additions only)

```
src/
├── config.ts          # EXTEND: add new env vars + validation guard
├── index.ts           # PATCH: add `import 'reflect-metadata'` as line 1
├── wire.ts            # EXTEND: initialize DataSource and Redis in // Infra block
└── infrastructure/
    └── postgres/      # Currently empty — DataSource defined in wire.ts for now
```

No new directories are needed for this phase. The `DataSource` instance lives in `wire.ts` and is passed to later infrastructure adapters via constructor injection.

### Pattern 1: reflect-metadata First Import

**What:** `import 'reflect-metadata'` must be the absolute first import in `src/index.ts`, before dotenv, before config, before everything.

**When to use:** Required whenever TypeORM entity decorators (`@Entity`, `@Column`, `@PrimaryGeneratedColumn`) are used in the process.

**Why:** `reflect-metadata` extends the global `Reflect` object. TypeORM's decorator factories call `Reflect.metadata(...)` at class-definition time. If the polyfill is not loaded first, any module that imports an entity class before `reflect-metadata` is loaded will silently lose type metadata, causing "column type not defined" errors at runtime.

**Example:**
```typescript
// src/index.ts — line 1, no exceptions
import 'reflect-metadata';
import { createServer } from './wire';
import { logger } from './config';

createServer()
    .then((server) => {
        server.start();
        logger.info('server started');
    })
    .catch((error) => {
        logger.error('failed to start server', { error });
        process.exit(1);
    });
```
Source: https://typeorm.io/docs/getting-started/

### Pattern 2: tsconfig.json Decorator Flags

**What:** Two compiler options must be added.

**When to use:** Any TypeScript project using TypeORM legacy decorators (all of 0.3.x).

**Note on TypeScript 5.0+:** TypeScript 5.0 introduced Stage 3 decorators that don't need `experimentalDecorators`, but TypeORM 0.3.x still uses the legacy decorator model. These flags are required until TypeORM migrates (tracked upstream as issue #10869, not yet done as of this writing).

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```
Source: https://typeorm.io/docs/getting-started/

### Pattern 3: TypeORM DataSource Initialization

**What:** Construct a `DataSource` with PostgreSQL options, call `initialize()`, await the result.

**When to use:** Once at application boot, inside the `// Infra` block of `wire.ts`.

**Key options:**
- `url: config.databaseUrl` — connection string from env; individual fields override parts of the URL if also set
- `synchronize: NODE_ENV !== 'production'` — auto-migrate schema in dev, never in prod
- `logging: NODE_ENV === 'development'` — optional; noisy in test
- `entities: []` — empty for Phase 1; entities are added in Phase 3

```typescript
// Source: https://typeorm.io/docs/data-source/data-source/
import { DataSource } from 'typeorm';
import { config } from './config';

const dataSource = new DataSource({
    type: 'postgres',
    url: config.databaseUrl,
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
    entities: [],
});

await dataSource.initialize();
// dataSource is now ready; pass to infrastructure adapters
```

**Failure mode:** `initialize()` throws if the database is unreachable. The existing `.catch → process.exit(1)` in `wire.ts` / `index.ts` handles this correctly.

### Pattern 4: ioredis Client Initialization

**What:** Construct `Redis` with a URL string, immediately attach an `'error'` listener.

**When to use:** Inside the `// Infra` block of `wire.ts`, after dotenv is loaded.

**Critical:** Node.js `EventEmitter` will throw unhandled errors at the process level if no `'error'` listener is attached. ioredis will emit connection errors even if the Redis server is temporarily unavailable. Attaching the listener before any async work is mandatory.

**Import style:** The ioredis README notes that `import Redis from 'ioredis'` will be deprecated in the next major; prefer named import `import { Redis } from 'ioredis'`.

```typescript
// Source: https://github.com/redis/ioredis (README)
import { Redis } from 'ioredis';
import { config, logger } from './config';

const redis = new Redis(config.redisUrl);

redis.on('error', (err: Error) => {
    logger.error('Redis client error', { error: err.message });
});
```

**Note:** ioredis auto-reconnects by default. The error handler is for logging — do not `process.exit` inside it or every transient Redis blip will kill the process. Graceful degradation (CACHE-03, DB-03) is handled in Phase 3.

### Pattern 5: Env Var Validation (Fail Fast)

**What:** A synchronous guard at the bottom of `config.ts` that collects missing required vars and throws a single descriptive error listing all of them.

**When to use:** Synchronous guard runs at module load time — `config.ts` is imported by `wire.ts`, which is called from `index.ts`. Any missing var causes `createServer()` to throw, which the existing `.catch → process.exit(1)` chain in `index.ts` handles.

**Required vars for Phase 1 (ETH-04 + INFRA-03):**

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | TypeORM DataSource connection string |
| `REDIS_URL` | ioredis connection string |
| `ETHERSCAN_API_KEY` | Etherscan API authentication (ETH-04) |
| `ETHERSCAN_BASE_URL` | Etherscan API base URL (ETH-04) |

`HOSTNAME`, `PORT`, `LOG_LEVEL`, and `NODE_ENV` already have defaults in `config.ts` and are not required.

```typescript
// config.ts — validation guard pattern
const REQUIRED_ENV_VARS = [
    'DATABASE_URL',
    'REDIS_URL',
    'ETHERSCAN_API_KEY',
    'ETHERSCAN_BASE_URL',
] as const;

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
    throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`,
    );
}

export const config = {
    hostname: process.env.HOSTNAME || '0.0.0.0',
    port: Number(process.env.PORT) || 3000,
    databaseUrl: process.env.DATABASE_URL as string,
    redisUrl: process.env.REDIS_URL as string,
    etherscanApiKey: process.env.ETHERSCAN_API_KEY as string,
    etherscanBaseUrl: process.env.ETHERSCAN_BASE_URL as string,
} as const;
```

**Important:** dotenv must be loaded before `config.ts` is evaluated. Since `config.ts` is not the entry point, the cleanest approach is to call `require('dotenv').config()` or `import 'dotenv/config'` at the very top of `wire.ts` (after `reflect-metadata` in `index.ts`). Alternatively, call `dotenv.config()` as the first statement in `wire.ts` before any other imports take effect — but in CommonJS this means a top-level call before the config import. The safest pattern in CJS is to load dotenv in `index.ts` right after `reflect-metadata`.

### Anti-Patterns to Avoid

- **`import * as Redis from 'ioredis'`:** ioredis v5 uses default exports; this import style was deprecated and does not work correctly with TypeScript's named `Redis` class.
- **`synchronize: true` unconditionally:** Will drop and recreate columns in production. Must be gated.
- **`new DataSource({...})` without `initialize()`:** The DataSource constructor does not connect; calling `.getRepository()` before `initialize()` throws `DataSourceNotInitializedError`.
- **No error handler on Redis:** Node.js process will crash on the first Redis connection error (`Error: unhandled 'error' event`).
- **Importing config before dotenv loads:** If `process.env.DATABASE_URL` is evaluated before `dotenv.config()`, it will be `undefined` even though `.env` has it defined.
- **`axios@^1.14.0` with caret:** npm will resolve to 1.14.1 (compromised). Must use `"axios": "1.14.0"` exactly or `--save-exact`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PostgreSQL connection pooling | Custom pool manager | TypeORM DataSource (uses `pg` pool internally) | pg's `Pool` handles edge cases: connection timeouts, idle eviction, max connections |
| Redis reconnect logic | Custom retry loop | ioredis built-in reconnect (on by default) | ioredis implements exponential backoff, cluster failover, sentinel support |
| Env type coercion | `Number(process.env.PORT) || 3000` in multiple files | Single `config.ts` export | Already established project pattern |

**Key insight:** Both TypeORM and ioredis have battle-tested connection management internally. This phase's job is purely configuration and wiring — not building anything custom.

## Common Pitfalls

### Pitfall 1: reflect-metadata Loaded Too Late

**What goes wrong:** `EntityMetadataNotFoundError: No metadata for "User" was found` or `Column type for X is not defined`.

**Why it happens:** An entity class file is evaluated (imported) before `reflect-metadata` polyfills `Reflect`. The `@Column()` decorator silently fails to register metadata.

**How to avoid:** `import 'reflect-metadata'` must be the literal first line of `src/index.ts`. It must appear before `import { createServer } from './wire'`.

**Warning signs:** Runtime errors about missing metadata even though decorators look correct; tests that pass in isolation fail when run in full suite.

### Pitfall 2: dotenv Not Called Before config.ts Evaluates

**What goes wrong:** `Missing required environment variables: DATABASE_URL, REDIS_URL, ...` even when `.env` is present and correct.

**Why it happens:** In CommonJS, `config.ts` runs synchronously at `require()` time. If `dotenv.config()` has not been called yet, `process.env` does not contain the `.env` values when the validation guard runs.

**How to avoid:** Load dotenv in `index.ts` as the second import (immediately after `reflect-metadata`). Use `import 'dotenv/config'` (side-effect import) for simplicity, or call `dotenv.config()` before any other project import.

**Warning signs:** The error fires on a machine that has a correct `.env` file; the error goes away when vars are exported into the shell environment directly.

### Pitfall 3: DataSource Used Before initialize() Completes

**What goes wrong:** `DataSourceNotInitializedError` when attempting to get a repository or run a query.

**Why it happens:** `DataSource` constructor is synchronous; the actual TCP connection to PostgreSQL happens only after `await dataSource.initialize()` resolves.

**How to avoid:** `await dataSource.initialize()` inside the async `createServer()` function in `wire.ts`. Pass the initialized `dataSource` to services/adapters after that await.

**Warning signs:** Error message explicitly names `DataSourceNotInitializedError`.

### Pitfall 4: Missing pg Package at Runtime

**What goes wrong:** `DriverPackageNotInstalledError: Postgres package has not been found installed.` TypeORM throws this at `initialize()` time.

**Why it happens:** TypeORM lists `pg` as a peer dependency, not a hard dependency. TypeORM is already installed but `pg` is not yet in the project's `package.json`.

**How to avoid:** Explicitly `npm install pg @types/pg` as part of this phase.

**Warning signs:** Happens only when `DataSource.initialize()` is called, not when the module is imported.

### Pitfall 5: axios Version Drift

**What goes wrong:** CI or a fresh `npm install` resolves to axios 1.14.1 (compromised version) because caret range `^1.14.0` allows minor/patch updates within 1.x.

**Why it happens:** npm semver range `^1.14.0` means `>=1.14.0 <2.0.0`.

**How to avoid:** Use `"axios": "1.14.0"` (no caret) in `package.json` or `npm install axios@1.14.0 --save-exact`. Verify with `cat package.json | grep axios`.

**Warning signs:** `package.json` shows `"^1.14.0"` or `"~1.14.0"` instead of `"1.14.0"`.

### Pitfall 6: TypeScript Compiler Errors After Adding Decorator Flags

**What goes wrong:** After adding `experimentalDecorators` and `emitDecoratorMetadata`, existing code may generate new TS warnings about decorators on classes. The TypeScript 6.x compiler (project uses `^6.0.2`) has opinions about decorator compatibility.

**Why it happens:** TypeScript 5.0+ distinguishes between legacy decorators (the old experimental kind) and Stage 3 decorators. With `experimentalDecorators: true`, the compiler enables the legacy path.

**How to avoid:** Adding the two flags is sufficient. Do not also add `"useDefineForClassFields": false` unless entity fields generate errors — this is only needed in edge cases.

**Warning signs:** `npm run build` fails with decorator-related type errors after adding tsconfig flags.

## Code Examples

### DataSource in wire.ts (complete Infra block)

```typescript
// src/wire.ts
// Source: TypeORM docs https://typeorm.io/docs/data-source/data-source/
import 'dotenv/config';
import express from 'express';
import { DataSource } from 'typeorm';
import { Redis } from 'ioredis';
import { Server, Controller } from './server';
import { config, logger } from './config';

export const createServer = async (): Promise<Server> => {
    const app = express();

    // Infra
    const dataSource = new DataSource({
        type: 'postgres',
        url: config.databaseUrl,
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
        entities: [],
    });
    await dataSource.initialize();
    logger.info('PostgreSQL DataSource initialized');

    const redis = new Redis(config.redisUrl);
    redis.on('error', (err: Error) => {
        logger.error('Redis client error', { error: err.message });
    });
    logger.info('ioredis client created');

    // Services

    // Controllers
    const controllers: Controller[] = [];

    const server = new Server(
        app,
        controllers,
        config.hostname,
        config.port,
    );

    logger.info(`server wired on ${config.hostname}:${config.port}`);

    return server;
};
```

### Config with Validation Guard

```typescript
// src/config.ts — extended version
// Source: INFRA-03 pattern; ETH-04 vars
import winston from 'winston';

const REQUIRED_ENV_VARS = [
    'DATABASE_URL',
    'REDIS_URL',
    'ETHERSCAN_API_KEY',
    'ETHERSCAN_BASE_URL',
] as const;

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
    throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`,
    );
}

export const config = {
    hostname: process.env.HOSTNAME || '0.0.0.0',
    port: Number(process.env.PORT) || 3000,
    databaseUrl: process.env.DATABASE_URL as string,
    redisUrl: process.env.REDIS_URL as string,
    etherscanApiKey: process.env.ETHERSCAN_API_KEY as string,
    etherscanBaseUrl: process.env.ETHERSCAN_BASE_URL as string,
} as const;

// ... logger definition unchanged ...
```

### index.ts with reflect-metadata First

```typescript
// src/index.ts
import 'reflect-metadata';     // MUST be first
import 'dotenv/config';        // Load .env before config.ts evaluates
import { createServer } from './wire';
import { logger } from './config';

createServer()
    .then((server) => {
        server.start();
        logger.info('server started');
    })
    .catch((error) => {
        logger.error('failed to start server', { error });
        process.exit(1);
    });
```

### tsconfig.json additions

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "target": "ES2020",
    "module": "commonjs",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### .env.example additions

```
HOSTNAME=0.0.0.0
PORT=3000
LOG_LEVEL=info
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ethereum_api
REDIS_URL=redis://localhost:6379
ETHERSCAN_API_KEY=your_api_key_here
ETHERSCAN_BASE_URL=https://api.etherscan.io/api
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `createConnection()` (TypeORM) | `new DataSource(...).initialize()` | TypeORM 0.3.0 | `createConnection` is removed; must use DataSource API |
| `import * as Redis from 'ioredis'` | `import { Redis } from 'ioredis'` | ioredis v5 | Named import; default will be deprecated next major |
| `@types/ioredis` (separate package) | Bundled types in ioredis v5 | ioredis v5 | Do not install `@types/ioredis`; it conflicts |
| `ormconfig.json` file | DataSource constructor options | TypeORM 0.3.0 | Config file approach is removed; all config is in code |

**Deprecated/outdated:**
- `createConnection()`: Removed in TypeORM 0.3; using it causes `TypeError: createConnection is not a function`.
- `@types/ioredis`: Do not install; ioredis v5 ships its own declarations and `@types/ioredis` will conflict.
- `ormconfig.json` / `ormconfig.ts`: Removed in TypeORM 0.3; config must be passed to the DataSource constructor.

## Open Questions

1. **ethers.js CJS named imports in CommonJS project**
   - What we know: STATE.md flags this as a concern: "Confirm `ethers.js` CJS named imports (`isAddress`, `getAddress`) work in this project's `"type": "commonjs"` setup"
   - What's unclear: ethers v6 ships ESM-first; CJS wrapper may have import path differences
   - Recommendation: Install ethers in this phase and add a trivial smoke test (`const { isAddress } = require('ethers'); isAddress('0x...')`) to surface any import issue before Phase 2 depends on it.

2. **dotenv loading order with ts-node in dev**
   - What we know: `nodemon.json` exec is `ts-node src/index.ts`; dotenv is loaded via side-effect import in `index.ts`
   - What's unclear: Whether ts-node's module evaluation order treats side-effect imports identically to compiled CJS
   - Recommendation: Use `import 'dotenv/config'` (not `dotenv.config()` inside a function body) to ensure it runs at module evaluation time, not lazily.

## Validation Architecture

### Test Framework

No test framework is currently configured. The `src/tests/` directory exists but is empty. `nyquist_validation` is enabled in `.planning/config.json`.

| Property | Value |
|----------|-------|
| Framework | None configured — Wave 0 must establish |
| Config file | None |
| Quick run command | `npm test` (once configured) |
| Full suite command | `npm test` (once configured) |

**Recommended framework:** Jest with `ts-jest` transformer, given the project is TypeScript + CommonJS. It integrates well with the existing toolchain and does not require a separate build step.

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-03 | Missing env var throws descriptive error | unit | `npx jest tests/config.test.ts -t "missing env"` | Wave 0 |
| ETH-04 | ETHERSCAN_API_KEY present in config export | unit | `npx jest tests/config.test.ts -t "etherscan"` | Wave 0 |

**Note:** Both requirements are testable with pure unit tests — mock `process.env`, import `config.ts`, assert error message or exported value. No database or Redis connection needed.

### Sampling Rate

- **Per task commit:** `npm run build` (TypeScript compile — fast, catches type regressions)
- **Per wave merge:** `npm test` (once test framework is set up in Wave 0)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `package.json` — add `"test": "jest"` script and jest + ts-jest deps
- [ ] `jest.config.ts` — configure `preset: 'ts-jest'`, `testEnvironment: 'node'`
- [ ] `src/tests/config.test.ts` — covers INFRA-03 and ETH-04
- [ ] Framework install: `npm install --save-dev jest ts-jest @types/jest`

## Sources

### Primary (HIGH confidence)
- https://typeorm.io/docs/getting-started/ — tsconfig decorator flags, reflect-metadata placement, DataSource init pattern
- https://typeorm.io/docs/data-source/data-source/ — initialize() method, promise handling
- https://typeorm.io/docs/data-source/data-source-options/ — synchronize, logging, entities, poolSize options
- https://typeorm.io/docs/drivers/postgres/ — PostgreSQL-specific options (url, ssl, schema, port)
- https://github.com/redis/ioredis (README via WebFetch) — import style, URL constructor, error event, lazyConnect
- https://github.com/redis/ioredis/wiki/Upgrading-from-v4-to-v5 — breaking changes, TypeScript declarations, import style change
- TypeORM `package.json` (local `node_modules`) — confirmed version 0.3.28, peer deps `ioredis ^5.0.4`, `pg ^8.5.1`

### Secondary (MEDIUM confidence)
- https://www.npmjs.com/package/ioredis — URL string constructor confirmed: `new Redis('redis://user:pass@host:port/')`
- STATE.md project decisions — axios@1.14.0 pin reason; ethers.js usage scope

### Tertiary (LOW confidence)
- General WebSearch results on env var validation patterns — confirmed manual throw pattern is idiomatic for no-library approach

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against installed node_modules and official docs
- Architecture: HIGH — patterns sourced from TypeORM and ioredis official documentation
- Pitfalls: HIGH — sourced from official docs and known breaking changes
- Validation architecture: MEDIUM — framework recommendation is standard but no framework is currently installed

**Research date:** 2026-04-02
**Valid until:** 2026-07-02 (stable libraries; TypeORM 0.3.x and ioredis 5.x are in maintenance mode)
