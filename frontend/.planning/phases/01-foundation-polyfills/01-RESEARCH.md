# Phase 1: Foundation & Polyfills - Research

**Researched:** 2026-04-01
**Domain:** Expo SDK 54 + React Native 0.81 polyfill wiring, Babel/Metro config, EAS local Android builds, Reown AppKit bootstrap, environment variables
**Confidence:** HIGH (all critical claims verified against official docs or official GitHub examples)

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Environment Variables:** Extend existing `config/env.ts` with three new vars: Reown Project ID, Etherscan API key, Infura RPC URL. Use standard `EXPO_PUBLIC_` prefix — no expo-dotenv. Validate all required env vars at startup; throw clear error if any are missing. Commit `.env.example` listing all required var names with placeholder values. Placeholders for now — real keys added later. Default network is Ethereum mainnet.
- **EAS Build Target:** Android only for development. Physical device (not emulator) for testing. Local builds using `npx expo run:android` — no EAS cloud builds. User is first-time with EAS/local builds — plan must include setup guidance.
- **RPC Provider:** Infura for Ethereum mainnet RPC. User does not have an Infura account yet — plan must note this as an external dependency (sign up at infura.io). RPC URL format: `https://mainnet.infura.io/v3/{PROJECT_ID}`.
- **AppKit Bootstrap:** Initialize Reown AppKit singleton in `lib/appkit.ts`. `@walletconnect/react-native-compat` must be the absolute first import in `lib/appkit.ts`. Integrate AppKit provider into existing `providers/app-provider.tsx` (stack inside the existing fragment). Do NOT create a separate wallet-provider file.
- **Validation:** Include a temporary smoke test screen on the index route displaying AppKit initialization status (OK / Error) and all three env var values (masked for keys). This screen will be replaced in Phase 2.

### Claude's Discretion

- Exact polyfill import order beyond the documented `@walletconnect/react-native-compat` first requirement
- Babel config flags and Metro resolver setup
- `react-native-quick-crypto` registration approach
- Any additional polyfills needed (Buffer, TextEncoder, etc.)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID       | Description                                                                            | Research Support                                                                                                                                                                         |
| -------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FOUND-01 | App bootstraps with correct polyfill import order (WalletConnect compat, crypto shims) | Import order verified against official Reown docs and appkit-expo-wagmi reference example. `@walletconnect/react-native-compat` must be first; `react-native-get-random-values` second.  |
| FOUND-02 | EAS development build configured and runnable on device/emulator                       | `npx expo run:android` documented as the correct command for local builds. Requires Android Studio + JDK 17 + USB debugging. No `eas.json` required for local `expo run:android` builds. |
| FOUND-03 | Environment variables configured (Reown Project ID, Etherscan API key, RPC URL)        | Standard Expo `EXPO_PUBLIC_` pattern already in use in `config/env.ts`. Extending with three new vars is a direct extension of existing pattern.                                         |

</phase_requirements>

---

## Summary

Phase 1 is entirely infrastructure — no user-facing features. Three independent work streams compose the phase: (1) package installation + polyfill wiring, (2) Babel + Metro config creation, and (3) environment variable extension + AppKit singleton + smoke test screen. All three must complete before Phase 2 can begin.

The polyfill setup is the highest-risk part. Reown AppKit's WalletConnect internals depend on browser/Node globals (`TextEncoder`, `URL`, `Buffer`, `crypto`) that Hermes does not provide. The `@walletconnect/react-native-compat` shim package patches these globals — but only if it is the first import executed. If anything imports WalletConnect's internal packages before this shim runs, the globals are missing and the app crashes with cryptic "X is not defined" errors. Import order is load-bearing, not stylistic.

The Babel configuration requires two flags that are both load-bearing: `unstable_transformImportMeta: true` is required for AppKit's internal `valtio` state library (confirmed by official Reown docs and the `appkit-expo-wagmi` reference example). `unstable_transformProfile: 'hermes-stable'` enables Hermes-native transforms including BigInt support required by ethers.js v6. Neither flag name is intuitive and both carry `unstable_` prefixes that mislead developers into treating them as optional. Both are mandatory for this stack.

The local Android build (`npx expo run:android`) is the correct approach per the locked decision. It requires a one-time Android Studio + JDK 17 setup with USB debugging enabled on the device. The first build will take 5–15 minutes due to Gradle dependency resolution and native compilation. Subsequent builds are faster.

