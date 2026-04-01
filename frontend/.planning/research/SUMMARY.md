# Project Research Summary

**Project:** Ethereum Wallet Viewer — Expo/React Native Mobile App
**Domain:** Blockchain / read-only Ethereum wallet viewer (mobile)
**Researched:** 2026-04-01
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a read-only Ethereum wallet viewer built with Expo SDK 54 (managed workflow) and React Native 0.81 using the Hermes engine. The standard approach for this category is: Reown AppKit (`@reown/appkit-react-native`) for WalletConnect v2 wallet connection, ethers.js v6 for balance fetching, and the Etherscan API v2 for transaction history. These three integrations form the backbone of every production-grade React Native wallet viewer in the ecosystem as of 2026. The existing stack — NativeWind, Zustand, Expo Router — aligns well with this approach and requires no replacement, only additions.

The recommended build strategy is strictly dependency-driven: polyfills and native crypto must be wired before any blockchain code is written, wallet connection must exist before balance or transaction features are built, and error handling is best applied as a final cross-cutting pass after the happy path is confirmed. The architecture follows Bulletproof React conventions (feature-scoped modules under `features/`) with AppKit owning canonical wallet state and Zustand serving as a derived cache for reactive UI consumption.

The single greatest risk in this project is the polyfill/bootstrap setup. Web3 libraries depend on Node.js globals that React Native's Hermes engine does not provide, and import order is load-bearing — wrong order causes runtime crashes that are misleading and hard to debug. A close second risk is the Expo Go limitation: native crypto modules required by this stack cannot run in Expo Go, so a custom EAS development build must be established from the start. Both risks are fully avoidable with known, documented solutions and must be addressed in Phase 1 before any feature work begins.

---

## Key Findings

### Recommended Stack

The existing project already includes Expo SDK 54, React Native 0.81, NativeWind, Zustand 5, and Expo Router — all compatible with the required additions. No package replacements are needed.

Additions required are: `@reown/appkit-react-native` + `@reown/appkit-ethers-react-native` for WalletConnect v2, `ethers` v6 for balance fetching and ETH formatting, `react-native-quick-crypto` for native C++ crypto (prevents 30+ second wallet operations), `react-native-get-random-values` for secure randomness, `react-native-svg` for AppKit modal UI, `@react-native-async-storage/async-storage` + `@react-native-community/netinfo` + `expo-application` as AppKit peer deps, and `@walletconnect/react-native-compat` for global environment shims.

Transaction history cannot be fetched via ethers.js v6 — `provider.getHistory()` was removed in v6 and there is no equivalent RPC method. The Etherscan API v2 (`https://api.etherscan.io/v2/api`) is the correct data source, called via `axios` or the existing `api-client.ts`.

**Core technologies:**
- `@reown/appkit-react-native` v2.x: WalletConnect v2 wallet connection and session management — official successor to web3modal, Expo SDK 54 explicitly supported
- `@reown/appkit-ethers-react-native`: Bridges AppKit sessions to an ethers `BrowserProvider` — use over wagmi adapter since wagmi is not in the existing stack
- `ethers` v6.x: Balance fetching, ETH/Wei formatting — actively maintained, typed, native BigInt, React Native cookbook in official docs
- `react-native-quick-crypto` v0.7.x: Native C++ crypto via JSI — mandatory for usable performance; pure-JS fallback takes 30+ seconds on real devices
- `@walletconnect/react-native-compat`: Global polyfills for WalletConnect — must be the absolute first import in the app
- Etherscan API v2: Transaction history — REST endpoint, free tier is sufficient for v1 single-user usage, no SDK needed
- `babel-preset-expo` with `unstable_transformImportMeta: true`: Hard requirement for AppKit's internal valtio state library under Expo SDK 54

