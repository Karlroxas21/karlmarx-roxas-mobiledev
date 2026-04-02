# Architecture Research

**Domain:** Ethereum Wallet Viewer — React Native / Expo (Bulletproof React)
**Researched:** 2026-04-01
**Confidence:** MEDIUM-HIGH (core patterns HIGH, polyfill behavior MEDIUM)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Screen Layer (app/)                        │
│  ┌──────────────────┐  ┌──────────────────┐                      │
│  │  index.tsx        │  │  wallet.tsx       │  (thin route files)  │
│  │  (connect gate)   │  │  (dashboard)      │                      │
│  └────────┬──────────┘  └────────┬──────────┘                    │
├───────────┴────────────────────────┴─────────────────────────────┤
│                      Feature Layer (features/)                    │
│  ┌──────────────────────────┐  ┌───────────────────────────┐     │
│  │  features/wallet/         │  │  features/transactions/   │     │
│  │  components/              │  │  components/              │     │
│  │  hooks/                   │  │  hooks/                   │     │
│  │  stores/wallet-store.ts   │  │  stores/tx-store.ts       │     │
│  │  api/                     │  │  api/                     │     │
│  │  types/                   │  │  types/                   │     │
│  └──────────┬───────────────┘  └───────────┬───────────────┘     │
├─────────────┴──────────────────────────────┴─────────────────────┤
│                      Shared Layer (lib/ / providers/)             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │  lib/ethers.ts    │  │  lib/appkit.ts   │  │  providers/    │  │
│  │  (provider setup) │  │  (AppKit config) │  │  app-provider  │  │
│  └──────────────────┘  └──────────────────┘  └────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│                    External / Protocol Layer                       │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────────────────┐ │
│  │  WalletConnect│   │  Ethereum RPC │   │  Etherscan REST API   │ │
│  │  (Reown SDK)  │   │  (Alchemy /   │   │  (tx history)         │ │
│  └──────────────┘   │   Infura)     │   └───────────────────────┘ │
│                      └──────────────┘                             │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component                    | Responsibility                                                                                     | Implementation                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `src/app/index.tsx`          | Route gate — show ConnectScreen or redirect to wallet                                              | Thin wrapper, reads `useWalletStore`           |
| `src/app/wallet.tsx`         | Dashboard route — balance + tx list                                                                | Thin wrapper, composes feature components      |
| `features/wallet/`           | Everything about wallet connection and balance                                                     | Reown AppKit hooks, ethers BrowserProvider     |
| `features/transactions/`     | Transaction history fetching and display                                                           | Etherscan API via `apiClient`, list rendering  |
| `lib/appkit.ts`              | Reown AppKit instance config (singleton)                                                           | `createAppKit()` called once, exported         |
| `lib/ethers.ts`              | ethers.js provider factory                                                                         | `new BrowserProvider(walletProvider, chainId)` |
| `providers/app-provider.tsx` | Root provider tree — add `AppKitProvider` here                                                     | Modified from current stub                     |
| `stores/wallet-store.ts`     | (feature-scoped) Connection state, address, balance                                                | Zustand; derived from AppKit hooks             |
| `stores/tx-store.ts`         | (feature-scoped) Transaction list + loading state                                                  | Zustand slice                                  |
| `config/env.ts`              | Add `EXPO_PUBLIC_ALCHEMY_URL`, `EXPO_PUBLIC_ETHERSCAN_KEY`, `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID` | Extend existing file                           |

---

## Recommended Project Structure

Only new files and modified files are shown. Unchanged existing files are omitted.

