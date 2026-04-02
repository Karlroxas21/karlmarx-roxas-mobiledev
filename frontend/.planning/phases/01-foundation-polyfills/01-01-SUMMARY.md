---
phase: 01-foundation-polyfills
plan: 01
subsystem: infra
tags:
  [
    expo,
    react-native,
    walletconnect,
    ethers,
    polyfills,
    babel,
    metro,
    environment-variables,
  ]

# Dependency graph
requires: []
provides:
  - 12 polyfill and crypto packages installed (AppKit, ethers v6, quick-crypto, stream/buffer shims)
  - babel.config.js with unstable_transformImportMeta and hermes-stable profile
  - metro.config.js with extraNodeModules mapping crypto/stream/buffer to RN packages
  - .env.example committed with 3 required EXPO_PUBLIC_ blockchain vars
  - src/config/env.ts extended with startup validation for REOWN, ETHERSCAN, INFURA vars
affects: [01-02, all subsequent phases that import ENV or use AppKit/ethers]

# Tech tracking
tech-stack:
  added:
    - '@reown/appkit-react-native@2.0.2'
    - '@reown/appkit-ethers-react-native@2.0.2'
    - '@react-native-async-storage/async-storage@2.2.0'
    - 'react-native-get-random-values@1.11.0'
    - 'react-native-svg@15.12.1'
    - '@react-native-community/netinfo@11.4.1'
    - '@walletconnect/react-native-compat@2.23.9'
    - 'expo-application@7.0.8'
    - 'ethers@6.16.0'
    - 'react-native-quick-crypto@1.0.18'
    - 'stream-browserify@3.0.0'
    - '@craftzdog/react-native-buffer@6.1.1'
  patterns:
    - 'Expo SDK version constraints honored via `npx expo install` for native modules'
    - 'Metro extraNodeModules for Node.js core module aliasing'
    - 'Static process.env.EXPO_PUBLIC_* access (expo/no-dynamic-env-var rule compliance)'
    - 'Startup-time env var validation via assertEnv helper'

key-files:
  created:
    - babel.config.js
    - .env.example
  modified:
    - package.json
    - package-lock.json
    - metro.config.js
    - .gitignore
    - src/config/env.ts

key-decisions:
  - 'Used assertEnv(name, process.env.EXPO_PUBLIC_*) pattern instead of requireEnv(name) to comply with expo/no-dynamic-env-var ESLint rule'
  - 'Removed .env from git tracking (git rm --cached) after adding it to .gitignore'
  - 'Two-step install: expo install for SDK-constrained native modules, npm install for Metro alias packages'

patterns-established:
  - 'Env validation pattern: static process.env read passed to assertEnv() validator, throws at startup with clear error'
  - 'Metro node alias pattern: config.resolver.extraNodeModules assigned before withNativeWind wrapper'

requirements-completed: [FOUND-01, FOUND-02, FOUND-03]

# Metrics
duration: 4min
completed: 2026-04-01
---

# Phase 1 Plan 01: Foundation Polyfills Summary

**12 blockchain polyfill packages installed with Babel import.meta + Hermes BigInt config, Metro crypto/stream/buffer aliasing, and startup-validated ENV object for Reown/Etherscan/Infura credentials**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-01T08:14:05Z
- **Completed:** 2026-04-01T08:18:25Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Installed all 12 required packages (10 via `npx expo install` respecting SDK 54 constraints, 2 via `npm install` for Metro aliases) with zero peer dependency conflicts
- Created babel.config.js with `unstable_transformImportMeta: true` (required for AppKit valtio) and `unstable_transformProfile: 'hermes-stable'` (required for ethers v6 BigInt on Hermes)
- Extended metro.config.js to map Node.js core module names (crypto, stream, buffer) to React Native packages via `config.resolver.extraNodeModules`, preserving the NativeWind wrapper
- Created .env.example (committed) and .env (gitignored) with 3 blockchain service placeholder vars; updated .gitignore to exclude .env; extended config/env.ts with startup validation for all three vars

## Task Commits

Each task was committed atomically:

1. **Task 1: Install polyfill and crypto packages** - `c838e8b` (chore)
2. **Task 2: Create babel.config.js and update metro.config.js** - `786ef1c` (chore)
3. **Task 3: Create .env files, update .gitignore, and extend config/env.ts** - `33d7b8c` (chore)

## Files Created/Modified