**What NOT to use:** web3.js (heavy Node.js polyfills, community moved on), Expo Go for development (native modules unavailable), `crypto-browserify` (pure-JS, slow), `@web3modal/ethers-react-native` (old pre-Reown package), Etherscan API v1 (deprecated May 31, 2025).

### Expected Features

**Must have (table stakes) — v1 launch:**
- Wallet connection (WalletConnect + MetaMask deep-link) — entry point; nothing else works without it
- ETH balance display formatted in ETH, not Wei — `ethers.formatEther()`, 4-6 decimal places
- Transaction history list (last 10) with direction, amount, counterparty address, timestamp
- Truncated address display (`0x1234...abcd`) with tap-to-copy
- Disconnect wallet — essential session control
- Loading states on all async operations — users treat absence as a bug
- Error messages for connection failure and API failure
- Empty state for transaction list

**Should have (competitive differentiators) — v1.x polish pass:**
- Pull-to-refresh on balance and transaction list
- Copy-to-clipboard on wallet address with toast confirmation
- Relative timestamps ("3 hours ago") using `date-fns`
- ETH amount color-coding by direction (green incoming, red outgoing)
- Wallet address QR code (`react-native-qrcode-svg`)

**Defer (v2+):**
- Fiat conversion (USD display) — requires price API, second network dependency
- ERC-20 token balances — multiplies API calls significantly
- Multi-chain support — separate RPC endpoints, chain UI, different block explorers
- Push notifications — requires backend infrastructure
- Dark mode — NativeWind supports it, but doubles visual QA surface; add after core ships

**Anti-features to avoid:** Real-time auto-polling (hammers rate limits), transaction sending/signing (changes security model to custodial-risk), storing private keys (out of scope for read-only app).

### Architecture Approach

The app follows a 3-layer Bulletproof React structure: thin screen routes in `src/app/` compose from feature modules in `src/features/`, which consume shared infrastructure in `src/lib/` and `src/providers/`. Two feature modules are needed: `features/wallet/` (connection, balance, Zustand wallet-store) and `features/transactions/` (Etherscan API, tx-store, list UI). AppKit is initialized as a singleton in `src/lib/appkit.ts` at module scope — never inside a component. Zustand stores act as derived caches of AppKit state, synced via a single `useWalletSync` hook called once in `app-provider.tsx`. Features must not import from each other; address flows from the screen layer down as a prop.

**Major components:**
1. `src/lib/appkit.ts` — AppKit singleton (`createAppKit()` at module scope); first import must be `@walletconnect/react-native-compat`
2. `src/providers/app-provider.tsx` — Root provider tree; wraps with `AppKitProvider`, calls `useWalletSync` once
3. `src/features/wallet/` — Connection hook, wallet-store (address, balance, status), `ConnectButton`, `WalletBalance`, `ConnectionStatus`
4. `src/features/transactions/` — `getTransactions()` via Etherscan API, tx-store, `TransactionList`, `TransactionItem`
5. `src/app/wallet.tsx` — Dashboard screen; composes wallet + transaction features; passes `address` to `TransactionList` as prop (avoids cross-feature store import)
6. `src/config/env.ts` — Adds `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID`, `EXPO_PUBLIC_ALCHEMY_URL`, `EXPO_PUBLIC_ETHERSCAN_API_KEY`

### Critical Pitfalls

1. **Node.js polyfills missing or imported in wrong order** — Import `@walletconnect/react-native-compat` as the absolute first line of `lib/appkit.ts`, `react-native-get-random-values` before any crypto imports, and configure `metro.config.js` `resolver.extraNodeModules` to map `crypto`, `stream`, `buffer` to React Native-compatible packages. Wrong order = runtime crash before UI renders.

2. **Using Expo Go for development** — Expo Go cannot run `react-native-quick-crypto`, `react-native-svg` (native renderer), or WalletConnect deep-link registration. All wallet testing must use a custom EAS Development Build (`eas build --profile development`). Establish this in Phase 1 before writing any integration code.

