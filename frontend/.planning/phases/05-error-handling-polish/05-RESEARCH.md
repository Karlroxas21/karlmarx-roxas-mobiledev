# Phase 05: Error Handling & Polish - Research

**Researched:** 2026-04-02
**Domain:** React Native error UI, inline error states, React component prop patterns
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Error display style**: Inline replacement — error message + retry button replaces content in the same position (no banners, no toasts)
- **Balance error**: Replaces the balance text area (between network label and address box)
- **Transaction error**: Replaces the transaction list area (below "Transactions" header, which stays visible)
- **Independent errors per section**: If both fail, each shows its own error + retry separately; no combined/full-screen error state
- **Retry mechanism**: Retry button increments the existing `refreshTrigger` counter — reuses pull-to-refresh mechanism, no new state
- **Each section's retry bumps the same trigger** (both hooks depend on `refreshTrigger`)
- **During retry**: Show skeleton loader again (same as initial load) — not spinner, not disabled button
- **Retry button style**: Text button (blue "Retry" text, no border/background) — consistent with existing "Disconnect" and "Copy" text button patterns
- **Error messages** (generic, no differentiation by failure type):
  - Balance: "Couldn't load balance"
  - Transactions: "Couldn't load transactions"
  - Connection: "Couldn't connect wallet"
- **Neutral/factual tone**: No apology, no blame, no technical details; same message regardless of root cause
- **Connection error polish**: Keep existing `ConnectionError` pattern (error message + "Tap Connect Wallet to try again" hint); replace raw technical error string with "Couldn't connect wallet"; no new retry button

### Claude's Discretion

- Whether to extract a shared `ErrorState` component for balance and transaction errors, or keep them inline
- Warning icon choice (emoji vs custom icon)
- Exact spacing and padding within error states
- Whether `ConnectionError` component needs structural changes or just a copy update

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID     | Description                                                | Research Support                                                                                                               |
| ------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| ERR-01 | User sees clear error message when wallet connection fails | `ConnectionError.tsx` copy update; `useWalletConnection` already sets `error` string in store                                  |
| ERR-02 | User sees clear error message when API/RPC calls fail      | `BalanceDisplay.tsx` prop extension + `useTransactions` error destructuring in `ConnectedScreen.tsx`                           |
| ERR-03 | User can retry failed operations via a retry button        | `onRetry` prop on `BalanceDisplay`; inline retry for tx errors in `ConnectedScreen`; both call `setRefreshTrigger(n => n + 1)` |

</phase_requirements>

---

## Summary

Phase 5 is purely a UI wiring and copy-polish phase. The data layer is already complete: both `useBalance` and `useTransactions` return an `error: string | null` field, and the `refreshTrigger` mechanism supports retry without any new state. The only gaps are: (1) `txError` is not destructured in `ConnectedScreen`, (2) `BalanceDisplay` shows a silent grey placeholder instead of a user-visible error with retry, and (3) `ConnectionError` renders the raw JS exception message rather than friendly copy.

Every change in this phase is additive — no refactoring of hooks or state management is required. The three file edits plus one optional shared component extraction are all straightforward React prop threading and conditional rendering work.

**Primary recommendation:** Wire `txError` into `ConnectedScreen`, extend `BalanceDisplay` with an `onRetry` prop, add an inline tx-error block, and replace the raw `message` in `ConnectionError` with the fixed string "Couldn't connect wallet". Extract a shared `ErrorState` component to avoid duplicating the error + retry layout.

---

## Standard Stack

### Core

| Library                                         | Version              | Purpose                                              | Why Standard                                                                    |
| ----------------------------------------------- | -------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| React Native `View`, `Text`, `TouchableOpacity` | Bundled with RN 0.81 | Error state UI primitives                            | Already used throughout the codebase for all interactive and layout elements    |
| NativeWind v4 `className`                       | `^4.2.3`             | Tailwind-based styling                               | Project convention — all styling uses `className`, never inline `style` objects |
| Zustand `useWalletStore`                        | `^5.0.12`            | Read `error` from wallet store for connection errors | Already wired; no changes needed                                                |

