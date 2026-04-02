---
phase: 01-infrastructure-foundations
plan: 01
subsystem: infra
tags: [typeorm, postgres, ioredis, redis, jest, ts-jest, dotenv, reflect-metadata, ethers, axios, env-validation]

# Dependency graph
requires: []
provides:
  - Jest test framework configured with ts-jest preset
  - Runtime dependencies installed (ioredis, pg, ethers, axios@1.14.0)
  - TypeScript decorator support (experimentalDecorators, emitDecoratorMetadata)
  - Env var validation guard in config.ts (fails fast with descriptive error)
  - Config exports databaseUrl, redisUrl, etherscanApiKey, etherscanBaseUrl
  - TypeORM DataSource initialized with PostgreSQL (synchronize gated by NODE_ENV)
  - ioredis Redis client with error handler (non-crashing)
  - reflect-metadata as first import, dotenv/config as second in index.ts
affects: [02-component-layer, 03-infrastructure-adapters, 04-http-layer]

# Tech tracking
tech-stack:
  added: [jest@30, ts-jest@29, @types/jest@30, ioredis@5, pg@8, @types/pg@8, ethers@6, axios@1.14.0]
  patterns:
    - Fail-fast env var validation at module load time (throws before app boots)
    - Redis error handler logs but never calls process.exit (ioredis auto-reconnects)
    - TypeORM synchronize gated behind NODE_ENV !== 'production'
    - jest.resetModules() + require() pattern for testing module-level code with env vars

key-files:
  created:
    - jest.config.ts
    - src/tests/config.test.ts
    - .env.example (replaced)
  modified:
    - package.json
    - tsconfig.json
    - src/config.ts
    - src/index.ts
    - src/wire.ts

key-decisions:
  - "axios pinned at exactly 1.14.0 (no caret) — supply chain safety, 1.14.1 is compromised"
  - "jest.config.ts uses module.exports (not export default) due to project commonjs type"
  - "Types array in tsconfig includes jest and node for global test type recognition"
  - "eslint-disable-next-line used for require() calls in test file — intentional for jest.resetModules pattern"

patterns-established:
  - "Env validation pattern: REQUIRED_ENV_VARS array + filter + throw at module load time"
  - "Redis resilience pattern: attach error handler immediately after new Redis() construction"
  - "Test isolation pattern: jest.resetModules() + process.env manipulation + require() in beforeEach"

requirements-completed: [ETH-04, INFRA-03]

# Metrics
duration: 5min
completed: 2026-04-02
---

# Phase 1 Plan 01: Infrastructure Foundations Summary

**TypeORM+PostgreSQL and ioredis+Redis clients initialized in composition root, with fail-fast env var validation (4 required vars) and automated Jest tests covering INFRA-03 and ETH-04**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-02T15:58:52Z
- **Completed:** 2026-04-02T16:03:19Z
- **Tasks:** 4 (Task 0 through Task 3)
- **Files modified:** 8

## Accomplishments

- Jest test framework configured with ts-jest preset; config tests cover both failure (missing env vars throw) and success (all fields exported correctly) paths
- Runtime dependencies installed: ioredis, pg, @types/pg, ethers, and axios@1.14.0 exact pin
- TypeScript compiler configured for TypeORM decorators (experimentalDecorators, emitDecoratorMetadata)
- Env var validation guard in config.ts throws with descriptive error listing missing variable names
- TypeORM DataSource initialized with PostgreSQL, synchronize gated behind NODE_ENV !== 'production'
- ioredis Redis client initialized with error handler that logs but does not crash the process

## Task Commits

Each task was committed atomically:

1. **Task 0: Set up Jest test framework and scaffold config tests** - `1366e5d` (feat)
2. **Task 1: Install dependencies and configure tsconfig for decorators** - `c320904` (feat)
3. **Task 2: Add env var validation to config.ts, update index.ts imports, update .env.example** - `36cb671` (feat)
4. **Task 3: Initialize TypeORM DataSource and ioredis client in wire.ts** - `48e850d` (feat)

## Files Created/Modified

- `jest.config.ts` - Jest configuration with ts-jest preset, node environment, CJS module.exports style
- `src/tests/config.test.ts` - Unit tests for env var validation (INFRA-03) and config exports (ETH-04)
- `package.json` - Added test script, ioredis, pg, @types/pg, ethers, axios@1.14.0, jest devDeps
- `tsconfig.json` - Added experimentalDecorators, emitDecoratorMetadata, types: [jest, node]
- `src/config.ts` - Added REQUIRED_ENV_VARS validation guard and databaseUrl/redisUrl/etherscanApiKey/etherscanBaseUrl exports
- `src/index.ts` - reflect-metadata first import, dotenv/config second import
- `src/wire.ts` - DataSource and Redis initialization in Infra block
- `.env.example` - Updated with all 8 env vars including Etherscan vars

