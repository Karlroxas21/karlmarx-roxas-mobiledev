# Phase 3: Balance Display - Research

**Researched:** 2026-04-02
**Domain:** ethers.js v6 RPC balance fetching, React Native skeleton animation, Wei-to-ETH formatting
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Balance appears **above the address box**, between the network label and the address card
- Hero number: large bold text (~28pt), the dominant element on screen
- "ETH" unit label inline on same text node: `"1.2345 ETH"`
- Centered, matching the existing centered layout of ConnectedScreen
- Fixed 4 decimal places always (e.g., "1.2300 ETH", "0.0042 ETH")
- Very small balances (< 0.0001 ETH): display "< 0.0001 ETH"
- Zero balance: display "0.0000 ETH" with no special treatment
- No thousand separators ("1234.5678 ETH" not "1,234.5678 ETH")
- Skeleton placeholder: gray pulsing rounded rectangle — no spinner, no text placeholder
- Fetch balance on mount only — no auto-refresh (pull-to-refresh is Phase 4)

### Claude's Discretion
- ethers.js provider setup (JsonRpcProvider vs StaticJsonRpcProvider)
- Hook structure for balance fetching (custom hook in features/wallet/hooks/)
- Skeleton animation implementation (Animated API, reanimated, or NativeWind animate)
- Wei-to-ETH conversion approach (ethers.formatEther or manual)
- Error state for failed balance fetch (Phase 5 will polish, but basic handling needed)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BAL-01 | User can view their ETH balance (formatted in ETH, 4-6 decimal places) | ethers.formatEther + parseFloat.toFixed(4) delivers 4 fixed decimals; JsonRpcProvider.getBalance() fetches from Infura RPC; ENV.INFURA_RPC_URL is already wired |
</phase_requirements>

---

## Summary

Phase 3 adds ETH balance fetching and display to the existing `ConnectedScreen`. The project already has ethers.js v6 installed and configured (`src/lib/appkit.ts` registers native crypto primitives), and `ENV.INFURA_RPC_URL` is ready. The only new work is: (1) a `useBalance` hook that creates a `JsonRpcProvider`, calls `getBalance`, and formats the result, (2) a `BalanceSkeleton` component for loading state, and (3) a `BalanceDisplay` component that renders the formatted value, all wired into `ConnectedScreen`.

The Wei-to-ETH formatting strategy is: `ethers.formatEther(bigint)` converts Wei bigint to a decimal string, then `parseFloat(...).toFixed(4)` gives exactly 4 decimal places. A pre-check handles the "< 0.0001 ETH" edge case. This was verified with representative inputs including zero, dust amounts, and large balances — `toFixed(4)` does not produce thousand separators.

For the skeleton animation, NativeWind v4 supports `animate-pulse` at experimental status (powered by `react-native-reanimated` 4.1.7 which is already installed). Given the experimental flag, the fallback is React Native's built-in `Animated` API with an `Animated.loop` + `Animated.timing` opacity cycle — a two-line addition if `animate-pulse` misbehaves. The UI-SPEC has already approved `animate-pulse`; the plan should use it but note the fallback.

**Primary recommendation:** Create `useBalance` hook with local state (no Zustand extension needed), use `ethers.JsonRpcProvider` with `staticNetwork: true` option, use `ethers.formatEther` + `parseFloat.toFixed(4)` for formatting, and use `animate-pulse` for the skeleton with `Animated` API as documented fallback.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ethers | ^6.16.0 | Provider, getBalance, formatEther | Already installed; v6 uses native BigInt; no additional install |
| react-native (Animated) | 0.81.5 | Fallback skeleton animation | Built-in; zero install cost; always available |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-reanimated | ~4.1.7 | Powers NativeWind animate-pulse | Used automatically by NativeWind when animate-pulse applied |
| nativewind | ^4.2.3 | animate-pulse skeleton utility | Preferred path — one className, no JS animation code |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| animate-pulse (NativeWind) | Animated API loop | animate-pulse is experimental; Animated API is stable but more verbose (~15 LOC) |
| parseFloat.toFixed(4) | Intl.NumberFormat | Intl.NumberFormat would add commas by default and requires explicit `useGrouping: false`; toFixed(4) is simpler and comma-free by default |
| JsonRpcProvider (staticNetwork) | JsonRpcProvider (default) | Default mode makes an extra eth_chainId RPC call at startup; staticNetwork avoids it since we're always mainnet |

