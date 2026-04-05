---
phase: 07-sepolia-deployment
plan: 01
subsystem: deployment
tags: [hardhat-ignition, deployment-module, sepolia, tdd]

# Dependency graph
requires:
  - phase: 02-contract-foundation
    provides: RoxasToken.sol contract with parameterless constructor
provides:
  - Hardhat Ignition deployment module for RoxasToken (ignition/modules/RoxasToken.ts)
  - Smoke test validating Ignition module on local network (test/RoxasToken.ignition.test.ts)
affects: [08-etherscan-verification]

# Tech tracking
tech-stack:
  added: []
  patterns: [hardhat-ignition-module, ignition-smoke-test]

key-files:
  created:
    - ignition/modules/RoxasToken.ts
    - test/RoxasToken.ignition.test.ts
  modified: []

key-decisions:
  - "Used network.connect() pattern for Ignition deploy in tests (Hardhat 3 API, not hre.ignition)"
  - "Module ID 'RoxasTokenModule' with Module suffix to distinguish from contract name"
  - "No refactor phase needed -- both files are minimal and clean"

patterns-established:
  - "Ignition module pattern: buildModule with m.contract() for parameterless constructors"
  - "Ignition test pattern: destructure ignition from network.connect(), then ignition.deploy(Module)"

requirements-completed: [DEPL-01]

# Metrics
duration: 2min
completed: 2026-04-05
---

# Phase 7 Plan 1: Ignition Deployment Module Summary

**Hardhat Ignition module for RoxasToken with TDD smoke test validating deploy, name, symbol, cap, and initial supply on local network**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-05T07:36:50Z
- **Completed:** 2026-04-05T07:38:25Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files created:** 2

## Accomplishments
- Created Hardhat Ignition deployment module at ignition/modules/RoxasToken.ts
- Created smoke test with 5 assertions covering deploy success, name, symbol, cap, and initial supply
- Full test suite passes: 28 tests (5 new Ignition + 23 existing)
- Module ready for manual Sepolia deployment via: `npx hardhat ignition deploy ignition/modules/RoxasToken.ts --network sepolia`

## Task Commits

Each task was committed atomically (TDD flow):

1. **Task 1 RED: Failing smoke test** - `8f0f32a` (test)
2. **Task 1 GREEN: Ignition module implementation** - `ae656ff` (feat)

## Files Created/Modified
- `ignition/modules/RoxasToken.ts` - Hardhat Ignition deployment module exporting RoxasTokenModule
- `test/RoxasToken.ignition.test.ts` - Smoke test: 5 tests verifying Ignition module deploys correctly on local network

## Decisions Made
- Used `network.connect()` destructuring pattern to access `ignition` (Hardhat 3 API -- `hre.ignition` is Hardhat 2 pattern)
- Module ID set to `"RoxasTokenModule"` per research recommendation (distinguishes module from contract name)
- No fallback `scripts/deploy.ts` created (user locked Ignition as the deployment system)
- No refactor commit needed -- both files are minimal

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected Ignition API access pattern for Hardhat 3**
- **Found during:** Task 1 (RED phase)
- **Issue:** Plan specified `hre.ignition.deploy()` but Hardhat 3 exposes ignition via `network.connect()` not on hre
- **Fix:** Used `const { ignition } = await network.connect()` then `ignition.deploy(RoxasTokenModule)`
- **Files modified:** test/RoxasToken.ignition.test.ts
- **Verification:** All 5 smoke tests pass
- **Committed in:** 8f0f32a

---

**Total deviations:** 1 auto-fixed (1 bug fix for Hardhat 3 API pattern)
**Impact on plan:** Essential correction for Hardhat 3 compatibility. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. User deploys to Sepolia manually when ready with faucet ETH and configured secrets.

## Next Phase Readiness
- Ignition module ready for Sepolia deployment
- Phase 8 (Etherscan verification) can proceed once contract is deployed
- User needs: faucet ETH, SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, ETHERSCAN_API_KEY configured via `npx hardhat keystore set`

## Self-Check: PASSED

- [x] ignition/modules/RoxasToken.ts exists
- [x] test/RoxasToken.ignition.test.ts exists
- [x] 07-01-SUMMARY.md exists
- [x] Commit 8f0f32a found (RED: failing test)
- [x] Commit ae656ff found (GREEN: Ignition module)

---
*Phase: 07-sepolia-deployment*
*Completed: 2026-04-05*