**Primary recommendation:** Wire polyfills and create `babel.config.js` first. These are the two load-bearing configuration changes — everything else can be tested once they are in place.

---

## Standard Stack

### Core (Phase 1 Packages)

| Library                              | Version | Purpose                                                                   | Why Standard                                                                                                                                   |
| ------------------------------------ | ------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `@walletconnect/react-native-compat` | latest  | Patches `TextEncoder`, `URL`, `Buffer`, `EventEmitter` globals for Hermes | Required by Reown AppKit — must be the absolute first import. Without it, WalletConnect internals crash at startup.                            |
| `react-native-get-random-values`     | ^1.11.x | Secure randomness shim for Hermes                                         | Required before any crypto operations. Ethers.js and WalletConnect both require a secure random source.                                        |
| `@reown/appkit-react-native`         | ^2.x    | WalletConnect v2 wallet connection modal + session management             | Official Reown AppKit for React Native. Expo SDK 53+ explicitly supported.                                                                     |
| `@reown/appkit-ethers-react-native`  | ^2.x    | Ethers.js adapter for AppKit                                              | Bridges AppKit sessions to ethers `BrowserProvider`. Use over wagmi adapter — wagmi is not in the existing stack.                              |
| `react-native-quick-crypto`          | ^0.7.x  | Native C++ crypto (JSI) for ethers.js                                     | Registers native crypto primitives with ethers v6's plugin API. Without it, key operations fall back to pure-JS (30+ seconds on real devices). |
| `ethers`                             | ^6.x    | Ethereum provider, BigInt-native balance formatting                       | Actively maintained, typed, official React Native cookbook. v6 uses native `BigInt` (requires Babel flag).                                     |

### Supporting (Peer Dependencies Required by AppKit)

| Library                                     | Version | Purpose                                            | When to Use                                                                                                               |
| ------------------------------------------- | ------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `@react-native-async-storage/async-storage` | ^2.x    | Persists WalletConnect session across app restarts | Required by AppKit — without it, every app launch requires reconnection.                                                  |
| `@react-native-community/netinfo`           | ^11.x   | Network status detection                           | Required by AppKit — pauses/resumes WalletConnect on connectivity changes.                                                |
| `expo-application`                          | ~6.x    | App name/version metadata                          | Required by AppKit — sends app metadata to wallets during WalletConnect handshake.                                        |
| `react-native-svg`                          | ^15.x   | SVG rendering                                      | Required by AppKit — wallet list icons and QR code are SVG.                                                               |
| `stream-browserify`                         | latest  | Node.js `stream` polyfill                          | Required for `metro.config.js` `extraNodeModules` — WalletConnect internals reference `stream`.                           |
| `@craftzdog/react-native-buffer`            | latest  | Node.js `Buffer` polyfill                          | Required for `metro.config.js` `extraNodeModules` — Metro needs to resolve `buffer` to a React Native-compatible package. |

Note: `react-native-safe-area-context` is already in `package.json` — do not reinstall. `expo-linking` is already present and needed for AppKit's `redirectUrl` in Phase 2.

### Alternatives Considered

| Instead of                                             | Could Use                                      | Tradeoff                                                                                             |
| ------------------------------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `react-native-quick-crypto`                            | `@ethersproject/shims` only (pure-JS fallback) | Pure-JS crypto is 30–100x slower. Perceptible on real devices. Not acceptable for wallet operations. |
| `stream-browserify` + `@craftzdog/react-native-buffer` | `readable-stream` + `buffer`                   | Either works for Metro aliasing. The craftzdog buffer is more actively maintained for React Native.  |

### Installation

```bash
# Step 1: Expo-aware install (respects SDK 54 version constraints)
npx expo install \
  @reown/appkit-react-native \
  @reown/appkit-ethers-react-native \
  @react-native-async-storage/async-storage \
  react-native-get-random-values \
  react-native-svg \
  @react-native-community/netinfo \
  @walletconnect/react-native-compat \
  expo-application \
  ethers \
  react-native-quick-crypto

# Step 2: Metro node module aliases (not Expo-aware — use npm)
npm install stream-browserify @craftzdog/react-native-buffer
```

---

## Architecture Patterns

### Recommended File Structure (Phase 1 changes only)

