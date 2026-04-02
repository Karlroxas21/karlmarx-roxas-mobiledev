---
phase: 05-error-handling-polish
plan: 01
subsystem: ui
tags: [react-native, error-handling, wallet, expo, nativewind]

# Dependency graph
requires:
  - phase: 04-transaction-history
    provides: ConnectedScreen with FlatList, useBalance, useTransactions with refreshTrigger, pull-to-refresh

provides:
  - ErrorState presentational component with message + blue Retry button
  - ConnectionError updated to show fixed friendly copy instead of raw JS error
  - ConnectedScreen with independent balance and transaction error states
  - BalanceDisplay simplified to pure success-state component
  - Retry mechanism wired to refreshTrigger increment for both error sections

affects: [05-error-handling-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    [
      3-branch conditional for data states (loading/error/content),
      retry via refreshTrigger increment,
      friendly error copy over raw JS error strings,
    ]

key-files:
  created:
    - src/features/wallet/components/ErrorState.tsx
  modified:
    - src/features/wallet/components/ConnectionError.tsx
    - src/features/wallet/components/ConnectScreen.tsx
    - src/features/wallet/components/BalanceDisplay.tsx
    - src/features/wallet/components/ConnectedScreen.tsx
    - src/features/wallet/hooks/use-balance.ts

key-decisions:
  - 'ErrorState is a shared presentational component — callers only render it when error exists (message prop is non-nullable string)'
  - 'ConnectionError uses hasError boolean instead of message string — hard-coded friendly copy replaces raw JS error propagation'
  - 'handleRetry increments refreshTrigger without setRefreshing(true) — button retry does not show pull-to-refresh spinner'
  - 'Unescaped apostrophe in ConnectionError JSX text node fixed with JS string expression to satisfy react/no-unescaped-entities lint rule'
  - "use-balance bug fix: string literal 'address' replaced with address variable in getBalance call — pre-existing bug discovered during device verification"

patterns-established:
  - '3-branch data conditional: loading skeleton -> error state -> content'
  - 'renderEmpty 3-branch: txLoading check -> txError check -> empty state'
  - 'Friendly error copy pattern: hard-code user-facing string in component, never propagate raw JS error messages to UI'

requirements-completed: [ERR-01, ERR-02, ERR-03]

# Metrics
duration: ~20min
completed: 2026-04-02
---

# Phase 05 Plan 01: Error Handling Polish Summary

**All three error paths wired with friendly copy and Retry button: ConnectionError shows "Couldn't connect wallet", balance/transaction sections show independent ErrorState components with refreshTrigger retry — user-verified on device**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-02T08:18:23Z
- **Completed:** 2026-04-02T08:33:44Z
- **Tasks:** 3 of 3
- **Files modified:** 6

## Accomplishments

- Created ErrorState.tsx: reusable presentational component with error message + blue "Retry" text button matching existing button patterns
- Updated ConnectionError to accept `hasError: boolean` and display fixed "Couldn't connect wallet" copy instead of raw JS error string
- Wired ConnectedScreen with independent balance and transaction error states, both using handleRetry callback that increments refreshTrigger
- Simplified BalanceDisplay to pure success-state component (error handling moved upstream to ConnectedScreen)
- Fixed pre-existing bug in use-balance.ts: string literal `'address'` replaced with `address` variable in getBalance call
- All three error paths verified on device by user (ERR-01, ERR-02, ERR-03 confirmed working)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ErrorState component and update ConnectionError** - `856254e` (feat)
2. **Task 2: Wire balance and transaction error states with retry in ConnectedScreen** - `7fd5010` (feat)
3. **Task 3: Verify error states on device** - approved by user (human-verify checkpoint, no code commit)

**Bug fix (deviation):** `93417d9` (fix: pass address variable instead of string literal to getBalance)
**Plan metadata:** `13ff5c1` (docs: complete plan — paused at human-verify checkpoint)

## Files Created/Modified

- `src/features/wallet/components/ErrorState.tsx` - New shared presentational component: error message + blue Retry text button
- `src/features/wallet/components/ConnectionError.tsx` - Changed prop from message string to hasError boolean, hard-coded friendly copy
- `src/features/wallet/components/ConnectScreen.tsx` - Updated call site to pass `hasError={!!error}`
- `src/features/wallet/components/BalanceDisplay.tsx` - Simplified to pure success-state (removed error prop and "Balance unavailable" branch)
- `src/features/wallet/components/ConnectedScreen.tsx` - Added ErrorState import, txError destructure, handleRetry callback, 3-branch conditionals for balance and transactions
- `src/features/wallet/hooks/use-balance.ts` - Bug fix: string literal replaced with address variable in getBalance call

## Decisions Made

- ErrorState message prop is `string` (not nullable) — callers are responsible for only rendering ErrorState when an error exists; this keeps the component simple and avoids null checks inside it
- ConnectionError switches from `message: string | null` to `hasError: boolean` — aligns with the pattern that error message copy is owned by the component, not passed from outside
- handleRetry increments refreshTrigger but does NOT call setRefreshing(true) — keeps retry distinct from pull-to-refresh; no spinner on button tap
- Unescaped apostrophe in ConnectionError JSX text node resolved with `{"Couldn't connect wallet"}` JS expression syntax to satisfy the `react/no-unescaped-entities` lint rule while preserving readable source text

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unescaped apostrophe in ConnectionError JSX text**

- **Found during:** Task 2 verification (lint check)
- **Issue:** ConnectionError.tsx renders "Couldn't connect wallet" as bare JSX text — the apostrophe triggers `react/no-unescaped-entities` lint error
- **Fix:** Wrapped the string in a JS expression: `{"Couldn't connect wallet"}`
- **Files modified:** src/features/wallet/components/ConnectionError.tsx
- **Verification:** `npm run lint` passes with 0 errors
- **Committed in:** `7fd5010` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed string literal passed to getBalance instead of address variable**

- **Found during:** Task 3 (user-reported during device verification)
- **Issue:** `use-balance.ts` was calling `provider.getBalance('address')` — passing the string literal `'address'` instead of the `address` variable. Balance would always fail for any connected wallet.
- **Fix:** Changed `'address'` to `address` in the getBalance call
- **Files modified:** `src/features/wallet/hooks/use-balance.ts`
- **Verification:** User confirmed balance loads correctly on device after fix
- **Committed in:** `93417d9` (separate fix commit)

---

**Total deviations:** 2 auto-fixed (2x Rule 1 - bugs)
**Impact on plan:** Both fixes necessary for correctness. The getBalance bug was pre-existing and would have prevented ERR-02/ERR-03 from working correctly. No scope creep.

## Issues Encountered

None beyond the apostrophe lint fix above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ERR-01, ERR-02, ERR-03 requirements fulfilled and user-verified on device
- All 5 phases of v1.0 milestone are complete
- No blockers — app is functionally complete for v1.0 scope

## Self-Check: PASSED

- FOUND: `src/features/wallet/components/ErrorState.tsx`
- FOUND: `src/features/wallet/components/ConnectionError.tsx`
- FOUND: `src/features/wallet/components/ConnectedScreen.tsx`
- FOUND: `.planning/phases/05-error-handling-polish/05-01-SUMMARY.md`
- FOUND: commit `856254e` (Task 1)
- FOUND: commit `7fd5010` (Task 2)
- FOUND: commit `93417d9` (bug fix)
- FOUND: commit `3c411aa` (final metadata)

---

_Phase: 05-error-handling-polish_
_Completed: 2026-04-02_
