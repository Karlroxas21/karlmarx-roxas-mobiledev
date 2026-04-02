---
phase: 1
slug: foundation-polyfills
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                      |
| ---------------------- | ---------------------------------------------------------- |
| **Framework**          | None installed — Phase 1 behaviors are device-runtime only |
| **Config file**        | None — no automated test framework applicable              |
| **Quick run command**  | `npx expo run:android` (build + launch on device)          |
| **Full suite command** | `npx expo run:android` (build + verify smoke screen)       |
| **Estimated runtime**  | ~300 seconds (first build), ~60 seconds (incremental)      |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint` (catches import/config errors)
- **After every plan wave:** Run `npx expo run:android` on physical device
- **Before `/gsd:verify-work`:** Full build + smoke test screen verification on device
- **Max feedback latency:** 300 seconds (first build), 60 seconds (incremental)

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type            | Automated Command                                                         | File Exists | Status     |
| -------- | ---- | ---- | ----------- | -------------------- | ------------------------------------------------------------------------- | ----------- | ---------- |
| 01-01-01 | 01   | 1    | FOUND-01    | Build + device smoke | `npx expo run:android` exit 0                                             | N/A         | ⬜ pending |
| 01-01-02 | 01   | 1    | FOUND-01    | Config verification  | `grep 'unstable_transformImportMeta' babel.config.js`                     | ❌ W0       | ⬜ pending |
| 01-01-03 | 01   | 1    | FOUND-02    | Config verification  | `grep 'unstable_transformProfile' babel.config.js`                        | ❌ W0       | ⬜ pending |
| 01-01-04 | 01   | 1    | FOUND-02    | Import order check   | `head -1 src/lib/appkit.ts` contains `@walletconnect/react-native-compat` | ❌ W0       | ⬜ pending |
| 01-01-05 | 01   | 1    | FOUND-03    | Env var presence     | `grep 'EXPO_PUBLIC_' .env.example` shows 3 vars                           | ❌ W0       | ⬜ pending |
| 01-01-06 | 01   | 1    | FOUND-03    | Smoke screen         | Visual check: smoke test screen shows masked env vars                     | N/A         | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `babel.config.js` — must be created (does not exist yet)
- [ ] `.env.example` — must be created with all three `EXPO_PUBLIC_` vars
- [ ] `.env` — must be created from `.env.example` with placeholder values before build
- [ ] Physical Android device connected via USB with USB debugging enabled
- [ ] Reown Project ID obtained from https://cloud.reown.com
- [ ] Infura Project ID obtained from https://app.infura.io

_No automated test framework is installed. Unit testing of polyfill behavior and build infrastructure is not practical. The smoke test screen is the intended verification mechanism for this phase._

---

## Manual-Only Verifications

| Behavior                            | Requirement | Why Manual                                              | Test Instructions                                                                                                |
| ----------------------------------- | ----------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| App launches without polyfill crash | FOUND-01    | Polyfill crashes manifest only in native Hermes runtime | 1. Build with `npx expo run:android` 2. Launch app on device 3. Verify no red screen / crash in first 10 seconds |
| AppKit initializes without errors   | FOUND-02    | AppKit init requires device-level native modules        | 1. Open Metro terminal 2. Launch app 3. Check Metro logs for "AppKit" errors 4. Smoke screen shows "AppKit: OK"  |
| Env vars visible on smoke screen    | FOUND-03    | Env vars only resolve at device runtime                 | 1. Launch app on device 2. Smoke screen displays masked values for all 3 vars                                    |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