```
(project root)/
├── babel.config.js          NEW — must exist; Expo SDK 54 does not generate it
├── .env.example             NEW — lists all required EXPO_PUBLIC_ vars with placeholders
├── .env                     NEW (gitignored) — actual values (placeholders for now)
└── src/
    ├── app/
    │   └── index.tsx        MODIFIED — temporary smoke test screen
    ├── config/
    │   └── env.ts           MODIFIED — add three new blockchain env vars
    ├── lib/
    │   └── appkit.ts        NEW — AppKit singleton (createAppKit at module scope)
    └── providers/
        └── app-provider.tsx MODIFIED — wrap children with AppKitProvider + render <AppKit />
```

### Pattern 1: Polyfill Import Order in lib/appkit.ts

**What:** All polyfill imports at the top of `lib/appkit.ts`, in strict order, before any other imports.

**When to use:** Always — this file is imported by `app-provider.tsx` which loads before any feature code.

**Example:**

```typescript
// src/lib/appkit.ts
// Source: https://docs.reown.com/appkit/react-native/core/installation

// 1. WalletConnect compat — MUST be the absolute first import in this file.
//    Patches TextEncoder, URL, Buffer, EventEmitter globals that Hermes lacks.
//    If anything else imports WalletConnect internals before this runs, the app crashes.
import '@walletconnect/react-native-compat';

// 2. Secure randomness — before any crypto or ethers imports.
import 'react-native-get-random-values';

// 3. AppKit + ethers adapter
import { createAppKit } from '@reown/appkit-react-native';
import { EthersAdapter } from '@reown/appkit-ethers-react-native';
import { mainnet } from '@reown/appkit/networks';

// 4. Native crypto registration for ethers v6
import { ethers } from 'ethers';
import crypto from 'react-native-quick-crypto';

// Register native crypto primitives with ethers v6 plugin API
// Source: https://docs.ethers.org/v6/cookbook/react-native/
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
  return crypto.createHash('sha256').update(data).digest();
});
ethers.sha512.register((data) => {
  return crypto.createHash('sha512').update(data).digest();
});

// 5. AppKit singleton — called ONCE at module scope, never inside a component
export const appKit = createAppKit({
  projectId: ENV.REOWN_PROJECT_ID,
  networks: [mainnet],
  adapters: [new EthersAdapter()],
  metadata: {
    name: 'Ethereum Wallet Viewer',
    description: 'View your ETH balance and transactions',
    url: 'https://yourapp.com',
    icons: [],
  },
});
```

**Critical note:** `ENV` must be imported after the polyfills above. Move the ENV import line to after `react-native-get-random-values`.

### Pattern 2: babel.config.js (Create at Project Root)

**What:** Expo SDK 54 does not generate a `babel.config.js` by default. It must be created manually. Two flags are required.

**When to use:** Required for this stack — without this file, AppKit (valtio) and ethers v6 (BigInt) both fail.

```javascript
// babel.config.js — place at project root (alongside package.json)
// Source: https://docs.reown.com/appkit/react-native/core/installation (unstable_transformImportMeta)
// Source: https://github.com/facebook/hermes/issues/510 (unstable_transformProfile)
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          unstable_transformImportMeta: true, // Required: AppKit's valtio uses import.meta
          unstable_transformProfile: 'hermes-stable', // Required: enables BigInt for ethers v6
        },
      ],
    ],
  };
};
```

**After creating this file:** Clear Metro cache with `npx expo start --clear` before the next build.

### Pattern 3: Metro Config Merge

**What:** Add `extraNodeModules` resolver to the existing `metro.config.js` without breaking the `withNativeWind` wrapper.

**When to use:** Required for WalletConnect internals that reference `crypto`, `stream`, and `buffer` by Node.js name.

```javascript
// metro.config.js — merge with existing withNativeWind config
// Source: project STACK.md; pattern verified against MetaMask Metro troubleshooting docs
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Map Node.js core module names to React Native-compatible packages.
// WalletConnect internals reference these by their Node.js names.
config.resolver.extraNodeModules = {
  crypto: require.resolve('react-native-quick-crypto'),
  stream: require.resolve('stream-browserify'),
  buffer: require.resolve('@craftzdog/react-native-buffer'),
};

module.exports = withNativeWind(config, { input: './global.css' });
```

