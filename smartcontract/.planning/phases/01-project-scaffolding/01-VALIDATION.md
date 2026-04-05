---
phase: 1
slug: project-scaffolding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Hardhat 3 compile task (no test framework needed for Phase 1) |
| **Config file** | hardhat.config.ts (created in this phase) |
| **Quick run command** | `npx hardhat compile` |
| **Full suite command** | `npx hardhat compile --force` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx hardhat compile`
- **After every plan wave:** Run `npx hardhat compile --force`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | INFR-01 | smoke | `npx hardhat compile` | N/A - built-in | ⬜ pending |
| 01-01-02 | 01 | 1 | INFR-04 | manual | `grep -c "artifacts" .gitignore` | ⬜ pending | ⬜ pending |
| 01-01-03 | 01 | 1 | INFR-05 | manual | `grep -c "SEPOLIA_RPC_URL" .env.example` | ⬜ pending | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements. Phase 1 creates the infrastructure from scratch — the compile task is the only automated verification needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| .gitignore excludes artifacts/, cache/, node_modules/, .env | INFR-04 | Static file content check | Verify .gitignore contains all 4 entries |
| .env.example documents SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, ETHERSCAN_API_KEY | INFR-05 | Static file content check | Verify .env.example has all 3 variables with Infura placeholder format |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