### Supporting

| Library          | Version  | Purpose                                           | When to Use        |
| ---------------- | -------- | ------------------------------------------------- | ------------------ |
| `expo-clipboard` | `~8.0.8` | Already in use for copy — no role in error states | N/A for this phase |

### Alternatives Considered

| Instead of                              | Could Use                      | Tradeoff                                                                                             |
| --------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Inline text retry button                | Toast / snackbar library       | Toasts are transient and non-retryable — explicitly rejected by user decisions                       |
| Fixed error string in `ConnectionError` | Pass friendly copy from caller | Either works; fixed string in component is simpler since there is only one connection error scenario |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure

No new files are strictly required. One optional new file:

```
src/features/wallet/components/
├── ErrorState.tsx           # NEW (optional) — shared error + retry layout
├── BalanceDisplay.tsx       # MODIFY — add onRetry prop
├── ConnectedScreen.tsx      # MODIFY — wire txError, add tx error block
└── ConnectionError.tsx      # MODIFY — replace raw message with fixed copy
```

### Pattern 1: Inline Error Replacement

**What:** The error UI occupies the exact same slot as the content it replaces. The container View does not change size unexpectedly — both the success and error states are similarly sized single-line or small blocks.

**When to use:** Any section that can load independently and fail independently. Both balance and transaction sections qualify.

**Example — BalanceDisplay with retry:**

```typescript
// Follows existing BalanceDisplay structure; adds onRetry prop
type BalanceDisplayProps = {
  balance: string | null;
  error: string | null;
  onRetry: () => void;
};

export function BalanceDisplay({ balance, error, onRetry }: BalanceDisplayProps) {
  if (error) {
    return (
      <View className="items-center gap-2">
        <Text className="text-sm text-gray-500 text-center">
          Couldn't load balance
        </Text>
        <TouchableOpacity onPress={onRetry}>
          <Text className="text-sm text-blue-600">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  // ... existing success/null rendering unchanged
}
```

### Pattern 2: Retry via refreshTrigger Increment

**What:** The retry button calls `setRefreshTrigger(n => n + 1)`. This is the same mechanism as pull-to-refresh (`onRefresh`). Both hooks (`useBalance`, `useTransactions`) already depend on `refreshTrigger` and reset to `isLoading: true` when it changes.

**When to use:** Any retry in `ConnectedScreen` — balance retry and transaction retry both use the same trigger, which is intentional (both data sources reload together on manual refresh already).

**Example — retry callback in ConnectedScreen:**

```typescript
const handleRetry = useCallback(() => {
  setRefreshTrigger((n) => n + 1);
}, []);
```

Both `<BalanceDisplay onRetry={handleRetry} ... />` and the transaction error's retry button reference the same `handleRetry`.

### Pattern 3: Optional Shared ErrorState Component

**What:** A small presentational component `ErrorState` that renders the error message text + retry button. Avoids duplicating the error layout between balance and transaction error blocks.

**When to use:** When two or more sections share the same error UI shape — which is true here (balance error and transaction error are structurally identical: one line of text + one blue text button).

**Example:**

```typescript
// src/features/wallet/components/ErrorState.tsx
type ErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View className="items-center gap-2 py-4">
      <Text className="text-sm text-gray-500 text-center">{message}</Text>
      <TouchableOpacity onPress={onRetry}>
        <Text className="text-sm text-blue-600">Retry</Text>
      </TouchableOpacity>
    </View>
  );
}
```

`BalanceDisplay` passes `message="Couldn't load balance"`. The transaction error block in `ConnectedScreen.renderEmpty` (or inline) passes `message="Couldn't load transactions"`.

### Pattern 4: ConnectionError Copy-Only Update

**What:** `ConnectionError.tsx` currently renders `{message}` (the raw JS Error message string from the store). The fix is to ignore the `message` prop content and render a fixed string "Couldn't connect wallet" instead.