**Safety note:** `extraNodeModules` is additive — it does not replace NativeWind's configuration. The `withNativeWind` wrapper call remains unchanged at the bottom.

### Pattern 4: AppKitProvider Wiring in app-provider.tsx

**What:** Wrap children with `AppKitProvider` (passing the exported `appKit` singleton as the `instance` prop). Render the `<AppKit />` component inside the provider so AppKit's modal UI can mount anywhere.

**When to use:** Only one place in the entire app — `providers/app-provider.tsx`.

```typescript
// src/providers/app-provider.tsx
// Source: https://docs.reown.com/appkit/react-native/core/installation
import '@/src/lib/appkit'; // Side-effect: runs polyfills + createAppKit at module load
import { type ReactNode } from 'react';
import { AppKit, AppKitProvider } from '@reown/appkit-react-native';
import { appKit } from '@/src/lib/appkit';

type AppProviderProps = {
  children: ReactNode;
};

export function AppProvider({ children }: AppProviderProps) {
  return (
    <AppKitProvider instance={appKit}>
      {children}
      <AppKit /> {/* Required: mounts AppKit modal UI */}
    </AppKitProvider>
  );
}
```

**Note:** `react-native-safe-area-context`'s `SafeAreaProvider` is already configured by Expo Router — do not add a second instance.

### Pattern 5: env.ts Extension

**What:** Extend the existing `ENV` object in `config/env.ts` with three new blockchain vars. Keep the existing `API_URL` var.

**When to use:** Direct extension of the established pattern.

```typescript
// src/config/env.ts
// Throws at startup if required env vars are missing — fail fast, not silently.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env and fill in the values.`,
    );
  }
  return value;
}

export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  REOWN_PROJECT_ID: requireEnv('EXPO_PUBLIC_REOWN_PROJECT_ID'),
  ETHERSCAN_API_KEY: requireEnv('EXPO_PUBLIC_ETHERSCAN_API_KEY'),
  INFURA_RPC_URL: requireEnv('EXPO_PUBLIC_INFURA_RPC_URL'),
} as const;
```

**Note on throwing at startup:** `requireEnv` throws synchronously. This is correct behavior — a missing API key should be a hard error, not a silent default. The smoke test screen (Pattern 6 below) catches this and displays it.

### Pattern 6: Smoke Test Screen (Temporary)

**What:** Replace `app/index.tsx` with a temporary status screen that displays AppKit initialization status and all three env vars (masked). Replaced in Phase 2.

```typescript
// src/app/index.tsx — temporary smoke test (replaced in Phase 2)
import { View, Text, ScrollView } from 'react-native';

function maskValue(value: string | undefined): string {
  if (!value) return '(not set)';
  if (value.length <= 8) return '***';
  return value.slice(0, 4) + '***' + value.slice(-4);
}

