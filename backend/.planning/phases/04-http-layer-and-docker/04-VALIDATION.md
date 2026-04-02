---
phase: 4
slug: http-layer-and-docker
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 30.3.0 + ts-jest 29.4.9 (from Phase 1) |
| **Config file** | `jest.config.ts` |
| **Quick run command** | `npx jest --testPathPattern=ethereum.controller --no-coverage` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --no-coverage`
- **After every plan wave:** Run `npx jest && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Wave 0 Requirements

- [ ] `src/tests/ethereum.controller.test.ts` — covers ARCH-03 (controller registration, error mapping)

*Existing infrastructure: jest working. Only controller test file needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Docker Compose full stack boot | INFRA-02 | Requires Docker runtime | `docker compose up -d && curl localhost:3000/api/health` |
| Health endpoint live response | INFRA-01 | Requires running server | `npm run dev` then `curl localhost:3000/api/health` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 8s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
