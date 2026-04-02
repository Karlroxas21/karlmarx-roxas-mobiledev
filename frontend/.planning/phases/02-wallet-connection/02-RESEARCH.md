# Phase 2: Wallet Connection - Research

**Researched:** 2026-04-01
**Domain:** Reown AppKit React Native — wallet connection UI, session persistence, blockies identicon, copy-to-clipboard
**Confidence:** HIGH (AppKit hooks API verified via official docs; blockies approach verified via library source + React Native SVG patterns)

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Screen Layout**

- Hero + features landing for disconnected state: app icon at top, bullet list of capabilities (view balance, see transactions, read-only & safe), "Connect Wallet" button at bottom
- Minimal connected state: just the connected address and disconnect — no placeholder sections for future features
- Single route: replace `app/index.tsx` smoke test with the wallet screen (connected/disconnected states on same page)

**Connect Flow UX**

- Use AppKit's built-in WalletConnect v2 modal (QR code + wallet list). Tap "Connect Wallet" opens the modal
- Custom loading overlay: show "Waiting for approval in MetaMask..." while waiting for wallet approval, with cancel option
- Connection rejection/timeout: show inline error message below the Connect button on the disconnected screen. Dismisses on next tap

**Address Display**

- Full 42-character address displayed (not truncated)
- "Connected to Ethereum Mainnet" label shown above the address
- Ethereum-style blockies identicon (pixelated colored squares) generated from the address
- Copy-to-clipboard button next to the address (pulled forward from Phase 5 scope)

**Disconnect Behavior**

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

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID        | Description                                                                                   | Research Support                                                                                                                                        |
| --------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WALLET-01 | User can connect Ethereum wallet via WalletConnect v2 modal (supports MetaMask + 300 wallets) | AppKit `useAppKit().open()` triggers built-in modal; `app.json` wallet scheme configuration enables wallet detection                                    |
| WALLET-02 | User can connect directly via MetaMask deep link                                              | AppKit modal includes MetaMask deep-link path natively; `app.json` LSApplicationQueriesSchemes + Android queries plugin enables device wallet detection |
| WALLET-03 | User's wallet session persists across app restarts                                            | AppKit uses AsyncStorage internally (already wired via `appKitStorage` in `lib/appkit.ts`); `useAppKitAccount()` re-hydrates on mount automatically     |
| WALLET-04 | User can disconnect their wallet                                                              | `useAppKit().disconnect()` ends session; `useWalletSync` clears Zustand store                                                                           |

</phase_requirements>

---

## Summary

Phase 2 builds on the AppKit singleton and provider already established in Phase 1. The core work is: (1) adding wallet scheme detection config to `app.json` so the modal can deep-link to installed wallets like MetaMask, (2) building the `features/wallet/` module with a hook, sync helper, store, and UI components, (3) replacing the smoke test at `app/index.tsx` with the conditional connected/disconnected screen, and (4) implementing the blockies identicon using `blo` + `SvgXml` from `react-native-svg`.

Session persistence requires no custom code — AppKit's `appKitStorage` (AsyncStorage adapter in `lib/appkit.ts`) already handles it. On app restart, `useAppKitAccount()` re-reads the persisted session and returns `isConnected: true` with the address. The Zustand store is populated by a `useWalletSync` hook called once near the tree root.

The blockies identicon is the main research finding that differs from a naive approach: React Native's `Image` component does not support SVG data URIs. Use `blo`'s `bloSvg()` function (returns raw SVG markup) combined with `SvgXml` from `react-native-svg` (already installed). The clipboard feature uses `expo-clipboard` which requires a separate install.

**Primary recommendation:** Follow the `features/wallet/` module structure from ARCHITECTURE.md with the hook corrections documented below. The AppKit API has one important change since the original research: `useDisconnect()` is deprecated — `disconnect()` now comes from `useAppKit()` directly.

---

## Standard Stack

### Core (all already installed in package.json)

| Library                                     | Version   | Purpose                                           | Why Standard                                               |
| ------------------------------------------- | --------- | ------------------------------------------------- | ---------------------------------------------------------- |
| `@reown/appkit-react-native`                | ^2.0.2    | AppKit modal, WalletConnect v2 session management | Official Reown SDK; already installed Phase 1              |
| `@reown/appkit-ethers-react-native`         | ^2.0.2    | Ethers adapter; bridges wallet to BrowserProvider | Already installed Phase 1                                  |
| `zustand`                                   | ^5.0.12   | Wallet connection state store                     | Project standard                                           |
| `react-native-svg`                          | installed | Renders blockies SVG identicon via SvgXml         | Required by AppKit (already present); also serves blockies |
| `@react-native-async-storage/async-storage` | 2.2.0     | AppKit session persistence                        | Already installed Phase 1                                  |