**Installation:** No new packages required. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/features/wallet/
├── hooks/
│   ├── use-wallet-connection.ts   (existing)
│   ├── use-wallet-sync.ts         (existing)
│   └── use-balance.ts             (NEW — balance fetch hook)
├── components/
│   ├── ConnectedScreen.tsx        (MODIFY — add BalanceDisplay/BalanceSkeleton)
│   ├── BalanceDisplay.tsx         (NEW — renders formatted ETH value)
│   └── BalanceSkeleton.tsx        (NEW — pulsing placeholder)
└── types/
    └── index.ts                   (no change needed)
```

### Pattern 1: Local State Balance Hook
**What:** Custom hook in `features/wallet/hooks/` with local `useState` for balance, loading, and error. No Zustand extension — balance is ephemeral UI state tied to the screen mount lifecycle.
**When to use:** One-shot fetch on mount with no cross-screen sharing needed.
**Example:**
```typescript
// Source: ethers.js v6 docs https://docs.ethers.org/v6/getting-started/
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { ENV } from '@/src/config/env';
import { useWalletStore } from '../stores/wallet-store';

type BalanceState = {
  balance: string | null;
  isLoading: boolean;
  error: string | null;
};

export function useBalance() {
  const address = useWalletStore((s) => s.address);
  const [state, setState] = useState<BalanceState>({
    balance: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!address) return;

    let cancelled = false;

    const fetchBalance = async () => {
      setState({ balance: null, isLoading: true, error: null });
      try {
        // staticNetwork: true avoids extra eth_chainId RPC call
        const provider = new ethers.JsonRpcProvider(
          ENV.INFURA_RPC_URL,
          undefined,
          { staticNetwork: true },
        );
        const raw = await provider.getBalance(address);
        if (!cancelled) {
          setState({ balance: formatBalance(raw), isLoading: false, error: null });
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            balance: null,
            isLoading: false,
            error: e instanceof Error ? e.message : 'Balance fetch failed',
          });
        }
      }
    };

    fetchBalance();
    return () => { cancelled = true; };
  }, [address]);

  return state;
}

function formatBalance(wei: bigint): string {
  const eth = parseFloat(ethers.formatEther(wei));
  const THRESHOLD = 0.0001;
  if (eth > 0 && eth < THRESHOLD) return '< 0.0001';
  return eth.toFixed(4);
}
```

### Pattern 2: BalanceSkeleton with animate-pulse
**What:** A `View` with NativeWind `animate-pulse` class. NativeWind v4 auto-wraps animated components via `react-native-css-interop` using Reanimated under the hood.
**When to use:** While `useBalance` returns `isLoading: true`.
**Example:**
```typescript
// Source: NativeWind v4 docs https://www.nativewind.dev/docs/tailwind/transitions-animation/animation
// UI-SPEC: w-40 h-9 rounded-lg bg-gray-200 animate-pulse
import { View } from 'react-native';

export function BalanceSkeleton() {
  return (
    <View className="w-40 h-9 rounded-lg bg-gray-200 animate-pulse" />
  );
}
```

**Fallback (if animate-pulse misbehaves on device):**
```typescript
// React Native built-in Animated API — stable, no experimental risk
import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

export function BalanceSkeleton() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={{ opacity }}
      className="w-40 h-9 rounded-lg bg-gray-200"
    />
  );
}
```

### Pattern 3: BalanceDisplay integration in ConnectedScreen
**What:** Conditional render — skeleton while loading, display when loaded, gray fallback text on error.
**When to use:** Always in ConnectedScreen after Phase 3.
**Example:**
```typescript
// Inserted between network label and address card in ConnectedScreen's gap-6 column
import { useBalance } from '../hooks/use-balance';
import { BalanceDisplay } from './BalanceDisplay';
import { BalanceSkeleton } from './BalanceSkeleton';

