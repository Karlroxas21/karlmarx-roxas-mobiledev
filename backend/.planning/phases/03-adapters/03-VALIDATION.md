---
phase: 3
slug: adapters
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
| **Framework** | jest 30.3.0 + ts-jest 29.4.9 (from Phase 1) |
| **Config file** | `jest.config.ts` |
| **Quick run command** | `npx jest --testPathPattern=adapter --no-coverage` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern=adapter --no-coverage`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-00-01 | 00 | 0 | ETH-02, CACHE-01 | unit | `npx jest --testPathPattern=etherscan.adapter` | ❌ W0 | ⬜ pending |
| 3-00-02 | 00 | 0 | CACHE-03 | unit | `npx jest --testPathPattern=redis.adapter` | ❌ W0 | ⬜ pending |
| 3-00-03 | 00 | 0 | DB-01 | unit | `npx jest --testPathPattern=balance.repository` | ❌ W0 | ⬜ pending |
| 3-01-01 | 01 | 1 | ETH-02 | unit | `npx jest --testPathPattern=etherscan.adapter` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | CACHE-01, CACHE-02, CACHE-03 | unit | `npx jest --testPathPattern=redis.adapter` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | DB-01, DB-02, DB-03 | unit | `npx jest --testPathPattern=balance.repository` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/tests/etherscan.adapter.test.ts` — covers ETH-02 (status check, gas/block/balance fetch)
- [ ] `src/tests/redis.adapter.test.ts` — covers CACHE-01, CACHE-02, CACHE-03 (TTL, hit/miss, graceful degradation)
- [ ] `src/tests/balance.repository.test.ts` — covers DB-01, DB-02, DB-03 (insert, non-blocking, graceful degradation)

*Existing infrastructure: jest.config.ts present, ts-jest working. Only test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Etherscan live API call | ETH-02 | Requires real API key and network | Set ETHERSCAN_API_KEY, call adapter directly |
| Redis actual TTL expiry | CACHE-01 | Requires running Redis with time-based check | Start Redis, set value, wait 15s, verify gone |

*Most behaviors are unit-testable with mocked dependencies.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 8s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
