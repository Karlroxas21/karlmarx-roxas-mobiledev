---
phase: 4
slug: minting-mechanics
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Mocha + Chai via hardhat-toolbox-mocha-ethers |
| **Config file** | hardhat.config.ts |
| **Quick run command** | `npx hardhat compile` |
| **Full suite command** | `npx hardhat compile --force` + ABI inspection |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx hardhat compile`
- **After every plan wave:** Run `npx hardhat compile --force` + ABI check
- **Before `/gsd:verify-work`:** Compilation + ABI confirms mint, events, errors, constants
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | MINT-01..06 | compile + ABI | `npx hardhat compile --force` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- None — unit tests for minting deferred to Phase 5. Compilation + ABI inspection serves as Phase 4 gate.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | — | All verifiable via compilation + ABI | — |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
