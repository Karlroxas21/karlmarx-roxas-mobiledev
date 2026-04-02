---
phase: 02-component-layer
plan: 01
subsystem: api
tags: [typescript, hexagonal-architecture, interfaces, dtos, errors, jest]

# Dependency graph
requires:
  - phase: 01-infrastructure-foundations
    provides: jest config, ts-jest, TypeScript strict mode, ethers.js installed
provides:
  - IEthereumProvider, ICacheStore, IBalanceRepository port interfaces
  - GasPriceDto, BalanceDto, EthereumDataDto, SuccessEnvelope, ErrorBody, ErrorEnvelope response DTOs
  - ValidationError and EtherscanApiError typed error classes with working instanceof
  - CACHE_TTL_SECONDS, CACHE_KEYS, cacheKey constants
  - Wave 0 test scaffold with 10 failing stubs for EthereumService
affects: [02-02, 03-infrastructure-adapters, 04-http-layer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hexagonal port interfaces: all external dependencies defined as TypeScript interfaces in component/ethereum/interfaces.ts"
    - "Object.setPrototypeOf in custom Error subclasses for correct instanceof in TypeScript CommonJS output"
    - "Dual-unit string DTOs: Wei values always string; gwei/eth are separate string fields"
    - "Namespaced cache keys: ethereum:* prefix to avoid collisions across components"

key-files:
  created:
    - src/component/ethereum/interfaces.ts
    - src/component/ethereum/response-models.ts
    - src/component/ethereum/requests-models.ts
    - src/component/ethereum/errors.ts
    - src/component/ethereum/constants.ts
    - src/tests/ethereum.service.test.ts
  modified: []

key-decisions:
  - "Object.setPrototypeOf required in both ValidationError and EtherscanApiError constructors for instanceof correctness in CJS"
  - "CACHE_KEYS uses as const to produce literal string types; cacheKey helper is typed to only accept valid key names"
  - "Test catch params typed as unknown with explicit cast to error class — satisfies strict mode without noUncheckedIndexedAccess"

patterns-established:
  - "Port interfaces in interfaces.ts: IEthereumProvider, ICacheStore, IBalanceRepository follow dependency-inversion; component never imports concrete adapters"
  - "ErrorBody.code union matches error class code literals exactly — enables type-safe controller error mapping"
  - "Wave 0 test stubs import from files that don't exist yet (service.ts) — this is intentional; they compile once Plan 02 creates the service"

requirements-completed: [ARCH-01, CORE-02, CORE-03, CORE-04, ETH-03]

# Metrics
duration: 3min
completed: 2026-04-02
---

# Phase 02 Plan 01: Component Layer Contracts Summary

**Hexagonal port interfaces (IEthereumProvider, ICacheStore, IBalanceRepository), dual-unit string DTOs, typed error classes with working instanceof, and 10-stub Wave 0 test scaffold for EthereumService**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-02T16:32:59Z
- **Completed:** 2026-04-02T16:35:26Z
- **Tasks:** 3 (+ 1 auto-fix)
- **Files modified:** 6 created

## Accomplishments

- Three port interfaces define the hexagonal architecture boundary for the ethereum component
- Response DTOs carry dual-unit string fields (wei+gwei for gas, wei+eth for balance) per locked decisions
- ValidationError and EtherscanApiError support correct instanceof checks in TypeScript CommonJS via Object.setPrototypeOf
- Wave 0 test scaffold has 10 failing stubs covering all CORE-02, CORE-03, CORE-05, CORE-06, ETH-01, ETH-03 requirements

## Task Commits

Each task was committed atomically:

1. **Task 0: Wave 0 test scaffold** - `327f538` (test)
2. **Task 1: Port interfaces and DTOs** - `50ea133` (feat)
3. **Task 2: Error classes and constants** - `dd5f37d` (feat)
4. **Auto-fix: TypeScript strict catch param types** - `84bcec8` (fix)

## Files Created/Modified

- `src/component/ethereum/interfaces.ts` - IEthereumProvider, ICacheStore, IBalanceRepository, BalanceSaveDto port interfaces
- `src/component/ethereum/response-models.ts` - GasPriceDto, BalanceDto, EthereumDataDto, SuccessEnvelope, ErrorBody, ErrorEnvelope
- `src/component/ethereum/requests-models.ts` - GetEthereumDataRequest input DTO
- `src/component/ethereum/errors.ts` - ValidationError (VALIDATION_ERROR), EtherscanApiError (UPSTREAM_ERROR) with Object.setPrototypeOf
- `src/component/ethereum/constants.ts` - CACHE_TTL_SECONDS=15, CACHE_KEYS with ethereum: namespace, typed cacheKey helper
- `src/tests/ethereum.service.test.ts` - Wave 0 test scaffold, 10 stubs, jest.Mocked pattern for all three ports

## Decisions Made

- Object.setPrototypeOf is required in both custom error constructors; verified at runtime via ts-node (`instanceof` returns true for both classes)
- CACHE_KEYS uses `as const` assertion to produce literal types; cacheKey helper is typed to `keyof typeof CACHE_KEYS` so only valid key names are accepted at compile time
- Test file catch parameters typed as `unknown` with explicit cast to error class type to satisfy TypeScript strict mode without `any`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added explicit `unknown` types to catch parameters in test file**
- **Found during:** Overall verification (TypeScript strict mode check)
- **Issue:** Two catch params `(e)` in test stubs had implicit `any` type, failing TS strict mode
- **Fix:** Changed `(e)` to `(e: unknown)` and added explicit cast `(err as ValidationError).code` / `(err as EtherscanApiError).code`
- **Files modified:** src/tests/ethereum.service.test.ts
- **Verification:** `npx tsc --noEmit` shows only the expected missing-service error
- **Committed in:** `84bcec8`

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing type annotation for strict mode compliance)
**Impact on plan:** Necessary for TypeScript strict mode correctness. No scope creep.

## Issues Encountered

None beyond the auto-fix above. Pre-commit Prettier hook reformatted the test file on first commit (expected behavior — formatting normalized automatically).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All contract files for Plan 02 (EthereumService implementation) are ready
- `service.ts` is the only remaining import that will resolve the single outstanding TypeScript error in the test file
- instanceof checks verified working at runtime; error codes match ErrorBody.code union literals exactly
- Wave 0 stubs will transition from compile-error to failing (red) once service.ts exists, then to passing (green) once service logic is implemented

---
*Phase: 02-component-layer*
*Completed: 2026-04-02*
