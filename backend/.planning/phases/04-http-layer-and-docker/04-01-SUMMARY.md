---
phase: 04-http-layer-and-docker
plan: 01
subsystem: api
tags: [express, typescript, controller, hexagonal, dependency-injection]

# Dependency graph
requires:
  - phase: 03-adapters
    provides: EtherscanAdapter, RedisAdapter, TypeOrmBalanceRepository
  - phase: 02-component-layer
    provides: EthereumService, ValidationError, EtherscanApiError, response-models

provides:
  - EthereumController implementing Controller interface with error-mapped async handler
  - GET /api/health endpoint registered before controllers in Server
  - Full dependency wiring in wire.ts: adapters -> EthereumService -> EthereumController

affects: [05-deployment, integration-tests]

# Tech tracking
tech-stack:
  added: []
  patterns: [controller error mapping, TDD red-green, hexagonal wiring via composition root]

key-files:
  created:
    - src/entrypoint/controller/ethereum-controller.ts
    - src/tests/ethereum.controller.test.ts
  modified:
    - src/server.ts
    - src/wire.ts

key-decisions:
  - "req.params['address'] cast as string to satisfy TypeScript strict mode (TS2345: string | string[] not assignable to string)"
  - "Health endpoint registered before controller loop in Server constructor — ensures /api/health always available regardless of controller registration order"
  - "EthereumController catch block uses instanceof for ValidationError and EtherscanApiError — Object.setPrototypeOf in both error constructors ensures instanceof works correctly in CJS"

patterns-established:
  - "Controller error mapping pattern: catch(err) -> instanceof check -> typed ErrorEnvelope -> res.status().json()"
  - "Composition root pattern: wire.ts instantiates infra -> adapters -> service -> controller, passes array to Server"

requirements-completed: [INFRA-01, ARCH-03]

# Metrics
duration: 28min
completed: 2026-04-03
---

# Phase 4 Plan 01: HTTP Layer and Dependency Wiring Summary

**EthereumController maps domain errors to HTTP status codes (400/502/500) and wire.ts wires EtherscanAdapter + RedisAdapter + TypeOrmBalanceRepository through EthereumService into the controller**

## Performance

- **Duration:** 28 min
- **Started:** 2026-04-03T01:25:26Z
- **Completed:** 2026-04-03T01:53:25Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- EthereumController implements Controller interface with full error mapping: ValidationError -> 400, EtherscanApiError -> 502, unknown -> 500
- GET /api/health registered before controller loop in server.ts, returns 200 `{ status: 'ok' }`
- wire.ts fully wired: EtherscanAdapter, RedisAdapter, TypeOrmBalanceRepository instantiated and injected into EthereumService then EthereumController
- 31 tests passing (26 existing + 5 new controller tests), TypeScript compiles cleanly, ESLint passes

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 test scaffold + EthereumController implementation** - `a9a9bca` (feat)
2. **Task 2: Health endpoint in server.ts + wire.ts full dependency wiring** - `0d8c37e` (feat)

## Files Created/Modified
- `src/entrypoint/controller/ethereum-controller.ts` - EthereumController implementing Controller interface with error-mapped async GET /api/ethereum/:address handler
- `src/tests/ethereum.controller.test.ts` - 5 controller unit tests covering route registration, 200 success, 400 validation, 502 upstream, 500 unknown
- `src/server.ts` - Added GET /api/health before controller registration loop
- `src/wire.ts` - Full dependency wiring: EtherscanAdapter, RedisAdapter, TypeOrmBalanceRepository -> EthereumService -> EthereumController

## Decisions Made
- Cast `req.params['address'] as string` to satisfy TypeScript strict mode TS2345 error (Express params type is `string | string[]`)
- Registered health endpoint before controller loop so /api/health is available regardless of controller registration state
- Used `instanceof` checks for error dispatch — safe because both error classes have `Object.setPrototypeOf` for CJS instanceof correctness

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TS2345 type error on req.params.address**
- **Found during:** Task 1 (EthereumController GREEN phase)
- **Issue:** `req.params.address` has type `string | string[]` in Express types; `EthereumService.getEthereumData` expects `string` — TypeScript strict mode rejects assignment
- **Fix:** Changed `req.params.address` to `req.params['address'] as string`
- **Files modified:** src/entrypoint/controller/ethereum-controller.ts
- **Verification:** npx jest --testPathPatterns=ethereum.controller passes all 5 tests
- **Committed in:** a9a9bca (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 type error bug)
**Impact on plan:** Necessary for TypeScript strict mode compliance. No scope creep.

## Issues Encountered
- Prettier formatting rejected multi-line lambda in server.ts health endpoint — auto-reformatted to single-line inline callback. Tests and build unaffected.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Full HTTP layer complete: GET /api/ethereum/:address and GET /api/health are registered
- Full dependency graph wired and TypeScript-validated
- Ready for Docker containerization (04-02) or integration testing
- No blockers

## Self-Check: PASSED

- FOUND: src/entrypoint/controller/ethereum-controller.ts
- FOUND: src/tests/ethereum.controller.test.ts
- FOUND: .planning/phases/04-http-layer-and-docker/04-01-SUMMARY.md
- FOUND commit: a9a9bca (Task 1)
- FOUND commit: 0d8c37e (Task 2)

---
*Phase: 04-http-layer-and-docker*
*Completed: 2026-04-03*
