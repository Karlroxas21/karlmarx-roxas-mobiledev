---
phase: 05
slug: error-handling-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual verification (no test framework configured) |
| **Config file** | none |
| **Quick run command** | `npm run lint` |
| **Full suite command** | `npm run lint` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint`
- **After every plan wave:** Run `npm run lint`
- **Before `/gsd:verify-work`:** Lint must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | ERR-01 | manual | Visual inspection | N/A | ⬜ pending |
| 05-01-02 | 01 | 1 | ERR-02 | manual | Visual inspection | N/A | ⬜ pending |
| 05-01-03 | 01 | 1 | ERR-03 | manual | Visual inspection | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework needed — this phase is UI error state wiring verified by lint + visual inspection.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Connection error shows friendly copy | ERR-01 | UI rendering requires visual check | Attempt wallet connection with no wallet app installed; verify "Couldn't connect wallet" appears |
| Balance error shows inline error + retry | ERR-02 | Network failure needs simulated | Disconnect network, refresh; verify "Couldn't load balance" + Retry button appears |
| Transaction error shows inline error + retry | ERR-02 | Network failure needs simulated | Disconnect network, refresh; verify "Couldn't load transactions" + Retry button appears |
| Retry button refetches data | ERR-03 | Requires interaction test | Trigger error state, tap Retry; verify skeleton appears then data loads |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
