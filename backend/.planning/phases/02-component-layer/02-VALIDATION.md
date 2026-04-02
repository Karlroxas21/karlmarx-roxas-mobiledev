---
phase: 2
slug: component-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 30.3.0 + ts-jest 29.4.9 (from Phase 1) |
| **Config file** | `jest.config.ts` |
| **Quick run command** | `npx jest --testPathPattern=ethereum.service --no-coverage` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern=ethereum.service --no-coverage`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-00-01 | 00 | 0 | CORE-05, CORE-06 | unit | `npx jest --testPathPattern=ethereum.service -t "invalid address"` | ❌ W0 | ⬜ pending |
| 2-01-01 | 01 | 1 | ARCH-01 | structural | `test -f src/component/ethereum/interfaces.ts` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | CORE-02, CORE-03, CORE-04 | unit | `npx jest --testPathPattern=ethereum.service -t "dual-unit"` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | ETH-01, ETH-03 | unit | `npx jest --testPathPattern=ethereum.service -t "cache miss"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/tests/ethereum.service.test.ts` — stubs for CORE-02, CORE-03, CORE-04, CORE-05, CORE-06, ETH-01, ETH-03

*Existing infrastructure covers framework setup (jest.config.ts present, ts-jest working). Only test file needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | — | — | — |

*All phase behaviors have automated verification via unit tests with mocked ports.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