```
src/
├── app/
│   ├── _layout.tsx              # MODIFIED — no functional change needed
│   ├── index.tsx                # MODIFIED — connection gate logic
│   └── wallet.tsx               # NEW — dashboard screen (balance + txs)
│
├── config/
│   └── env.ts                   # MODIFIED — add WC project ID, Alchemy URL, Etherscan key
│
├── features/
│   ├── wallet/                  # NEW feature module
│   │   ├── api/
│   │   │   └── get-balance.ts   # ethers.js getBalance() wrapper
│   │   ├── components/
│   │   │   ├── ConnectButton.tsx        # AppKit <AppKitButton /> wrapper or custom
│   │   │   ├── WalletBalance.tsx        # Displays ETH balance
│   │   │   └── ConnectionStatus.tsx     # Connected/disconnected indicator
│   │   ├── hooks/
│   │   │   ├── use-wallet-connection.ts # Wraps useAccount() + useAppKit()
│   │   │   └── use-eth-balance.ts       # Fetches balance via ethers provider
│   │   ├── stores/
│   │   │   └── wallet-store.ts          # address, isConnected, balance, status
│   │   └── types/
│   │       └── index.ts                 # WalletState, ConnectionStatus types
│   │
│   └── transactions/            # NEW feature module
│       ├── api/
│       │   └── get-transactions.ts  # Etherscan API call (last 10 txs)
│       ├── components/
│       │   ├── TransactionList.tsx   # FlatList of transactions
│       │   └── TransactionItem.tsx   # Single row — hash, value, timestamp
│       ├── hooks/
│       │   └── use-transactions.ts   # Fetch + cache tx history
│       ├── stores/
│       │   └── tx-store.ts           # transactions[], isLoading, error
│       └── types/
│           └── index.ts              # Transaction type
│
├── lib/
│   ├── api-client.ts            # UNCHANGED — used for Etherscan calls
│   ├── appkit.ts                # NEW — createAppKit() singleton
│   └── ethers.ts                # NEW — provider factory function
│
└── providers/
    └── app-provider.tsx         # MODIFIED — wrap with AppKitProvider
```

### Structure Rationale

- **`features/wallet/`** owns the WalletConnect flow. It does not reach into `features/transactions/`. Keeps connection concerns separate from data concerns.
- **`features/transactions/`** only needs a wallet address as input (from the wallet store). Fully decoupled from the connection mechanism.
- **`lib/appkit.ts`** creates the AppKit singleton outside React. This is the recommended Reown pattern — `createAppKit()` must be called before any hooks are used, so it belongs in lib not in a component.
- **`lib/ethers.ts`** is a thin factory. Components never instantiate `BrowserProvider` directly — they call `createEthersProvider(walletProvider, chainId)`. This keeps test seams clean.
- **Feature stores live in `features/<name>/stores/`** per the Bulletproof React rule in `CLAUDE.md`. Global `src/stores/` is reserved for truly cross-cutting state (currently only `app-store.ts`).

---

## Architectural Patterns

### Pattern 1: AppKit Singleton + Provider Wrapper

**What:** `createAppKit()` is called once in `lib/appkit.ts` at module load time and exported. `AppKitProvider` wraps the app in `app-provider.tsx`. All components consume hooks from `@reown/appkit-react-native`.

**When to use:** Always — this is the mandated Reown pattern. Calling `createAppKit()` inside a component causes re-initialization on every render.

**Trade-offs:** Singleton makes testing harder. Mitigate with a factory function that accepts config overrides in tests.

```typescript
// src/lib/appkit.ts
import '@walletconnect/react-native-compat'; // MUST be first import in this file
import { createAppKit } from '@reown/appkit-react-native';
import { EthersAdapter } from '@reown/appkit-ethers-react-native';
import { mainnet } from 'viem/chains';
import { ENV } from '@/src/config/env';

const ethersAdapter = new EthersAdapter();

export const appKit = createAppKit({
  projectId: ENV.WALLETCONNECT_PROJECT_ID,
  networks: [mainnet],
  adapters: [ethersAdapter],
  metadata: {
    name: 'Ethereum Wallet Viewer',
    description: 'View your ETH balance and transactions',
    url: 'https://yourapp.com',
    icons: [],
  },
});
```

### Pattern 2: Feature Hook Wrapping AppKit Hooks

**What:** Feature-specific hooks (`use-wallet-connection.ts`, `use-eth-balance.ts`) wrap the raw Reown hooks. Components never call Reown hooks directly.

**When to use:** Always. This creates a stable internal API that survives SDK upgrades and allows unit testing without the Reown context.

**Trade-offs:** One extra indirection layer. Worth it for any non-trivial app.

```typescript
// src/features/wallet/hooks/use-wallet-connection.ts
import { useAccount, useAppKit } from '@reown/appkit-react-native';
import { useWalletStore } from '../stores/wallet-store';

export function useWalletConnection() {
  const { address, isConnected } = useAccount();
  const { open, disconnect } = useAppKit();
  const { setWallet, clearWallet } = useWalletStore();

  // Sync AppKit state → Zustand store when it changes
  // (see Pattern 3 below for sync strategy)

  return { address, isConnected, connect: open, disconnect };
}
```

### Pattern 3: Zustand as Derived Cache, Not Source of Truth