### New Dependencies (Phase 2)

| Library          | Version | Purpose                                        | Install                           |
| ---------------- | ------- | ---------------------------------------------- | --------------------------------- |
| `blo`            | latest  | Generates Ethereum blockies (SVG) from address | `npm install blo`                 |
| `expo-clipboard` | latest  | Copy address to clipboard                      | `npx expo install expo-clipboard` |

### Alternatives Considered

| Instead of       | Could Use                           | Tradeoff                                                                                                                        |
| ---------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `blo` + `SvgXml` | `ethereum-blockies-base64`          | Returns PNG base64; `Image` component accepts it, but library is unmaintained (7 years). `blo` is zero-dep, pure JS, 85x faster |
| `blo` + `SvgXml` | Custom hand-rolled blockie          | Significant complexity; blockies algorithm is non-trivial. Don't hand-roll                                                      |
| `expo-clipboard` | `@react-native-clipboard/clipboard` | Both work; `expo-clipboard` is the Expo-first choice, consistent with rest of stack                                             |

**Installation:**

```bash
npm install blo
npx expo install expo-clipboard
```

---

## Architecture Patterns

### Recommended Project Structure

Files new or modified in Phase 2 only:

```
src/
├── app/
│   └── index.tsx                          # REPLACED — wallet screen (conditional connected/disconnected)
│
├── features/
│   └── wallet/
│       ├── components/
│       │   ├── ConnectScreen.tsx          # Disconnected hero: icon + bullets + ConnectButton
│       │   ├── ConnectedScreen.tsx        # Connected: network label + blockie + address + disconnect
│       │   ├── BlockieIdenticon.tsx       # blo() + SvgXml wrapper component
│       │   ├── ConnectButton.tsx          # Calls open(); shows loading overlay state
│       │   ├── LoadingOverlay.tsx         # "Waiting for approval..." modal with cancel
│       │   └── ConnectionError.tsx        # Inline error below ConnectButton
│       ├── hooks/
│       │   ├── use-wallet-connection.ts   # Wraps useAppKit + useAppKitAccount
│       │   └── use-wallet-sync.ts         # Syncs AppKit state → Zustand; called once in AppProvider
│       ├── stores/
│       │   └── wallet-store.ts            # address, isConnected, status, error
│       └── types/
│           └── index.ts                   # WalletState, ConnectionStatus types
│
└── providers/
    └── app-provider.tsx                   # MODIFIED — add useWalletSync() call
```

### Pattern 1: AppKit Hook API (Verified 2026-04-01)

**Verified hooks from `@reown/appkit-react-native`:**

```typescript
// useAppKit() — modal control + disconnect
import { useAppKit } from '@reown/appkit-react-native';
const { open, close, disconnect } = useAppKit();
// open()         — opens wallet selection modal
// close()        — closes modal
// disconnect()   — ends session, clears AsyncStorage
// NOTE: useDisconnect() is DEPRECATED. Use disconnect() from useAppKit() instead.

// useAppKitAccount() — connection state (preferred over useAccount for this project)
import { useAppKitAccount } from '@reown/appkit-react-native';
const { address, isConnected } = useAppKitAccount();
// address      — "0x..." | undefined
// isConnected  — boolean; true after wallet approves

// useAppKitState() — modal state
import { useAppKitState } from '@reown/appkit-react-native';
const { isOpen, isLoading } = useAppKitState();
// isOpen    — modal visibility
// isLoading — loading indicator (note: known issue: stays true after modal close without connect)
```

