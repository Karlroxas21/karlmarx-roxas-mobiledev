# Pitfalls Research

**Domain:** Ethereum wallet integration in Expo SDK 54 / React Native 0.81
**Researched:** 2026-04-01
**Confidence:** HIGH (verified against official docs: Reown, Etherscan, MetaMask, Expo, Hermes)

---

## Critical Pitfalls

### Pitfall 1: Node.js Polyfills Missing — App Crashes at Runtime

**What goes wrong:**
Web3 libraries (ethers.js, WalletConnect) depend on Node.js built-ins (`crypto`, `stream`, `buffer`, `process`) that do not exist in the React Native JS environment. Without polyfills, the app crashes on launch or throws inscrutable errors like `"crypto is not defined"` or `"TextEncoder is not defined"` before any UI renders.

**Why it happens:**
These libraries were designed for browser or Node.js environments first. Metro bundler does not automatically resolve Node.js core modules — it silently skips them. Developers often install the library, import it, and assume it works because no build-time error appears, only discovering the problem at runtime on device.

**How to avoid:**

1. Install polyfill packages: `react-native-get-random-values`, `readable-stream`, `crypto-browserify`, `buffer`, `process`.
2. Configure `metro.config.js` to map Node.js module names to the polyfill packages via `resolver.extraNodeModules`.
3. Import `react-native-get-random-values` as the **first line** of your entry file (before any other import). Order matters — if another library imports `crypto` first the polyfill won't take effect.
4. For Expo SDK 54+, add `@walletconnect/react-native-compat` as the **very first import** in your WalletConnect config file.

```js
// index.js — MUST be first
import 'react-native-get-random-values';
import '@walletconnect/react-native-compat'; // if using WalletConnect
// all other imports below
```

**Warning signs:**

- Any "X is not defined" crash on app startup
- `ReferenceError: Can't find variable: crypto`
- `TextEncoder is not defined`
- App works in Expo Go but crashes in dev build

**Phase to address:**
Phase 1 (Project setup / foundation) — polyfills must be wired before any blockchain code is written.

---

### Pitfall 2: Expo Go Blocks All Native Crypto — Development Is Misleading

**What goes wrong:**
Any library that uses native C/C++ crypto (e.g., `react-native-quick-crypto`, `@coinbase/wallet-mobile-sdk`) will silently fail or crash in Expo Go. Wallet detection on iOS also fails in Expo Go because the `LSApplicationQueriesSchemes` entries in `Info.plist` are not present in the App Store Expo Go binary. Developers waste hours debugging behavior that only exists inside Expo Go's sandboxed environment.

**Why it happens:**
Expo Go is a pre-compiled app — it cannot include arbitrary native modules. The managed workflow looks like it supports these libraries (they install without error) but the native layer is absent.

**How to avoid:**

- Use a **custom development build** (`npx expo prebuild && eas build --profile development`) from day one for any phase that touches WalletConnect, MetaMask SDK, or crypto libraries.
- Never use Expo Go as the test target for wallet connection flows.
- The project constraint "no ejecting" is fine — `expo prebuild` is not ejecting. It generates native code that EAS Build compiles while Expo's managed tooling is preserved.

**Warning signs:**

- Wallet detection returns zero installed wallets on iOS simulator
- Native module NativeModule.X is null errors
- `react-native-quick-crypto` crashes at import in Expo Go

**Phase to address:**
Phase 1 (setup) — configure EAS Build and create the first development build before writing any integration code.

---

### Pitfall 3: WalletConnect Deep Link Loop / App Never Returns After Wallet Approval

**What goes wrong:**
The user taps "Connect" → MetaMask or another wallet opens → user approves → wallet tries to redirect back to your app → the app either does not receive the callback, opens a new instance, or routes to the wrong screen. The session appears to be established in the wallet but the app shows "connecting…" indefinitely.

**Why it happens:**
Two root causes:

