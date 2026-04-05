# Phase 6: Transfer and Boundary Tests - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Add transfer, approval, and cap boundary tests to the existing test file. Covers: transfer() success + Transfer event, transfer revert on insufficient balance, full approve() + transferFrom() flow, and mint-exactly-to-cap then revert on next mint. Adds to `test/RoxasToken.test.ts` created in Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- All implementation choices are at Claude's discretion — testing phase with well-defined patterns
- Whether to add new describe blocks to existing file or create a separate file
- Test fixture reuse strategy (use existing deployFixture or create new ones)
- Use ethers v6 BigInt throughout (consistent with Phase 5 tests)
- OZ v5 note: transferFrom() does NOT emit Approval event (gas optimization) — tests should NOT assert Approval on transferFrom

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Test File
- `test/RoxasToken.test.ts` — Existing 189-line test file to extend (Phase 5 deliverable)
- `contracts/RoxasToken.sol` — Contract under test (71 lines with minting)

### Research
- `.planning/phases/03-erc-20-transfers-and-approvals/03-RESEARCH.md` — OZ v5 Approval event behavior on transferFrom (does NOT emit)
- `.planning/phases/05-deployment-and-minting-tests/05-RESEARCH.md` — HH3 test patterns, loadFixture, ethers v6

### Prior Phase Context
- `.planning/phases/05-deployment-and-minting-tests/05-CONTEXT.md` — Test infrastructure decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `test/RoxasToken.test.ts` — deployFixture with deployer + user1 signers already set up
- loadFixture pattern established
- nearCapFixture from Phase 5 Task 2 (can be reused for boundary tests)

### Established Patterns
- Hardhat 3 ESM: `const { ethers, networkHelpers } = await network.connect()`
- ethers v6 BigInt, parseEther
- `.to.be.revertedWithCustomError(contract, "ErrorName")`
- `.to.emit(contract, "EventName").withArgs(...)`

### Integration Points
- Extends existing test file — must not break Phase 5's 15 passing tests

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard transfer/approval test patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-transfer-and-boundary-tests*
*Context gathered: 2026-04-05*
