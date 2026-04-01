# Feature Research

**Domain:** Ethereum wallet viewer mobile app (read-only, Expo/React Native)
**Researched:** 2026-04-01
**Confidence:** MEDIUM-HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Wallet connection via WalletConnect/MetaMask | Every crypto mobile app supports connecting an existing wallet. Users expect both WalletConnect (broad wallet support) and MetaMask SDK (most popular wallet). | MEDIUM | WalletConnect v2 via Reown AppKit is the standard. MetaMask SDK adds deep-link support. Both needed for credible coverage. |
| ETH balance display in human-readable ETH | Blockchain returns Wei (18 decimals). Users expect ETH with 4-6 decimal places (e.g. "1.2345 ETH"), not raw Wei. | LOW | Use `ethers.formatEther()` or Wagmi's `useBalance` hook — do NOT display raw Wei. |
| Gas fee display in Gwei | Users expect gas info in Gwei, not Wei or ETH. This is the universal standard across MetaMask, block explorers, and gas trackers. | LOW | Gwei is readable; ETH is too small; Wei is unreadable. Standard formatting: "25 Gwei". |
| Transaction history list | Users expect to see recent transactions without leaving the app. Minimum: last 10 txns with date, amount, direction (in/out), and truncated address. | MEDIUM | Etherscan API v2 is the standard data source. ethers.js `EtherscanProvider` wraps this. Free tier has rate limits. |
| Transaction direction indicator | Each transaction row must visually distinguish incoming (green, arrow in) vs. outgoing (red, arrow out). | LOW | Determined by comparing tx `from` address to connected wallet address. |
| Truncated address display | Full Ethereum addresses (42 chars) are unreadable. Standard format: `0x1234...abcd` (first 6, last 4). | LOW | Tapping should copy full address to clipboard — this is a universal expectation. |
| Connection state persistence | Users expect to stay connected across app restarts without re-scanning a QR code. | MEDIUM | Requires async storage. Reown AppKit handles this automatically. Manual implementation with ethers requires AsyncStorage integration. |
| Disconnect wallet | Users must be able to disconnect cleanly from within the app. | LOW | Clear session from storage, reset state to disconnected screen. |
| Loading states | Every async operation (connection, balance fetch, tx history fetch) needs a visible loading indicator. | LOW | No skeleton screens required for v1, but spinners are non-negotiable. Users consider lack of loading feedback a bug. |
| Error handling with user-visible messages | Connection failures, network errors, and API rate limits must surface as readable messages, not silent failures or raw error objects. | LOW-MEDIUM | At minimum: "Could not connect wallet", "Failed to load balance", "Failed to load transactions". |
| Empty state for transaction history | If a wallet has no transactions, the list must show a meaningful empty state, not a blank screen. | LOW | Simple text label: "No transactions found." |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Pull-to-refresh on balance and transaction list | Expected on native mobile but not always implemented in web-wrapper apps. Signals "real" native app quality. | LOW | React Native's `RefreshControl` component. Re-trigger provider queries on pull. |
| Copy-to-clipboard on wallet address | Saves user from manually typing their address. Tiny feature, high daily utility. | LOW | `Clipboard.setString()` with toast confirmation. |
| Transaction timestamp formatted as relative time | "3 hours ago" is friendlier than "2026-04-01 14:32:22". Most wallets show both. | LOW | Use `date-fns` `formatDistanceToNow()`. |
| ETH amount color-coding by direction | Green for incoming, red for outgoing amounts, beyond just the direction icon. Reduces cognitive load at a glance. | LOW | CSS class or NativeWind conditional. High visual impact for minimal cost. |
| Block confirmation display on transactions | Shows how final a transaction is. Users familiar with crypto appreciate this; casual users can ignore it. | LOW | Field is available from Etherscan API response. |
| Wallet address QR code display | Let others scan to send ETH to this wallet. Read-only app context — no security risk, high utility. | LOW | Use `react-native-qrcode-svg`. Users expect this in any wallet app. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time balance auto-polling | "Live balance" feels premium. | Polling every few seconds hammers Etherscan/RPC APIs, hits free tier rate limits within minutes, drains phone battery, and adds complexity. Ethereum blocks are ~12 seconds apart — real-time display is not meaningful at that cadence. | Manual pull-to-refresh + single fetch on app foreground event. Serves same need without rate-limit risk. |
| Fiat currency conversion (USD/EUR) | Users want to see "$1,234.56" not just "0.42 ETH". | Requires a price API (CoinGecko, CoinMarketCap, etc.), a second network dependency, additional error surface, and exchange rate caching logic. Out of scope for read-only v1. | Defer to v2. Note the ETH amount prominently; USD can come later. |
| ERC-20 token balances | "My ETH wallet has tokens too." | Requires iterating known token contract addresses or using a token list API, plus ERC-20 ABI calls per token. Multiplies API calls and error surface significantly. | ETH-only for v1. Token support is a natural v2 milestone after core is solid. |
| Transaction sending / signing | "Why can't I send from here?" | Fundamentally changes the security model from read-only viewer to custodial-risk app. Requires deep-link permission flows, gas estimation UI, and confirmation flows. Out of scope. | Clearly communicate the app is read-only in the onboarding screen to set expectations. |
| Multi-chain support (Polygon, Arbitrum, etc.) | "I use L2s." | Requires chain switching UI, separate RPC endpoints, network detection, and separate Etherscan-equivalent APIs per chain. Significantly increases scope. | Ethereum mainnet only for v1. Label clearly: "Ethereum Mainnet". Chain selector deferred to v2. |
| Push notifications for new transactions | "Alert me when I receive ETH." | Requires a backend service to watch the address, a push notification infrastructure (FCM/APNs), and a server-side API key to call Ethereum nodes. Not achievable in a pure client-side app. | Out of scope for v1. Would require backend phase first. |
| Dark mode toggle | "I use dark mode." | Not a wallet-specific need. Adds theming complexity and doubles visual QA surface. NativeWind supports it, but distracts from core feature delivery. | Use a single theme consistently for v1. Add after core features ship. |