3. **ethers.js v6 BigInt / Babel config missing** — ethers v6 uses native `BigInt` which requires `unstable_transformProfile: 'hermes-stable'` in `babel.config.js`. Also requires `unstable_transformImportMeta: true` for AppKit's valtio internals. Both must be set before first ethers import.

4. **WalletConnect deep link loop** — App scheme must be registered in `app.json` (`"scheme": "ethereumwalletviewer"`). `redirectUrl` must be generated with `Linking.createURL('/')`, never hardcoded. Full round-trip (connect → approve → return) must be tested on a physical device, not the iOS simulator where wallet apps are unavailable.

5. **Etherscan rate limit errors misclassified as data errors** — Free tier allows 5 req/s; without an API key it drops to 1 req/5s. Both "rate limited" and "no transactions found" return `status: "0"` — parse the `result` string to distinguish them. Cache fetched transactions in the Zustand store with `lastFetchedAddress` to prevent re-fetching on screen remounts.

---

## Implications for Roadmap

Based on combined research, the build order is strictly dependency-driven. Five phases are recommended.

### Phase 1: Foundation and Polyfills
**Rationale:** Polyfills, Babel config, Metro config, and the EAS Development Build are prerequisites for every other phase. No blockchain library can be imported without them. Discover and fix setup issues here before any feature code is written — retrofit is expensive.
**Delivers:** App boots on a physical device without polyfill errors. AppKit singleton and provider are in the tree. `babel.config.js` has both `unstable_transformImportMeta` and `unstable_transformProfile: 'hermes-stable'`. EAS development build runs.
**Addresses features:** None directly, but unblocks all of them.
**Avoids pitfalls:** Polyfill import order (Pitfall 1), Expo Go masking native issues (Pitfall 2), ethers v6 BigInt / Babel (Pitfall 3).
**Key tasks:** Install all packages via `npx expo install`, create `babel.config.js`, update `metro.config.js` with `extraNodeModules`, extend `config/env.ts`, create `lib/appkit.ts` singleton, modify `providers/app-provider.tsx`, configure EAS build profile.

### Phase 2: Wallet Connection
**Rationale:** ETH balance and transaction history both require a connected wallet address. Nothing data-facing can be built until this is established and verified on a real device.
**Delivers:** User can tap "Connect Wallet", wallet modal opens (WalletConnect QR + MetaMask deep-link), address appears on screen. Session persists across app restarts. Disconnect clears session.
**Addresses features:** Wallet connection, address display (truncated), disconnect wallet, connection persistence.
**Avoids pitfalls:** WalletConnect deep link loop (Pitfall 4), Reown Project ID exposure (configure bundle whitelist in Reown dashboard before TestFlight).
**Key tasks:** Build `features/wallet/` (connection hook, `useWalletSync`, wallet-store, `ConnectButton`, `ConnectionStatus`). Update `app/index.tsx` connection gate. Test full connect → approve → return on physical iOS and Android.

### Phase 3: Balance Display
**Rationale:** ETH balance is the primary data value and validates that the ethers.js provider works correctly through the WalletConnect session. Simpler than transaction history (single RPC call vs. external REST API). Build this before transactions to confirm the ethers integration is solid.
**Delivers:** Connected user sees their ETH balance formatted in ETH (not Wei) at the top of the wallet screen.
**Addresses features:** ETH balance display, loading state for balance fetch, error message for balance failure.
**Avoids pitfalls:** Precision loss from float conversion (use `formatEther()`, never `Number(wei)/1e18`).
**Key tasks:** Create `lib/ethers.ts` provider factory. Build `use-eth-balance` hook and `WalletBalance` component. Create `app/wallet.tsx` dashboard screen.

