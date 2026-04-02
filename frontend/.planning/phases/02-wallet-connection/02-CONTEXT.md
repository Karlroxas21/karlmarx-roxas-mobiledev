# Phase 2: Wallet Connection - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can connect their Ethereum wallet via WalletConnect v2 and MetaMask deep-link, have their session survive app restarts, and disconnect when needed. This phase replaces the Phase 1 smoke test screen with the wallet connection UI. No balance display or transaction history (Phases 3-4).

</domain>

<decisions>
## Implementation Decisions

### Screen Layout

- Hero + features landing for disconnected state: app icon at top, bullet list of capabilities (view balance, see transactions, read-only & safe), "Connect Wallet" button at bottom
- Minimal connected state: just the connected address and disconnect — no placeholder sections for future features
- Single route: replace `app/index.tsx` smoke test with the wallet screen (connected/disconnected states on same page)

### Connect Flow UX

- Use AppKit's built-in WalletConnect v2 modal (QR code + wallet list). Tap "Connect Wallet" opens the modal
- Custom loading overlay: show "Waiting for approval in MetaMask..." while waiting for wallet approval, with cancel option
- Connection rejection/timeout: show inline error message below the Connect button on the disconnected screen. Dismisses on next tap

### Address Display

- Full 42-character address displayed (not truncated)
- "Connected to Ethereum Mainnet" label shown above the address
- Ethereum-style blockies identicon (pixelated colored squares) generated from the address
- Copy-to-clipboard button next to the address (pulled forward from Phase 5 scope)

### Disconnect Behavior

- Instant disconnect — no confirmation dialog. Reconnecting is easy
- Disconnect button placed in top-right corner of the connected screen (small icon or text link)
- Silent transition: just flip back to the disconnected hero screen, no "Disconnected" message

### Claude's Discretion

- Wallet feature module structure (`features/wallet/` layout)
- Zustand store design for wallet connection state
- AppKit hook usage and session persistence implementation
- Blockies library selection for React Native
- Loading overlay implementation details
- Exact styling and spacing within the established NativeWind patterns

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### AppKit integration (from Phase 1)

- `src/lib/appkit.ts` — AppKit singleton with EthersAdapter, AsyncStorage-based storage, mainnet config. Connection hooks build on this
- `src/providers/app-provider.tsx` — AppKitProvider wrapping with AppKit modal component already rendered
- `src/config/env.ts` — ENV object with REOWN_PROJECT_ID, ETHERSCAN_API_KEY, INFURA_RPC_URL

### Existing patterns

- `src/features/auth/stores/auth-store.ts` — Zustand store pattern to follow for wallet store
- `src/stores/app-store.ts` — Global store pattern
- `src/utils/storage.ts` — Storage utility (needs AsyncStorage wiring for native)

### Research outputs (Phase 1)

- `.planning/research/ARCHITECTURE.md` — System architecture, AppKit bootstrap pattern
- `.planning/research/STACK.md` — Package list, versions, AppKit API surface

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `lib/appkit.ts`: AppKit singleton already initialized — Phase 2 uses its hooks (`useAppKit`, `useAppKitAccount`, etc.)
- `providers/app-provider.tsx`: AppKitProvider + `<AppKit />` modal already rendered — connection modal works out of the box
- `features/auth/stores/auth-store.ts`: Zustand store pattern (create, typed state, actions) — wallet store follows same structure
- `@react-native-async-storage/async-storage`: Already installed (used in appkit.ts storage adapter)

### Established Patterns

- Zustand stores in `stores/` (global) and `features/*/stores/` (feature-scoped)
- `lib/` directory for pre-configured library wrappers
- NativeWind `className` prop for all styling
- Bulletproof React feature-based architecture (`features/<name>/`)

### Integration Points

- `app/index.tsx` — Replace smoke test with wallet screen (conditional connected/disconnected rendering)
- `app/_layout.tsx` — Root layout (no changes needed, AppProvider already wraps)
- New `features/wallet/` module — components, hooks, stores for wallet connection

</code_context>

<specifics>
## Specific Ideas

- Blockies should be Ethereum-style (pixelated colored squares), the classic MetaMask look
- Connected screen should feel minimal — just enough to confirm wallet is connected, balance/transactions fill in later phases
- Hero screen bullet points: "View ETH balance", "See transactions", "Read-only & safe"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 02-wallet-connection_
_Context gathered: 2026-04-01_