**What:** Reown AppKit owns the canonical wallet connection state. Zustand's `wallet-store` is a derived cache — it mirrors AppKit state for convenient access across the component tree without prop drilling.

**When to use:** Any state that originates externally (wallet provider, balance) but needs to be read in many places.

**Trade-offs:** Two sources of truth risk divergence. Prevent this by syncing in a single `useEffect` in a hook called exactly once (near the root, inside `AppProvider`).

```typescript
// src/features/wallet/hooks/use-wallet-sync.ts
// Called once in app-provider.tsx to keep Zustand in sync with AppKit
import { useEffect } from 'react';
import { useAccount } from '@reown/appkit-react-native';
import { useWalletStore } from '../stores/wallet-store';

export function useWalletSync() {
  const { address, isConnected } = useAccount();
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

### Pattern 4: Etherscan API via Existing apiClient

**What:** Transaction history is fetched from Etherscan REST API using the existing `src/lib/api-client.ts`. The Etherscan base URL goes into `config/env.ts`. No new HTTP client needed.

**When to use:** For transaction history. Do not use ethers.js provider for tx history — providers only expose `getTransactionCount`, not full lists.

**Trade-offs:** Requires a separate Etherscan API key. Free tier supports 5 req/sec, which is more than enough for v1 (single user, on-demand fetches).

```typescript
// src/features/transactions/api/get-transactions.ts
import { apiClient } from '@/src/lib/api-client';
import type { Transaction } from '../types';

export function getTransactions(address: string) {
  return apiClient<EtherscanTxListResponse>(
    `/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=${ENV.ETHERSCAN_API_KEY}`,
  );
}
```

Note: `apiClient` must be pointed at `https://api.etherscan.io` for Etherscan calls, not the app's own backend. This requires either a separate client instance or a URL override parameter.

---

## Zustand Store Design

### `features/wallet/stores/wallet-store.ts`

```typescript
import { create } from 'zustand';

type WalletStatus = 'idle' | 'connecting' | 'connected' | 'error';

type WalletState = {
  address: string | null;
  isConnected: boolean;
  status: WalletStatus;
  balance: string | null; // formatted ETH string e.g. "1.234"
  balanceError: string | null;
  // Actions
  setWallet: (wallet: { address: string; isConnected: boolean }) => void;
  clearWallet: () => void;
  setBalance: (balance: string) => void;
  setBalanceError: (error: string | null) => void;
  setStatus: (status: WalletStatus) => void;
};

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  isConnected: false,
  status: 'idle',
  balance: null,
  balanceError: null,
  setWallet: ({ address, isConnected }) =>
    set({ address, isConnected, status: 'connected' }),
  clearWallet: () =>
    set({ address: null, isConnected: false, balance: null, status: 'idle' }),
  setBalance: (balance) => set({ balance, balanceError: null }),
  setBalanceError: (error) => set({ balanceError: error }),
  setStatus: (status) => set({ status }),
}));
```

**Do not persist this store with AsyncStorage.** Wallet connection state is owned by AppKit (and ultimately the wallet app). Re-reading it on each launch from AppKit's own persisted session is more reliable.

### `features/transactions/stores/tx-store.ts`

```typescript
import { create } from 'zustand';
import type { Transaction } from '../types';

type TxState = {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  lastFetchedAddress: string | null;
  // Actions
  setTransactions: (txs: Transaction[], address: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearTransactions: () => void;
};

export const useTxStore = create<TxState>((set) => ({
  transactions: [],
  isLoading: false,
  error: null,
  lastFetchedAddress: null,
  setTransactions: (transactions, address) =>
    set({ transactions, lastFetchedAddress: address, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  clearTransactions: () =>
    set({ transactions: [], lastFetchedAddress: null, error: null }),
}));
```

`lastFetchedAddress` prevents refetching when the wallet screen remounts but the address hasn't changed.

---

## Data Flow

### Wallet Connection Flow

```
User taps "Connect Wallet"
    ↓
ConnectButton.tsx → calls open() from useWalletConnection()
    ↓
Reown AppKit SDK opens wallet selection modal (built-in UI)
    ↓
User selects MetaMask or WalletConnect-compatible wallet
    ↓
AppKit establishes WalletConnect v2 session
    ↓
useWalletSync (running in AppProvider) detects address/isConnected change
    ↓
Zustand wallet-store updated: { address, isConnected: true, status: 'connected' }
    ↓
WalletBalance component re-renders → triggers use-eth-balance hook
    ↓
use-eth-balance: useProvider() → new BrowserProvider(walletProvider, chainId)
                              → provider.getBalance(address)
                              → formatEther(balance) → store.setBalance()
    ↓
WalletBalance displays formatted ETH amount
```

