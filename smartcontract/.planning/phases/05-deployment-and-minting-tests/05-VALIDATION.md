---
phase: 5
slug: deployment-and-minting-tests
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Mocha + Chai via hardhat-toolbox-mocha-ethers |
| **Config file** | hardhat.config.ts |
| **Quick run command** | `npx hardhat test test/RoxasToken.test.ts` |
| **Full suite command** | `npx hardhat test` |
| **Estimated runtime** | ~15-30 seconds (cap test loop) |

---

## Sampling Rate

- **After every task commit:** Run `npx hardhat test test/RoxasToken.test.ts`
- **After every plan wave:** Run `npx hardhat test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | TEST-01..05 | unit | `npx hardhat test test/RoxasToken.test.ts` | Created in this phase | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `test/RoxasToken.test.ts` — test file created in this phase (IS the deliverable)

---

## Manual-Only Verifications

All phase behaviors have automated verification via test runner.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