// Inside ConnectedScreen's View column:
{isLoading
  ? <BalanceSkeleton />
  : <BalanceDisplay balance={balance} error={error} />
}
```

### Anti-Patterns to Avoid
- **Extending wallet Zustand store with balance:** Balance is ephemeral, not needed outside ConnectedScreen, and tied to mount lifecycle. Adding it to global store adds unnecessary complexity.
- **Using ethers.formatEther result directly as display string:** `formatEther` returns variable decimal places (e.g., "1.234", "0.0"). Always run through `parseFloat.toFixed(4)` to normalize.
- **Forgetting the cancellation flag in useEffect:** Without `cancelled = true` on cleanup, a slow RPC response after unmount will call `setState` on an unmounted component.
- **Creating a new JsonRpcProvider on every render:** Instantiate inside `useEffect`, not at module scope or component body — React Compiler + StrictMode double-invocation would create two providers.
- **Using Intl.NumberFormat for formatting:** Default config adds thousand separators. Spec requires no separators. `toFixed(4)` is simpler and correct.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wei → ETH conversion | Custom BigInt division | `ethers.formatEther(bigint)` | ETH has 18 decimals; integer division with BigInt is verbose; formatEther handles precision correctly |
| Pulse animation | Manual Animated timing sequence | `animate-pulse` NativeWind class (with Animated fallback) | One className; NativeWind handles Reanimated integration |
| RPC JSON-RPC calls | fetch() to Infura manually | `ethers.JsonRpcProvider` | Provider handles request batching, retries, error normalization, and typed responses |

**Key insight:** ethers.js abstracts all RPC protocol details. `getBalance` accepts an address string and returns a typed bigint — there is no value in calling `eth_getBalance` manually.

---

## Common Pitfalls

### Pitfall 1: StaticJsonRpcProvider does not exist in ethers v6
**What goes wrong:** Copy-pasting ethers v5 patterns — `new ethers.StaticJsonRpcProvider(url)` throws `TypeError: ethers.StaticJsonRpcProvider is not a constructor` at runtime.
**Why it happens:** v5's `StaticJsonRpcProvider` was merged into `JsonRpcProvider` in v6. The static-network behavior is now an option: `{ staticNetwork: true }`.
**How to avoid:** Use `new ethers.JsonRpcProvider(url, undefined, { staticNetwork: true })` for fixed-network connections.
**Warning signs:** TypeScript will not catch this (the constructor isn't in types either); it only fails at runtime.

### Pitfall 2: formatEther returns variable decimal places
**What goes wrong:** Displaying `ethers.formatEther(balance)` directly shows "1.234" instead of "1.2340" — inconsistent UI.
**Why it happens:** `formatEther` returns the minimal string representation ("0.0", "1.234", "1.234567890123456789").
**How to avoid:** Always wrap: `parseFloat(ethers.formatEther(wei)).toFixed(4)`. Apply the "< 0.0001 ETH" threshold check before `toFixed`.

### Pitfall 3: animate-pulse experimental flag in NativeWind v4
**What goes wrong:** The skeleton renders but doesn't animate on device (particularly Android), or crashes on first render.
**Why it happens:** NativeWind v4 marks animation utilities as experimental — they depend on `react-native-css-interop` 0.2.3 + Reanimated 4.1.7 working together. This combination is installed and should work, but the experimental flag signals it may not cover all edge cases.
**How to avoid:** Test on device early. Have the `Animated` API fallback (Pattern 2 above) ready. Switching is a component-level change — the hook and consumer are unaffected.
**Warning signs:** Skeleton renders as static gray rectangle (no animation) — fallback needed.

### Pitfall 4: Missing async cancellation in useEffect
**What goes wrong:** RPC call resolves after component unmounts (e.g., user disconnects mid-fetch) → setState on unmounted component → React warning + potential state corruption.
**Why it happens:** `provider.getBalance()` is async; component lifecycle can change during the await.
**How to avoid:** Set `let cancelled = false` before the async call; check `if (!cancelled)` before `setState`; return cleanup `() => { cancelled = true; }` from useEffect.

### Pitfall 5: Infura RPC URL contains the Project ID as a secret
**What goes wrong:** Infura RPC URLs are `https://mainnet.infura.io/v3/{PROJECT_ID}`. This is already in `ENV.INFURA_RPC_URL` — use it as-is. Don't try to construct the URL from parts.
**Why it happens:** Infura endpoint format requires auth embedded in URL path.
**How to avoid:** Use `ENV.INFURA_RPC_URL` directly; it's already validated by `assertEnv` at app boot.

