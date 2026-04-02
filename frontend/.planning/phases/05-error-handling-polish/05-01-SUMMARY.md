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
  patterns: [3-branch conditional for data states (loading/error/content), retry via refreshTrigger increment, friendly error copy over raw JS error strings]

key-files:
  created:
    - src/features/wallet/components/ErrorState.tsx
  modified:
    - src/features/wallet/components/ConnectionError.tsx
    - src/features/wallet/components/ConnectScreen.tsx
    - src/features/wallet/components/BalanceDisplay.tsx
    - src/features/wallet/components/ConnectedScreen.tsx

key-decisions:
  - "ErrorState is a shared presentational component — callers only render it when error exists (message prop is non-nullable string)"
  - "ConnectionError uses hasError boolean instead of message string — hard-coded friendly copy replaces raw JS error propagation"
  - "handleRetry increments refreshTrigger without setRefreshing(true) — button retry does not show pull-to-refresh spinner"
  - "Unescaped apostrophe in ConnectionError JSX text node fixed with JS string expression to satisfy react/no-unescaped-entities lint rule"

patterns-established:
  - "3-branch data conditional: loading skeleton -> error state -> content"
  - "renderEmpty 3-branch: txLoading check -> txError check -> empty state"
  - "Friendly error copy pattern: hard-code user-facing string in component, never propagate raw JS error messages to UI"

requirements-completed: [ERR-01, ERR-02, ERR-03]

# Metrics
duration: 7min
completed: 2026-04-02
---

# Phase 05 Plan 01: Error Handling Polish Summary

**All three error paths wired with friendly copy and Retry button: ConnectionError shows "Couldn't connect wallet", balance/transaction sections show independent ErrorState components with refreshTrigger retry**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-02T08:18:23Z
- **Completed:** 2026-04-02T08:25:00Z
- **Tasks:** 2 of 3 (Task 3 is a human-verify checkpoint)
- **Files modified:** 5

## Accomplishments
- Created ErrorState.tsx: reusable presentational component with error message + blue "Retry" text button matching existing button patterns
- Updated ConnectionError to accept `hasError: boolean` and display fixed "Couldn't connect wallet" copy instead of raw JS error string
- Wired ConnectedScreen with independent balance and transaction error states, both using handleRetry callback that increments refreshTrigger
- Simplified BalanceDisplay to pure success-state component (error handling moved upstream to ConnectedScreen)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ErrorState component and update ConnectionError** - `856254e` (feat)
2. **Task 2: Wire balance and transaction error states with retry in ConnectedScreen** - `7fd5010` (feat)

_Task 3 is a human-verify checkpoint — awaiting visual confirmation._

## Files Created/Modified
- `src/features/wallet/components/ErrorState.tsx` - New shared presentational component: error message + blue Retry text button
- `src/features/wallet/components/ConnectionError.tsx` - Changed prop from message string to hasError boolean, hard-coded friendly copy
- `src/features/wallet/components/ConnectScreen.tsx` - Updated call site to pass `hasError={!!error}`
- `src/features/wallet/components/BalanceDisplay.tsx` - Simplified to pure success-state (removed error prop and "Balance unavailable" branch)
- `src/features/wallet/components/ConnectedScreen.tsx` - Added ErrorState import, txError destructure, handleRetry callback, 3-branch conditionals for balance and transactions

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
- **Committed in:** 7fd5010 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — lint error from unescaped apostrophe in JSX)
**Impact on plan:** Minor fix required by ESLint rules. No scope creep. Rendered text is identical.

## Issues Encountered
None beyond the apostrophe lint fix above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ERR-01, ERR-02, ERR-03 requirements fulfilled in code
- Task 3 (human-verify checkpoint) must be confirmed before marking phase complete
- After verification: all three error paths confirmed working on device/emulator with skeleton loaders and retry

---
*Phase: 05-error-handling-polish*
*Completed: 2026-04-02*