**Warning — known bug:** `isLoading` from `useAppKitState` remains `true` after user closes modal without connecting (GitHub issue #4677). Do NOT use `isLoading` alone to determine "waiting for wallet approval" state. Manage loading state manually in the hook.

### Pattern 2: use-wallet-connection Hook

```typescript
// src/features/wallet/hooks/use-wallet-connection.ts
import { useAppKit, useAppKitAccount } from '@reown/appkit-react-native';
import { useWalletStore } from '../stores/wallet-store';

export function useWalletConnection() {
  const { open, disconnect } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { status, setStatus, error, setError } = useWalletStore();

  const connect = async () => {
    try {
      setStatus('connecting');
      setError(null);
      await open();
      // Status transitions to 'connected' via useWalletSync when address arrives
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Connection failed');
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    // useWalletSync handles clearing the store
  };

  return {
    address,
    isConnected,
    status,
    error,
    connect,
    disconnect: handleDisconnect,
  };
}
```

### Pattern 3: useWalletSync — AppKit → Zustand Sync

Called exactly once, inside `AppProvider`. This is the single source-of-truth sync point.

```typescript
// src/features/wallet/hooks/use-wallet-sync.ts
import { useEffect } from 'react';
import { useAppKitAccount } from '@reown/appkit-react-native';
import { useWalletStore } from '../stores/wallet-store';

export function useWalletSync() {
  const { address, isConnected } = useAppKitAccount();
  const { setWallet, clearWallet } = useWalletStore();

  useEffect(() => {
    if (isConnected && address) {
      setWallet({ address, isConnected: true });
    } else {
      clearWallet();
    }
  }, [address, isConnected]);
}
```

```typescript
// src/providers/app-provider.tsx (modified)
import { appKit } from '@/src/lib/appkit';
import { type ReactNode } from 'react';
import { AppKit, AppKitProvider } from '@reown/appkit-react-native';
import { useWalletSync } from '@/src/features/wallet/hooks/use-wallet-sync';

function WalletSyncBridge() {
  useWalletSync();
  return null;
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <AppKitProvider instance={appKit}>
      <WalletSyncBridge />
      {children}
      <AppKit />
    </AppKitProvider>
  );
}
```

**Why WalletSyncBridge as a separate component:** `useWalletSync` calls `useAppKitAccount` which requires `AppKitProvider` to be in the tree. A sibling component inside the provider satisfies this; calling the hook in `AppProvider` itself would place it outside the provider boundary.

### Pattern 4: Blockies Identicon with blo + SvgXml

**Critical:** React Native's `Image` component does NOT accept SVG data URIs. Use `bloSvg()` (raw SVG string) with `SvgXml` from `react-native-svg`.

```typescript
// src/features/wallet/components/BlockieIdenticon.tsx
import { SvgXml } from 'react-native-svg';
import { bloSvg } from 'blo';

type Props = {
  address: `0x${string}`;
  size?: number;
};

export function BlockieIdenticon({ address, size = 48 }: Props) {
  const svg = bloSvg(address);
  return <SvgXml xml={svg} width={size} height={size} />;
}
```

**Import path:** `blo` exports both `blo()` (returns `data:image/svg+xml;base64,...`) and `bloSvg()` (returns raw SVG markup). Use `bloSvg()` for React Native.

### Pattern 5: Copy to Clipboard

```typescript
import * as Clipboard from 'expo-clipboard';

const handleCopy = async () => {
  await Clipboard.setStringAsync(address);
  // Optionally: brief visual feedback (button state change)
};
```

### Pattern 6: app.json Wallet Detection Configuration

Required for AppKit modal to detect and deep-link to installed wallets. Without this, MetaMask may not appear in the wallet list on real devices.

**iOS — add to `app.json`:**

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "LSApplicationQueriesSchemes": [
          "metamask",
          "trust",
          "safe",
          "rainbow",
          "uniswap",
          "cbwallet"
        ]
      }
    }
  }
}
```

**Android — create `queries.js` config plugin at project root:**

```javascript
// queries.js
const {
  withAndroidManifest,
  createRunOncePlugin,
} = require('expo/config-plugins');

const queries = {
  package: [
    { $: { 'android:name': 'io.metamask' } },
    { $: { 'android:name': 'com.wallet.crypto.trustapp' } },
    { $: { 'android:name': 'io.gnosis.safe' } },
    { $: { 'android:name': 'me.rainbow' } },
    { $: { 'android:name': 'org.toshi' } },
  ],
};

const withAndroidManifestService = (config) => {
  return withAndroidManifest(config, (c) => {
    c.modResults.manifest = { ...c.modResults.manifest, queries };
    return c;
  });
};

module.exports = createRunOncePlugin(
  withAndroidManifestService,
  'withAndroidManifestService',
  '1.0.0',
);
```

**Add to `app.json` plugins:**

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      ["expo-splash-screen", { ... }],
      "./queries.js"
    ]
  }
}
```

**Also add `redirect` to `lib/appkit.ts` metadata:**

```typescript
metadata: {
  name: 'Ethereum Wallet Viewer',
  description: 'View your ETH balance and transactions',
  url: 'https://ethereum-wallet-viewer.app',
  icons: [],
  redirect: {
    native: 'frontend://',   // matches "scheme": "frontend" in app.json
  },
},
```