export default function Index() {
  let appKitStatus = 'OK';
  let envError: string | null = null;

  try {
    // ENV import will throw if any var is missing
    const { ENV } = require('@/src/config/env');
    void ENV; // access to trigger validation
  } catch (e) {
    envError = e instanceof Error ? e.message : String(e);
  }

  return (
    <ScrollView className="flex-1 bg-white p-6 pt-16">
      <Text className="text-xl font-bold mb-4">Phase 1 Smoke Test</Text>

      <Text className="font-semibold">AppKit Status</Text>
      <Text className="mb-4 text-green-600">{appKitStatus}</Text>

      {envError && (
        <Text className="text-red-600 mb-4">{envError}</Text>
      )}

      <Text className="font-semibold">REOWN_PROJECT_ID</Text>
      <Text className="mb-2 font-mono">
        {maskValue(process.env.EXPO_PUBLIC_REOWN_PROJECT_ID)}
      </Text>

      <Text className="font-semibold">ETHERSCAN_API_KEY</Text>
      <Text className="mb-2 font-mono">
        {maskValue(process.env.EXPO_PUBLIC_ETHERSCAN_API_KEY)}
      </Text>

      <Text className="font-semibold">INFURA_RPC_URL</Text>
      <Text className="mb-2 font-mono">
        {maskValue(process.env.EXPO_PUBLIC_INFURA_RPC_URL)}
      </Text>
    </ScrollView>
  );
}
```

**Note:** The smoke test accesses `process.env` directly (not via `ENV`) to show masked values without triggering the `requireEnv` throw in the display layer. The `ENV` import is wrapped in try/catch to surface missing var errors on screen rather than crashing silently.

### Anti-Patterns to Avoid

- **Calling `createAppKit()` inside a React component or `useEffect`:** Reinitializes the WalletConnect session on every render. Call it once at module scope in `lib/appkit.ts`.
- **Importing `@walletconnect/react-native-compat` anywhere other than the first line of `lib/appkit.ts`:** Any import of WalletConnect code before this shim patches the globals causes a runtime crash. The polyfill must run before WalletConnect's module code executes.
- **Using `npx expo start` (Expo Go) to test this phase:** `react-native-quick-crypto` and `react-native-svg`'s native renderer cannot run in Expo Go. Test exclusively with the local Android build (`npx expo run:android`).
- **Hardcoding `unstable_transformImportMeta` without `unstable_transformProfile`:** The CONTEXT.md success criteria require both flags. `unstable_transformImportMeta` fixes valtio; `unstable_transformProfile: 'hermes-stable'` fixes ethers v6 BigInt.

---

## Don't Hand-Roll

| Problem                                       | Don't Build                                         | Use Instead                                     | Why                                                                                                                                                                  |
| --------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TextEncoder` / `URL` / `Buffer` global shims | Custom polyfill code                                | `@walletconnect/react-native-compat`            | WalletConnect's compat package handles edge cases (proto chain, iterable, etc.) that hand-rolled shims miss.                                                         |
| Native crypto binding for ethers              | Custom JSI bridge                                   | `react-native-quick-crypto` + ethers plugin API | `react-native-quick-crypto` is a mature C++ JSI implementation with 30–100x faster crypto than pure JS. The ethers v6 plugin API makes registration straightforward. |
| Node.js module aliases in Metro               | Custom resolver logic                               | `extraNodeModules` map                          | Metro's built-in resolver handles this correctly — no custom resolver code needed.                                                                                   |
| Env var validation                            | Manual `if (!process.env.X)` scattered across files | `requireEnv()` helper in `config/env.ts`        | Centralizes validation, fails fast at startup with a clear message, and is already the convention in this project.                                                   |

**Key insight:** All polyfill complexity in this phase has well-established solutions. The implementation work is configuration, not coding.

---

## Common Pitfalls

### Pitfall 1: Wrong Polyfill Import Order

**What goes wrong:** App crashes on launch with `ReferenceError: TextEncoder is not defined` or `Can't find variable: crypto`. The error appears deep in WalletConnect's internal stack, not at the import site.

**Why it happens:** WalletConnect's JS modules execute their body code on import. If `@walletconnect/react-native-compat` hasn't run yet, the globals it patches are missing when the first WalletConnect module is executed.

**How to avoid:** `@walletconnect/react-native-compat` must be the first `import` statement in `lib/appkit.ts`. `react-native-get-random-values` must be second. Every other import follows. Add a comment explaining the ordering constraint so future developers don't "clean it up."

**Warning signs:** "X is not defined" errors on launch with stack traces pointing into `node_modules/@walletconnect/` or `node_modules/ethers/`.

### Pitfall 2: Missing babel.config.js

**What goes wrong:** App silently fails to render, or crashes with `import.meta is not defined` or `SyntaxError: Unexpected identifier 'n'` (the `n` suffix on BigInt literals).

**Why it happens:** Expo SDK 54 uses `babel-preset-expo` but does not create a `babel.config.js` file. The two required flags (`unstable_transformImportMeta`, `unstable_transformProfile: 'hermes-stable'`) have no defaults — they must be explicitly set.

**How to avoid:** Create `babel.config.js` at the project root with both flags before running any build. After creating the file, always clear Metro cache with `npx expo start --clear`.

**Warning signs:** `import.meta` errors in stack traces pointing to `node_modules/valtio/` or `node_modules/@reown/`. BigInt syntax errors in stack traces pointing to `node_modules/ethers/`.

### Pitfall 3: Metro Cache Stale After Config Changes

**What goes wrong:** Changes to `babel.config.js` or `metro.config.js` appear to have no effect. The old error persists.

**Why it happens:** Metro caches its transform output. Config changes do not automatically invalidate the cache.

**How to avoid:** Run `npx expo start --clear` after any change to `babel.config.js` or `metro.config.js`. If running `npx expo run:android`, add `--no-build-cache` on the first run after a config change.