### Phase 4: Transaction History
**Rationale:** Requires connected address (Phase 2) and a working dashboard screen to mount onto (Phase 3). The Etherscan API integration is entirely independent of ethers.js balance fetching — these are two separate data sources. Separating them into distinct phases keeps scope manageable.
**Delivers:** Last 10 transactions visible below balance with direction indicator (in/out), ETH amount, counterparty address (truncated), and timestamp.
**Addresses features:** Transaction history list, transaction direction indicator, loading state, empty state, error handling for API failures.
**Avoids pitfalls:** Etherscan rate limit misclassification (Pitfall 5) — parse `result` string, implement `lastFetchedAddress` caching in tx-store, use API v2 URL, store API key in env var.
**Key tasks:** Build `features/transactions/` (Etherscan API call, `use-transactions` hook, tx-store, `TransactionList`, `TransactionItem`). Configure Etherscan base URL in `env.ts`. Pass `address` from `wallet.tsx` as a prop, not via cross-feature store import.

### Phase 5: Error Handling and Polish
**Rationale:** Error handling is a cross-cutting concern that is most efficiently applied after the happy path is confirmed working. The v1.x polish features (pull-to-refresh, copy-to-clipboard, relative timestamps, color-coding) are low-effort and high-impact — grouping them into a single pass avoids interrupting feature development.
**Delivers:** All error states surfaced with user-readable messages and retry affordances. Pull-to-refresh on balance and transactions. Copy wallet address to clipboard. Relative timestamps. ETH amount color-coded by direction.
**Addresses features:** All P2 (competitive differentiator) features. Complete error handling for all async paths.
**Avoids pitfalls:** UX pitfalls — no loading state, no retry affordance, raw Wei display, no disconnect affordance.
**Key tasks:** Audit all `catch` blocks, add error UI with retry buttons, test with airplane mode and invalid API keys. Add `RefreshControl` to balance and transaction list. Add `Clipboard.setString()` on address tap. Add `date-fns` `formatDistanceToNow()`. Add conditional color classes to ETH amounts.

### Phase Ordering Rationale

- **Polyfills before everything:** Import order is load-bearing. If discovered late, recovery requires rebuilding the dev client. Zero shortcuts here.
- **Connection before data:** ETH balance and transaction history are both gated on having a wallet address. The dependency is explicit and cannot be worked around.
- **Balance before transactions:** Validates the ethers.js + WalletConnect integration with a single RPC call before introducing the Etherscan REST API as a second external dependency.
- **Error handling last:** Retrofitting error states is significantly less error-prone than attempting to build them alongside initial feature code. The happy path must be confirmed before edge cases are hardened.
- **Polish bundled with error handling:** P2 features (pull-to-refresh, timestamps, color-coding) are all trivial and naturally belong in the same "polish" pass as error hardening.

### Research Flags

Phases needing deeper research during planning:
- **Phase 1 (Foundation):** EAS build profile configuration and `eas.json` setup may require project-specific research if the project has not used EAS before. The `babel.config.js` double-flag requirement (`unstable_transformImportMeta` + `unstable_transformProfile`) should be validated against the exact versions installed.
- **Phase 2 (Wallet Connection):** Deep-link round-trip behavior is device-specific and underdocumented. Physical device testing on both iOS and Android is mandatory — this cannot be validated in planning.

