---
phase: 6
slug: transfer-and-boundary-tests
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Mocha + Chai via hardhat-toolbox-mocha-ethers |
| **Config file** | hardhat.config.ts |
| **Quick run command** | `npx hardhat test test/RoxasToken.test.ts` |
| **Full suite command** | `npx hardhat test` |
| **Estimated runtime** | ~15-30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx hardhat test test/RoxasToken.test.ts`
- **After every plan wave:** Run `npx hardhat test`
- **Before `/gsd:verify-work`:** Full suite must be green (all tests including Phase 5's)
- **Max feedback latency:** 30 seconds

---

## Wave 0 Requirements

- None — extends existing test file from Phase 5

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
