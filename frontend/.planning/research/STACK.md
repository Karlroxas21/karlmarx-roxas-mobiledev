# Stack Research

**Domain:** Ethereum wallet viewer — Expo/React Native mobile app
**Researched:** 2026-04-01
**Confidence:** MEDIUM (core recommendations verified with official docs; some version specifics LOW confidence due to rapid ecosystem churn)

---

## Existing Stack (Do Not Touch)

Already in `package.json` — these are constraints, not decisions:

| Package | Version | Notes |
|---------|---------|-------|
| expo | ~54.0.33 | SDK 54, managed workflow |
| react-native | 0.81.5 | Hermes engine |
| nativewind | ^4.2.3 | Tailwind styling |
| zustand | ^5.0.12 | State management |
| expo-router | ~6.0.23 | File-based routing |
| react-native-safe-area-context | ~5.6.0 | Already present — no reinstall needed |

---

## Recommended Stack Additions

### Core Blockchain Libraries

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| ethers | ^6.x | Ethereum provider, balance fetching, ABI encoding | Actively maintained, typed, smaller than web3.js, v6 has native crypto registration API that removes the pure-JS fallback penalty. The ethers.js docs explicitly document React Native setup for v6. |
| react-native-quick-crypto | ^0.7.x | Native C++ crypto for ethers.js | Without this, `ethers.Wallet.createRandom()` takes 33s on an iPhone 11 Pro. With it: under 1s. Register it with ethers' plugin API to replace the slow JS fallback. Mandatory for usable performance. |

### WalletConnect / Wallet Connection

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @reown/appkit-react-native | ^2.x | Core AppKit UI + WalletConnect v2 session management | Official WalletConnect successor (Reown). Handles deeplink routing to MetaMask Mobile, QR code fallback, and session persistence. Expo is explicitly supported with SDK 53+. |
| @reown/appkit-ethers-react-native | ^2.x | Ethers.js adapter for AppKit | Bridges AppKit's wallet connection to an ethers `BrowserProvider`-compatible interface. Use this over the wagmi adapter since the project has no wagmi dependency. |
| @walletconnect/react-native-compat | latest | Polyfills for WalletConnect internals | Must be imported as the very first line of the app entry point. Provides `URL`, `TextEncoder`, `Buffer`, and event emitter shims that WalletConnect's core library expects from Node/browser but that Hermes doesn't provide. |
| react-native-get-random-values | ^1.11.x | Secure randomness for crypto ops | Required by ethers.js before `@ethersproject/shims`. Without it, private key generation is insecure. Import before all other crypto imports. |

### Supporting Infrastructure

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-native-async-storage/async-storage | ^2.x | Persist WalletConnect session | Required by AppKit to save wallet sessions across app restarts. |
| @react-native-community/netinfo | ^11.x | Network status detection | Required by AppKit to detect connectivity changes and pause/resume WalletConnect connections. |
| expo-application | ~6.x | App metadata (name, version) | Required by AppKit for WalletConnect metadata sent to wallets. |
| react-native-svg | ^15.x | SVG rendering for AppKit modal UI | Required by AppKit — the wallet list and QR code use SVG components. Already compatible with Expo SDK 54. |
| axios | ^1.x | HTTP client for Etherscan API | Fetch transaction history from Etherscan v2 API. Prefer over raw `fetch` for error handling, timeout config, and interceptors. Not required if fetch is acceptable. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| babel-preset-expo + `unstable_transformImportMeta: true` | Required for valtio (AppKit's state library) to work under Expo | Must create `babel.config.js` at project root — Expo SDK 54 does not generate it by default. This is a **hard requirement**; without it AppKit will fail with import.meta errors at runtime. |
| EAS Build (eas-cli) | Production builds with native modules | `react-native-quick-crypto` and `react-native-svg` require native code — **Expo Go will not work**. You must use a Development Build (`eas build --profile development`) or run via `expo run:ios` / `expo run:android`. |

---

## Installation

```bash
# Core WalletConnect + AppKit (Expo-aware install preserves version constraints)
npx expo install \
  @reown/appkit-react-native \
  @reown/appkit-ethers-react-native \
  @react-native-async-storage/async-storage \
  react-native-get-random-values \
  react-native-svg \
  @react-native-community/netinfo \
  @walletconnect/react-native-compat \
  expo-application

# Ethers.js v6 + native crypto
npx expo install ethers react-native-quick-crypto

# Optional: HTTP client for Etherscan API calls
npm install axios
```

### Required babel.config.js (create at project root)

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
  };
};
```

### Required app entry point import order

In `index.js` or the first file loaded by Expo Router (e.g., `src/app/_layout.tsx` before any other imports):

```typescript
// 1. WalletConnect compat shims — MUST be first
import "@walletconnect/react-native-compat";