**When to use:** When the component has a single responsibility and the caller always passes the same semantic type of error.

**Options for implementation:**

1. Remove the `message` prop entirely and hard-code the string inside the component — simplest, since there is no other connection error scenario.
2. Keep the `message` prop as a boolean/existence signal but always render fixed copy — maintains the existing null-guard pattern.

Option 1 is cleanest. The prop currently only signals "an error occurred" (not the content), and the caller (`ConnectScreen`) already has a boolean-equivalent check via `error` from the store.

**Example:**

```typescript
// ConnectionError.tsx — simplified
export function ConnectionError({ hasError }: { hasError: boolean }) {
  if (!hasError) return null;
  return (
    <View className="mt-2">
      <Text className="text-red-600 text-sm text-center">
        Couldn't connect wallet
      </Text>
      <Text className="text-gray-500 text-sm text-center mt-1">
        Tap Connect Wallet to try again.
      </Text>
    </View>
  );
}
```

Caller in `ConnectScreen.tsx`:

```typescript
<ConnectionError hasError={!!error} />
```

### Anti-Patterns to Avoid

- **Passing `onRetry` all the way from ConnectScreen through ConnectionError**: The connection retry is implicit — the "Connect Wallet" button IS the retry. Do not add a new retry button to `ConnectionError`.
- **Setting `error: null` in the hook on retry before `isLoading` becomes `true`**: The hooks already reset `{ isLoading: true, error: null }` at the top of the effect. No manual clearing needed in the component.
- **Showing both skeleton and error simultaneously**: The conditional chain is `isLoading → skeleton`, `error → ErrorState`, `else → content`. These three are mutually exclusive.
- **Hiding the "Transactions" header when the tx list errors**: Per user decision, the header stays visible — only the list area below it shows the error.

---

## Don't Hand-Roll

| Problem                  | Don't Build                                                | Use Instead                    | Why                                                                                                                               |
| ------------------------ | ---------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Retry state coordination | A separate `retryCount` or `lastRetried` state per section | Increment `refreshTrigger`     | The counter already drives both hooks via `useEffect` dependency — adding parallel state creates two sources of truth             |
| Error boundary           | A React `ErrorBoundary` class component                    | Inline `error` from hook       | Hook errors are already caught in `.catch()` and returned as strings — they never propagate as thrown exceptions to ErrorBoundary |
| Toast/snackbar           | A custom overlay notification system                       | The inline replacement pattern | User decision explicitly rejects banners and toasts                                                                               |

**Key insight:** The retry mechanism is already implemented — `refreshTrigger` in `ConnectedScreen` drives both hooks. This phase only needs to expose retry affordances to the user, not build new plumbing.

---

## Common Pitfalls

### Pitfall 1: Transaction error never visible because `renderEmpty` is skipped when `txLoading` is false but `transactions` is non-empty

**What goes wrong:** `FlatList` calls `ListEmptyComponent` only when `data` is empty. When `useTransactions` errors, `transactions` remains `[]` (the hook resets to empty on error), so `renderEmpty` IS called. However, the current `renderEmpty` checks `if (txLoading)` first — if not loading, it shows "No transactions yet". An errored state would be indistinguishable from an empty wallet.

**Why it happens:** `txError` is not yet destructured in `ConnectedScreen`, so there is no error branch in `renderEmpty`.

**How to avoid:** Destructure `error: txError` from `useTransactions`. In `renderEmpty`, add a branch before the empty-state check:

```typescript
const renderEmpty = () => {
  if (txLoading) return <TransactionSkeleton />;
  if (txError) return <ErrorState message="Couldn't load transactions" onRetry={handleRetry} />;
  return (/* "No transactions yet" */);
};
```

**Warning signs:** Test by simulating a network failure — if you see "No transactions yet" instead of the error UI, the branch is missing.

### Pitfall 2: `onRetry` prop missing on `BalanceDisplay` call site after adding it as required

**What goes wrong:** TypeScript will error if `onRetry` is added as a required prop to `BalanceDisplayProps` but the call site in `ConnectedScreen` is not updated simultaneously.

