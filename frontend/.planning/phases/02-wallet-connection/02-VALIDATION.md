---
phase: 2
slug: wallet-connection
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                               |
| ---------------------- | --------------------------------------------------- |
| **Framework**          | Manual UAT (no automated test framework configured) |
| **Config file**        | none — no jest/vitest configured                    |
| **Quick run command**  | `npm run lint`                                      |
| **Full suite command** | Manual device UAT — run all 4 WALLET-XX scenarios   |
| **Estimated runtime**  | ~120 seconds (manual walkthrough)                   |

---

## Sampling Rate

- **After every task commit:** Visual inspection of component renders in dev build + `npm run lint`
- **After every plan wave:** Manual UAT on device — run all 4 WALLET-XX scenarios
- **Before `/gsd:verify-work`:** All 4 WALLET-XX scenarios pass on a real device
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type     | Automated Command                  | File Exists | Status     |
| -------- | ---- | ---- | ----------- | ------------- | ---------------------------------- | ----------- | ---------- |
| 02-01-01 | 01   | 1    | WALLET-01   | manual device | `npm run lint` (code quality only) | N/A         | ⬜ pending |
| 02-01-02 | 01   | 1    | WALLET-02   | manual device | `npm run lint` (code quality only) | N/A         | ⬜ pending |
| 02-01-03 | 01   | 1    | WALLET-03   | manual device | `npm run lint` (code quality only) | N/A         | ⬜ pending |
| 02-01-04 | 01   | 1    | WALLET-04   | manual device | `npm run lint` (code quality only) | N/A         | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `queries.js` — Expo config plugin for Android wallet detection (does not exist yet)
- [ ] No test framework installed — manual UAT is the verification path for this phase

_Existing infrastructure covers lint checks only. All behavioral verification is manual._

---

## Manual-Only Verifications

| Behavior                                             | Requirement | Why Manual                                                                  | Test Instructions                                                              |
| ---------------------------------------------------- | ----------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| WalletConnect modal opens with QR code + wallet list | WALLET-01   | Requires AppKit modal rendering + wallet list detection (device-level)      | Tap "Connect Wallet", verify modal shows QR code and MetaMask option           |
| MetaMask deep-link connects and returns to app       | WALLET-02   | Requires installed MetaMask, deep link round-trip, physical/emulator device | Select MetaMask in modal, approve in MetaMask, verify address displayed in app |
| Session persists across app restart                  | WALLET-03   | Requires app lifecycle (kill + reopen), device-level AsyncStorage           | Connect wallet, kill app, reopen, verify address still displayed               |
| Disconnect clears session                            | WALLET-04   | Requires connected wallet session                                           | Tap "Disconnect", verify app returns to disconnected state                     |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
