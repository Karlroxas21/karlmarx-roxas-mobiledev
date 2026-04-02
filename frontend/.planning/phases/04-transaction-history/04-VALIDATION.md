---
phase: 04
slug: transaction-history
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                    |
| ---------------------- | ------------------------ |
| **Framework**          | None detected in project |
| **Config file**        | None — Wave 0 gap        |
| **Quick run command**  | N/A — Wave 0 gap         |
| **Full suite command** | N/A — Wave 0 gap         |
| **Estimated runtime**  | N/A                      |

---

## Sampling Rate

- **After every task commit:** N/A until test infrastructure is set up
- **After every plan wave:** N/A until test infrastructure is set up
- **Before `/gsd:verify-work`:** Manual smoke test on device
- **Max feedback latency:** N/A

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type   | Automated Command                                         | File Exists | Status     |
| -------- | ---- | ---- | ----------- | ----------- | --------------------------------------------------------- | ----------- | ---------- |
| 04-01-01 | 01   | 1    | TX-01       | unit        | `jest src/features/wallet/hooks/use-transactions.test.ts` | ❌ W0       | ⬜ pending |
| 04-01-02 | 01   | 1    | TX-01       | unit        | `jest src/features/wallet/hooks/use-transactions.test.ts` | ❌ W0       | ⬜ pending |
| 04-01-03 | 01   | 1    | TX-01       | unit        | `jest src/features/wallet/hooks/use-transactions.test.ts` | ❌ W0       | ⬜ pending |
| 04-01-04 | 01   | 1    | TX-01       | unit        | `jest src/features/wallet/hooks/use-transactions.test.ts` | ❌ W0       | ⬜ pending |
| 04-02-01 | 02   | 1    | TX-02       | manual-only | Visual test on device                                     | N/A         | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `jest.config.js` — no Jest config found in project root
- [ ] `src/features/wallet/hooks/use-transactions.test.ts` — covers TX-01 pure function tests
- [ ] Jest install: `npm install --save-dev jest @types/jest jest-environment-jsdom`

_Note: Given no existing test infrastructure and the visual/native nature of TX-02, implementing Jest from scratch is a significant Wave 0 cost. The pure utility functions (formatTxValue, getTxDirection, truncateAddress, formatRelativeTime) are straightforward enough that manual verification in development suffices. If the project adds testing in a future phase, these functions are pure and easy to test retroactively._

---

## Manual-Only Verifications

| Behavior                                                      | Requirement | Why Manual                                                                     | Test Instructions                                                                                                           |
| ------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Pull-to-refresh triggers both balance and transaction refetch | TX-02       | RefreshControl is native platform gesture — cannot be automated without device | 1. Connect wallet 2. Pull down on transaction list 3. Verify spinner appears 4. Verify both balance and transactions update |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < N/A
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