**How to avoid:** Update `BalanceDisplay.tsx` and the call site in `ConnectedScreen.tsx` in the same task. Alternatively, make `onRetry` optional with a no-op default — but since it is always needed in the error path, required is the correct choice.

### Pitfall 3: Skeleton shown during retry but `refreshTrigger` increment does not immediately flip `isLoading`

**What goes wrong:** `setRefreshTrigger` is a state setter — the effect re-runs asynchronously on next render. If the component conditionally renders skeleton only when `isLoading` is true AND the error was previously shown, the transition is:

1. User taps Retry
2. React schedules re-render with incremented `refreshTrigger`
3. On next render, `useEffect` inside hook runs → sets `isLoading: true`
4. On the render after that, skeleton appears

This is a two-render transition, which is fine and expected. There is no race condition here because the hooks reset `isLoading: true` synchronously at the top of the effect body via `setState(...)`.

**Warning signs:** A flash of the error state for one frame before skeleton appears. This is acceptable and normal React behavior — not a bug.

### Pitfall 4: `ConnectionError` prop interface change breaks `ConnectScreen`

**What goes wrong:** If the `message: string | null` prop is renamed or removed from `ConnectionError`, the call site `<ConnectionError message={error} />` in `ConnectScreen.tsx` will break at compile time.

**How to avoid:** Update both files together. The TypeScript compiler will catch this — do not suppress the error.

---

## Code Examples

Verified patterns from the existing codebase:

### Existing text button pattern (blue, no border)

```typescript
// Source: ConnectedScreen.tsx — "Copy" button
<TouchableOpacity
  className="h-11 w-11 items-center justify-center"
  onPress={handleCopy}
>
  <Text className="text-sm text-blue-600">Copy</Text>
</TouchableOpacity>
```

The retry button follows the same `text-sm text-blue-600` pattern without a wrapping fixed-size View (since it is not positioned absolutely).

### Existing conditional rendering pattern (skeleton → content)

```typescript
// Source: ConnectedScreen.tsx — balance section
{balanceLoading ? (
  <BalanceSkeleton />
) : (
  <BalanceDisplay balance={balance} error={balanceError} />
)}
```

After this phase, the pattern extends to three branches:

```typescript
{balanceLoading ? (
  <BalanceSkeleton />
) : balanceError ? (
  <ErrorState message="Couldn't load balance" onRetry={handleRetry} />
) : (
  <BalanceDisplay balance={balance} />
)}
```

Or equivalently, keep `BalanceDisplay` and pass `onRetry` as a prop — both approaches are valid.

### Hook error already captured

```typescript
// Source: use-balance.ts
.catch((e) => {
  if (!cancelled) {
    setState({
      balance: null,
      isLoading: false,
      error: e instanceof Error ? e.message : 'Balance fetch failed',
    });
  }
});
```

The `error` field is already a non-null string on failure. No changes to the hooks are needed.

### refreshTrigger increment — existing onRefresh

```typescript
// Source: ConnectedScreen.tsx
const onRefresh = useCallback(() => {
  setRefreshing(true);
  setRefreshTrigger((n) => n + 1);
}, []);
```

The retry handler is the same increment, minus the `setRefreshing(true)` (pull-to-refresh indicator is not needed for button-triggered retry):

```typescript
const handleRetry = useCallback(() => {
  setRefreshTrigger((n) => n + 1);
}, []);
```

---

## State of the Art

| Old Approach                                               | Current Approach                                | When Changed | Impact                                          |
| ---------------------------------------------------------- | ----------------------------------------------- | ------------ | ----------------------------------------------- |
| `ConnectionError` shows raw JS error message               | Fixed friendly copy "Couldn't connect wallet"   | Phase 5      | User never sees internal error strings          |
| `BalanceDisplay` silently shows grey "Balance unavailable" | Explicit error copy + retry button              | Phase 5      | Meets ERR-02 and ERR-03                         |
| `txError` unread in `ConnectedScreen`                      | Destructured and rendered as inline error state | Phase 5      | Meets ERR-02 and ERR-03 for transaction section |