### Transaction History Flow

```
Wallet dashboard mounts with connected address
    ↓
use-transactions hook checks: txStore.lastFetchedAddress === current address?
    ↓ (no — first load or address changed)
setLoading(true) → getTransactions(address) via apiClient → Etherscan API
    ↓
Response: EtherscanTxListResponse.result[] (array of raw tx objects)
    ↓
Transform raw tx → Transaction type (format value, timestamp, truncate hash)
    ↓
setTransactions(txs, address) → useTxStore updated
    ↓
TransactionList renders FlatList from store
```

### Error Flow

```
API/network failure at any stage
    ↓
catch block in hook → setError(message) or setBalanceError(message)
    ↓
Component reads error from store → renders error state with retry action
    ↓
User taps "Retry" → hook re-executes fetch
```

### State Management Summary

```
Reown AppKit (external SDK state)
    ↓ synced via useWalletSync hook (runs once in AppProvider)
Zustand wallet-store (reactive, in-memory)
    ↓ read by
WalletBalance, ConnectionStatus components
    ↓ triggers
use-eth-balance hook → ethers.js provider.getBalance()
    ↓ writes back to
wallet-store.balance

wallet-store.address
    ↓ passed as input to
use-transactions hook → Etherscan API fetch
    ↓ writes to
tx-store.transactions
    ↓ read by
TransactionList component
```

---

## Integration Points

### External Services

| Service                             | Integration Pattern                                                                                         | Notes                                                                        |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| WalletConnect v2 (via Reown AppKit) | `@reown/appkit-react-native` + `@reown/appkit-ethers-react-native` — provides modal UI + session management | Requires `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID` from cloud.reown.com         |
| Ethereum RPC (Alchemy or Infura)    | `ethers.JsonRpcProvider` for read-only calls; `BrowserProvider(walletProvider)` for wallet-signed calls     | `EXPO_PUBLIC_ALCHEMY_URL` in env.ts. Alchemy free tier is sufficient for v1. |
| Etherscan API                       | REST via existing `apiClient` (or a separate Etherscan client instance)                                     | `EXPO_PUBLIC_ETHERSCAN_API_KEY` required. Free tier: 5 req/sec, 10K req/day. |
| MetaMask                            | Handled natively by Reown AppKit — no separate integration needed                                           | AppKit's modal includes MetaMask deep-link support on mobile.                |

### Internal Boundaries

| Boundary                                      | Communication                                                                                  | Notes                                                                                                                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features/wallet` ↔ `features/transactions`   | `features/transactions` reads `address` from `wallet-store` via import                         | Only this one cross-boundary read is acceptable under Bulletproof React rules; prefer passing address as a prop or parameter instead to keep features fully decoupled |
| `lib/appkit.ts` ↔ `features/wallet`           | Feature hooks import AppKit hooks; `lib/appkit.ts` export used in `providers/app-provider.tsx` | lib is shared, features import from it — correct dependency direction                                                                                                 |
| `providers/app-provider.tsx` ↔ both features  | Provider calls `useWalletSync()` hook from `features/wallet`                                   | Only one place for this sync; acceptable to import from feature into provider                                                                                         |
| `features/transactions` ↔ `lib/api-client.ts` | Direct function call                                                                           | `api-client` is shared lib — correct                                                                                                                                  |

**Preferred decoupling for transactions:** Pass `address` from the wallet screen to the transaction hook as a parameter rather than having the transaction feature read from the wallet store directly. This eliminates cross-feature store imports entirely.

```typescript
// In app/wallet.tsx (screen):
const { address } = useWalletStore();
// ...
<TransactionList address={address} />

