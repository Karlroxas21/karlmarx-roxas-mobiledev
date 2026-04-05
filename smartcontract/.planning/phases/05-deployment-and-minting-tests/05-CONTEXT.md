# Phase 5: Deployment and Minting Tests - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Write automated Mocha/Chai tests that verify deployment state and all minting behaviors. Test file: `test/RoxasToken.test.ts`. Uses Hardhat 3 test patterns (hre.network.connect(), loadFixture, ethers v6 BigInt). Covers deployment, public mint success, per-tx limit revert, cap revert, and cooldown revert.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- All implementation choices are at Claude's discretion — testing phase with well-defined patterns
- Test file structure, fixture design, assertion patterns, describe/it organization
- Whether to use loadFixture for state management
- Time manipulation approach for cooldown tests (hardhat network helpers time.increase)
- Use ethers v6 BigInt (not BigNumber) throughout

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Contract
- `contracts/RoxasToken.sol` — Contract under test (71 lines with minting mechanics)
- `types/ethers-contracts/RoxasToken.ts` — TypeChain typed interface for test assertions

### Research
- `.planning/research/STACK.md` — Hardhat 3 test patterns, ethers v6 BigInt, loadFixture
- `.planning/research/PITFALLS.md` — Pitfall #6 (BigInt confusion), Pitfall #3 (OZ v5 custom errors)
- `.planning/phases/04-minting-mechanics/04-RESEARCH.md` — Custom error signatures, CEI pattern, cooldown timing

### Prior Phases
- `.planning/phases/04-minting-mechanics/04-CONTEXT.md` — Minting parameters (1000 RXS limit, 60s cooldown, 1M initial supply)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Hardhat 3 toolbox already installed (Mocha, Chai matchers, network helpers, ethers)
- TypeChain types generated for RoxasToken
- No existing test files — this creates the first one

### Established Patterns
- Hardhat 3 ESM: `import { ... } from "hardhat/config"`
- ethers v6: native BigInt, parseUnits, formatUnits
- OZ v5 custom errors: `.to.be.revertedWithCustomError(contract, "ErrorName")`

### Integration Points
- test/ directory needs to be created
- `npx hardhat test` runs all tests
- Phase 6 will add transfer/boundary tests to the same or separate file

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard Hardhat test patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-deployment-and-minting-tests*
*Context gathered: 2026-04-05*