---

## Code Examples

Verified patterns from official sources and local codebase:

### Wei to ETH formatting (verified locally with ethers 6.16.0)
```typescript
// Source: verified with ethers 6.16.0 in this project
import { ethers } from 'ethers';

function formatBalance(wei: bigint): string {
  const eth = parseFloat(ethers.formatEther(wei));
  const THRESHOLD = 0.0001;
  if (eth > 0 && eth < THRESHOLD) return '< 0.0001';
  return eth.toFixed(4);
}

// Verified outputs:
// 0n                    -> "0.0000"
// 1n                    -> "< 0.0001"
// 100000000000000n      -> "0.0001"    (exactly at threshold)
// 1230000000000000000n  -> "1.2300"
// 1234567800000000000n  -> "1.2346"    (toFixed rounds)
// 1234567000000000000000n -> "1234.5670" (no thousand separator)
```

### JsonRpcProvider with staticNetwork (ethers v6)
```typescript
// Source: https://docs.ethers.org/v6/api/providers/jsonrpc/ + GitHub discussion #3994
import { ethers } from 'ethers';

// CORRECT for v6 — staticNetwork avoids extra eth_chainId call
const provider = new ethers.JsonRpcProvider(
  ENV.INFURA_RPC_URL,
  undefined,           // network: undefined = auto-detect once, or pass network object
  { staticNetwork: true },
);

// WRONG — does not exist in v6
// const provider = new ethers.StaticJsonRpcProvider(url);
```

### getBalance usage (ethers v6)
```typescript
// Source: https://docs.ethers.org/v6/getting-started/
const balanceWei: bigint = await provider.getBalance(address);
// Returns native BigInt (not BigNumber from v5)
// Example: 4085267032476673080n
```

### ConnectedScreen insertion point
```typescript
// Source: src/features/wallet/components/ConnectedScreen.tsx (existing)
// Insert between these two existing elements:
// 1. <Text className="text-xs text-green-600 text-center">Connected to Ethereum Mainnet</Text>
// [INSERT BALANCE HERE]
// 2. <View className="bg-gray-100 rounded-xl p-4 w-full flex-row items-center gap-2">
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ethers.BigNumber` from v5 | Native JS `bigint` | ethers v6 (2023) | `formatEther` takes `bigint`, not `BigNumber`; no `.toString()` conversion needed |
| `StaticJsonRpcProvider` | `JsonRpcProvider` + `{ staticNetwork: true }` | ethers v6 (2023) | Constructor name changed; passing option instead |
| `provider.getHistory()` | Etherscan API (Phase 4) | ethers v6 (2023) | `getHistory` removed in v6 — not relevant for Phase 3 (balance only) |

**Deprecated/outdated:**
- `ethers.BigNumber`: Removed in v6. All amounts are native `bigint`.
- `ethers.StaticJsonRpcProvider`: Does not exist in v6. Use `JsonRpcProvider` with `{ staticNetwork: true }`.

---

## Open Questions

1. **animate-pulse reliability on the target device/emulator**
   - What we know: NativeWind v4 marks it experimental; Reanimated 4.1.7 is installed and powers it
   - What's unclear: Whether it works without issues on the Android emulator used in this project
   - Recommendation: Plan tasks so `BalanceSkeleton` is implemented with `animate-pulse` first, with an explicit note to swap to the `Animated` API fallback if animation doesn't appear during manual testing