## Feature Dependencies

```
[Wallet Connection]
    └──required by──> [ETH Balance Display]
    └──required by──> [Transaction History]
    └──required by──> [Disconnect Wallet]
    └──required by──> [Address Display + Copy]
    └──required by──> [Wallet Address QR Code]

[ETH Balance Display]
    └──requires──> [Ethereum RPC Provider] (ethers.js JsonRpcProvider or Wagmi useBalance)

[Transaction History]
    └──requires──> [Etherscan API v2 key + integration]
    └──enhanced by──> [Transaction Direction Indicator]
    └──enhanced by──> [Relative Timestamp]
    └──enhanced by──> [Color-coded ETH Amount]

[Connection State Persistence]
    └──requires──> [AsyncStorage integration]
    └──enables──> [Auto-reconnect on app start]

[Pull-to-Refresh]
    └──requires──> [ETH Balance Display] (to refresh)
    └──requires──> [Transaction History] (to refresh)
```

### Dependency Notes

- **Balance and tx history require wallet connection:** Nothing data-facing can be built until address is available from connected wallet. Build connection first.
- **Transaction history requires Etherscan API, not just ethers.js:** `eth_getBalance` is available on any RPC. Transaction history is NOT — it requires Etherscan API v2 or equivalent indexer (Alchemy, Moralis). Plan for API key management.
- **Connection persistence requires AsyncStorage:** Must be configured before wallet connection is considered "complete". Reown AppKit handles this automatically; a manual ethers.js approach requires explicit storage wiring.
- **Pull-to-refresh requires balance and tx history to exist:** It's enhancement layer, not core. Build last.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] Wallet connection (WalletConnect + MetaMask deep-link) — entry point to everything
- [ ] Connected wallet address display (truncated format `0x1234...abcd`) — confirms connection succeeded
- [ ] ETH balance display formatted in ETH (not Wei) — core read value
- [ ] Transaction history list (last 10) with direction, amount, truncated counterparty address, and timestamp — core browse value
- [ ] Disconnect wallet — essential session control
- [ ] Loading states on all async operations — required for usable UX
- [ ] Error messages for connection failure and API failure — required for debuggable UX

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Pull-to-refresh — add when core data display is stable; high impact, low effort
- [ ] Copy address to clipboard — add with pull-to-refresh as a "polish" pass
- [ ] Relative timestamps on transactions — trivial, add in same polish pass
- [ ] ETH color-coding by direction — same polish pass
- [ ] QR code for wallet address — useful, one extra library, add post-validation

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Fiat conversion (USD display) — most-requested missing feature; add once core is validated
- [ ] ERC-20 token balances — logical next data layer after ETH balance is proven
- [ ] Multi-chain support — after token support, natural expansion
- [ ] Dark mode — polish investment; defer until UX is stable
- [ ] Transaction filtering / search — add when history list grows (pagination first)
- [ ] Push notifications — requires backend infrastructure; separate project phase

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Wallet connection (WalletConnect + MetaMask) | HIGH | MEDIUM | P1 |
| ETH balance display | HIGH | LOW | P1 |
| Transaction history (last 10) | HIGH | MEDIUM | P1 |
| Address display (truncated) | HIGH | LOW | P1 |
| Disconnect wallet | HIGH | LOW | P1 |
| Loading states | HIGH | LOW | P1 |
| Error messages | HIGH | LOW | P1 |
| Pull-to-refresh | MEDIUM | LOW | P2 |
| Copy address to clipboard | MEDIUM | LOW | P2 |
| Relative timestamps | MEDIUM | LOW | P2 |
| Color-coded transaction amounts | MEDIUM | LOW | P2 |
| QR code for address | MEDIUM | LOW | P2 |
| Fiat conversion | HIGH | MEDIUM | P3 |
| ERC-20 token balances | MEDIUM | HIGH | P3 |
| Multi-chain support | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

