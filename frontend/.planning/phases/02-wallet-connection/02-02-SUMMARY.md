---
phase: 02-wallet-connection
plan: 02
subsystem: ui
tags:
  [
    react-native,
    nativewind,
    appkit,
    walletconnect,
    blo,
    expo-clipboard,
    zustand,
  ]

# Dependency graph
requires:
  - phase: 02-wallet-connection-plan-01
    provides: useWalletConnection hook, useWalletStore, ConnectionStatus types, blo and expo-clipboard packages, WalletSyncBridge wiring

provides:
  - BlockieIdenticon component (bloSvg + SvgXml, circle-clipped)
  - ConnectButton component (opens AppKit modal via useWalletConnection)
  - LoadingOverlay component (transparent Modal with ActivityIndicator and Cancel)
  - ConnectionError component (inline error with retry hint, renders null when no message)
  - ConnectScreen component (disconnected hero: icon, title, bullets, connect button, error, overlay)
  - ConnectedScreen component (address, blockie, network label, copy with 2s feedback, disconnect)
  - app/index.tsx thin WalletScreen composing ConnectScreen/ConnectedScreen on isConnected

affects:
  - 03 (balance display phase will add ETH balance to ConnectedScreen)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - NativeWind contentContainerClassName on ScrollView for flex content centering
    - useState + setTimeout for copy-to-clipboard 2s feedback pattern
    - Conditional address cast to `0x${string}` at call site when BlockieIdenticon is invoked

key-files:
  created:
    - src/features/wallet/components/BlockieIdenticon.tsx
    - src/features/wallet/components/ConnectButton.tsx
    - src/features/wallet/components/LoadingOverlay.tsx
    - src/features/wallet/components/ConnectionError.tsx
    - src/features/wallet/components/ConnectScreen.tsx
    - src/features/wallet/components/ConnectedScreen.tsx
  modified:
    - src/app/index.tsx

key-decisions:
  - 'ConnectionError splits message and retry hint into two separate Text nodes — avoids punctuation collision when error message already ends with period'
  - 'ConnectedScreen casts address to `0x${string}` at call site — BlockieIdenticon prop is typed stricter than Zustand store address (string | null)'
  - 'ConnectScreen uses ScrollView with contentContainerClassName to allow vertical centering on small devices while still scrolling on overflow'

patterns-established:
  - 'Copy feedback: useState(false) + setTimeout 2000ms + setCopied(false) for transient copy confirmation'
  - 'Null-guard inside ConnectedScreen: {address && <BlockieIdenticon />} — address is string | null from store'

requirements-completed: [WALLET-01, WALLET-02, WALLET-03, WALLET-04]

# Metrics
duration: 2min
completed: 2026-04-01
---

# Phase 2 Plan 02: Wallet Connection UI Components Summary

**Six NativeWind wallet UI components (blockie identicon, connect button, loading overlay, error, hero screen, connected screen) with smoke test replaced by conditional WalletScreen**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-01T15:12:41Z
- **Completed:** 2026-04-01T15:14:20Z
- **Tasks:** 2 of 3 executed (Task 3 is checkpoint:human-verify — awaiting on-device verification)
- **Files modified:** 7 (6 created, 1 replaced)

## Accomplishments

- All 6 wallet UI components created using NativeWind className exclusively — no inline style objects
- Smoke test screen (SmokeTestScreen, maskValue, ENV, require appkit) fully replaced by thin WalletScreen
- app/index.tsx reduced from 116 lines to 9 lines — purely a conditional render delegating to feature components

## Task Commits

Each task was committed atomically:

1. **Task 1: Create wallet UI components** - `49586de` (feat)
2. **Task 2: Replace smoke test with wallet screen** - `ed65a32` (feat)

**Plan metadata:** (pending — after human-verify checkpoint resolves)

## Files Created/Modified

- `src/features/wallet/components/BlockieIdenticon.tsx` - bloSvg generates raw SVG, SvgXml renders it, View with rounded-full clips to circle
- `src/features/wallet/components/ConnectButton.tsx` - TouchableOpacity calling useWalletConnection().connect, disabled during connecting
- `src/features/wallet/components/LoadingOverlay.tsx` - transparent Modal with ActivityIndicator, "Waiting for approval in MetaMask...", Cancel button, accessibilityLiveRegion
- `src/features/wallet/components/ConnectionError.tsx` - renders null when no message; shows error text + "Tap Connect Wallet to try again." on two lines
- `src/features/wallet/components/ConnectScreen.tsx` - hero layout with ETH icon placeholder, title, three bullets, ConnectButton, ConnectionError, LoadingOverlay
- `src/features/wallet/components/ConnectedScreen.tsx` - blockie, "Connected to Ethereum Mainnet", address card with Copy/Copied! feedback, Disconnect in top-right
- `src/app/index.tsx` - replaced smoke test; thin WalletScreen reading isConnected from useWalletStore, conditionally renders ConnectScreen or ConnectedScreen

## Decisions Made

- `ConnectionError` renders the error message and the retry hint as separate `Text` nodes rather than string concatenation, to avoid awkward punctuation when the upstream error message already ends with a period
- `ConnectedScreen` casts `address as \`0x\${string}\``at the call site since`useWalletConnection`returns`string | null`but`BlockieIdenticon`requires the hex-typed address — the`{address &&}` guard ensures the cast is only reached with a non-null value
- `ConnectScreen` wraps content in a `ScrollView` with `contentContainerClassName="flex-1 items-center justify-center ..."` so the layout vertically centers on normal screens and scrolls on very small devices

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 6 UI components are ready. Task 3 (checkpoint:human-verify) awaits on-device manual verification on a Development Build (not Expo Go — deep-link requires native build).
- Once WALLET-01 through WALLET-04 are verified on device, Phase 2 is complete and Phase 3 (ETH balance display) can begin.
- Known blocker: MetaMask deep-link round-trip must be tested on a physical device — iOS simulator has no wallet apps installed.

---

_Phase: 02-wallet-connection_
_Completed: 2026-04-01_
