---
phase: 2
slug: contract-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Mocha (via @nomicfoundation/hardhat-mocha) + Chai |
| **Config file** | hardhat.config.ts |
| **Quick run command** | `npx hardhat compile --force` |
| **Full suite command** | `npx hardhat compile --force && ls types/ethers-contracts/RoxasToken.ts` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx hardhat compile --force`
- **After every plan wave:** Run `npx hardhat compile --force && ls types/ethers-contracts/RoxasToken.ts`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | INFR-02 | smoke | `npx hardhat compile --force` | N/A | ⬜ pending |
| 02-01-02 | 01 | 1 | INFR-03 | smoke | `ls types/ethers-contracts/RoxasToken.ts` | N/A | ⬜ pending |
| 02-01-03 | 01 | 1 | TOKN-01 | smoke | `npx hardhat compile --force` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Update `.gitignore` to include `types/` entry (replace stale `typechain-types/`)
- No unit test file needed — tests are Phase 5 scope. Compilation + TypeChain generation serve as Phase 2 gate.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| name() returns "Roxas Token" | TOKN-01 | No test runner for Phase 2 | Verify via Hardhat console or wait for Phase 5 tests |
| symbol() returns "RXS" | TOKN-01 | No test runner for Phase 2 | Verify via Hardhat console or wait for Phase 5 tests |
| decimals() returns 18 | TOKN-01 | ERC20 default, no override needed | Verify via Hardhat console or wait for Phase 5 tests |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