Observed from MetaMask Mobile, Rainbow Wallet, and Zerion — the three most-cited mobile wallet UX references in the community.

| Feature | MetaMask Mobile | Rainbow / Zerion | Our Approach |
|---------|-----------------|------------------|--------------|
| Balance display | ETH + USD side-by-side | ETH + USD, portfolio graph | ETH only for v1 (USD deferred) |
| Transaction list | Flat list, icon for direction, amount, date | Rich cards with gas info, status badge | Flat list with direction icon, amount, date, truncated address |
| Connection flow | QR scan or deep-link if MetaMask installed | WalletConnect QR modal | WalletConnect modal + MetaMask deep-link |
| Address display | Truncated in header, tap to copy | Truncated in header, tap to copy | Truncated, tap to copy in v1.x |
| Loading state | Skeleton cards while fetching | Skeleton cards | Spinner for v1 (skeletons are v2 polish) |
| Empty state | "No activity" with illustration | "No activity" with illustration | Text label for v1, illustration later |
| Disconnect | Settings page or long-press | Settings icon in header | Single "Disconnect" button, prominent |

## UX Patterns — Concrete Implementation Notes

### Connection Flow
1. Landing screen: single CTA button ("Connect Wallet")
2. WalletConnect modal opens (QR code + wallet list)
3. If MetaMask SDK: deep-link opens MetaMask app for approval, returns via universal link
4. On success: navigate to wallet home screen (no modal)
5. On failure: in-context error message, not full-screen error screen
6. On next app open: check AsyncStorage for session, auto-reconnect silently, show loading indicator

### Balance Display
- Format: `ethers.formatEther(balanceWei)` → clip to 6 decimal places → display as "1.234567 ETH"
- Position: prominent, top of home screen, large font
- Gas fees: display in Gwei for any gas-related context (not required for v1 read-only)
- Never show raw Wei to end users

### Transaction List
- Item anatomy: direction icon (arrow) | amount in ETH (colored) | counterparty address (truncated) | relative date
- Direction: compare `tx.from.toLowerCase() === connectedAddress.toLowerCase()` → outgoing; else incoming
- Sort: descending by block number (newest first) — Etherscan API returns this by default
- Pagination: show last 10 for v1; load-more is v2
- Data source: Etherscan API v2 `?module=account&action=txlist&address=...&sort=desc&offset=10`

## Sources

- [Reown AppKit overview](https://docs.reown.com/appkit/overview) — WalletConnect v2 modern integration standard
- [Callstack: Best DX for React Native Web3 dApps](https://www.callstack.com/blog/best-dx-for-react-native-web3-dapps-with-web3modal-and-wagmi) — Wagmi + Web3Modal patterns (MEDIUM confidence, 2024 article)
- [MetaMask SDK Connect docs](https://docs.metamask.io/sdk/) — Official MetaMask SDK for React Native
- [Etherscan API v2 Docs](https://docs.etherscan.io/api-reference/endpoint/balance) — Balance and transaction history endpoints
- [ethers.js v6 Display Logic](https://docs.ethers.org/v6/single-page/) — `formatEther`, `formatUnits` for balance display
- [MetaMask news: Best mobile crypto wallets 2026](https://metamask.io/news/best-mobile-crypto-wallets-2026) — Market context and user expectations
- [Cryptowisser: Crypto Wallet UX Guide 2025](https://www.cryptowisser.com/guides/crypto-wallet-ux-guide-2025/) — UX benchmarking
- [Zerion: Top Crypto Wallet APIs 2025](https://zerion.io/blog/top-10-crypto-wallet-data-apis-2025-guide/) — Data API ecosystem context
- [Alchemy: What is Wei / Gwei](https://www.alchemy.com/blog/what-is-wei) — Unit formatting standards

---
*Feature research for: Ethereum wallet viewer mobile app (Expo/React Native)*
*Researched: 2026-04-01*
