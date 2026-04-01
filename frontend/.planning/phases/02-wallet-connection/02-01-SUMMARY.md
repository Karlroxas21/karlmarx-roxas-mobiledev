---
phase: 02-wallet-connection
plan: 01
subsystem: wallet
tags: [appkit, walletconnect, zustand, react-native, blo, expo-clipboard, deep-link]

# Dependency graph
requires:
  - phase: 01-foundation-polyfills
    provides: AppKit singleton, AsyncStorage adapter, polyfills, app-provider.tsx scaffold
provides:
  - Wallet detection config for iOS (LSApplicationQueriesSchemes) and Android (queries.js)
  - AppKit deep-link return path via redirect.native metadata
  - ConnectionStatus and WalletState TypeScript types
  - Zustand wallet store tracking address, isConnected, status, error
  - useWalletConnection hook wrapping AppKit open/disconnect with manual status management
  - useWalletSync hook bridging AppKit account state to Zustand with isLoading bug workaround
  - WalletSyncBridge component inside AppKitProvider in app-provider.tsx
affects:
  - 02-02 (UI components that consume useWalletConnection and useWalletStore)

# Tech tracking
tech-stack:
  added:
    - blo (Ethereum blockies SVG generation, zero-dep)
    - expo-clipboard (cross-platform clipboard API)
  patterns:
    - WalletSyncBridge component pattern - sibling inside provider boundary to safely call context-dependent hooks
    - Manual status management in Zustand for connecting state (avoids AppKit isLoading bug #4677)
    - No persist middleware on wallet store - AppKit owns session persistence via AsyncStorage adapter

key-files:
  created:
    - queries.js (Android manifest plugin for wallet package detection)
    - src/features/wallet/types/index.ts
    - src/features/wallet/stores/wallet-store.ts
    - src/features/wallet/hooks/use-wallet-connection.ts
    - src/features/wallet/hooks/use-wallet-sync.ts
  modified:
    - app.json (iOS LSApplicationQueriesSchemes + queries.js plugin reference)
    - src/lib/appkit.ts (redirect.native metadata)
    - src/providers/app-provider.tsx (WalletSyncBridge)
    - package.json (blo, expo-clipboard)

key-decisions:
  - "No persist middleware on wallet store — AppKit owns session persistence via AsyncStorage adapter already wired in appkit.ts"
  - "useDisconnect() deprecated; disconnect() used from useAppKit() directly per AppKit v2 API"
  - "WalletSyncBridge rendered as sibling inside AppKitProvider (not in AppProvider body) to satisfy useAppKitAccount context requirement"
  - "isOpen transition used instead of isLoading to detect modal dismissal without connection (workaround for AppKit bug #4677)"

patterns-established:
  - "WalletSyncBridge: separate null-rendering component inside provider to call provider-dependent hooks at tree root"
  - "Manual connecting status: set to 'connecting' on open(), transition to 'connected' via sync hook, reset on isOpen false transition"

requirements-completed: [WALLET-01, WALLET-02, WALLET-03, WALLET-04]

# Metrics
duration: 3min
completed: 2026-04-01
---

# Phase 2 Plan 01: Wallet Connection Data Layer Summary

**Wallet detection config (iOS schemes + Android queries), AppKit deep-link redirect, and complete wallet feature module (types, Zustand store, connection hook, sync hook, provider bridge)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-01T15:03:08Z
- **Completed:** 2026-04-01T15:06:20Z
- **Tasks:** 2
- **Files modified:** 9 (5 created, 4 modified)

## Accomplishments

- Wallet detection configured for both iOS (LSApplicationQueriesSchemes in app.json) and Android (queries.js Expo config plugin) enabling MetaMask and other wallets to appear in AppKit modal
- Complete `features/wallet/` module scaffolded: types, Zustand store, useWalletConnection hook, and useWalletSync hook with isLoading bug workaround
- WalletSyncBridge component wired inside AppKitProvider so AppKit account state flows to Zustand store on every connection state change

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and configure wallet detection** - `5b9ab21` (feat)
2. **Task 2: Create wallet types, Zustand store, hooks, and wire AppProvider** - `6b47bb2` (feat)

## Files Created/Modified

- `queries.js` - Expo config plugin adding Android manifest `<queries>` for wallet package detection
- `app.json` - Added iOS `infoPlist.LSApplicationQueriesSchemes` and `./queries.js` plugin reference
- `src/lib/appkit.ts` - Added `redirect: { native: 'frontend://' }` to AppKit metadata
- `src/features/wallet/types/index.ts` - ConnectionStatus and WalletState type exports
- `src/features/wallet/stores/wallet-store.ts` - Zustand store: address, isConnected, status, error with set/clear actions
- `src/features/wallet/hooks/use-wallet-connection.ts` - Hook wrapping AppKit open/disconnect, exposes connect/disconnect/cancelConnection
- `src/features/wallet/hooks/use-wallet-sync.ts` - Bridges useAppKitAccount to Zustand; detects modal dismissal via isOpen transition
- `src/providers/app-provider.tsx` - Added WalletSyncBridge component inside AppKitProvider
- `package.json` / `package-lock.json` - Added blo and expo-clipboard

## Decisions Made

- No `persist` middleware on wallet store — AppKit's AsyncStorage adapter (already in appkit.ts) owns session persistence. Adding persist would create a duplicate, stale source of truth
- Used `disconnect()` from `useAppKit()` — `useDisconnect()` hook is deprecated in AppKit v2
- WalletSyncBridge rendered as a sibling component inside `<AppKitProvider>` rather than calling `useWalletSync` in the AppProvider body. This satisfies React context requirements: `useAppKitAccount` requires AppKitProvider to be in the tree above the calling component
- `isOpen` transition used to detect modal dismissal without connection (AppKit bug #4677: `isLoading` stays true after dismissal)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Data layer is complete. Plan 02-02 can consume `useWalletConnection`, `useWalletStore`, and the wallet types directly.
- The `blo` package is installed and ready for BlockieIdenticon component implementation in 02-02.
- `expo-clipboard` is installed and ready for copy-address functionality.
- Deep-link return path requires a Development Build to test (not Expo Go) — documented in RESEARCH.md Pitfall 5.

---
*Phase: 02-wallet-connection*
*Completed: 2026-04-01*