Phases with standard patterns (skip research-phase):
- **Phase 3 (Balance Display):** `ethers.JsonRpcProvider` + `provider.getBalance()` + `formatEther()` is a single well-documented call. No surprises.
- **Phase 4 (Transaction History):** Etherscan API v2 is a straightforward REST GET with documented parameters. The integration pattern is entirely standard.
- **Phase 5 (Polish):** `RefreshControl`, `Clipboard`, `date-fns`, conditional NativeWind classes — all fully standard React Native patterns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core recommendations verified against official Reown, ethers.js, and Etherscan docs. Version compatibility matrix for Expo SDK 54 + RN 0.81 confirmed. MEDIUM rather than HIGH due to rapid ecosystem churn — Reown package names changed once already (web3modal → appkit) and could change again. |
| Features | MEDIUM-HIGH | Table stakes derived from competitor analysis (MetaMask, Rainbow, Zerion) and official UX guides. Feature dependency graph is reliable. Deferral decisions (fiat conversion, tokens, multi-chain) are well-supported by complexity analysis. |
| Architecture | MEDIUM-HIGH | Bulletproof React feature-scoped structure is well-established. AppKit singleton pattern is the mandated Reown approach per official docs. Zustand-as-derived-cache pattern is community consensus with documented pitfalls. |
| Pitfalls | HIGH | All critical pitfalls verified against official sources (Reown docs, Hermes issue tracker, Etherscan deprecation notice, Expo Linking docs). Import order requirements confirmed against multiple independent sources. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Reown dashboard setup:** The Reown cloud.reown.com Project ID registration process and bundle ID whitelisting UI are not documented in detail in the research. This needs to be walked through during Phase 2 setup.
- **RPC provider selection (Alchemy vs. Infura vs. public):** STACK.md recommends Alchemy free tier but notes Infura is also acceptable. The choice affects `EXPO_PUBLIC_ALCHEMY_URL` configuration. Either works for v1 — pick one and document the choice in `config/env.ts`.
- **`apiClient` base URL handling for Etherscan:** The existing `src/lib/api-client.ts` is assumed to support a base URL override or a separate client instance for Etherscan calls (which go to `api.etherscan.io`, not the app's own backend). This needs to be confirmed and potentially extended during Phase 4.
- **Metro config `extraNodeModules` interaction with NativeWind:** The existing `metro.config.js` uses `withNativeWind`. Adding `extraNodeModules` entries must be done carefully to not override NativeWind's config. The exact merge pattern is documented in STACK.md but should be validated during Phase 1.

---

## Sources

### Primary (HIGH confidence)
- https://docs.reown.com/appkit/react-native/core/installation — AppKit Expo installation, polyfill requirements, import order
- https://docs.ethers.org/v6/cookbook/react-native/ — ethers v6 React Native quick-crypto registration
- https://docs.etherscan.io/etherscan-v2/get-an-addresss-full-transaction-history — Etherscan v2 txlist endpoint
- https://docs.etherscan.io/etherscan-v2/rate-limits — free tier limits (5 req/s, 100k/day)
- https://docs.etherscan.io/etherscan-v2/support/v2-faq — v1 deprecation after May 31, 2025
- https://github.com/margelo/react-native-quick-crypto — Expo Go incompatibility, performance benchmarks
- https://github.com/facebook/hermes/issues/510 — BigInt + unstable_transformProfile requirement
- https://docs.expo.dev/linking/into-your-app/ — scheme registration, createURL pattern

### Secondary (MEDIUM confidence)
- https://www.callstack.com/blog/build-modern-web3-dapps-on-ethereum-with-react-native-and-viem — viem + React Native patterns
- https://github.com/alan2207/bulletproof-react — Bulletproof React feature-scoped structure conventions
- https://medium.com/@alimuradbukhari12345/optimizing-wallet-creation-in-react-native-a-guide-using-react-native-quick-crypto-and-ethers-js-767695e57166 — quick-crypto + ethers performance benchmarks (verified against official ethers v6 docs)
- https://metamask.io/news/best-mobile-crypto-wallets-2026 — market context and user expectations
- https://www.cryptowisser.com/guides/crypto-wallet-ux-guide-2025/ — UX benchmarking

### Tertiary (LOW confidence)
- https://github.com/pmndrs/zustand/issues/394 — Zustand persist with AsyncStorage in React Native (community pattern, not official)
- https://community.metamask.io/t/walletconnect-v2-deep-linking-with-metamask-mobile/24657 — deep-link round-trip configuration (community, needs physical device validation)

---

*Research completed: 2026-04-01*
*Ready for roadmap: yes*