// In TransactionList.tsx:
export function TransactionList({ address }: { address: string }) {
  const txs = useTransactions(address);
  // ...
}
```

---

## Polyfill and Bootstrap Order

This is the most critical setup detail. Order of imports in `lib/appkit.ts` (or wherever AppKit is configured) must be:

```
1. import '@walletconnect/react-native-compat'   ← absolute first line
2. import 'react-native-get-random-values'        ← before ethers or uuid
3. Optionally: register react-native-quick-crypto primitives with ethers
4. All other imports
```

AppKit config file is imported in `providers/app-provider.tsx`. Ensure `app-provider.tsx` imports `lib/appkit.ts` at the top before any other local imports.

---

## Suggested Build Order

Dependencies drive this order. Each phase unblocks the next.

### Phase 1 — Foundation and Polyfills (prerequisite for everything)

Install packages, configure polyfills and Babel, extend `config/env.ts`, create `lib/appkit.ts` singleton, modify `providers/app-provider.tsx` to wrap with `AppKitProvider`.

**Why first:** Without this foundation, no wallet hooks work. Nothing else can be built or tested.

Deliverable: App boots without polyfill errors. AppKit provider is in the tree.

### Phase 2 — Wallet Connection UI

Build `features/wallet/` — connection hook, `useWalletSync`, wallet store, `ConnectButton` and `ConnectionStatus` components. Update `app/index.tsx` to gate on connection state.

**Why second:** Balance and transaction features depend on having a connected address. Connection must exist before fetching.

Deliverable: User can tap "Connect", wallet modal opens, address appears on screen.

### Phase 3 — Balance Display

Build `use-eth-balance` hook and `WalletBalance` component. Create `lib/ethers.ts` provider factory. Add `app/wallet.tsx` screen. Wire balance display into wallet dashboard.

**Why third:** Requires connected address from Phase 2. Validates that ethers.js provider works through the WalletConnect session.

Deliverable: Connected user sees their ETH balance.

### Phase 4 — Transaction History

Build `features/transactions/` — Etherscan API call, `use-transactions` hook, tx store, `TransactionList` and `TransactionItem` components. Configure Etherscan base URL in `env.ts`.

**Why fourth:** Requires a connected address (Phase 2) and a working screen to mount onto (Phase 3). Entirely independent of the ethers.js balance fetch.

Deliverable: Last 10 transactions visible below balance.

### Phase 5 — Error Handling Pass

Audit all async paths (connection, balance fetch, tx fetch). Add error state rendering and retry actions to all components. Test with invalid API keys, airplane mode, rejected wallet connection.

**Why last:** Error handling is a cross-cutting concern best applied after the happy path is confirmed working. Retrofitting error handling is less error-prone than trying to build it alongside the initial feature code.

Deliverable: App shows meaningful errors and retry options for all failure cases.

---

## Anti-Patterns

### Anti-Pattern 1: Calling createAppKit() Inside a Component

**What people do:** Import and call `createAppKit(...)` inside a React component body or `useEffect`.

**Why it's wrong:** Reinitializes the WalletConnect session on every render. Causes duplicate modals, dropped connections, and memory leaks.

**Do this instead:** Call `createAppKit()` once in `src/lib/appkit.ts` at module scope. Import the result where needed.

### Anti-Pattern 2: Importing Wallet Feature Into Transaction Feature

**What people do:** `import { useWalletStore } from '@/src/features/wallet/stores/wallet-store'` inside `features/transactions/`.

**Why it's wrong:** Violates Bulletproof React's rule that features must not import from other features. Creates invisible coupling that breaks as either feature evolves.

**Do this instead:** Pass `address` as a prop or function parameter from the screen layer (`app/wallet.tsx`) down to the transaction components. Screen layer is allowed to compose from multiple features.

### Anti-Pattern 3: Persisting Wallet Connection in Zustand AsyncStorage

**What people do:** Add `persist` middleware to `wallet-store.ts` to remember the connected address across launches.

**Why it's wrong:** Reown AppKit already persists its own session in AsyncStorage. Duplicating this in Zustand creates stale state bugs — the Zustand address could disagree with the actual AppKit session after a user disconnects from their wallet app directly.

**Do this instead:** On app launch, let AppKit restore its session. `useWalletSync` will populate Zustand once the AppKit session is ready. No manual persistence needed.

### Anti-Pattern 4: Using ethers.js JsonRpcProvider for Transaction History

**What people do:** Call `provider.getTransactionCount()` or iterate blocks to build transaction history using the RPC provider.

**Why it's wrong:** Ethereum RPC nodes do not support querying all transactions for an address. `getTransactionCount` only returns a count. Fetching real history requires indexing services.

**Do this instead:** Use the Etherscan API (`?module=account&action=txlist&address=...`) which is designed exactly for this. This is a free REST call, not a blockchain RPC call.

### Anti-Pattern 5: Missing Polyfill Import Order

**What people do:** Import `ethers` or `@reown/appkit-react-native` before `@walletconnect/react-native-compat`.

**Why it's wrong:** WalletConnect's compat module patches the global environment. Missing it causes cryptographic random source errors at runtime ("missing secure random source") that are difficult to debug and platform-specific.

**Do this instead:** Make `@walletconnect/react-native-compat` the absolute first import in `lib/appkit.ts`. Add a comment explaining why the order is load-bearing.

---

## Scaling Considerations

This is a read-only, single-user mobile app. Scaling is not a primary concern for v1. The realistic bottlenecks are rate limits on third-party APIs.

| Scale                     | Architecture Adjustments                                                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single user (v1)          | Direct Etherscan + Alchemy API calls. No caching layer needed. Free tiers are sufficient.                                                                                        |
| Multiple wallets per user | Extend `wallet-store` to hold an array of addresses. Tx store needs to key by address.                                                                                           |
| Multi-chain support (v2+) | Extend AppKit config with additional chains. `wallet.tsx` needs chain selector. Etherscan replaced with chain-specific block explorer APIs or a unified provider like The Graph. |
| ERC-20 tokens             | Add `features/tokens/` feature. Use Etherscan token endpoints or Alchemy Token API. No architectural change to existing features.                                                |

### Scaling Priorities

1. **First bottleneck — Etherscan rate limit (5 req/sec):** Add debouncing to `use-transactions` so rapid remounts don't spam the API. Cache txs in the store with `lastFetchedAddress` check (already designed above).
2. **Second bottleneck — Alchemy free tier (300M compute units/month):** Balance is fetched on demand (not polling), so this is unlikely to be hit in v1.

---

## New vs. Modified Files Summary

| File                             | Status                        | Notes                                        |
| -------------------------------- | ----------------------------- | -------------------------------------------- |
| `src/app/index.tsx`              | MODIFIED                      | Add connection gate logic                    |
| `src/app/wallet.tsx`             | NEW                           | Dashboard screen                             |
| `src/app/_layout.tsx`            | UNCHANGED                     | No changes needed                            |
| `src/config/env.ts`              | MODIFIED                      | Add 3 new env vars                           |
| `src/providers/app-provider.tsx` | MODIFIED                      | Wrap with AppKitProvider, call useWalletSync |
| `src/lib/appkit.ts`              | NEW                           | createAppKit singleton                       |
| `src/lib/ethers.ts`              | NEW                           | Provider factory                             |
| `src/lib/api-client.ts`          | UNCHANGED OR LIGHTLY MODIFIED | May need base URL override for Etherscan     |
| `src/features/wallet/`           | NEW                           | Entire feature module                        |
| `src/features/transactions/`     | NEW                           | Entire feature module                        |
| `src/stores/app-store.ts`        | UNCHANGED                     | Global store stays as-is                     |
| `src/utils/storage.ts`           | UNCHANGED                     | No new persistence needed                    |

---

## Sources

- [Reown AppKit React Native Installation](https://docs.reown.com/appkit/react-native/core/installation) — official Reown docs, current 2025
- [Reown AppKit React Native Hooks](https://docs.reown.com/appkit/react-native/core/hooks) — `useAccount`, `useProvider`, `useAppKit` hook API
- [Reown AppKit Ethers: Send Transaction + Get Balance](https://docs.reown.com/appkit/recipes/ethers-send-transaction) — BrowserProvider usage pattern
- [ethers.js v6 React Native / Quick Crypto](https://docs.ethers.org/v6/cookbook/react-native/) — official ethers v6 RN setup
- [Etherscan API: Get Address Transaction History](https://docs.etherscan.io/etherscan-v2/get-an-addresss-full-transaction-history) — REST endpoint reference
- [reown-com/appkit-react-native GitHub](https://github.com/reown-com/appkit-react-native) — SDK source and examples
- [reown-com/react-native-examples GitHub](https://github.com/reown-com/react-native-examples) — reference implementations
- [Bulletproof React Architecture](https://github.com/alan2207/bulletproof-react) — feature-based structure conventions
- [Zustand persist with AsyncStorage — React Native](https://github.com/pmndrs/zustand/issues/394) — community pattern, MEDIUM confidence

---

_Architecture research for: Ethereum Wallet Viewer (Expo SDK 54 + Bulletproof React)_
_Researched: 2026-04-01_
