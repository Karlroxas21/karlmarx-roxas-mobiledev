# Phase 5: Error Handling & Polish - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden all async error paths so balance fetch failures, transaction fetch failures, and wallet connection failures surface clear, actionable error messages with retry affordances. Polish the connection error copy. Pull-to-refresh, copy-to-clipboard, relative timestamps, and direction color-coding are already implemented (Phase 4) — this phase focuses exclusively on error handling.

Requirements fulfilled: ERR-01, ERR-02, ERR-03.

</domain>

<decisions>
## Implementation Decisions

### Error display style

- Inline replacement: error message + retry button replaces content in the same position (no banners, no toasts)
- Balance error replaces the balance text area (between network label and address box)
- Transaction error replaces the transaction list area (below "Transactions" header, which stays visible)
- Independent errors per section — if both fail, each shows its own error + retry separately
- No combined/full-screen error state

### Retry mechanism

- Retry button increments the existing `refreshTrigger` counter — reuses pull-to-refresh mechanism, no new state
- Each section's retry bumps the same trigger (both hooks depend on `refreshTrigger`)
- During retry, show skeleton loader again (same as initial load) — not spinner, not disabled button
- Retry button is a text button (blue "Retry" text, no border/background) — consistent with existing "Disconnect" and "Copy" text button patterns

### Error messaging

- Generic message per section, no differentiation by failure type:
  - Balance: "Couldn't load balance"
  - Transactions: "Couldn't load transactions"
  - Connection: "Couldn't connect wallet"
- Neutral/factual tone — no apology, no blame, no technical details
- Same message regardless of root cause (network, rate limit, API error)

### Connection error polish

- Keep existing ConnectionError pattern: error message + "Tap Connect Wallet to try again" hint
- Replace raw technical error string with friendly copy: "Couldn't connect wallet"
- No raw error details shown to user (no expandable details, no gray subtext)
- No new retry button — the existing Connect Wallet button serves as retry

### Claude's Discretion

- Whether to extract a shared ErrorState component for balance and transaction errors, or keep them inline
- Warning icon choice (emoji vs custom icon)
- Exact spacing and padding within error states
- Whether ConnectionError component needs structural changes or just a copy update

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Error state integration points

- `src/features/wallet/components/ConnectedScreen.tsx` — Main screen; wire up `txError` display, add retry buttons to balance and transaction error states
- `src/features/wallet/components/BalanceDisplay.tsx` — Currently shows "Balance unavailable" on error; needs retry button and updated copy
- `src/features/wallet/components/ConnectionError.tsx` — Currently shows raw error + hint text; needs copy polish to neutral tone

### Hook error handling

- `src/features/wallet/hooks/use-balance.ts` — Returns `error` string; `refreshTrigger` param already supports retry
- `src/features/wallet/hooks/use-transactions.ts` — Returns `error` string; `refreshTrigger` param already supports retry; `txError` not currently destructured in ConnectedScreen

### Existing patterns to follow

- `src/features/wallet/components/BalanceSkeleton.tsx` — Skeleton pattern shown during retry
- `src/features/wallet/components/TransactionSkeleton.tsx` — Skeleton pattern shown during retry

### Project specs

- `.planning/REQUIREMENTS.md` — ERR-01: clear error on connection fail; ERR-02: clear error on API/RPC fail; ERR-03: retry button for failed operations

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `BalanceSkeleton`: pulsing gray rectangle — shown during balance retry
- `TransactionSkeleton`: 3 skeleton rows — shown during transaction retry
- `ConnectionError`: existing component, needs copy update only
- `refreshTrigger` state + `onRefresh` callback in ConnectedScreen — retry mechanism already exists

### Established Patterns

- NativeWind `className` for all styling — error states follow this
- Text buttons: "Disconnect" (red text), "Copy" (blue text) — retry button follows same pattern (blue text)
- Hooks return `{ data, isLoading, error }` tuple — error state drives conditional rendering
- `useEffect` + cancelled flag + `.catch()` — error strings already captured in both hooks

### Integration Points

- `ConnectedScreen.tsx` — destructure `txError` from `useTransactions`, add conditional rendering for both error states
- `BalanceDisplay.tsx` — add `onRetry` prop, show retry button when error is present
- `ConnectionError.tsx` — replace `message` prop usage with fixed friendly copy

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Error states follow the inline replacement pattern common in mobile wallet apps.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 05-error-handling-polish_
_Context gathered: 2026-04-02_