The scheme `frontend` is already set in `app.json`. This redirect enables wallets to deep-link back to the app after approval.

### Anti-Patterns to Avoid

- **Using `useDisconnect()` hook:** Deprecated. Use `disconnect()` from `useAppKit()`.
- **Using `isLoading` from `useAppKitState` as "waiting for wallet" signal:** Known bug — stays true after modal dismissal. Track connecting state in Zustand store instead.
- **Using `blo()` (data URI) with React Native `Image`:** SVG data URIs not supported. Use `bloSvg()` + `SvgXml`.
- **Persisting wallet store with AsyncStorage:** AppKit owns session persistence. Zustand store is a derived cache only. No `persist` middleware.
- **Calling `useWalletSync` more than once:** Must be called exactly once in `AppProvider` via `WalletSyncBridge`. Multiple calls cause duplicate state updates.
- **Adding `scheme` redirect for linkMode without SIWE:** `linkMode: true` requires One-Click Auth (SIWE) which is out of scope for this phase. Use `redirect.native` only (no `linkMode`).

---

## Don't Hand-Roll

| Problem                          | Don't Build                               | Use Instead                                                         | Why                                                                                                                   |
| -------------------------------- | ----------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Wallet selection modal + QR code | Custom modal with WalletConnect QR        | AppKit `open()`                                                     | QR code generation, wallet list management, WalletConnect session negotiation are non-trivial                         |
| Session persistence              | Manual AsyncStorage read/write of address | AppKit's built-in AsyncStorage adapter (already in `lib/appkit.ts`) | AppKit persists cryptographic session material, not just the address — custom persistence would be incomplete         |
| Ethereum blockies algorithm      | Custom pixel color algorithm              | `blo` library                                                       | Blockies uses a seeded PRNG with specific color space transformations — the algorithm is subtle and easy to get wrong |
| Clipboard access                 | Direct native module                      | `expo-clipboard`                                                    | Platform differences between iOS pasteboard and Android clipboard API                                                 |

**Key insight:** AppKit handles 95% of the complexity in this phase. The feature code is primarily wiring (hooks, store, UI) on top of what AppKit provides.

---

## Common Pitfalls

### Pitfall 1: Missing app.json Wallet Schemes

**What goes wrong:** AppKit modal opens but MetaMask (and other installed wallets) do not appear in the wallet list — only QR code is shown. User cannot use the deep-link flow on a device that has MetaMask installed.

**Why it happens:** iOS requires explicit `LSApplicationQueriesSchemes` declaration to query whether other apps are installed. Android requires `<queries>` in the manifest. Without these, the OS blocks wallet detection.

**How to avoid:** Add the `app.json` iOS infoPlist config and `queries.js` plugin before testing on device/emulator.

**Warning signs:** Modal shows only QR code tab, no wallet list. MetaMask not listed even when installed.

### Pitfall 2: useWalletSync Called Outside AppKitProvider

**What goes wrong:** Runtime crash — `useAppKitAccount` throws "AppKit context not found" or similar because the hook is called above the `AppKitProvider` boundary.

**Why it happens:** Calling `useWalletSync` directly inside `AppProvider` body means the hook runs in the same component that renders the provider — the component's hook calls execute before its children render.

**How to avoid:** Use a `WalletSyncBridge` component rendered as a child inside `<AppKitProvider>`. This places the hook call correctly within the provider's React context.

**Warning signs:** Crash on app startup with "context" or "provider" in the error message.

### Pitfall 3: isLoading Bug — Stale True State

**What goes wrong:** After user opens modal and dismisses it without connecting, the UI stays in "connecting" loading state indefinitely because `useAppKitState().isLoading` never returns to `false`.