// 2. Secure randomness
import "react-native-get-random-values";

// 3. Ethers shims (v5 package, still needed for v6 in React Native)
import "@ethersproject/shims";
```

### Register react-native-quick-crypto with ethers v6

```typescript
import { ethers } from "ethers";
import crypto from "react-native-quick-crypto";

ethers.randomBytes.register((length) => {
  return new Uint8Array(crypto.randomBytes(length));
});
ethers.computeHmac.register((algo, key, data) => {
  return crypto.createHmac(algo.toLowerCase(), key).update(data).digest();
});
ethers.pbkdf2.register((passwd, salt, iter, keylen, algo) => {
  return crypto.pbkdf2Sync(passwd, salt, iter, keylen, algo.toLowerCase());
});
ethers.sha256.register((data) => {
  return crypto.createHash("sha256").update(data).digest();
});
ethers.sha512.register((data) => {
  return crypto.createHash("sha512").update(data).digest();
});
```

### Metro config update (add resolver extraNodeModules)

The existing `metro.config.js` only has NativeWind. Add Node module resolution for `crypto`, `stream`, and `buffer` which WalletConnect internals reference:

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  crypto: require.resolve("react-native-quick-crypto"),
  stream: require.resolve("stream-browserify"),
  buffer: require.resolve("@craftzdog/react-native-buffer"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
```

Additional packages for metro aliases:
```bash
npm install stream-browserify @craftzdog/react-native-buffer
```

---

## Transaction History: Use Etherscan API v2, Not ethers getLogs

ethers.js v6 **dropped `provider.getHistory(address)`** (which existed in v5). There is no built-in method to list all transactions for an address in v6. `provider.getLogs()` only returns event logs, not normal ETH transfers.

**Use Etherscan API v2 directly:**

```
GET https://api.etherscan.io/v2/api
  ?chainid=1
  &module=account
  &action=txlist
  &address=0x...
  &startblock=0
  &endblock=99999999
  &page=1
  &offset=10
  &sort=desc
  &apikey=YOUR_KEY
```

- Free tier: 5 calls/second, 100,000 calls/day, max 1,000 records returned per call
- v1 API was deprecated May 31, 2025 — use v2 endpoints only
- No npm SDK required — call via `axios` or `fetch`

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| ethers v6 | web3.js v4 | Never for this project. web3.js requires a substantially larger polyfill surface (it pulls in Node.js modules more aggressively), has a larger bundle footprint, and community momentum has shifted to ethers/viem for new projects. |
| ethers v6 | viem | Use viem if adding wagmi for advanced multi-chain state management. For a read-only viewer app, viem adds complexity with no benefit. viem also requires TextEncoder polyfill separately. |
| @reown/appkit-ethers-react-native | @metamask/sdk-react-native | MetaMask SDK React Native (`@metamask/sdk-react-native`) only connects to MetaMask — it cannot handle WalletConnect sessions for other wallets. AppKit supports MetaMask AND any WalletConnect-compatible wallet (Rainbow, Trust, Coinbase Wallet, etc.) from one integration. |
| @reown/appkit-ethers-react-native | @reown/appkit-wagmi-react-native | Use the wagmi adapter if wagmi is already in your stack. For this project it is not — adding wagmi + viem + @tanstack/react-query as peer deps for a read-only app is unnecessary weight. |
| react-native-quick-crypto | @ethersproject/shims only | The ethersproject shims use pure-JS crypto fallback (slow). react-native-quick-crypto is C++ JSI and is 30-100x faster. The performance gap is perceptible on real devices. |
| Etherscan API v2 | Alchemy SDK | Alchemy SDK is not optimized for React Native and requires a separate account + API key with different rate limits. Etherscan is the canonical source for transaction history and has a clean REST API that needs only `fetch`/`axios`. Use Alchemy if you need WebSocket subscriptions or advanced NFT APIs in a later phase. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| web3.js | Node.js-first design requires heavy polyfills (`crypto`, `http`, `https`, `os`, `net`, `tls`). Bundle adds ~300KB+. Active community has moved on. | ethers v6 |
| @ethersproject/shims alone (without quick-crypto) | Pure-JS crypto fallback causes 30+ second wallet operations on real devices. Technically works but UX is broken. | react-native-quick-crypto registered via ethers v6 plugin API |
| Expo Go for development | Expo Go does not support native modules (`react-native-quick-crypto`, `react-native-svg` with native renderer, `react-native-get-random-values`). WalletConnect deeplinks also require custom URL scheme registration unavailable in Expo Go. | EAS Development Build (`eas build --profile development`) |
| ethers v5 `provider.getHistory()` | Method was removed in v6 and relied on Etherscan under the hood anyway. Don't use it even if downgrading to v5 — it's undocumented behavior. | Etherscan API v2 `txlist` endpoint directly |
| crypto-browserify | Pure-JS crypto replacement. Slow and adds ~200KB to bundle. The community has deprecated its use in favor of react-native-quick-crypto. | react-native-quick-crypto |
| @web3modal/ethers-react-native | Old package name (web3modal era). Reown rebranded the packages. This package may still work but receives no new features or bug fixes. | @reown/appkit-ethers-react-native |