## Decisions Made

- **axios@1.14.0 exact pin (no caret):** Supply chain safety — 1.14.1 is a known compromised version.
- **jest.config.ts uses `module.exports`:** Project is `"type": "commonjs"`. The ES `export default` syntax in a .ts file causes Node to fail loading it. Using `module.exports` keeps the .ts extension while remaining CJS-compatible.
- **`types: ["jest", "node"]` in tsconfig:** Required for TypeScript to recognize Jest globals (`describe`, `it`, `expect`) without explicit imports in test files.
- **eslint-disable-next-line for require() in tests:** The `jest.resetModules()` + `require()` pattern is intentional — it forces module re-evaluation after mutating `process.env`, which is required to test module-level validation code. The ESLint `no-require-imports` rule is suppressed with inline comments to document intent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] jest.config.ts format changed from `export default` to `module.exports`**
- **Found during:** Task 0 (Jest framework setup)
- **Issue:** Node.js failed to load `jest.config.ts` with "Failed to load the ES module" warning because the project is `"type": "commonjs"` and `export default` is ESM syntax
- **Fix:** Changed `export default config` to `module.exports = config` in jest.config.ts, keeping the TypeScript type annotation
- **Files modified:** jest.config.ts
- **Verification:** Tests ran successfully after change
- **Committed in:** `1366e5d` (Task 0 commit)

**2. [Rule 3 - Blocking] Added `types: ["jest", "node"]` to tsconfig.json**
- **Found during:** Task 0 (Jest framework setup)
- **Issue:** TypeScript error TS2593 "Cannot find name 'describe'" — @types/jest was installed but tsconfig didn't specify the types array, so Jest globals weren't recognized
- **Fix:** Added `"types": ["jest", "node"]` to tsconfig.json compilerOptions
- **Files modified:** tsconfig.json
- **Verification:** Both config tests ran without TS errors
- **Committed in:** `1366e5d` (Task 0 commit)

**3. [Rule 3 - Blocking] Added eslint-disable-next-line for require() in test file**
- **Found during:** Task 0 commit attempt (pre-commit hook)
- **Issue:** ESLint `@typescript-eslint/no-require-imports` rule blocked the commit; two `require()` calls in config.test.ts violated the rule
- **Fix:** Added `// eslint-disable-next-line @typescript-eslint/no-require-imports` before each require() call with the understanding that these are intentional for the jest.resetModules() test isolation pattern
- **Files modified:** src/tests/config.test.ts
- **Verification:** `npm run lint` passes
- **Committed in:** `1366e5d` (Task 0 commit)

**4. [Rule 3 - Blocking] wire.ts reformatted by Prettier before commit**
- **Found during:** Task 3 commit attempt (pre-commit hook)
- **Issue:** Prettier reformatted the multi-line `new Server(app, controllers, config.hostname, config.port)` constructor call to a single line
- **Fix:** Ran `npm run format` before re-staging and committing
- **Files modified:** src/wire.ts
- **Verification:** Pre-commit hook passed after format
- **Committed in:** `48e850d` (Task 3 commit)

---

**Total deviations:** 4 auto-fixed (all Rule 3 - Blocking)
**Impact on plan:** All auto-fixes were required for the pre-commit hook and TypeScript compilation to succeed. No scope creep — all changes are part of the planned Task 0 deliverables.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

**Environment variables required before running the application.** Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL` — PostgreSQL connection string (e.g. `postgresql://postgres:postgres@localhost:5432/ethereum_api`)
- `REDIS_URL` — Redis connection string (e.g. `redis://localhost:6379`)
- `ETHERSCAN_API_KEY` — Etherscan API key from https://etherscan.io/apis
- `ETHERSCAN_BASE_URL` — Etherscan base URL (e.g. `https://api.etherscan.io/api`)

Optional: `HOSTNAME`, `PORT`, `LOG_LEVEL`, `NODE_ENV` (all have defaults).

## Next Phase Readiness

- TypeORM DataSource is initialized but has `entities: []` — Phase 3 populates this array when adding entity classes
- Jest test framework is ready for Phase 2+ component and adapter tests
- All required runtime deps installed; no additional installs needed for Phase 2 (component layer)
- reflect-metadata import is in place; TypeORM decorators will work immediately

---
*Phase: 01-infrastructure-foundations*
*Completed: 2026-04-02*
