---
phase: 3
slug: balance-display
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None detected — Wave 0 must install jest + jest-expo |
| **Config file** | None — Wave 0 installs |
| **Quick run command** | `npx jest --testPathPattern=use-balance` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern=use-balance`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | BAL-01 | unit | `npx jest --testPathPattern=use-balance -t "formatBalance"` | Wave 0 | ⬜ pending |
| 03-01-02 | 01 | 0 | BAL-01 | unit | `npx jest --testPathPattern=use-balance -t "formatBalance dust"` | Wave 0 | ⬜ pending |
| 03-01-03 | 01 | 0 | BAL-01 | unit | `npx jest --testPathPattern=use-balance -t "threshold"` | Wave 0 | ⬜ pending |
| 03-01-04 | 01 | 0 | BAL-01 | unit | `npx jest --testPathPattern=use-balance -t "fixed decimals"` | Wave 0 | ⬜ pending |
| 03-01-05 | 01 | 1 | BAL-01 | manual | manual-only (no RN test runner) | — | ⬜ pending |
| 03-01-06 | 01 | 1 | BAL-01 | manual | manual-only (no RN test runner) | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install jest + jest-expo: `npm install --save-dev jest jest-expo @testing-library/react-native`
- [ ] `src/features/wallet/hooks/__tests__/use-balance.test.ts` — stubs for BAL-01 formatBalance unit cases
- [ ] Jest config in package.json or jest.config.js

*No test framework currently exists in this project. Wave 0 must install one for automated formatBalance verification.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Skeleton renders when isLoading | BAL-01 | No RN component test runner installed | Connect wallet on device/emulator, observe gray pulsing rectangle before balance loads |
| BalanceDisplay renders formatted ETH | BAL-01 | No RN component test runner installed | Connect wallet on device/emulator, verify balance shows as "X.XXXX ETH" format |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