**Deliberately not changing:**

- Hook internals (`use-balance.ts`, `use-transactions.ts`) — error capture is already correct
- `refreshTrigger` coordination — already works for pull-to-refresh; retry reuses it
- `TransactionSkeleton` / `BalanceSkeleton` — no changes; shown as-is during retry

---

## Open Questions

1. **Should `ErrorState` be a shared component or inline JSX?**
   - What we know: Two sections (balance, transactions) have structurally identical error UI
   - What's unclear: Whether there will ever be a third error section that would benefit from reuse
   - Recommendation: Extract `ErrorState` as a shared component — it costs one small file and makes the balance/transaction rendering logic cleaner. Since it is scoped to `src/features/wallet/components/`, it does not cross feature boundaries.

2. **Warning icon: emoji vs no icon?**
   - What we know: No icon library beyond `@expo/vector-icons` is installed; existing error text in `ConnectionError` uses no icon
   - What's unclear: Whether adding a warning character ("⚠") or similar would be desired
   - Recommendation: No icon. Keep it consistent with the existing `ConnectionError` which uses text only. Avoids introducing an icon dependency decision mid-phase.

---

## Validation Architecture

> `workflow.nyquist_validation` key is absent from `.planning/config.json` — treating as enabled.

### Test Framework

| Property           | Value                                                                    |
| ------------------ | ------------------------------------------------------------------------ |
| Framework          | None installed — no Jest, Vitest, or other test runner in `package.json` |
| Config file        | None                                                                     |
| Quick run command  | N/A                                                                      |
| Full suite command | N/A                                                                      |

### Phase Requirements → Test Map

| Req ID | Behavior                                                                        | Test Type   | Automated Command    | File Exists? |
| ------ | ------------------------------------------------------------------------------- | ----------- | -------------------- | ------------ |
| ERR-01 | `ConnectionError` renders fixed friendly copy when `hasError` is true           | unit        | N/A — no test runner | ❌ Wave 0    |
| ERR-02 | `BalanceDisplay` renders error copy + retry button when `error` is non-null     | unit        | N/A — no test runner | ❌ Wave 0    |
| ERR-02 | Transaction error state renders in `ConnectedScreen` when `txError` is non-null | unit        | N/A — no test runner | ❌ Wave 0    |
| ERR-03 | Tapping retry button increments `refreshTrigger`                                | integration | N/A — no test runner | ❌ Wave 0    |

### Sampling Rate

- **Per task commit:** Manual visual verification on device/emulator
- **Per wave merge:** Manual visual verification of all three error paths
- **Phase gate:** All three error UIs visible and retry triggers loading state before `/gsd:verify-work`

### Wave 0 Gaps

No test framework is installed. This phase does not introduce tests — all verification is manual visual/functional testing.

- [ ] No test runner detected — automated tests cannot be written without installing Jest + `@testing-library/react-native`
- [ ] Manual test checklist covers ERR-01, ERR-02, ERR-03

_(Recommendation: Accept manual testing for this phase. Installing a test framework is out of scope per CONTEXT.md.)_

---

## Sources

### Primary (HIGH confidence)

- Direct codebase read — `ConnectedScreen.tsx`, `BalanceDisplay.tsx`, `ConnectionError.tsx`, `use-balance.ts`, `use-transactions.ts`, `use-wallet-connection.ts`, `BalanceSkeleton.tsx`, `TransactionSkeleton.tsx`
- `CONTEXT.md` — all implementation decisions locked by user

### Secondary (MEDIUM confidence)

- `package.json` — confirmed no test framework present

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries are already in use; no new dependencies
- Architecture: HIGH — error paths already exist in hooks; only UI wiring needed; patterns read directly from source
- Pitfalls: HIGH — identified from direct code reading (txError not destructured, BalanceDisplay silent error)

**Research date:** 2026-04-02
**Valid until:** Stable — this phase has no external dependencies that could change
