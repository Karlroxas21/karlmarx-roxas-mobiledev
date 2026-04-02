# Phase 3: Balance Display - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Display the connected user's ETH balance in human-readable format on the wallet screen. This phase adds balance fetching (via ethers.js + Infura RPC) and display to the existing ConnectedScreen. No transaction history (Phase 4), no pull-to-refresh (Phase 4), no error handling polish (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Balance Placement & Prominence
- Balance appears **above the address box**, between the network label and the address card
- Hero number: large bold text (~28pt), the dominant element on screen
- "ETH" unit label in the same style as the number (single bold line: "1.2345 ETH")
- Centered, matching the existing centered layout of ConnectedScreen

### Number Formatting
- Fixed 4 decimal places always (e.g., "1.2300 ETH", "0.0042 ETH")
- Very small balances (< 0.0001 ETH): display "< 0.0001 ETH"
- Zero balance: display "0.0000 ETH" with no special treatment
- No thousand separators (crypto convention: "1234.5678 ETH" not "1,234.5678 ETH")

### Loading State
- Skeleton placeholder: gray pulsing rounded rectangle in the shape/size of the balance text
- Replaces the balance text area while loading, same position and dimensions
- No spinner, no text placeholder

### Fetch Timing
- Fetch balance on mount only (when ConnectedScreen renders)
- No auto-refresh, no foreground re-fetch — pull-to-refresh comes in Phase 4 (TX-02)

### Claude's Discretion
- ethers.js provider setup (JsonRpcProvider vs StaticJsonRpcProvider)
- Hook structure for balance fetching (custom hook in features/wallet/hooks/)
- Skeleton animation implementation (Animated API, reanimated, or NativeWind animate)
- Wei-to-ETH conversion approach (ethers.formatEther or manual)
- Error state for failed balance fetch (Phase 5 will polish, but basic handling needed)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Wallet infrastructure (from Phase 1-2)
- `src/lib/appkit.ts` — AppKit singleton with EthersAdapter, Infura RPC config, ethers.js v6 crypto registration
- `src/config/env.ts` — ENV.INFURA_RPC_URL for creating ethers provider
- `src/features/wallet/stores/wallet-store.ts` — Zustand store with address, isConnected, status, error
- `src/features/wallet/types/index.ts` — ConnectionStatus and WalletState types
- `src/features/wallet/hooks/use-wallet-connection.ts` — useWalletConnection hook (address, disconnect)

### UI integration point
- `src/features/wallet/components/ConnectedScreen.tsx` — Where balance display gets added (between network label and address box)

### Project specs
- `.planning/REQUIREMENTS.md` — BAL-01: "ETH balance display, 4-6 decimal places"

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ethers` (v6): Already installed and configured with native crypto in `lib/appkit.ts` — use for provider and `formatEther`
- `ENV.INFURA_RPC_URL`: Infura mainnet RPC endpoint ready to use
- `useWalletStore`: Zustand store with `address` — use to get connected address for balance lookup
- `useWalletConnection`: Hook returning `address` — already used by ConnectedScreen

### Established Patterns
- Feature hooks in `features/wallet/hooks/` — new `useBalance` hook follows this pattern
- Zustand stores for state — balance could extend wallet store or use a separate hook with local state
- NativeWind `className` for all styling — skeleton placeholder follows this
- No data-fetching library (no React Query) — plain useEffect + async fetch pattern

### Integration Points
- `ConnectedScreen.tsx` — Add balance display between network label and address box View
- `features/wallet/hooks/` — New balance hook lives here
- `features/wallet/types/index.ts` — May need balance-related types if extending store

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Layout follows the established MetaMask-style wallet pattern with balance as the hero element.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-balance-display*
*Context gathered: 2026-04-02*
