---
phase: 3
slug: erc-20-transfers-and-approvals
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Mocha + Chai via @nomicfoundation/hardhat-toolbox-mocha-ethers |
| **Config file** | hardhat.config.ts |
| **Quick run command** | `npx hardhat compile` |
| **Full suite command** | `npx hardhat compile` + ABI inspection |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx hardhat compile`
- **After every plan wave:** Run `npx hardhat compile` + ABI check
- **Before `/gsd:verify-work`:** All 10 ERC-20 functions and 2 events present in ABI
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | TOKN-02..06 | ABI check | `npx hardhat compile && node -e "const a=require('./artifacts/contracts/RoxasToken.sol/RoxasToken.json');..."` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- None — verification-only phase. No test files needed. Transfer/approval tests deferred to Phase 6.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | — | All verifiable via ABI inspection | — |

*All phase behaviors have automated verification via ABI artifact inspection.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