1. The `redirectUrl` (your app's deep link scheme) is not registered or is registered incorrectly in `app.json` under `expo.scheme`. Expo Router requires the scheme to match exactly.
2. On Android, deep links need `intentFilters` in the manifest. On iOS, the `LSApplicationQueriesSchemes` list must include the wallet's scheme so the system knows your app can open it.

**How to avoid:**

- Set a unique scheme in `app.json`: `"scheme": "ethereumwalletviewer"` (no capitals, no spaces).
- Generate `redirectUrl` with `expo-linking`: `Linking.createURL('/')` — never hardcode it.
- Confirm Android `intentFilters` and iOS `associatedDomains` (if using universal links) are in `app.json`.
- Test the full round-trip on a real device, not the simulator — wallet apps are not available on simulators.
- With Expo Router, set `initialRouteName` on the root layout so back navigation after deep-link return lands on the wallet screen, not a blank stack.

**Warning signs:**

- `Linking.getInitialURL()` returns null after MetaMask redirect
- Session established in wallet, not in app
- App opens to root screen (ignoring route state) after wallet redirect

**Phase to address:**
Phase 2 (wallet connection) — must be verified on a physical device with MetaMask installed.

---

### Pitfall 4: Etherscan Free-Tier Rate Limits Break the Transaction History Screen

**What goes wrong:**
The free Etherscan API allows **5 calls per second** maximum, and without a valid API key the limit drops to **1 call per 5 seconds**. If the app fires multiple balance + transaction history requests on mount (common with `useEffect` in React), requests start returning `{"status":"0","message":"NOTOK","result":"Max rate limit reached"}`. The UI silently shows no data or an error state, and developers may incorrectly conclude the address lookup logic is broken.

**Why it happens:**
Two simultaneous `useEffect` hooks (one for balance, one for transactions) both fire on mount. Without request deduplication or caching, every navigation back to the wallet screen repeats both calls. Rate limit errors look identical to "address not found" errors in Etherscan's response shape (`status: "0"`), so error handling swallows the real cause.

**How to avoid:**

- Sequence requests: fetch balance first, then transactions (avoids parallel burst).
- Cache responses with a short TTL (60 seconds) using Zustand's state — do not refetch if data is fresh.
- Parse the Etherscan `result` string when `status === "0"` and surface rate limit errors distinctly from empty-address errors.
- Store the Etherscan API key in an environment variable (`.env`) loaded via `expo-constants` — never hardcode. An API key raises the limit to 5 req/s and 100,000 req/day.
- Note: Etherscan API v1 is **deprecated after May 31, 2025** — use API v2 (`https://api.etherscan.io/v2/api`).

**Warning signs:**

- Intermittent empty transaction list that fixes itself on page reload
- Console shows `result: "Max rate limit reached"` or `result: "Invalid API Key"`
- Works in development, fails after rapid navigation in QA

**Phase to address:**
Phase 3 (blockchain data display) — implement caching and error classification before wiring API calls to the UI.

---

### Pitfall 5: ethers.js v6 BigInt Incompatibility on Older Hermes Builds

**What goes wrong:**
ethers.js v6 replaced its custom `BigNumber` class with native JavaScript `BigInt`. Hermes (the React Native JS engine) added BigInt support, but it requires `unstable_transformProfile: 'hermes-stable'` in `babel.config.js` or Hermes transforms are not enabled. Without this flag, `BigInt` literals in the bundled ethers code produce a `SyntaxError: Unexpected identifier` at parse time, and the app crashes before rendering.

**Why it happens:**
ethers v6 is the current major version, and new projects often install it without realising the Babel config needs updating for Hermes. The flag name (`unstable_`) misleads developers into thinking it is optional or experimental.

**How to avoid:**

- If using ethers v6, set `unstable_transformProfile: 'hermes-stable'` in `babel.config.js`.
- Alternatively, use ethers v5 (still maintained) which uses the custom `BigNumber` class and is fully compatible with current Hermes without config changes.
- Do not mix v5 and v6 imports — they are mutually incompatible.
- The project research phase should decide v5 vs v6 and document the exact Babel config required.

**Warning signs:**

- `SyntaxError: Unexpected identifier 'n'` in bundled output
- App works on web/Node but crashes on Android/iOS device
- Error stack traces point inside `ethers/lib/` paths

**Phase to address:**
Phase 1 (setup) — lock ethers version and validate Babel config before writing any contract/provider code.

---

### Pitfall 6: WalletConnect Project ID Exposed in App Bundle

**What goes wrong:**
WalletConnect / Reown AppKit requires a `projectId` at initialization. Developers store this in an `.env` file as `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID`, which Expo automatically exposes in the JS bundle. Anyone who reverse-engineers the `.apk` or `.ipa` can extract the Project ID and use it to make requests that count against your quota or link their sessions to your project.

**Why it happens:**
There is no server-side layer in a read-only wallet viewer — the Project ID must be in the client. This is documented by Reown as "the Project ID will be exposed in the client." Developers are often unaware that `EXPO_PUBLIC_` variables are embedded in the bundle in plaintext.

**How to avoid:**

- Accept the exposure as a known, documented limitation — Reown's recommendation is to lock allowed domains/bundle IDs in the Reown dashboard, not to hide the key.
- In the Reown dashboard, whitelist your iOS bundle ID and Android package name so the Project ID cannot be used from unauthorized apps.
- Do not store private keys or signing secrets the same way — the Project ID is a rate-limiting credential, not a private key.

**Warning signs:**

- Project ID usage spikes unexpectedly in Reown dashboard
- Session requests from unrecognised bundle IDs

**Phase to address:**
Phase 2 (wallet connection) — configure domain/bundle restrictions in Reown dashboard before shipping to TestFlight or Play Store internal test.

---

## Technical Debt Patterns

| Shortcut                                      | Immediate Benefit                | Long-term Cost                                                           | When Acceptable                              |
| --------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------- |
| Use `any` for ethers.js provider/signer types | Faster initial wiring            | Type errors propagate silently into balance/tx parsing; hard to refactor | Never — use the typed interfaces from ethers |
| Hardcode Etherscan API key in source          | One less env var to manage       | Key leaks via version control; rate-limits shared across all builds      | Never                                        |
| Skip polyfill order (import at random)        | No visible short-term difference | Random crashes in production builds that work in development             | Never — order is load-bearing                |
| Use Expo Go for all WalletConnect testing     | Faster iteration loop            | Hides real deep-link and wallet-detection bugs until very late           | Never for wallet connection features         |
| Poll Etherscan every 5 seconds                | Live-feeling balance updates     | Hits rate limit ceiling immediately; 5 req/s is the total budget         | Never — use event-driven or manual refresh   |
| Fetch v1 Etherscan API URLs                   | Existing code examples use v1    | v1 deprecated after May 31 2025; will break in production                | Never — use v2 API from the start            |

---

## Integration Gotchas

| Integration                  | Common Mistake                                                                          | Correct Approach                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| WalletConnect / Reown AppKit | Import `@walletconnect/react-native-compat` after other imports                         | It **must** be the first import in the config file — it patches globals                                        |
| WalletConnect / Reown AppKit | Forget `babel.config.js` `unstable_transformImportMeta: true` for valtio (Expo SDK 53+) | Add to `babel.config.js` or modal state breaks silently                                                        |
| MetaMask SDK                 | Use `window.ethereum` pattern copied from web examples                                  | React Native has no `window` — use `useSDK()` hook from `@metamask/sdk-react`                                  |
| Etherscan API                | Check only `status === "0"` for errors                                                  | Parse `result` string too — `"Max rate limit reached"` and `"No transactions found"` both return `status: "0"` |
| Etherscan API                | Call v1 API endpoint (`/api?module=...`)                                                | Migrate to v2 (`/v2/api?chainid=1&...`) — v1 disabled after May 31, 2025                                       |
| Infura / Alchemy RPC         | Expose RPC URL with API key directly in app                                             | Route RPC calls through a thin proxy backend, or use public endpoints for read-only mainnet data               |
| `expo-linking`               | Hardcode `myapp://` scheme as redirect URL                                              | Use `Linking.createURL('/')` — it adapts between development (exp+tunnel) and production (custom scheme)       |
| AsyncStorage                 | Skip configuring storage in AppKit provider                                             | Session won't persist across app restarts without `storageOptions: { asyncStorage: AsyncStorage }`             |

---

## Performance Traps

| Trap                                              | Symptoms                                                 | Prevention                                                                           | When It Breaks                                             |
| ------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Calling Etherscan on every React re-render        | Rapid rate limit errors; slow UI                         | Wrap calls in `useEffect` with dependency array; add Zustand caching with TTL        | Immediately on any address with active state               |
| Subscribing to new block events without cleanup   | Memory leak; duplicate events fire on re-render          | Return cleanup function from `useEffect` that calls `provider.off('block', handler)` | After ~10 navigations to wallet screen                     |
| Parsing raw Wei values as floats                  | Silent precision loss for wallets holding fractional ETH | Use `formatEther()` from ethers.js — never `Number(balanceInWei) / 1e18`             | Any balance > `Number.MAX_SAFE_INTEGER / 1e18` (~9007 ETH) |
| Loading all 10,000 Etherscan transactions at once | Slow initial load; possible OOM on low-end Android       | Fetch only the last 10 transactions using `page=1&offset=10&sort=desc`               | Any address with >1000 transactions                        |

---

## Security Mistakes

| Mistake                                                                 | Risk                                                                           | Prevention                                                                                                        |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Storing a wallet private key in AsyncStorage                            | Private key readable by any app with storage access; stolen key = stolen funds | This app is read-only — never request or store private keys under any circumstances                               |
| Logging wallet addresses or transaction hashes to console in production | On-device log capture leaks financial data                                     | Remove all `console.log` in production builds; use Sentry with PII scrubbing                                      |
| Trusting balance values returned from an unverified RPC endpoint        | Man-in-the-middle can return falsified balances                                | Use well-known providers (Infura, Alchemy, public Ethereum nodes) over HTTPS; verify RPC URL is not user-supplied |
| Skipping Reown dashboard bundle ID whitelisting                         | Project ID abused to inflate quota                                             | Set allowed bundle IDs in Reown dashboard before any TestFlight/Play Store release                                |

---

## UX Pitfalls

| Pitfall                                                   | User Impact                                       | Better Approach                                                                        |
| --------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| No loading state while fetching balance                   | Screen appears blank/broken for 1–3 seconds       | Show skeleton loader immediately; populate when data arrives                           |
| "Error" message with no retry affordance                  | User is stuck; must kill and relaunch app         | Every error state needs a "Retry" button that re-fires the failed fetch                |
| Showing raw Wei balance                                   | "1500000000000000000 ETH" is unreadable           | Always format with `formatEther()` and display 4 decimal places max                    |
| No "wallet not installed" message when MetaMask is absent | Connect button appears to do nothing on first tap | Detect whether MetaMask is installed; if not, show deep link to App Store / Play Store |
| Showing wallet address without truncation                 | Long hex address wraps and breaks layout          | Truncate to `0x1234…abcd` format; make it tappable to copy full address                |
| No disconnect affordance                                  | User cannot remove wallet from app                | Always provide a clearly labelled "Disconnect" button in the wallet screen             |

---

## "Looks Done But Isn't" Checklist

- [ ] **Polyfill setup:** App launches without "X is not defined" errors on a fresh install on both iOS and Android device (not simulator).
- [ ] **WalletConnect deep linking:** After approving connection in MetaMask, the app returns to the correct screen — tested on a physical iOS and Android device.
- [ ] **Rate limit handling:** Etherscan calls when status=0 distinguish between "rate limited", "invalid key", and "no transactions found" — not all lumped into one generic error.
- [ ] **Etherscan v2:** All API calls use `https://api.etherscan.io/v2/api?chainid=1` format, not the deprecated v1 endpoint.
- [ ] **Session persistence:** After closing and reopening the app, a previously connected wallet address is restored without prompting re-connection.
- [ ] **BigInt / Babel config:** ethers.js v6 used → `unstable_transformProfile: 'hermes-stable'` set in `babel.config.js`. OR ethers.js v5 used → this flag is not needed.
- [ ] **Custom dev build:** CI builds use EAS development profile, not Expo Go, for integration testing.
- [ ] **Reown bundle whitelist:** iOS bundle ID and Android package name are entered in Reown dashboard before any external testing.
- [ ] **Error boundary:** A React error boundary wraps the wallet feature tree so a failed provider import does not crash the entire app.

---

## Recovery Strategies

| Pitfall                              | Recovery Cost | Recovery Steps                                                                                      |
| ------------------------------------ | ------------- | --------------------------------------------------------------------------------------------------- |
| Missing polyfills discovered late    | MEDIUM        | Add polyfill packages, update metro.config.js, fix import order in entry file, rebuild dev client   |
| Deep link loop discovered in QA      | MEDIUM        | Audit `app.json` scheme, regenerate with `expo prebuild`, retest full round-trip on physical device |
| Etherscan v1 deprecation breakage    | LOW           | Update base URL from `/api` to `/v2/api` with `chainid=1` param; no other changes needed            |
| ethers v6 BigInt crash in production | LOW-MEDIUM    | Add `unstable_transformProfile: 'hermes-stable'` to `babel.config.js`, clear Metro cache, rebuild   |
| Rate limit hammering in production   | LOW           | Add Zustand cache with 60s TTL, sequence requests, restart — no infrastructure changes needed       |
| WalletConnect Project ID abused      | LOW           | Rotate Project ID in Reown dashboard (takes minutes), update env variable, redeploy                 |

---

## Pitfall-to-Phase Mapping

| Pitfall                       | Prevention Phase            | Verification                                                                                 |
| ----------------------------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| Node.js polyfills missing     | Phase 1: Foundation & Setup | `console.log(typeof crypto)` returns "object" in a device build                              |
| Expo Go masking native issues | Phase 1: Foundation & Setup | All testing from this point forward uses EAS dev build                                       |
| ethers.js v6 BigInt / Babel   | Phase 1: Foundation & Setup | App launches without SyntaxError on device; ethers.parseEther() returns a BigInt             |
| WalletConnect deep link loop  | Phase 2: Wallet Connection  | Full connect → approve → return flow tested on physical iOS + Android                        |
| Reown Project ID exposure     | Phase 2: Wallet Connection  | Reown dashboard shows bundle ID whitelist set before TestFlight                              |
| Etherscan rate limiting       | Phase 3: Blockchain Data    | Navigating wallet screen 5 times quickly does not trigger NOTOK response                     |
| Etherscan v1 deprecation      | Phase 3: Blockchain Data    | All fetch calls use v2 API URL format                                                        |
| Session persistence missing   | Phase 2–3 boundary          | Kill app, reopen — wallet address is restored without reconnect prompt                       |
| Precision loss on ETH balance | Phase 3: Blockchain Data    | Test with address holding fractional ETH; value matches Etherscan web UI to 4 decimal places |

---

## Sources

- [Reown AppKit React Native Installation](https://docs.reown.com/appkit/react-native/core/installation) — polyfill import order, Expo Go limitations, valtio Babel config
- [MetaMask Metro Bundler Polyfill Troubleshooting](https://docs.metamask.io/embedded-wallets/troubleshooting/metro-issues/) — extraNodeModules configuration
- [Etherscan API Rate Limits & Errors](https://info.etherscan.com/api-return-errors/) — 5 req/s free tier, error response format
- [Etherscan API v2 FAQ](https://docs.etherscan.io/etherscan-v2/support/v2-faq) — v1 deprecation after May 31, 2025
- [react-native-quick-crypto GitHub](https://github.com/margelo/react-native-quick-crypto) — Expo Go incompatibility, requires prebuild
- [Hermes BigInt Issue #510](https://github.com/facebook/hermes/issues/510) — BigInt support in Hermes, unstable_transformProfile requirement
- [ethers.js v6 Migration Guide](https://docs.ethers.org/v6/migrating/) — BigNumber → BigInt breaking change
- [WalletConnect React Native Deep Linking](https://community.metamask.io/t/walletconnect-v2-deep-linking-with-metamask-mobile/24657) — redirectUrl and scheme configuration
- [Expo Linking Documentation](https://docs.expo.dev/linking/into-your-app/) — scheme registration, createURL pattern
- [Callstack: Best DX for React Native Web3 dApps](https://www.callstack.com/blog/best-dx-for-react-native-web3-dapps-with-web3modal-and-wagmi) — ecosystem overview and recommendations
- [Request Network rn-expo-support](https://github.com/RequestNetwork/rn-expo-support) — real-world polyfill setup for Expo + blockchain

---

_Pitfalls research for: Ethereum wallet integration — Expo SDK 54 / React Native 0.81_
_Researched: 2026-04-01_