2. **JsonRpcProvider network detection on Hermes**
   - What we know: A GitHub issue (#4377) reported `JsonRpcProvider` failing to detect network on some React Native setups; `staticNetwork: true` is the fix
   - What's unclear: Whether `staticNetwork: true` is fully compatible with the Hermes JS engine and the polyfills loaded in `appkit.ts`
   - Recommendation: Use `{ staticNetwork: true }` in the plan as the default. If network detection errors appear in logs, the fallback is to pass the network object explicitly: `new ethers.JsonRpcProvider(url, { chainId: 1, name: 'homestead' }, { staticNetwork: true })`

---

## Validation Architecture

`workflow.nyquist_validation` key is absent from `.planning/config.json` — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, no vitest.config, no test scripts in package.json |
| Config file | None — Wave 0 must install |
| Quick run command | N/A — see Wave 0 Gaps |
| Full suite command | N/A — see Wave 0 Gaps |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BAL-01 | `formatBalance(0n)` returns `"0.0000"` | unit | `jest --testPathPattern=use-balance -t "formatBalance"` | Wave 0 |
| BAL-01 | `formatBalance(1n)` returns `"< 0.0001"` | unit | `jest --testPathPattern=use-balance -t "formatBalance dust"` | Wave 0 |
| BAL-01 | `formatBalance(100000000000000n)` returns `"0.0001"` | unit | `jest --testPathPattern=use-balance -t "threshold"` | Wave 0 |
| BAL-01 | `formatBalance(1230000000000000000n)` returns `"1.2300"` | unit | `jest --testPathPattern=use-balance -t "fixed decimals"` | Wave 0 |
| BAL-01 | Skeleton renders when isLoading | component | manual-only (no RN test runner) | — |
| BAL-01 | BalanceDisplay renders formatted ETH | component | manual-only (no RN test runner) | — |

**Note:** The `formatBalance` pure function is unit-testable in isolation (no React Native dependency). The skeleton/display rendering requires a device/emulator — manual testing only until a Jest + React Native Testing Library setup is added.

### Sampling Rate
- **Per task commit:** `jest --testPathPattern=use-balance` (once Wave 0 adds the framework)
- **Per wave merge:** same
- **Phase gate:** `formatBalance` unit tests green + manual verification of skeleton and balance display on emulator

### Wave 0 Gaps
- [ ] No test framework present in project — install jest + @testing-library/react-native if automated unit tests are wanted for `formatBalance`. If the project intentionally has no test suite, document this decision and mark BAL-01 as manual-only.
- [ ] `src/features/wallet/hooks/__tests__/use-balance.test.ts` — covers `formatBalance` unit cases
- [ ] Framework install (if adding): `npm install --save-dev jest @testing-library/react-native jest-expo`

---

## Sources

### Primary (HIGH confidence)
- Verified locally with `node -e` against `ethers` 6.16.0 in this project — formatEther behavior, getBalance existence, StaticJsonRpcProvider absence
- [ethers v6 getting-started](https://docs.ethers.org/v6/getting-started/) — getBalance API, formatEther usage, BigInt return type
- [NativeWind v4 animation docs](https://www.nativewind.dev/docs/tailwind/transitions-animation/animation) — animate-pulse experimental status, Reanimated dependency
- Existing source code: `src/lib/appkit.ts`, `src/config/env.ts`, `src/features/wallet/stores/wallet-store.ts`, `src/features/wallet/hooks/use-wallet-connection.ts`, `src/features/wallet/components/ConnectedScreen.tsx`
- `.planning/phases/03-balance-display/03-UI-SPEC.md` — approved visual contract (w-40 h-9 skeleton, text-3xl font-semibold balance)

### Secondary (MEDIUM confidence)
- [ethers GitHub discussion #3994](https://github.com/ethers-io/ethers.js/discussions/3994) — StaticJsonRpcProvider removed in v6, staticNetwork option confirmed
- [NativeWind DeepWiki](https://deepwiki.com/nativewind/nativewind/4.4-animations-and-transitions) — animate-pulse described as predefined animation utility; Reanimated integration details

### Tertiary (LOW confidence)
- [ethers GitHub issue #4377](https://github.com/ethers-io/ethers.js/issues/4377) — JsonRpcProvider network detection failures in React Native; `staticNetwork: true` cited as fix (single issue report, not official docs)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — ethers 6.16.0 verified locally; all packages already installed
- Architecture: HIGH — follows existing patterns in features/wallet/hooks/ and components/; formatting logic verified with actual inputs
- Pitfalls: HIGH for ethers v6 API changes (verified); MEDIUM for animate-pulse experimental behavior (verified docs, untested on device)

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (ethers v6 and NativeWind v4 are stable releases; animate-pulse experimental status may change in NativeWind v5)
