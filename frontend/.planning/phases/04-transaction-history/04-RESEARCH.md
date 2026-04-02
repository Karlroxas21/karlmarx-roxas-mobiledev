# Phase 4: Transaction History - Research

**Researched:** 2026-04-02
**Domain:** Etherscan API v2, React Native FlatList, ETH formatting, relative timestamps
**Confidence:** HIGH

## Summary

Phase 4 adds transaction history to a working wallet screen. The three technical concerns are: (1) fetching the last 10 transactions from the Etherscan API v2, (2) restructuring ConnectedScreen from a centered View to a FlatList so transactions render below the existing balance/address header, and (3) implementing pull-to-refresh that re-fetches both balance and transactions simultaneously.

All three concerns have verified patterns. The Etherscan API v2 `txlist` endpoint is well-documented and returns the exact fields needed (hash, from, to, value in Wei, timeStamp as Unix seconds). The FlatList `ListHeaderComponent` + `RefreshControl` pattern is the canonical React Native approach for this layout. The `useBalance` hook is the direct template for the new `useTransactions` hook — same cancelled-flag pattern, same state shape.

**Primary recommendation:** Model `useTransactions` directly on `useBalance`. Wrap both in a coordinated refresh callback in ConnectedScreen. No new libraries needed — ethers.js `formatEther`, native `Intl.RelativeTimeFormat`, and FlatList cover all requirements.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Transaction list layout**

- Compact flat rows, no cards or dividers
- 2-line per row: counterparty address (truncated) on first line, ETH amount + relative timestamp on second line
- Address truncation: 6+4 format (0x1234...abcd) — standard wallet convention
- Tapping a transaction row does nothing (display-only for v1)
- "Transactions (N)" section header above the list showing count of displayed transactions

**Direction indicators**

- Color-coded amount text only — no arrow icons, no text labels
- Incoming: green text with "+" prefix (e.g., "+0.5000 ETH")
- Outgoing: red text with "-" prefix (e.g., "-0.5000 ETH")
- Self-transactions (from === to === user address): neutral gray text, no +/- prefix
- Zero-value transactions (contract interactions with 0 ETH): shown in gray, count toward the 10 transactions
- Counterparty address line shows address only, no "From"/"To" prefix — color already signals direction

**Pull-to-refresh behavior**

- Pull-to-refresh refetches BOTH balance AND transaction list simultaneously
- During refresh: existing data stays visible, native RefreshControl spinner at top
- No skeleton replacement during refresh — skeletons only for initial load
- Convert ConnectedScreen from plain View to FlatList with balance/address as ListHeaderComponent and transactions as FlatList data
- No rate-limiting or throttle on pull-to-refresh — Etherscan free tier (5 req/sec) won't be hit by manual pulls

**Empty & loading states**

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

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID    | Description                                                                                   | Research Support                                                                                                                                                                 |
| ----- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TX-01 | User can view their last 10 transactions with basic details (hash, from/to, value, timestamp) | Etherscan API v2 `txlist` with `offset=10&sort=desc` returns all required fields; ethers.formatEther converts Wei value; Intl.RelativeTimeFormat handles timestamp               |
| TX-02 | User can pull-to-refresh to update balance and transactions                                   | FlatList `refreshControl` prop with `RefreshControl` component; coordinated re-fetch of both `useBalance` and `useTransactions` via shared `refreshing` state in ConnectedScreen |

</phase_requirements>

## Standard Stack

### Core

| Library                     | Version                | Purpose                                          | Why Standard                                                                                             |
| --------------------------- | ---------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| ethers.js                   | v6 (already installed) | `formatEther` for Wei-to-ETH conversion          | Already the project's RPC library; handles bigint-string Wei values from Etherscan                       |
| React Native FlatList       | built-in               | Scrollable transaction list with pull-to-refresh | Only scroll component that supports `refreshControl`, `ListHeaderComponent`, and `keyExtractor` together |
| React Native RefreshControl | built-in               | Native pull-to-refresh spinner                   | Standard RefreshControl; pass to FlatList via `refreshControl` prop                                      |

### Supporting

