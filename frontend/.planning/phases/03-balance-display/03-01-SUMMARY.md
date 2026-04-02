---
phase: 03-balance-display
plan: 01
subsystem: ui
tags: [ethers, rpc, balance, skeleton, nativewind, react-native, zustand]

# Dependency graph
requires:
  - phase: 02-wallet-connection
    provides: useWalletStore with address state, ConnectedScreen component
provides:
  - useBalance hook: fetches ETH balance via Infura RPC using ethers.js v6 JsonRpcProvider
  - formatBalance utility: converts bigint Wei to 4-decimal ETH string with dust threshold
  - BalanceSkeleton component: pulsing gray placeholder for loading state
  - BalanceDisplay component: renders formatted balance or error fallback
  - ConnectedScreen: updated to show balance between network label and address card
affects: [03-balance-display, transactions-phase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useEffect cancellation guard (cancelled flag + cleanup) for async RPC fetch
    - staticNetwork: true on JsonRpcProvider to avoid extra eth_chainId RPC call
    - Pure formatBalance utility exported for testability, separate from hook

key-files:
  created:
    - src/features/wallet/hooks/use-balance.ts
    - src/features/wallet/components/BalanceSkeleton.tsx
    - src/features/wallet/components/BalanceDisplay.tsx
  modified:
    - src/features/wallet/components/ConnectedScreen.tsx

key-decisions:
  - "useBalance reads address directly from useWalletStore, not useWalletConnection (avoids pulling in connect/disconnect logic)"
  - "ethers.JsonRpcProvider with staticNetwork: true prevents redundant eth_chainId RPC call on provider creation"
  - "formatBalance exported as pure function for independent testability"
  - "Dust threshold: values > 0 && < 0.0001 ETH display as '< 0.0001' rather than truncating to 0.0000"

patterns-established:
  - "Async cancellation: set cancelled = false before async work, check !cancelled before setState, return () => { cancelled = true; } from useEffect"
  - "Balance formatting: ethers.formatEther() -> parseFloat() -> toFixed(4) with threshold check"
  - "Conditional loading render: {isLoading ? <Skeleton /> : <Display />} pattern"

requirements-completed: [BAL-01]

# Metrics
duration: 2min
completed: 2026-04-02
---

# Phase 3 Plan 01: Balance Display Summary

**ETH balance fetching via Infura RPC with 4-decimal formatting, dust threshold, pulsing skeleton placeholder, and error fallback integrated into ConnectedScreen**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-02T03:30:09Z
- **Completed:** 2026-04-02T03:31:59Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- useBalance hook fetches live ETH balance via ethers.js v6 JsonRpcProvider using Infura RPC URL from ENV
- formatBalance converts bigint Wei to human-readable ETH with exactly 4 decimal places and dust threshold (< 0.0001 for tiny non-zero values)
- BalanceSkeleton renders a 160x36px pulsing gray rectangle while balance loads
- BalanceDisplay renders "{value} ETH" in large semibold text or "Balance unavailable" on error
- ConnectedScreen wires useBalance hook and conditionally shows skeleton or formatted balance between network label and address card

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useBalance hook with formatBalance utility** - `7b2aa81` (feat)
2. **Task 2: Create balance UI components and wire into ConnectedScreen** - `9b95720` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `src/features/wallet/hooks/use-balance.ts` - Balance fetch hook and formatBalance pure utility
- `src/features/wallet/components/BalanceSkeleton.tsx` - Pulsing gray placeholder for loading state
- `src/features/wallet/components/BalanceDisplay.tsx` - Formatted balance display or error fallback
- `src/features/wallet/components/ConnectedScreen.tsx` - Updated to include balance display between network label and address card

## Decisions Made
- useBalance reads `address` directly from `useWalletStore` (not `useWalletConnection`) to avoid importing unneeded connect/disconnect logic
- `staticNetwork: true` passed to `JsonRpcProvider` to prevent an extra `eth_chainId` RPC round-trip on provider creation (ethers v6 optimization)
- `formatBalance` exported as a named export separate from the hook so it can be tested in isolation without React or RPC dependencies
- Dust threshold: values > 0 and < 0.0001 ETH display as `'< 0.0001'` to avoid misleadingly showing `0.0000` for non-zero balances

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript compiled with zero errors. ESLint showed 0 errors (8 pre-existing warnings in unrelated files: `use-wallet-sync.ts`, `use-app-state.ts`, `appkit.ts` — out of scope).

## User Setup Required

None - no external service configuration required. Infura RPC URL is already required by `ENV.INFURA_RPC_URL` from Phase 01 setup.

## Next Phase Readiness
- Balance display is complete and integrated — BAL-01 satisfied
- ethers.js v6 RPC integration validated via useBalance hook pattern
- Next: transaction history display (will reuse JsonRpcProvider pattern from this phase)

---
*Phase: 03-balance-display*
*Completed: 2026-04-02*