**Warning signs:** Errors that should be fixed by a config change are still occurring.

### Pitfall 4: `extraNodeModules` Overwriting NativeWind Config

**What goes wrong:** NativeWind stops working — styles are not applied, or `className` is treated as an unknown prop.

**Why it happens:** Incorrectly replacing the `withNativeWind` call with a raw `extraNodeModules` assignment, or assigning `extraNodeModules` inside the `withNativeWind` options object instead of on the `config` object.

**How to avoid:** Assign `config.resolver.extraNodeModules = {...}` before the `withNativeWind` wrapper call, not inside it. The `withNativeWind(config, { input: './global.css' })` call must remain as the final `module.exports` assignment.

**Warning signs:** NativeWind `className` props stop styling components after metro.config.js is changed.

### Pitfall 5: `requireEnv` Throws Before App Renders

**What goes wrong:** App crashes at the white screen stage with an unhandled `Error: Missing required environment variable` before any UI appears.

**Why it happens:** `env.ts` is imported by `lib/appkit.ts` which is imported by `app-provider.tsx` which wraps the root layout. If `.env` is missing or empty, the throw happens before React can mount any error UI.

**How to avoid:** Copy `.env.example` to `.env` immediately after setting up the project. Even with placeholder values, the vars must exist. The smoke test screen is designed to show the error on-screen, but that only works if `.env` has the vars defined (even as placeholders).

**Warning signs:** White screen on launch with Metro log showing `Error: Missing required environment variable: EXPO_PUBLIC_REOWN_PROJECT_ID`.

### Pitfall 6: React Compiler + AppKit Hooks

**What goes wrong:** AppKit hooks (`useAppKitProvider`, `useAccount`) return stale values or don't re-render on connection state changes.

**Why it happens:** The React Compiler is enabled experimentally in this project (`experiments.reactCompiler: true` in `app.json`). It only runs on application code (not node_modules), but if a custom hook that wraps AppKit hooks violates React's rules (e.g., conditional hook calls), the compiler may produce incorrect memoization.

**How to avoid:** Follow React's rules of hooks in all custom hooks. If a specific hook has React Compiler issues, add the `'use no memo'` directive at the top of that function. Verify with `npx react-compiler-healthcheck@latest`.

**Warning signs:** Connection state doesn't update in UI after wallet connects. `useAccount().address` shows `undefined` after connection.

---

## Code Examples

Verified patterns from official sources:

### .env.example

```bash
# .env.example — copy to .env and fill in real values
# All vars are required. App will throw at startup if any are missing.

# Reown Project ID — get from https://cloud.reown.com
EXPO_PUBLIC_REOWN_PROJECT_ID=your_reown_project_id_here

# Etherscan API key — get from https://etherscan.io/myapikey
EXPO_PUBLIC_ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Infura RPC URL — get from https://app.infura.io (sign up required)
# Format: https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
EXPO_PUBLIC_INFURA_RPC_URL=https://mainnet.infura.io/v3/your_infura_project_id_here
```

### Quick-crypto registration with ethers v6

```typescript
// Source: https://docs.ethers.org/v6/cookbook/react-native/
import { ethers } from 'ethers';
import crypto from 'react-native-quick-crypto';

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
  return crypto.createHash('sha256').update(data).digest();
});
ethers.sha512.register((data) => {
  return crypto.createHash('sha512').update(data).digest();
});
```

### Android physical device build commands

```bash
# Prerequisites (one-time setup):
# 1. Install Android Studio: https://developer.android.com/studio
# 2. Install JDK 17 (Azul Zulu recommended on Linux/Mac, Microsoft OpenJDK on Windows)
# 3. Set environment variables:
#    export JAVA_HOME=/path/to/jdk17
#    export ANDROID_HOME=$HOME/Android/Sdk
#    export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
# 4. Enable USB debugging on device: Settings > About phone > tap Build number 7x
#    then Settings > Developer options > USB debugging ON
# 5. Connect device via USB, accept "Allow USB debugging" prompt

# Verify device is detected:
adb devices

# First build (5–15 min — downloads Gradle dependencies, compiles native modules):
npx expo run:android

# If multiple devices connected, select one:
npx expo run:android --device

# Clear Metro cache if config was changed:
npx expo start --clear
# Then in a separate terminal: npx expo run:android
```

---

## State of the Art