- `babel.config.js` - babel-preset-expo with unstable_transformImportMeta and hermes-stable profile flags
- `metro.config.js` - Added extraNodeModules resolver for crypto/stream/buffer before withNativeWind wrapper
- `package.json` - 12 new dependency entries
- `package-lock.json` - Updated lock file
- `.env.example` - Template with 3 EXPO*PUBLIC* blockchain service vars (committed to repo)
- `.gitignore` - Added `.env` to excluded files, removed from git tracking
- `src/config/env.ts` - Added assertEnv helper and REOWN_PROJECT_ID, ETHERSCAN_API_KEY, INFURA_RPC_URL to ENV object

## Decisions Made

- **assertEnv pattern instead of requireEnv:** The plan specified `requireEnv(name)` which uses dynamic bracket access `process.env[name]`. The Expo ESLint config enforces `expo/no-dynamic-env-var` which prohibits this pattern. Fixed by passing the static value as a second argument: `assertEnv('EXPO_PUBLIC_REOWN_PROJECT_ID', process.env.EXPO_PUBLIC_REOWN_PROJECT_ID)`.
- **Preserved existing API_URL in .env:** The pre-existing `.env` contained `EXPO_PUBLIC_API_URL=http://localhost:3000`. This was preserved in the updated `.env` alongside the 3 new blockchain vars.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed expo/no-dynamic-env-var lint error in env.ts**

- **Found during:** Task 3 (Create .env files, update .gitignore, and extend config/env.ts)
- **Issue:** The plan specified `function requireEnv(name: string)` which internally calls `process.env[name]` — dynamic bracket access. The Expo ESLint rule `expo/no-dynamic-env-var` prohibits this, causing a lint error.
- **Fix:** Renamed helper to `assertEnv(name, value)` accepting the value as a second parameter. Each call site passes the statically-named `process.env.EXPO_PUBLIC_*` directly: `assertEnv('EXPO_PUBLIC_REOWN_PROJECT_ID', process.env.EXPO_PUBLIC_REOWN_PROJECT_ID)`. Same runtime behavior (throws if missing), compliant with lint rule.
- **Files modified:** `src/config/env.ts`
- **Verification:** `npm run lint` passes with 0 errors after fix
- **Committed in:** `33d7b8c` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug fix)
**Impact on plan:** The fix maintains identical runtime semantics — startup throws with a clear error message if any var is missing. No scope creep. Function name changed from `requireEnv` to `assertEnv` to reflect the two-argument signature.

## Issues Encountered

- Pre-existing `.env` file was being tracked by git before `.gitignore` was updated. After adding `.env` to `.gitignore`, ran `git rm --cached .env` to remove it from tracking without deleting the local file.

## User Setup Required

The plan's `user_setup` section defines 3 external services that require manual configuration before the app can be used:

| Service   | Env Var                         | Source                                                                    |
| --------- | ------------------------------- | ------------------------------------------------------------------------- |
| Reown     | `EXPO_PUBLIC_REOWN_PROJECT_ID`  | https://cloud.reown.com -> Create project -> Copy Project ID              |
| Infura    | `EXPO_PUBLIC_INFURA_RPC_URL`    | https://app.infura.io -> Create API key -> Copy Ethereum mainnet endpoint |
| Etherscan | `EXPO_PUBLIC_ETHERSCAN_API_KEY` | https://etherscan.io/myapikey -> Create key -> Copy                       |

Copy `.env.example` to `.env` and replace the placeholder values. The app will throw a clear error at startup if any are missing.

## Next Phase Readiness

- All 12 packages installed and available for import in Phase 1 Plan 02
- Babel config ready: AppKit (valtio/import.meta) and ethers v6 (BigInt/Hermes) will work at build time
- Metro config ready: `crypto`, `stream`, `buffer` resolve to React Native packages
- ENV object ready: REOWN_PROJECT_ID, ETHERSCAN_API_KEY, INFURA_RPC_URL all exported and validated at startup
- Phase 1 Plan 02 can now create `lib/appkit.ts` singleton and wire providers

**Remaining concern:** WalletConnect deep-link round-trip requires a physical Android device for testing (no wallet apps in emulator). Noted in STATE.md blockers.

## Self-Check: PASSED

- FOUND: babel.config.js
- FOUND: metro.config.js
- FOUND: .env.example
- FOUND: src/config/env.ts
- FOUND: 01-01-SUMMARY.md
- FOUND commit: c838e8b (Task 1)
- FOUND commit: 786ef1c (Task 2)
- FOUND commit: 33d7b8c (Task 3)

---

_Phase: 01-foundation-polyfills_
_Completed: 2026-04-01_