| Library                   | Version     | Purpose                                  | When to Use                                                       |
| ------------------------- | ----------- | ---------------------------------------- | ----------------------------------------------------------------- |
| `Intl.RelativeTimeFormat` | JS built-in | Relative timestamps ("2h ago", "3d ago") | No library needed; supported in Hermes (React Native's JS engine) |
| `fetch` (global)          | built-in    | Etherscan API HTTP requests              | Same as used everywhere else in the project; no axios             |

### Alternatives Considered

| Instead of                | Could Use             | Tradeoff                                                                                      |
| ------------------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| `Intl.RelativeTimeFormat` | `date-fns` or `dayjs` | Libraries add bundle weight; built-in covers all needed units (seconds, minutes, hours, days) |
| Plain `fetch`             | `axios`               | axios not in project; no benefit for a single GET endpoint                                    |
| FlatList                  | ScrollView + map      | ScrollView has no native `refreshControl` + `ListHeaderComponent` combination                 |

**Installation:** No new packages required — all dependencies are already installed.

## Architecture Patterns

### Component & File Structure

```
src/features/wallet/
├── hooks/
│   └── use-transactions.ts        # NEW — mirrors use-balance.ts pattern
├── components/
│   ├── ConnectedScreen.tsx        # MODIFIED — View -> FlatList restructure
│   ├── TransactionRow.tsx         # NEW — 2-line compact row
│   ├── TransactionSkeleton.tsx    # NEW — 3 pulsing rows for initial load
│   └── [existing files unchanged]
└── types/
    └── index.ts                   # MODIFIED — add Transaction type
```

### Pattern 1: useTransactions Hook (mirrors useBalance)

**What:** Fetch last 10 transactions from Etherscan API v2. Returns `{ transactions, isLoading, error }` state tuple with cancelled-flag abort pattern.

**When to use:** Replaces direct API calls inside components. Called from ConnectedScreen alongside useBalance.

```typescript
// Source: Modeled on src/features/wallet/hooks/use-balance.ts

type TransactionState = {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
};

export function useTransactions(refreshTrigger?: number): TransactionState {
  const address = useWalletStore((s) => s.address);
  const [state, setState] = useState<TransactionState>({
    transactions: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!address) return;

    let cancelled = false;
    setState({ transactions: [], isLoading: true, error: null });

    const url =
      `https://api.etherscan.io/v2/api` +
      `?chainid=1&module=account&action=txlist` +
      `&address=${address}&startblock=0&endblock=latest` +
      `&page=1&offset=10&sort=desc&apikey=${ENV.ETHERSCAN_API_KEY}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          if (data.status === '1') {
            setState({
              transactions: data.result.map(mapEtherscanTx),
              isLoading: false,
              error: null,
            });
          } else {
            // status "0" with message "No transactions found" is the empty-wallet case
            setState({ transactions: [], isLoading: false, error: null });
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setState({
            transactions: [],
            isLoading: false,
            error: e instanceof Error ? e.message : 'Transactions fetch failed',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, refreshTrigger]);

  return state;
}
```

### Pattern 2: ConnectedScreen Pull-to-Refresh Coordination

**What:** ConnectedScreen manages `refreshing` state and passes a shared `refreshTrigger` counter to both hooks. When pull-to-refresh fires, both hooks re-run simultaneously.

**When to use:** Avoids lifting balance state out of `useBalance`; keeps each hook self-contained; triggers simultaneous re-fetch via a shared counter increment.

```typescript
// Source: React Native docs — https://reactnative.dev/docs/flatlist

export function ConnectedScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { balance, isLoading: balanceLoading, error: balanceError } = useBalance(refreshTrigger);
  const { transactions, isLoading: txLoading, error: txError } = useTransactions(refreshTrigger);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((n) => n + 1);
    // Clear refreshing after both hooks settle (simple timeout or Promise.all)
  }, []);

  // Clear refreshing when both hooks finish loading
  useEffect(() => {
    if (!balanceLoading && !txLoading && refreshing) {
      setRefreshing(false);
    }
  }, [balanceLoading, txLoading, refreshing]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <FlatList
        data={txLoading ? [] : transactions}
        keyExtractor={(item) => item.hash}
        renderItem={({ item }) => <TransactionRow tx={item} userAddress={address ?? ''} />}
        ListHeaderComponent={<WalletHeader ... />}
        ListEmptyComponent={txLoading ? <TransactionSkeleton /> : <EmptyTransactions />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
}
```

**Critical layout note:** FlatList parent must have `flex-1` and a defined height or the pull gesture won't register. `SafeAreaView className="flex-1"` satisfies this.

### Pattern 3: Transaction Type and Mapper

**What:** Map the raw Etherscan response fields to a clean internal `Transaction` type.

```typescript
// Add to src/features/wallet/types/index.ts

export type Transaction = {
  hash: string;
  from: string;
  to: string;
  value: string; // Wei string from Etherscan (e.g., "500000000000000000")
  timeStamp: number; // Unix seconds (parsed from Etherscan's string)
  isError: boolean;
};

// Mapper function (in use-transactions.ts or a utils file)
function mapEtherscanTx(raw: EtherscanTx): Transaction {
  return {
    hash: raw.hash,
    from: raw.from.toLowerCase(),
    to: raw.to.toLowerCase(),
    value: raw.value, // Keep as Wei string; format at display time
    timeStamp: parseInt(raw.timeStamp, 10),
    isError: raw.isError === '1',
  };
}
```

### Pattern 4: ETH Amount Formatting for Transactions

**What:** Reuse `formatEther` from ethers.js v6 for transaction values. The `value` field from Etherscan is a Wei string (e.g., `"500000000000000000"`).

```typescript
// Source: src/features/wallet/hooks/use-balance.ts (formatBalance pattern)
import { ethers } from 'ethers';

export function formatTxValue(weiString: string): string {
  if (weiString === '0') return '0';
  const eth = parseFloat(ethers.formatEther(BigInt(weiString)));
  if (eth > 0 && eth < 0.0001) return '< 0.0001';
  return eth.toFixed(4);
}
```

**Key detail:** `ethers.formatEther` accepts `bigint`, not string. Must wrap with `BigInt(weiString)`.

### Pattern 5: Address Truncation (6+4 format)

```typescript
// Standard wallet convention: 0x1234...abcd
export function truncateAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
```

### Pattern 6: Relative Timestamp

```typescript
// Source: MDN — Intl.RelativeTimeFormat
export function formatRelativeTime(unixSeconds: number): string {
  const diffSeconds = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 2592000) return `${Math.floor(diffSeconds / 86400)}d ago`;
  return `${Math.floor(diffSeconds / 2592000)}mo ago`;
}
```

**Why not Intl.RelativeTimeFormat:** The custom implementation above is simpler, 100% predictable, and avoids locale edge cases. `Intl.RelativeTimeFormat` requires choosing the right unit manually anyway.

### Anti-Patterns to Avoid

- **Using `ethers.formatEther(raw.value)` directly:** Etherscan returns value as a string; ethers.js v6 `formatEther` requires a `bigint`. Wrap with `BigInt(raw.value)` first.
- **Checking `data.status === 1` (number):** Etherscan returns `"1"` (string). Compare as string.
- **Treating `data.status === "0"` as an error:** When an address has no transactions, the API returns `status: "0"` with `message: "No transactions found"`. This is a valid empty result, not an error.
- **FlatList without flex-1 parent:** If the parent doesn't fill the screen, pull-to-refresh gesture won't fire. Keep `SafeAreaView className="flex-1"` on the container.
- **Replacing skeletons during refresh:** Per locked decisions, skeletons are initial-load only. During pull-to-refresh, show existing data with the native RefreshControl spinner.
- **FlatList `data` as `undefined`:** Pass an empty array `[]` (not `undefined`) when loading — `undefined` data causes FlatList warnings.

## Don't Hand-Roll

| Problem               | Don't Build            | Use Instead                       | Why                                                      |
| --------------------- | ---------------------- | --------------------------------- | -------------------------------------------------------- |
| Wei-to-ETH conversion | Custom division math   | `ethers.formatEther(BigInt(wei))` | Precision loss with float arithmetic on large Wei values |
| Pull-to-refresh       | Custom gesture handler | `FlatList` + `RefreshControl`     | Native platform behavior, handles iOS bounce physics     |
| Address truncation    | Regex                  | Simple `slice` (see Pattern 5)    | No regex complexity needed for fixed-format addresses    |

**Key insight:** The Etherscan API already does the heavy work — filtering, sorting, pagination. The app only needs to parse, map, and display.

## Common Pitfalls

### Pitfall 1: Etherscan "No transactions found" is not an error

**What goes wrong:** Code checks `if (data.status !== '1') throw error` — but when a wallet has zero transactions, Etherscan returns `{ status: "0", message: "No transactions found", result: [] }`. This wrongly triggers an error state on new wallets.

**Why it happens:** Etherscan reuses `status: "0"` for both real errors (invalid API key, rate limit) and empty results.

**How to avoid:** Check `data.message` when `data.status === "0"`. If `message === "No transactions found"`, treat as empty list.

**Warning signs:** New wallet shows error state immediately despite no actual API failure.

### Pitfall 2: `ethers.formatEther` receives a string

**What goes wrong:** `ethers.formatEther(raw.value)` where `raw.value` is `"500000000000000000"` — throws a TypeError because ethers v6 `formatEther` expects `bigint`, not `string`.

**Why it happens:** Etherscan API returns all numeric fields as strings to preserve precision.

**How to avoid:** Always `BigInt(raw.value)` before passing to `formatEther`.

**Warning signs:** Runtime crash with "Cannot convert string to BigInt" or similar.

### Pitfall 3: RefreshControl does not fire on short FlatList

**What goes wrong:** The FlatList has fewer items than fill the screen. On some RN versions, pull-to-refresh won't trigger if the list is not scrollable.

**Why it happens:** React Native's RefreshControl requires a scroll position of 0 with downward drag. Non-scrollable lists may not register the gesture on Android.

**How to avoid:** Set `alwaysBounceVertical` (iOS) and consider adding `contentContainerStyle={{ flexGrow: 1 }}` to ensure minimum scroll height. With 3 skeletons + header, this is unlikely to be a problem but worth knowing.

**Warning signs:** Pull-to-refresh works on iOS but not Android, or only on longer lists.

### Pitfall 4: refreshTrigger coordination — hooks refetch but refreshing clears too early

**What goes wrong:** `setRefreshing(false)` fires immediately after `setRefreshTrigger`, before the new fetch completes, because `isLoading` briefly remains `false` from the previous fetch.

**Why it happens:** The `isLoading` flag starts as the previous state value; the new effect hasn't fired yet at the synchronous render boundary.

**How to avoid:** In `onRefresh`, call `setRefreshing(true)` first, then `setRefreshTrigger(n + 1)`. The effect that clears `refreshing` checks `!balanceLoading && !txLoading` — this works because the hooks reset `isLoading: true` at the start of each fetch effect.

**Warning signs:** Spinner flickers (appears then disappears instantly).

## Code Examples

### Etherscan API v2 Request

```typescript
// Source: https://docs.etherscan.io/api-reference/endpoint/txlist
const url =
  `https://api.etherscan.io/v2/api` +
  `?chainid=1&module=account&action=txlist` +
  `&address=${address}` +
  `&startblock=0&endblock=latest` +
  `&page=1&offset=10&sort=desc` +
  `&apikey=${ENV.ETHERSCAN_API_KEY}`;

// Response shape:
// {
//   "status": "1",
//   "message": "OK",
//   "result": [
//     {
//       "hash": "0xf9db905d...",
//       "from": "0x2449ecef...",
//       "to": "0xc5102fe9...",
//       "value": "0",                   // Wei string
//       "timeStamp": "1759129619",      // Unix seconds string
//       "isError": "0"
//     },
//     ...
//   ]
// }
```

### Direction Detection

```typescript
// Source: CONTEXT.md locked decisions
type TxDirection = 'incoming' | 'outgoing' | 'self';

export function getTxDirection(
  from: string,
  to: string,
  userAddress: string,
): TxDirection {
  const addr = userAddress.toLowerCase();
  const f = from.toLowerCase();
  const t = to.toLowerCase();
  if (f === addr && t === addr) return 'self';
  if (t === addr) return 'incoming';
  return 'outgoing';
}

// Display mapping per CONTEXT.md:
// incoming  → green text, "+" prefix
// outgoing  → red text, "-" prefix
// self      → gray text, no prefix
// zero value → gray text regardless of direction
```

### TransactionRow NativeWind layout

```typescript
// 2-line compact row, NativeWind className styling per CLAUDE.md
export function TransactionRow({ tx, userAddress }: Props) {
  const direction = getTxDirection(tx.from, tx.to, userAddress);
  const counterparty = direction === 'incoming' ? tx.from : tx.to;
  const ethValue = formatTxValue(tx.value);
  const isZero = tx.value === '0';

  const amountColor = isZero
    ? 'text-gray-400'
    : direction === 'incoming'
      ? 'text-green-600'
      : direction === 'outgoing'
        ? 'text-red-600'
        : 'text-gray-400';

  const amountPrefix = isZero || direction === 'self'
    ? ''
    : direction === 'incoming' ? '+' : '-';

  return (
    <View className="px-4 py-3">
      <Text className="text-sm text-gray-900 font-mono">
        {truncateAddress(counterparty)}
      </Text>
      <View className="flex-row justify-between mt-0.5">
        <Text className={`text-sm font-medium ${amountColor}`}>
          {amountPrefix}{ethValue} ETH
        </Text>
        <Text className="text-xs text-gray-400">
          {formatRelativeTime(tx.timeStamp)}
        </Text>
      </View>
    </View>
  );
}
```

### TransactionSkeleton (3 rows, follows BalanceSkeleton pattern)

```typescript
// Source: src/features/wallet/components/BalanceSkeleton.tsx pattern
export function TransactionSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <View key={i} className="px-4 py-3 gap-1.5">
          <View className="w-40 h-4 rounded bg-gray-200 animate-pulse" />
          <View className="w-32 h-4 rounded bg-gray-200 animate-pulse" />
        </View>
      ))}
    </>
  );
}
```

## State of the Art

| Old Approach                              | Current Approach                             | When Changed              | Impact                                          |
| ----------------------------------------- | -------------------------------------------- | ------------------------- | ----------------------------------------------- |
| `ethers.provider.getHistory()`            | Etherscan API v2 `txlist`                    | ethers.js v6 (removed)    | Must use external API for transaction history   |
| Etherscan API v1 (`api.etherscan.io/api`) | API v2 (`api.etherscan.io/v2/api?chainid=1`) | Mandatory by May 31, 2025 | Add `chainid=1` param; v1 disabled after cutoff |
| Moment.js for dates                       | `Intl.RelativeTimeFormat` or custom          | ~2020                     | Moment deprecated; built-in sufficient          |

**Deprecated/outdated:**

- `ethers.provider.getHistory()`: Removed in ethers.js v6; replaced by Etherscan/block explorer APIs
- Etherscan API v1 URL (`api.etherscan.io/api` without version prefix): Deprecated; use `api.etherscan.io/v2/api` with `chainid` param

## Open Questions

1. **refreshTrigger propagation to useBalance**
   - What we know: `useBalance` currently takes no parameters; its `useEffect` depends only on `address`
   - What's unclear: Adding `refreshTrigger` requires either modifying `useBalance`'s signature or using a different coordination strategy (e.g., exposing a `refetch` callback)
   - Recommendation: Add an optional `refreshTrigger?: number` parameter to `useBalance` (same as `useTransactions`) and include it in the `useEffect` dependency array. Minimal signature change, backward compatible.

2. **Etherscan "No transactions" exact message string**
   - What we know: When status is "0", the API returns a `message` field. The likely value is `"No transactions found"`.
   - What's unclear: Exact string is unverified in official docs (docs only show success examples)
   - Recommendation: Check for `data.result` being an empty array OR `data.status === '0'` — both conditions should resolve to empty state, not error state. This is safer than string-matching the message.

## Validation Architecture

> `workflow.nyquist_validation` key is absent from `.planning/config.json` — treating as enabled.

### Test Framework

| Property           | Value                    |
| ------------------ | ------------------------ |
| Framework          | None detected in project |
| Config file        | None — Wave 0 gap        |
| Quick run command  | N/A — Wave 0 gap         |
| Full suite command | N/A — Wave 0 gap         |

### Phase Requirements → Test Map

| Req ID | Behavior                                      | Test Type   | Automated Command                                                 | File Exists? |
| ------ | --------------------------------------------- | ----------- | ----------------------------------------------------------------- | ------------ |
| TX-01  | `formatTxValue` converts Wei string to ETH    | unit        | `jest src/features/wallet/hooks/use-transactions.test.ts`         | Wave 0       |
| TX-01  | `getTxDirection` returns correct direction    | unit        | `jest src/features/wallet/hooks/use-transactions.test.ts`         | Wave 0       |
| TX-01  | `truncateAddress` formats 6+4 correctly       | unit        | `jest src/features/wallet/hooks/use-transactions.test.ts`         | Wave 0       |
| TX-01  | `formatRelativeTime` returns expected strings | unit        | `jest src/features/wallet/hooks/use-transactions.test.ts`         | Wave 0       |
| TX-02  | Pull-to-refresh triggers both refetches       | manual-only | Visual test on device — RefreshControl is native platform gesture | N/A          |

**Note on TX-02:** Pull-to-refresh coordination is best validated manually on device. The `onRefresh` callback and state coordination can be unit-tested but the native gesture behavior requires device verification.

### Sampling Rate

- **Per task commit:** N/A until test infrastructure is set up
- **Per wave merge:** N/A until test infrastructure is set up
- **Phase gate:** Manual smoke test on device before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `jest.config.js` — no Jest config found in project root
- [ ] `src/features/wallet/hooks/use-transactions.test.ts` — covers TX-01 pure function tests
- [ ] Jest or equivalent test runner install: `npm install --save-dev jest @types/jest jest-environment-jsdom`

**Recommendation:** Given no existing test infrastructure and the visual/native nature of the primary TX-02 requirement, implementing Jest from scratch is a significant Wave 0 cost relative to benefit. The pure utility functions (`formatTxValue`, `getTxDirection`, `truncateAddress`, `formatRelativeTime`) are straightforward enough that manual verification in development suffices for this phase. If the project adds testing in a future phase, these functions are pure and easy to test retroactively.

## Sources

### Primary (HIGH confidence)

- Etherscan API v2 txlist endpoint docs (https://docs.etherscan.io/api-reference/endpoint/txlist) — URL format, response fields, parameter names, example response JSON
- React Native FlatList docs (https://reactnative.dev/docs/flatlist) — `ListHeaderComponent`, `refreshControl`, `onRefresh`, `refreshing`, `keyExtractor` props
- Existing codebase: `src/features/wallet/hooks/use-balance.ts` — hook pattern to replicate
- Existing codebase: `src/features/wallet/components/BalanceSkeleton.tsx` — skeleton pattern to replicate

### Secondary (MEDIUM confidence)

- Etherscan API v2 multichain announcement (https://info.etherscan.com/etherscan-api-v2-multichain/) — confirms v2 URL format and May 31, 2025 v1 deprecation deadline
- ethers.js v6 docs (https://docs.ethers.org/v6/) — `formatEther` accepts `bigint`

### Tertiary (LOW confidence)

- Etherscan `status: "0"` empty-result behavior — documented by community examples; exact `message` string not verified in official docs. Recommendation in Open Questions accounts for this.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already installed, no new dependencies
- Architecture: HIGH — direct pattern reuse from Phase 3 hooks/components
- Etherscan API: HIGH — official docs verified, response format confirmed with example JSON
- Pitfalls: HIGH — formatEther/BigInt and status string issues are well-known, verified in ethers v6 source
- Timestamp formatting: HIGH — custom implementation is simple, no external dependency

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (Etherscan API stable; FlatList API stable)
