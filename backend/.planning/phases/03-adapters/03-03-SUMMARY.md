---
phase: 03-adapters
plan: 03
subsystem: infra
tags: [redis, ioredis, typeorm, postgres, cache, repository, entity]

# Dependency graph
requires:
  - phase: 03-01
    provides: Wave 0 test files for redis.adapter and balance.repository in RED state
  - phase: 02-01
    provides: ICacheStore, IBalanceRepository, BalanceSaveDto interfaces in ethereum/interfaces.ts
provides:
  - RedisAdapter: concrete ICacheStore with graceful degradation (try-catch, null/void on failure)
  - Balance entity: TypeORM entity for balance_history table (indexed address, varchar balanceWei)
  - TypeOrmBalanceRepository: concrete IBalanceRepository, errors propagate to service
  - wire.ts Balance registration: DataSource entities array includes Balance for schema sync
affects: [03-04, EthereumService wiring in wire.ts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cache adapter wraps all Redis calls in try-catch and returns null/void on failure (graceful degradation)"
    - "TypeORM repository does NOT catch errors — lets service .catch() handle DB failures"
    - "Definite assignment assertions (!) on TypeORM entity properties for strict mode compliance"

key-files:
  created:
    - src/infrastructure/redis/RedisAdapter.ts
    - src/infrastructure/postgres/Balance.entity.ts
    - src/infrastructure/postgres/TypeOrmBalanceRepository.ts
  modified:
    - src/wire.ts

key-decisions:
  - "RedisAdapter try-catch returns null/void with logger.warn — cache failures are non-fatal"
  - "TypeOrmBalanceRepository has no try-catch — service .catch() handles DB errors to avoid silent failures"
  - "Balance.entity.ts uses definite assignment assertions (!) on all columns — required for TypeScript strict mode with TypeORM decorators"
  - "EtherscanAdapter.ts (from 03-02) needed Prettier formatting fix to unblock pre-commit hook"

patterns-established:
  - "Pattern: Infrastructure adapters implement their port interface from component/ethereum/interfaces.ts"
  - "Pattern: Cache adapters are error-tolerant; DB repositories let errors propagate"
  - "Pattern: TypeORM entity columns use ! assertion for strict mode compliance"

requirements-completed: [CACHE-01, CACHE-02, CACHE-03, DB-01, DB-02, DB-03, ARCH-02]

# Metrics
duration: 5min
completed: 2026-04-02
---

# Phase 03 Plan 03: RedisAdapter, Balance Entity, and TypeOrmBalanceRepository Summary

**Redis cache adapter with graceful degradation, TypeORM Balance entity for balance_history table, and no-try-catch repository delegating errors to the service layer**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-02T17:05:49Z
- **Completed:** 2026-04-02T17:10:25Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- RedisAdapter implements ICacheStore with blanket try-catch on get/set — Redis failures return null/void with logger.warn, never throw
- Balance entity maps to balance_history table with auto-increment PK, indexed address varchar, balanceWei varchar, CreateDateColumn fetchedAt
- TypeOrmBalanceRepository implements IBalanceRepository with no error swallowing — lets service .catch() handle DB failures
- wire.ts updated to import Balance and register in DataSource entities array for TypeORM schema synchronization

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement RedisAdapter** - `c4b23b4` (feat)
2. **Task 2: Balance entity, TypeOrmBalanceRepository, wire.ts** - `0519074` (feat)

## Files Created/Modified

- `src/infrastructure/redis/RedisAdapter.ts` - ICacheStore implementation with graceful Redis error handling
- `src/infrastructure/postgres/Balance.entity.ts` - TypeORM entity for balance_history table
- `src/infrastructure/postgres/TypeOrmBalanceRepository.ts` - IBalanceRepository implementation, no try-catch
- `src/wire.ts` - Added Balance import and entity registration in DataSource entities array

## Decisions Made

- RedisAdapter wraps all Redis calls in try-catch returning null/void with logger.warn — cache is non-fatal per CACHE-03 requirement
- TypeOrmBalanceRepository deliberately has no try-catch — if errors are swallowed, the service's fire-and-forget .catch() warning log never fires and DB failures become invisible (DB-03)
- TypeORM entity properties use definite assignment assertions (`!`) because TypeScript strict mode rejects uninitialized properties even when TypeORM decorators handle assignment at runtime

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript strict mode strict property initialization error on Balance entity**
- **Found during:** Task 2 (Balance entity implementation)
- **Issue:** TypeScript strict mode requires property initializers; TypeORM entity columns are assigned by the decorator at runtime but TS does not know this, causing TS2564 errors on all four columns
- **Fix:** Added definite assignment assertions (`!`) to all entity properties: `id!`, `address!`, `balanceWei!`, `fetchedAt!`
- **Files modified:** src/infrastructure/postgres/Balance.entity.ts
- **Verification:** `npm run build` exits 0 after fix
- **Committed in:** `0519074` (Task 2 commit)

**2. [Rule 3 - Blocking] EtherscanAdapter.ts Prettier formatting blocked pre-commit hook**
- **Found during:** Task 1 commit
- **Issue:** Pre-commit hook runs `prettier --check` on all staged files; EtherscanAdapter.ts from plan 03-02 had pre-existing formatting issues that failed the hook and blocked the commit
- **Fix:** Ran `npx prettier --write src/infrastructure/etherscan/EtherscanAdapter.ts`
- **Files modified:** src/infrastructure/etherscan/EtherscanAdapter.ts
- **Verification:** Prettier check passes, 7 EtherscanAdapter tests still pass after reformatting
- **Committed in:** `c4b23b4` (Task 1 commit, alongside RedisAdapter)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug, 1 Rule 3 blocking)
**Impact on plan:** Both auto-fixes necessary for correct TypeScript compilation and committing. No scope creep.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 7 Wave 0 tests now pass GREEN (5 redis.adapter + 2 balance.repository)
- Full test suite: 26 tests passing (10 service + 7 etherscan + 5 redis + 2 balance + 2 existing)
- Infrastructure layer complete: EtherscanAdapter, RedisAdapter, Balance entity, TypeOrmBalanceRepository all implemented
- wire.ts ready for service wiring (EthereumService instantiation connecting all adapters)
- Next: Plan 03-04 should wire EthereumService with EtherscanAdapter, RedisAdapter, and TypeOrmBalanceRepository in wire.ts

## Self-Check: PASSED

All files exist and all commits verified.

---
*Phase: 03-adapters*
*Completed: 2026-04-02*
