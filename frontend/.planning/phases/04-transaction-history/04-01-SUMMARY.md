---
phase: 04-transaction-history
plan: "01"
subsystem: wallet-data-layer
tags: [transaction-history, etherscan-api, hooks, types, utility-functions]

dependency_graph:
  requires:
    - src/features/wallet/types/index.ts (ConnectionStatus, WalletState — existing)
    - src/config/env.ts (ENV.ETHERSCAN_API_KEY)
    - src/features/wallet/stores/wallet-store.ts (useWalletStore address selector)
    - ethers (formatEther, BigInt)
  provides:
    - Transaction type with Wei-string value and parsed timeStamp
    - TxDirection union type for direction classification
    - useTransactions hook returning { transactions, isLoading, error }
    - formatTxValue, getTxDirection, truncateAddress, formatRelativeTime utilities
    - useBalance with optional refreshTrigger parameter
  affects:
    - Plan 02 (UI layer consumes useTransactions and utility functions)
    - ConnectedScreen (will pass refreshTrigger to useBalance and useTransactions)

tech_stack:
  added: []
  patterns:
    - Etherscan API v2 with chainid=1 parameter
    - Cancelled-flag pattern for async effect cleanup
    - Optional refreshTrigger parameter for pull-to-refresh coordination

key_files:
  created:
    - src/features/wallet/hooks/use-transactions.ts
  modified:
    - src/features/wallet/types/index.ts
    - src/features/wallet/hooks/use-balance.ts

decisions:
  - useTransactions treats Etherscan status '0' as empty list (not error) — consistent with API semantics where new wallets return status '0' with an empty result array
  - formatTxValue uses BigInt(weiString) before ethers.formatEther — required by ethers v6 API (no implicit string coercion)
  - All addresses lowercased in mapEtherscanTx mapper for consistent direction comparison in getTxDirection
  - refreshTrigger added as optional parameter to both useBalance and useTransactions for backward compatibility

metrics:
  duration: "70 seconds"
  completed_date: "2026-04-02"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 2
---

# Phase 4 Plan 01: Transaction Data Layer Summary

**One-liner:** Etherscan API v2 transaction fetcher with Wei-to-ETH formatting, address direction detection, and pull-to-refresh coordination via refreshTrigger parameter.

## What Was Built

### Task 1 — Transaction and TxDirection types (commit: 90065e9)

Added two new exported types to `src/features/wallet/types/index.ts`:

- `Transaction` — matches Etherscan v2 response fields with normalized types: Wei value as string, timeStamp as parsed number, isError as boolean
- `TxDirection` — `'incoming' | 'outgoing' | 'self'` union for direction classification

Existing `ConnectionStatus` and `WalletState` types untouched.

### Task 2 — useTransactions hook with utility functions (commit: 09f8c26)

Created `src/features/wallet/hooks/use-transactions.ts` with:

- `useTransactions(refreshTrigger?: number)` — fetches last 10 transactions from `https://api.etherscan.io/v2/api` with `chainid=1`, `offset=10`, `sort=desc`. Returns `{ transactions, isLoading, error }`. Uses cancelled-flag pattern for cleanup. Treats `status === '0'` as empty list.
- `formatTxValue(weiString)` — converts Wei to 4-decimal ETH, handles `< 0.0001` edge case
- `getTxDirection(from, to, userAddress)` — classifies transaction as `'self'`, `'incoming'`, or `'outgoing'`
- `truncateAddress(address)` — produces `0x1234...abcd` format (6+4)
- `formatRelativeTime(unixSeconds)` — returns `'just now'`, `'Nm ago'`, `'Nh ago'`, `'Nd ago'`, `'Nmo ago'`

Internal helpers (not exported): `EtherscanTx` type, `mapEtherscanTx` function, `TransactionState` type.

### Task 3 — useBalance refreshTrigger (commit: e495def)

Two targeted changes to `src/features/wallet/hooks/use-balance.ts`:

1. Function signature: `useBalance(refreshTrigger?: number): BalanceState`
2. Dependency array: `[address, refreshTrigger]`

Backward-compatible — all existing callers with no argument continue to work.

## Verification

- TypeScript compiles cleanly (`npx tsc --noEmit`) after each task
- `npm run lint` — 0 errors, 8 warnings all pre-existing in unrelated files

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- src/features/wallet/hooks/use-transactions.ts — FOUND
- src/features/wallet/types/index.ts — FOUND (modified)
- src/features/wallet/hooks/use-balance.ts — FOUND (modified)

Commits exist:
- 90065e9 — feat(04-01): add Transaction and TxDirection types to wallet types
- 09f8c26 — feat(04-01): create useTransactions hook with utility functions
- e495def — feat(04-01): add refreshTrigger parameter to useBalance hook