| Old Approach                                         | Current Approach                                                                                                    | When Changed            | Impact                                                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `@web3modal/ethers-react-native`                     | `@reown/appkit-react-native` + `@reown/appkit-ethers-react-native`                                                  | 2024 (Reown rebrand)    | Old package receives no new features. Use new package names.                                                                                    |
| `crypto-browserify` in `extraNodeModules`            | `react-native-quick-crypto` in `extraNodeModules`                                                                   | 2022–2023               | `crypto-browserify` is pure JS, adds ~200KB, and is effectively abandoned. `react-native-quick-crypto` is C++ JSI, faster, actively maintained. |
| Etherscan API v1 (`/api?module=...`)                 | Etherscan API v2 (`/v2/api?chainid=1&...`)                                                                          | Deprecated May 31, 2025 | Phase 4 must use v2. Not relevant to Phase 1, but noted to prevent a common copy-paste error from old examples.                                 |
| `babel-preset-expo` with no custom `babel.config.js` | Explicit `babel.config.js` with `unstable_transformImportMeta: true` + `unstable_transformProfile: 'hermes-stable'` | Expo SDK 53+            | Without this file, AppKit and ethers v6 both fail on first launch.                                                                              |

**Deprecated/outdated:**

- `rn-nodeify`: Old polyfill approach using postinstall script hacks. Replaced by `extraNodeModules` in metro.config.js.
- `@ethersproject/shims` (without quick-crypto): Technically functional but produces 30+ second wallet operations. Not acceptable for production use.

---

## Open Questions

1. **Infura Project ID not yet obtained**
   - What we know: User needs to sign up at infura.io to get a Project ID for the Ethereum mainnet RPC URL.
   - What's unclear: Whether signup is instant or involves verification delays.
   - Recommendation: Plan task should explicitly note "external dependency — sign up at https://app.infura.io before running the build" and use a placeholder in `.env` until the real key is available.

2. **Reown Project ID not yet obtained**
   - What we know: A Project ID from https://cloud.reown.com is required for `createAppKit()`. Without it, AppKit initialization throws.
   - What's unclear: Dashboard onboarding steps.
   - Recommendation: Plan task should note "external dependency — create project at https://cloud.reown.com before running Phase 1 smoke test."

3. **`app.json` scheme value**
   - What we know: `app.json` currently has `"scheme": "frontend"` (generic). WalletConnect deep-link callbacks use this scheme. The scheme is fine for Phase 1 (no deep links yet), but Phase 2 will need it changed to something app-specific.
   - What's unclear: Whether "frontend" conflicts with any existing apps on the test device.
   - Recommendation: Note in the plan as a Phase 2 prerequisite: rename scheme to something unique (e.g., `ethereum-wallet-viewer`) in `app.json` before building Phase 2.

4. **React Compiler + ethers v6 BigInt**
   - What we know: React Compiler is enabled (`experiments.reactCompiler: true`). It only processes application code (not node_modules). The BigInt issue is in `ethers` (a node module), so the compiler doesn't touch it.
   - What's unclear: Whether any application-layer code that handles BigInt values (e.g., formatting balance) needs `'use no memo'` directives.
   - Recommendation: Monitor for stale values in hooks that return BigInt-formatted strings. Add `'use no memo'` to specific hooks if the compiler produces incorrect output.

---

## Validation Architecture

### Test Framework

No existing test framework is present in this project. All test files found during scanning are inside `node_modules`.

| Property           | Value                         |
| ------------------ | ----------------------------- |
| Framework          | None installed                |
| Config file        | None — Wave 0 gap             |
| Quick run command  | N/A until framework installed |
| Full suite command | N/A until framework installed |

**Assessment for Phase 1:** Phase 1 requirements are fundamentally device-runtime behaviors (polyfill crashes, Babel transform errors, build success). These cannot be meaningfully unit tested — they manifest only in a native build on a physical device. Automated testing infrastructure is therefore not applicable to FOUND-01 and FOUND-02. FOUND-03 (env var readable) can be lightly verified via a manual smoke test.

The appropriate validation mechanism for this phase is the smoke test screen on `app/index.tsx` (already planned in the locked decisions) which serves as a live integration check on the physical device.

### Phase Requirements to Test Map

