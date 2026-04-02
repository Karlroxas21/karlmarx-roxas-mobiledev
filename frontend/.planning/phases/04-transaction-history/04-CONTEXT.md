# Phase 4: Transaction History - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Display the connected user's last 10 Ethereum transactions below the balance on the wallet screen, fetched via the Etherscan API v2. Each transaction shows direction (incoming/outgoing via color-coded amounts), counterparty address, ETH value, and timestamp. Pull-to-refresh refreshes both balance and transactions. No detailed transaction view (tap does nothing), no error handling polish (Phase 5), no fiat conversion (v2).

</domain>

<decisions>
## Implementation Decisions

### Transaction list layout

- Compact flat rows, no cards or dividers
- 2-line per row: counterparty address (truncated) on first line, ETH amount + relative timestamp on second line
- Address truncation: 6+4 format (0x1234...abcd) — standard wallet convention
- Tapping a transaction row does nothing (display-only for v1)
- "Transactions (N)" section header above the list showing count of displayed transactions

### Direction indicators

- Color-coded amount text only — no arrow icons, no text labels
- Incoming: green text with "+" prefix (e.g., "+0.5000 ETH")
- Outgoing: red text with "-" prefix (e.g., "-0.5000 ETH")
- Self-transactions (from === to === user address): neutral gray text, no +/- prefix
- Zero-value transactions (contract interactions with 0 ETH): shown in gray, count toward the 10 transactions
- Counterparty address line shows address only, no "From"/"To" prefix — color already signals direction

### Pull-to-refresh behavior

- Pull-to-refresh refetches BOTH balance AND transaction list simultaneously
- During refresh: existing data stays visible, native RefreshControl spinner at top
- No skeleton replacement during refresh — skeletons only for initial load
- ConvertConnectedScreen from plain View to FlatList with balance/address as ListHeaderComponent and transactions as FlatList data
- No rate-limiting or throttle on pull-to-refresh — Etherscan free tier (5 req/sec) won't be hit by manual pulls

### Empty & loading states

- Initial load: 3 skeleton placeholder rows matching transaction row shape (gray pulsing rectangles), consistent with BalanceSkeleton pattern from Phase 3
- Empty state (0 transactions): "No transactions yet" centered text, simple and clean
- Section header shows "Transactions (0)" when empty

### Claude's Discretion

- Etherscan API v2 endpoint and response parsing approach
- Transaction type definition and data mapping
- Hook structure for transaction fetching (useTransactions in features/wallet/hooks/)
- Skeleton animation implementation (follow BalanceSkeleton pattern)
- Exact timestamp formatting for relative time ("2h ago", "3d ago")
- ETH amount formatting for transactions (follow formatBalance pattern from use-balance.ts)
- How to refactor ConnectedScreen's current centered layout to work within FlatList's ListHeaderComponent

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Wallet infrastructure (from Phase 1-3)

- `src/lib/appkit.ts` — AppKit singleton with ethers.js v6, Infura RPC config
- `src/config/env.ts` — ENV.ETHERSCAN_API_KEY for Etherscan API, ENV.INFURA_RPC_URL for balance refresh
- `src/features/wallet/stores/wallet-store.ts` — Zustand store with address, isConnected
- `src/features/wallet/hooks/use-balance.ts` — useBalance hook + formatBalance utility (pattern to follow for useTransactions)
- `src/features/wallet/hooks/use-wallet-connection.ts` — useWalletConnection hook (address, disconnect)
- `src/features/wallet/types/index.ts` — ConnectionStatus and WalletState types

### UI integration point

- `src/features/wallet/components/ConnectedScreen.tsx` — Will be restructured from View to FlatList; balance/address become ListHeaderComponent
- `src/features/wallet/components/BalanceSkeleton.tsx` — Skeleton pattern to replicate for transaction skeletons

### Project specs

- `.planning/REQUIREMENTS.md` — TX-01: last 10 transactions with details; TX-02: pull-to-refresh updates balance and transactions

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `useBalance` hook: fetch pattern (useEffect + cancelled flag + state tuple) to replicate for useTransactions
- `formatBalance`: ETH formatting utility — may reuse or create similar for transaction amounts
- `BalanceSkeleton`: pulsing gray rectangle pattern to replicate for transaction skeleton rows
- `ENV.ETHERSCAN_API_KEY`: already configured and available
- `ethers.js v6`: already installed, use for Wei-to-ETH conversion via `ethers.formatEther`

### Established Patterns

- Feature hooks in `features/wallet/hooks/` — new `useTransactions` hook follows this
- Zustand store for wallet state — transactions may need their own state or extend existing
- NativeWind `className` for all styling — transaction components follow this
- Plain `useEffect` + async fetch, no React Query — follow same pattern as useBalance
- `JsonRpcProvider` with `staticNetwork: true` — reuse for balance refresh in pull-to-refresh

### Integration Points

- `ConnectedScreen.tsx` — major restructure: View -> FlatList, add transaction list, wire pull-to-refresh
- `features/wallet/hooks/` — new useTransactions hook
- `features/wallet/components/` — new TransactionRow, TransactionSkeleton, and possibly TransactionList components
- `features/wallet/types/index.ts` — new Transaction type

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Layout follows the compact row pattern common in mobile wallet apps (Coinbase, MetaMask mobile).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 04-transaction-history_
_Context gathered: 2026-04-02_
