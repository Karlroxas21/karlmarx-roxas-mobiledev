---
phase: 01-foundation-polyfills
plan: 02
subsystem: infra
tags: [appkit, walletconnect, reown, ethers, polyfills, react-native, expo]

# Dependency graph
requires:
  - phase: 01-foundation-polyfills-01
    provides: "polyfill packages installed, babel+metro config, env.ts with three env vars"
provides:
  - "src/lib/appkit.ts — AppKit singleton with correct polyfill import order and ethers v6 crypto registration"
  - "src/providers/app-provider.tsx — AppKitProvider wrapping with AppKit modal component"
  - "src/app/index.tsx — Smoke test screen showing AppKit init status and masked env vars"
affects:
  - "02-wallet-connection — AppKit singleton is the entry point for wallet connect flows"
  - "All future phases — AppProvider is root provider that wraps entire app"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AppKit singleton initialized at module scope in lib/appkit.ts (never inside a component)"
    - "@walletconnect/react-native-compat MUST be absolute first import in lib/appkit.ts"
    - "app-provider.tsx imports lib/appkit as first import (side-effect ensures polyfills run)"
    - "Ethereum mainnet defined inline as AppKitNetwork (no @reown/appkit web package installed)"
    - "ethers v6 crypto registered via plugin API (randomBytes, computeHmac, pbkdf2, sha256, sha512)"

key-files:
  created:
    - src/lib/appkit.ts
    - src/app/index.tsx (replaced)
  modified:
    - src/providers/app-provider.tsx

key-decisions:
  - "Defined Ethereum mainnet AppKitNetwork inline — @reown/appkit (web package) is not installed in this project; only @reown/appkit-react-native and @reown/appkit-common-react-native are present"
  - "Merged side-effect import into named import in app-provider.tsx to avoid import/no-duplicates lint warning"
  - "Used require() inside try/catch in smoke test screen to catch AppKit init errors on screen rather than crashing at module load"

patterns-established:
  - "Pattern: lib/appkit.ts import order — @walletconnect/react-native-compat first, react-native-get-random-values second, then AppKit+adapters, then env config, then ethers+quick-crypto"
  - "Pattern: AppKitNetwork inline definition — use @reown/appkit-common-react-native AppKitNetwork type with eip155 chainNamespace and caipNetworkId"

requirements-completed: [FOUND-01, FOUND-02, FOUND-03]

# Metrics
duration: 5min
completed: 2026-04-01
---

# Phase 1 Plan 02: AppKit Singleton and Smoke Test Screen Summary

**AppKit singleton with correct polyfill import order, ethers v6 native crypto registration, AppKitProvider wired into root provider, and smoke test screen showing masked env var values**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-01T08:21:26Z
- **Completed:** 2026-04-01T08:25:31Z
- **Tasks:** 2 of 3 complete (Task 3 is a blocking human-verify checkpoint)
- **Files modified:** 3

## Accomplishments

- AppKit singleton created in `src/lib/appkit.ts` with strict polyfill load order — `@walletconnect/react-native-compat` first, `react-native-get-random-values` second, then AppKit+adapters, then env config, then ethers+crypto
- All five ethers v6 crypto primitives registered via plugin API (`randomBytes`, `computeHmac`, `pbkdf2`, `sha256`, `sha512`) using `react-native-quick-crypto` for native JSI performance
- `app-provider.tsx` wraps children with `AppKitProvider` (instance prop) and renders `<AppKit />` modal component
- Smoke test screen at `src/app/index.tsx` shows AppKit init status and all three env vars with masked values (last 4 chars visible for keys, full URL for RPC)

## Task Commits

1. **Task 1: Create AppKit singleton and wire into AppProvider** - `fe6ee9a` (feat)
2. **Task 2: Build temporary smoke test screen on index route** - `884f46c` (feat)
3. **Task 3: Verify app builds on physical Android device** — awaiting human verification checkpoint

## Files Created/Modified