| Req ID   | Behavior                                                                 | Test Type          | Automated Command                                           | Automated?                                                |
| -------- | ------------------------------------------------------------------------ | ------------------ | ----------------------------------------------------------- | --------------------------------------------------------- |
| FOUND-01 | App launches without polyfill or crypto-related runtime crash            | Device smoke test  | Manual — launch on physical Android device, verify no crash | Manual only — crash happens at JS runtime in native build |
| FOUND-02 | EAS development build (via `npx expo run:android`) compiles and installs | Build verification | `npx expo run:android` exit code 0                          | Manual — requires connected device                        |
| FOUND-03 | All three env vars readable from `config/env.ts`                         | Device smoke test  | Manual — check smoke test screen shows masked values        | Manual only — requires running app                        |

### Wave 0 Gaps

For Phase 1, the validation is entirely device-level. The smoke test screen in `app/index.tsx` is the test artifact.

- [ ] `.env` file created from `.env.example` with placeholder values — required before `npx expo run:android`
- [ ] Physical Android device connected via USB with USB debugging enabled — required for FOUND-02
- [ ] Reown Project ID obtained from https://cloud.reown.com — required for AppKit to initialize without throwing
- [ ] Infura Project ID obtained from https://app.infura.io — required for `EXPO_PUBLIC_INFURA_RPC_URL` to be set

_No automated test framework is installed. Unit testing of polyfill behavior and build infrastructure is not practical. The smoke test screen is the intended verification mechanism for this phase._

---

## Sources

### Primary (HIGH confidence)

- [Reown AppKit React Native Installation](https://docs.reown.com/appkit/react-native/core/installation) — exact install command, polyfill import order, `babel.config.js` with `unstable_transformImportMeta`, `AppKitProvider` with `instance` prop, `<AppKit />` component placement
- [ethers.js v6 React Native cookbook](https://docs.ethers.org/v6/cookbook/react-native/) — quick-crypto registration API for all five crypto primitives
- [reown-com/react-native-examples — appkit-expo-wagmi](https://github.com/reown-com/react-native-examples/tree/main/dapps/appkit-expo-wagmi) — confirms `unstable_transformImportMeta: true` in `babel.config.js` for Expo AppKit example
- [Expo local app development guide](https://docs.expo.dev/guides/local-app-development/) — `npx expo run:android` command, auto-runs `expo prebuild`, starts Metro
- [Expo environment setup — Android physical device](https://docs.expo.dev/get-started/set-up-your-environment/) — JDK 17 requirement, `ANDROID_HOME`, USB debugging steps
- [react-native-quick-crypto GitHub](https://github.com/margelo/react-native-quick-crypto) — Expo Go incompatibility confirmed, JSI implementation details
- [Expo React Compiler guide](https://docs.expo.dev/guides/react-compiler/) — compiler only runs on application code (not node_modules), `'use no memo'` opt-out

### Secondary (MEDIUM confidence)

- [Hermes BigInt issue #510](https://github.com/facebook/hermes/issues/510) — `unstable_transformProfile: 'hermes-stable'` requirement documented by React Native core team
- [ethers.js Discussion #3905 — React Native](https://github.com/ethers-io/ethers.js/discussions/3905) — community-verified install steps for ethers v6 on React Native
- [project STACK.md](../../research/STACK.md) — Metro `extraNodeModules` pattern, `stream-browserify` + `@craftzdog/react-native-buffer` alias map
- [project PITFALLS.md](../../research/PITFALLS.md) — polyfill order pitfalls, Expo Go limitations, BigInt/Babel pitfalls, all verified against official sources

### Tertiary (LOW confidence)

- None for this phase — all critical claims are covered by HIGH or MEDIUM sources.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — packages verified against official Reown install command; versions confirmed compatible with Expo SDK 54 / RN 0.81 in existing STACK.md research
- Architecture: HIGH — AppKit singleton pattern is the mandated Reown approach per official docs; Metro extraNodeModules pattern verified against official Metro docs; provider wiring confirmed against appkit-expo-wagmi example
- Pitfalls: HIGH — all six pitfalls have official source backing (Reown docs, Hermes issue tracker, Expo docs, React Compiler docs)
- Build setup: MEDIUM-HIGH — `npx expo run:android` command confirmed; JDK 17 and ANDROID_HOME confirmed by Expo docs; first-build duration is an estimate based on typical Gradle + React Native native module compilation

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (Reown package names changed once already; re-verify if more than 30 days old)
