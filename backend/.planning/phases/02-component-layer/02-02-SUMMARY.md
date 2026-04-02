---
phase: 02-component-layer
plan: 02
subsystem: api
tags: [ethereum, ethers, bigint, jest, typescript, hexagonal]

# Dependency graph
requires:
  - phase: 02-component-layer/02-01
    provides: port interfaces (IEthereumProvider, ICacheStore, IBalanceRepository), error classes, constants, response DTOs, test stubs
provides:
  - EthereumService class with getEthereumData orchestration method
  - 10 passing unit tests covering all business logic branches
  - BigInt Wei-to-Gwei and Wei-to-ETH conversion utilities (private methods)
affects: [03-infrastructure-adapters, 04-http-layer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Two-step address validation: isAddress guard then getAddress normalization'
    - 'Parallel cache read then parallel provider fetch on cache miss (Promise.all)'
    - 'Fire-and-forget via void + .catch logger.warn for non-blocking DB insert'
    - 'BigInt integer division for exact Wei-to-Gwei and Wei-to-ETH conversion'

key-files:
  created:
    - src/component/ethereum/service.ts
  modified:
    - src/tests/ethereum.service.test.ts

key-decisions:
  - 'jest.mock path for config is ../config (relative to src/tests/), not ../../config — fixed during execution'
  - 'All Wei values remain as strings in DTOs; BigInt used only internally for arithmetic'

patterns-established:
  - 'Pattern: jest.mock config module at top of test file before any imports to avoid env var errors'
  - 'Pattern: cacheKey() helper uses uppercase CACHE_KEYS enum keys (GAS_PRICE, BLOCK_NUMBER)'

requirements-completed: [CORE-01, CORE-05, CORE-06, ETH-01, ETH-03]

# Metrics
duration: 7min
completed: 2026-04-02
---

# Phase 02 Plan 02: EthereumService Implementation Summary

**EthereumService orchestrating isAddress/getAddress validation, parallel Promise.all cache miss fetching, BigInt dual-unit conversion, and fire-and-forget DB insert — 10 unit tests green**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-02T16:38:11Z
- **Completed:** 2026-04-02T16:45:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Implemented EthereumService with full getEthereumData orchestration: validate → normalize → cache check → parallel fetch → convert → DB insert → return DTO
- All 10 unit tests from Plan 02-01 Wave 0 scaffold pass green
- Zero lint errors, zero TypeScript type errors, build compiles cleanly to dist/

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement EthereumService** - `3ed48bb` (feat)
2. **Task 2: Verify full test suite and lint** - no code changes needed (all checks passed without modification)

**Plan metadata:** (docs commit to follow)

_Note: Task 1 was a TDD task — service.ts written to pass the Wave 0 test scaffold._

## Files Created/Modified

- `src/component/ethereum/service.ts` - EthereumService class with getEthereumData, buildResponse, weiToEth
- `src/tests/ethereum.service.test.ts` - Added jest.mock('../config') at top to prevent env var errors during test

## Decisions Made

- jest.mock path in test file is `../config` (not `../../config`) — test file is in `src/tests/`, config is at `src/config.ts`, so one level up
- cacheKey() helper uses uppercase enum keys (`'GAS_PRICE'`, `'BLOCK_NUMBER'`), matching `keyof typeof CACHE_KEYS` type

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed jest.mock path for config module**
- **Found during:** Task 1 (implementing EthereumService, running tests)
- **Issue:** Plan specified `jest.mock('../../config', ...)` but test file is in `src/tests/` making correct path `../config`
- **Fix:** Changed mock path from `../../config` to `../config` in test file
- **Files modified:** src/tests/ethereum.service.test.ts
- **Verification:** Tests ran successfully with corrected path — all 10 pass
- **Committed in:** 3ed48bb (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — wrong relative path in jest.mock)
**Impact on plan:** Auto-fix necessary for tests to run. No scope creep.

## Issues Encountered

- The plan's jest.mock example used `../../config` path which is wrong relative to `src/tests/`. Caught immediately when tests failed with "Cannot find module '../../config'" — fixed inline per Rule 1.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- EthereumService is complete and test-verified against port interfaces only
- Phase 3 (Infrastructure Adapters) can implement IEthereumProvider, ICacheStore, and IBalanceRepository as concrete classes
- Phase 4 (HTTP Layer) can instantiate EthereumService via wire.ts and mount the controller
- No blockers

---
*Phase: 02-component-layer*
*Completed: 2026-04-02*