- `src/lib/appkit.ts` — AppKit singleton with polyfills in strict load order, ethers v6 crypto plugin registrations, Ethereum mainnet AppKitNetwork inline definition, createAppKit call
- `src/providers/app-provider.tsx` — Replaced empty fragment with AppKitProvider wrapping; imports lib/appkit as first import
- `src/app/index.tsx` — Temporary smoke test screen: AppKit status (OK/Error), masked env var display, maskValue helper

## Decisions Made

- **Defined Ethereum mainnet inline:** The plan referenced `import { mainnet } from '@reown/appkit/networks'` but `@reown/appkit` (the web package) is not installed — only `@reown/appkit-react-native` and `@reown/appkit-common-react-native` are present. Used `AppKitNetwork` type from `@reown/appkit-common-react-native` to define `mainnet` inline with `eip155:1` caipNetworkId.
- **Merged duplicate import:** Original plan had a separate `import '@/src/lib/appkit'` (side-effect) and `import { appKit } from '@/src/lib/appkit'` (named). These were merged into a single named import to satisfy the `import/no-duplicates` lint rule while preserving the same behavior.
- **require() in try/catch:** Used `require()` inside try/catch (not a top-level `import`) in the smoke test screen so that AppKit initialization errors appear on-screen rather than crashing the app at module parse time. ESLint warns about this pattern but the warning is intentional and the lint exits with code 0.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced unresolvable @reown/appkit/networks import with inline AppKitNetwork definition**
- **Found during:** Task 1 (Create AppKit singleton)
- **Issue:** Plan specified `import { mainnet } from '@reown/appkit/networks'` but the `@reown/appkit` web package is not installed in this project. ESLint reported `Unable to resolve path to module '@reown/appkit/networks'` (error, not warning).
- **Fix:** Removed the web package import. Defined `mainnet` as an `AppKitNetwork` constant inline using the type from `@reown/appkit-common-react-native`, which is already installed as a peer dependency of `@reown/appkit-react-native`.
- **Files modified:** `src/lib/appkit.ts`
- **Verification:** `npm run lint` passes with 0 errors after fix.
- **Committed in:** `fe6ee9a` (Task 1 commit)

**2. [Rule 1 - Bug] Merged duplicate appkit import in app-provider.tsx to fix lint warning**
- **Found during:** Task 1 (Wire AppKitProvider)
- **Issue:** Plan template had both `import '@/src/lib/appkit'` (side-effect) and `import { appKit } from '@/src/lib/appkit'` (named) — two imports from the same path. ESLint `import/no-duplicates` reported a warning.
- **Fix:** Removed the side-effect import; the named import `import { appKit } from '@/src/lib/appkit'` already executes all module-scope side effects (polyfills + createAppKit) when the module is first loaded.
- **Files modified:** `src/providers/app-provider.tsx`
- **Verification:** `npm run lint` drops from 4 problems to 1 (the pre-existing `useCallback` warning in an unrelated file).
- **Committed in:** `fe6ee9a` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 × Rule 1 Bug)
**Impact on plan:** Both fixes were necessary for the code to pass lint. No behavioral change — the AppKit singleton still initializes at module scope exactly as designed.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

Task 3 requires manual device verification. See the checkpoint message for full instructions:

- Android Studio + JDK 17 + USB debugging setup (one-time)
- Real API keys needed in `.env`: Reown Project ID, Etherscan API Key, Infura RPC URL
- Run `npx expo run:android` and verify 6 on-screen checks

## Self-Check: PASSED

All files verified to exist on disk:
- `src/lib/appkit.ts` — FOUND
- `src/providers/app-provider.tsx` — FOUND
- `src/app/index.tsx` — FOUND
- `.planning/phases/01-foundation-polyfills/01-02-SUMMARY.md` — FOUND

Commits verified:
- `fe6ee9a` — feat(01-02): create AppKit singleton and wire AppKitProvider — FOUND
- `884f46c` — feat(01-02): add smoke test screen showing AppKit status and env vars — FOUND

## Next Phase Readiness

- AppKit singleton and provider wiring are complete — Phase 2 wallet connection flows have a working foundation
- Smoke test screen will be replaced in Phase 2 with the actual wallet UI
- **Blocker:** Task 3 human verification must pass before Phase 1 is marked complete

---
*Phase: 01-foundation-polyfills*
*Completed: 2026-04-01*