---

## Stack Patterns by Variant

**For wallet connection only (no read operations):**
- Use `@reown/appkit-react-native` + `@reown/appkit-ethers-react-native`
- Skip `react-native-quick-crypto` registration (no local key ops needed)
- ethers `BrowserProvider` wrapping the AppKit provider handles balance fetching

**For balance + transaction history (this project):**
- Full stack as above
- Add Etherscan API v2 calls for transaction history (ethers cannot enumerate txs natively)
- Store Etherscan API key in Expo's `extra` config (not hardcoded)

**If ejecting or using Bare workflow later:**
- No changes to this stack required
- All packages listed are compatible with Bare workflow

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @reown/appkit-react-native ^2.x | Expo SDK 53+ | Babel `unstable_transformImportMeta` required for SDK 53+. SDK 54 (this project) confirmed compatible. |
| react-native-quick-crypto ^0.7.x | react-native 0.71+ | This project uses RN 0.81.5 — compatible. Requires native build (no Expo Go). |
| ethers ^6.x | react-native-quick-crypto ^0.7.x | Register native functions before first ethers call. No conflicts with ethers v6 module structure. |
| react-native-svg ^15.x | react-native 0.73+ | Project uses RN 0.81.5 — compatible. |
| @react-native-async-storage/async-storage ^2.x | Expo SDK 50+ | v2 requires Expo SDK 50+. SDK 54 confirmed. |
| @ethersproject/shims (v5) | ethers v6 | The shims package is v5-era but still required for Hermes TextEncoder/URL compatibility when used before ethers v6 imports. |

---

## Sources

- https://docs.reown.com/appkit/react-native/core/installation — Reown AppKit Expo installation (HIGH confidence — official docs)
- https://docs.ethers.org/v6/cookbook/react-native/ — ethers v6 React Native quick-crypto registration (HIGH confidence — official docs)
- https://docs.ethers.org/v5/cookbook/react-native/ — ethers shims import order (HIGH confidence — official docs)
- https://docs.etherscan.io/etherscan-v2/get-an-addresss-full-transaction-history — Etherscan v2 txlist endpoint (HIGH confidence — official docs)
- https://docs.etherscan.io/etherscan-v2/rate-limits — Etherscan free tier limits: 5 req/s, 100k/day (HIGH confidence)
- https://github.com/margelo/react-native-quick-crypto — react-native-quick-crypto performance data (HIGH confidence — official repo)
- https://www.callstack.com/blog/build-modern-web3-dapps-on-ethereum-with-react-native-and-viem — viem + RN patterns (MEDIUM confidence — Callstack blog)
- https://medium.com/@alimuradbukhari12345/optimizing-wallet-creation-in-react-native-a-guide-using-react-native-quick-crypto-and-ethers-js-767695e57166 — quick-crypto + ethers perf benchmarks (MEDIUM confidence — community article, verified against ethers v6 docs)
- https://github.com/ethers-io/ethers.js/discussions/3905 — ethers v6 React Native installation discussion (MEDIUM confidence — community, official maintainer responses)

---

*Stack research for: Ethereum wallet viewer (Expo SDK 54 / React Native 0.81)*
*Researched: 2026-04-01*