**Why it happens:** Known bug in `@reown/appkit` (issue #4677). `isLoading` remains `true` after modal close without connection.

**How to avoid:** Track connecting state manually in Zustand. Set `status: 'idle'` when `isConnected` stays `false` after a reasonable timeout, or listen for the modal closing (via `useAppKitState().isOpen` transitioning from `true` to `false`).

**Concrete approach:**

```typescript
// When isOpen transitions false→false AND we're still 'connecting', return to 'idle'
useEffect(() => {
  if (!isOpen && status === 'connecting' && !isConnected) {
    setStatus('idle');
    // Show inline error if appropriate
  }
}, [isOpen]);
```

### Pitfall 4: SVG Data URI in React Native Image

**What goes wrong:** `<Image source={{ uri: blo(address) }} />` renders a broken image or nothing.

**Why it happens:** React Native's Image component supports jpeg, png, gif, webp, bmp — not SVG data URIs.

**How to avoid:** Use `bloSvg()` (raw SVG string) with `SvgXml` from `react-native-svg`. `react-native-svg` is already installed.

### Pitfall 5: DeepLink Return Trip Requires Device Build

**What goes wrong:** Connecting via MetaMask deep link works (app opens MetaMask) but MetaMask cannot return to the app. Session appears to connect in MetaMask but the app never receives confirmation.

**Why it happens:** Deep link return requires the app's URL scheme (`frontend://`) to be registered. This only works in a Development Build or release build — not in Expo Go or the Metro dev server alone.

**How to avoid:** Test wallet deep-link flow only on a Development Build or `expo run:android` / `expo run:ios` build. Confirm the `redirect.native` in AppKit metadata matches the `scheme` in `app.json`.

### Pitfall 6: Missing redirect in AppKit Metadata

**What goes wrong:** After approving connection in MetaMask (mobile), MetaMask does not auto-return to the app. User must manually switch back.

**Why it happens:** Without `metadata.redirect.native`, AppKit cannot instruct the wallet to deep-link back after approval.

**How to avoid:** Add `redirect: { native: 'frontend://' }` to the `createAppKit` metadata in `lib/appkit.ts`. The scheme must match `app.json`'s `"scheme": "frontend"`.

---

## Code Examples

### wallet-store.ts

```typescript
// src/features/wallet/stores/wallet-store.ts
import { create } from 'zustand';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

type WalletState = {
  address: string | null;
  isConnected: boolean;
  status: ConnectionStatus;
  error: string | null;
  // Actions
  setWallet: (wallet: { address: string; isConnected: boolean }) => void;
  clearWallet: () => void;
  setStatus: (status: ConnectionStatus) => void;
  setError: (error: string | null) => void;
};

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  isConnected: false,
  status: 'idle',
  error: null,
  setWallet: ({ address, isConnected }) =>
    set({ address, isConnected, status: 'connected', error: null }),
  clearWallet: () =>
    set({ address: null, isConnected: false, status: 'idle', error: null }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
}));
```

**Do not add `persist` middleware.** AppKit owns session persistence.

### index.tsx — Conditional Routing

```typescript
// src/app/index.tsx
import { useWalletStore } from '@/src/features/wallet/stores/wallet-store';
import { ConnectScreen } from '@/src/features/wallet/components/ConnectScreen';
import { ConnectedScreen } from '@/src/features/wallet/components/ConnectedScreen';

export default function WalletScreen() {
  const { isConnected } = useWalletStore();
  return isConnected ? <ConnectedScreen /> : <ConnectScreen />;
}
```

### app.json additions

```json
{
  "expo": {
    "scheme": "frontend",
    "ios": {
      "infoPlist": {
        "LSApplicationQueriesSchemes": [
          "metamask",
          "trust",
          "safe",
          "rainbow",
          "uniswap",
          "cbwallet"
        ]
      }
    },
    "plugins": [
      "expo-router",
      ["expo-splash-screen", { "...": "existing config" }],
      "./queries.js"
    ]
  }
}
```

---

## State of the Art

| Old Approach                     | Current Approach                    | When Changed | Impact                                                        |
| -------------------------------- | ----------------------------------- | ------------ | ------------------------------------------------------------- |
| `useDisconnect()` hook           | `disconnect()` from `useAppKit()`   | AppKit v2    | `useDisconnect` is deprecated; use `useAppKit().disconnect()` |
| `@web3modal/ethers-react-native` | `@reown/appkit-ethers-react-native` | 2024 rebrand | Old package receives no updates                               |
| WalletConnect v1 (bridge server) | WalletConnect v2 (Relay server)     | 2023         | V1 shutdown June 2023; AppKit v2 uses v2 only                 |
| `web3modal` package              | `appkit` package (Reown)            | 2024         | Complete rename; same team                                    |

**Deprecated/outdated:**

- `useDisconnect()`: Removed. Disconnect via `useAppKit().disconnect()`.
- `useAccount()`: Still functional but `useAppKitAccount()` is the preferred name in the React Native SDK.
- Etherscan API v1: Deprecated May 31, 2025. Use v2 (not relevant to Phase 2 but relevant to Phase 4).

---

## Open Questions

1. **`isLoading` state management for the loading overlay**
   - What we know: `isLoading` from `useAppKitState` has a known bug where it stays `true` after modal dismissal without connection
   - What's unclear: Whether v2.0.2 (installed version) has this bug or it was fixed in a later release
   - Recommendation: Implement loading state via `isOpen` transition in `useWalletSync` regardless — it's the robust approach. If the bug is fixed, the extra check is harmless.

2. **`blo` import path in the installed version**
   - What we know: `blo` exports both `blo()` and `bloSvg()`. The exact named export may vary by version.
   - Recommendation: After installing, verify `import { bloSvg } from 'blo'` compiles. If not, check for `import { blo } from 'blo'` and use `btoa` + string manipulation — unlikely to be needed but flag for implementation.

---

## Validation Architecture

No automated test framework is configured in this project (no jest.config.js, no test script in package.json, no `__tests__` directory). Wallet connection behavior requires a physical device or emulator with a wallet app installed and cannot be meaningfully unit tested without extensive mocking of the AppKit SDK.

### Phase Requirements → Test Map

| Req ID    | Behavior                                                    | Test Type     | Why Automated is Not Practical                                              |
| --------- | ----------------------------------------------------------- | ------------- | --------------------------------------------------------------------------- |
| WALLET-01 | WalletConnect modal opens with QR code + wallet list        | Manual device | Requires AppKit modal rendering + wallet list detection (device-level)      |
| WALLET-02 | MetaMask deep-link path connects and returns to app         | Manual device | Requires installed MetaMask, deep link round-trip, physical/emulator device |
| WALLET-03 | Session persists across app restart                         | Manual device | Requires app lifecycle (kill + reopen), device-level AsyncStorage           |
| WALLET-04 | Disconnect clears session and returns to disconnected state | Manual device | Requires connected wallet session                                           |

### Sampling Rate

- **Per task commit:** Visual inspection of component renders in dev build
- **Per wave merge:** Manual UAT on device — run all 4 WALLET-XX scenarios
- **Phase gate:** All 4 WALLET-XX scenarios pass on a real device before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] No test framework installed — manual UAT is the verification path for this phase
- [ ] `queries.js` config plugin file does not exist yet (needed for Android wallet detection)

---

## Sources

### Primary (HIGH confidence)

- [Reown AppKit React Native Hooks](https://docs.reown.com/appkit/react-native/core/hooks) — verified `useAppKit`, `useAppKitAccount`, `useAppKitState` signatures; confirmed `useDisconnect` deprecation
- [Reown AppKit React Native Installation](https://docs.reown.com/appkit/react-native/core/installation) — verified `app.json` iOS infoPlist config, `queries.js` Android plugin pattern, `babel.config.js` requirement (already satisfied)
- [Reown AppKit React Native Link Mode](https://docs.reown.com/appkit/react-native/core/link-mode) — verified `redirect.native` metadata config; linkMode requires SIWE (out of scope)
- `src/lib/appkit.ts` — confirmed `appKitStorage` AsyncStorage adapter already wired; session persistence requires no additional code
- `app.json` — confirmed `"scheme": "frontend"` already set; matches `redirect.native: 'frontend://'`
- [blo GitHub README](https://github.com/bpierre/blo) — verified `bloSvg()` returns raw SVG string; zero dependencies; works in Node.js without DOM
- [expo-clipboard docs](https://docs.expo.dev/versions/latest/sdk/clipboard/) — verified `Clipboard.setStringAsync()` API; confirmed separate install required

### Secondary (MEDIUM confidence)

- [GitHub issue #4677 — isLoading stays true](https://github.com/reown-com/appkit/issues/4677) — `useAppKitState().isLoading` bug confirmed; workaround via `isOpen` transition recommended
- [GitHub issue #13 — Error on disconnect](https://github.com/reown-com/appkit-react-native/issues/13) — disconnect error "Please call connect() before enable()" in some versions; current v2.0.2 status unconfirmed — handle with try/catch in disconnect handler

### Tertiary (LOW confidence)

- Community pattern for `WalletSyncBridge` component — derived from React context boundary analysis; not explicitly documented by Reown but logically correct

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages verified in package.json; `blo` + `expo-clipboard` are the only new installs
- Architecture: HIGH — AppKit hook API verified from official docs; patterns follow established Phase 1 patterns
- Pitfalls: HIGH (pitfalls 1, 4, 5, 6) / MEDIUM (pitfalls 2, 3) — core pitfalls verified from official docs and GitHub issues

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (30 days; AppKit v2 is stable but the RN SDK is actively maintained — re-verify if upgrading beyond 2.0.2)
