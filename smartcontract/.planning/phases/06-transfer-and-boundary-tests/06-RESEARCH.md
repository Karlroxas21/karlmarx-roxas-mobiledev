# Phase 6: Transfer and Boundary Tests - Research

**Researched:** 2026-04-05
**Domain:** Hardhat 3 Mocha/Chai testing -- ERC-20 transfer/approval assertions and cap boundary conditions
**Confidence:** HIGH

## Summary

Phase 6 extends the existing `test/RoxasToken.test.ts` file (189 lines, 15 passing tests from Phase 5) with four new test areas: (1) transfer succeeds and emits Transfer event (TEST-06), (2) transfer reverts on insufficient balance (TEST-07), (3) approve + transferFrom flow (TEST-08), and (4) cap boundary -- mint exactly to cap then revert (TEST-09).

All patterns needed are already established in the Phase 5 test file. The existing `deployFixture` provides `owner` (1M RXS initial balance), `user1`, and `user2` signers. The existing `nearCapFixture` provides a contract with totalSupply near the 10M cap. No new fixtures are needed -- the existing ones cover all four requirements. Transfer tests use `owner` (who has tokens from initial supply) as the sender. The approve/transferFrom flow uses three actors: `owner` (token holder), `user1` (approved spender), `user2` (recipient).

The key OZ v5 behaviors verified from source: (a) `transfer()` calls `_update()` which emits `Transfer(from, to, value)` -- confirmed at ERC20.sol line 203; (b) insufficient balance reverts with `ERC20InsufficientBalance(sender, balance, needed)` -- confirmed at ERC20.sol line 183; (c) `approve()` calls `_approve()` which emits `Approval(owner, spender, value)` -- confirmed at ERC20.sol line 281; (d) `transferFrom()` calls `_spendAllowance()` which does NOT emit Approval (the `emitEvent` flag is `false` at line 302) then calls `_transfer()` which emits Transfer; (e) `ERC20ExceededCap(supply, maxSupply)` fires in `_update()` after `super._update()` has already incremented totalSupply -- confirmed at ERC20Capped.sol lines 46-52.

**Primary recommendation:** Add two new `describe` blocks ("Transfers" and "Approvals") inside the existing top-level `describe("RoxasToken")`. Reuse `deployFixture` for all transfer/approval tests. For TEST-09 (cap boundary), the existing "Cap enforcement" describe block already covers "mint exactly to cap then revert" in its two tests. Verify whether the existing tests satisfy TEST-09's exact wording or if a sharper single test is needed.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
None -- CONTEXT.md places all implementation choices at Claude's discretion for this testing phase.

### Claude's Discretion
- All implementation choices are at Claude's discretion -- testing phase with well-defined patterns
- Whether to add new describe blocks to existing file or create a separate file
- Test fixture reuse strategy (use existing deployFixture or create new ones)
- Use ethers v6 BigInt throughout (consistent with Phase 5 tests)
- OZ v5 note: transferFrom() does NOT emit Approval event (gas optimization) -- tests should NOT assert Approval on transferFrom

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEST-06 | Tests verify transfer succeeds and emits Transfer event | `deployFixture` provides `owner` with 1M RXS. Call `token.transfer(user1.address, amount)`, assert balance changes and `.to.emit(token, "Transfer").withArgs(owner.address, user1.address, amount)`. Transfer event emitted at ERC20.sol `_update()` line 203. |
| TEST-07 | Tests verify transfer reverts on insufficient balance | `user1` starts with 0 balance. Call `token.connect(user1).transfer(user2.address, amount)`, assert `.to.be.revertedWithCustomError(token, "ERC20InsufficientBalance").withArgs(user1.address, 0n, amount)`. Error at ERC20.sol line 183. |
| TEST-08 | Tests verify approve + transferFrom flow works correctly | Three steps: (1) `token.approve(user1.address, amount)` -- assert Approval event, (2) verify `allowance(owner, user1) == amount`, (3) `token.connect(user1).transferFrom(owner.address, user2.address, amount)` -- assert Transfer event (NOT Approval), verify balances, verify allowance decremented. |
| TEST-09 | Tests verify cap boundary conditions (mint exactly to cap, then revert) | Existing `nearCapFixture` gets near cap. Mint remaining to reach exactly cap, verify `totalSupply() == cap()`, then attempt one more mint and assert `ERC20ExceededCap`. The existing Phase 5 tests already cover this pattern -- evaluate whether they fully satisfy TEST-09 or need enhancement. |

</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Hardhat | ^3.3.0 | Test runner framework | `npx hardhat test` executes Mocha tests on Hardhat Network |
| @nomicfoundation/hardhat-toolbox-mocha-ethers | ^3.0.3 | Meta-plugin bundle | Mocha runner, Chai matchers, network helpers, ethers, TypeChain |
| Chai | (bundled) | Assertion library | `expect()` with `.to.emit()`, `.to.be.revertedWithCustomError()` |
| ethers.js | v6 (bundled) | Ethereum library | `parseEther()`, `getSigners()`, native BigInt |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nomicfoundation/hardhat-ethers-chai-matchers | (bundled) | `.to.emit()`, `.to.be.revertedWithCustomError()` | Every event and revert assertion |
| @nomicfoundation/hardhat-network-helpers | (bundled) | `loadFixture()`, `time.increase()` | State isolation and time manipulation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Adding describe blocks to existing file | Separate test file for transfers | Single file keeps all RoxasToken tests together, easier to maintain. Only split if file exceeds ~500 lines. |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Additions to Existing Structure
```
test/
  RoxasToken.test.ts      # Existing 189 lines + new Transfer and Approval describe blocks
```

### Pattern 1: Transfer Test with Event Assertion
**What:** Assert both the state change (balance) and event emission from a single `transfer()` call.
**When to use:** TEST-06.
**Example:**
```typescript
// Source: ERC20.sol line 99-103 (transfer), line 203 (Transfer event in _update)
it("should transfer tokens and emit Transfer event", async function () {
  const { token, owner, user1 } = await networkHelpers.loadFixture(deployFixture);
  const amount = ethers.parseEther("100");

  await expect(token.transfer(user1.address, amount))
    .to.emit(token, "Transfer")
    .withArgs(owner.address, user1.address, amount);

  expect(await token.balanceOf(user1.address)).to.equal(amount);
  expect(await token.balanceOf(owner.address)).to.equal(
    ethers.parseEther("1000000") - amount
  );
});
```

### Pattern 2: Insufficient Balance Revert Assertion
**What:** Assert that transfer reverts with the exact ERC-6093 custom error and its arguments.
**When to use:** TEST-07.
**Key detail:** `ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)` -- the `sender` is the address whose balance is insufficient, `balance` is their current balance, `needed` is the transfer amount.
**Example:**
```typescript
// Source: ERC20.sol line 182-184, draft-IERC6093.sol line 17
it("should revert transfer on insufficient balance", async function () {
  const { token, user1, user2 } = await networkHelpers.loadFixture(deployFixture);
  const amount = ethers.parseEther("1");

  await expect(token.connect(user1).transfer(user2.address, amount))
    .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance")
    .withArgs(user1.address, 0n, amount);
});
```

### Pattern 3: Full Approve + TransferFrom Flow
**What:** Three-step test: approve, verify allowance, transferFrom. Assert Approval event only on approve(). Assert Transfer event only on transferFrom(). Do NOT assert Approval on transferFrom().
**When to use:** TEST-08.
**Key detail:** OZ v5 `_spendAllowance()` calls `_approve(owner, spender, newAllowance, false)` -- the `false` flag suppresses the Approval event during transferFrom. This is confirmed at ERC20.sol line 302 (`_approve(owner, spender, currentAllowance - value, false)`).
**Example:**
```typescript
// Source: ERC20.sol lines 120-123 (approve), 142-147 (transferFrom), 294-304 (_spendAllowance)
it("should allow approve and transferFrom", async function () {
  const { token, owner, user1, user2 } = await networkHelpers.loadFixture(deployFixture);
  const amount = ethers.parseEther("500");

  // Step 1: Approve -- emits Approval
  await expect(token.approve(user1.address, amount))
    .to.emit(token, "Approval")
    .withArgs(owner.address, user1.address, amount);

  // Step 2: Verify allowance
  expect(await token.allowance(owner.address, user1.address)).to.equal(amount);

  // Step 3: TransferFrom -- emits Transfer, NOT Approval
  await expect(token.connect(user1).transferFrom(owner.address, user2.address, amount))
    .to.emit(token, "Transfer")
    .withArgs(owner.address, user2.address, amount);

  // Step 4: Verify balances and allowance
  expect(await token.balanceOf(user2.address)).to.equal(amount);
  expect(await token.balanceOf(owner.address)).to.equal(
    ethers.parseEther("1000000") - amount
  );
  expect(await token.allowance(owner.address, user1.address)).to.equal(0n);
});
```

### Pattern 4: Cap Boundary Test (Existing Coverage Analysis)
**What:** The existing Phase 5 tests already contain two cap enforcement tests that cover the TEST-09 requirement.
**Existing test 1:** "should revert when mint would exceed cap" -- fills to cap, then asserts `ERC20ExceededCap` on next mint.
**Existing test 2:** "should allow minting exactly to the cap" -- mints exactly the remaining amount, asserts `totalSupply == cap`, then asserts `ERC20ExceededCap` on next mint.
**Assessment:** These two existing tests together fully satisfy TEST-09 ("mint exactly to cap, then revert"). The planner should verify that the existing tests are deemed sufficient for TEST-09 or add one sharper dedicated test if needed.

### Anti-Patterns to Avoid
- **Asserting Approval event on transferFrom():** OZ v5 does NOT emit Approval during transferFrom. The `emitEvent` parameter is `false` in `_spendAllowance`. Tests that assert `.to.emit(token, "Approval")` on a `transferFrom()` call will fail.
- **Using `.to.not.emit(token, "Approval")` on transferFrom():** While technically correct, negative event assertions can be fragile. Prefer simply not asserting Approval and focusing on Transfer.
- **Creating new fixtures when existing ones suffice:** `deployFixture` already provides owner (with 1M RXS), user1, and user2. No new fixture needed for transfer/approval tests.
- **Testing zero-address transfers:** The contract inherits OZ validation, and testing OZ internals is out of scope. Focus on the four TEST requirements.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Transfer event verification | Manual log parsing from tx receipt | `.to.emit(token, "Transfer").withArgs(...)` | Chai matcher handles topic decoding and arg matching |
| Custom error argument matching | Try/catch with error decoding | `.to.be.revertedWithCustomError(token, "ErrorName").withArgs(...)` | Matcher handles ABI-based decoding and clear failure messages |
| Balance verification after transfer | Manual balanceOf before/after with subtraction | Direct `expect(await token.balanceOf(addr)).to.equal(expected)` | Simpler and more readable; the initial balance is known from fixtures |
| New deployment fixture for transfers | Separate fixture with token transfers pre-done | Reuse existing `deployFixture` | Owner already has 1M RXS from constructor; that is more than enough for transfer tests |

**Key insight:** All four new test areas (TEST-06 through TEST-09) can be built using only the existing fixtures and assertion patterns already established in Phase 5.

## Common Pitfalls

### Pitfall 1: Approval Event on transferFrom
**What goes wrong:** Writing `await expect(transferFrom(...)).to.emit(token, "Approval")` -- this will fail.
**Why it happens:** The ERC-20 spec historically expected Approval on transferFrom. OZ v5 optimized this away for gas savings. The `_spendAllowance()` function at ERC20.sol line 302 calls `_approve(owner, spender, currentAllowance - value, false)` where `false` means "do not emit event."
**How to avoid:** Only assert `Transfer` event on transferFrom. Assert `Approval` event only on explicit `approve()` calls.
**Warning signs:** Test fails with "Expected event Approval to be emitted."

### Pitfall 2: Wrong Error Name for Insufficient Balance
**What goes wrong:** Using `"InsufficientBalance"` or `"ERC20: insufficient balance"` instead of the exact error name `"ERC20InsufficientBalance"`.
**Why it happens:** Mixing up OZ v4 revert strings with OZ v5 custom errors.
**How to avoid:** Use the exact error name from `draft-IERC6093.sol`: `ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)`.
**Warning signs:** "Error ERC20InsufficientBalance not found in contract" -- check spelling and contract reference.

### Pitfall 3: ERC20InsufficientBalance Argument Order
**What goes wrong:** Passing arguments in wrong order to `.withArgs()`. The error is `ERC20InsufficientBalance(sender, balance, needed)` -- NOT `(sender, needed, balance)`.
**Why it happens:** Intuition suggests "needed" comes before "balance" but the ERC-6093 spec puts current balance second and needed amount third.
**How to avoid:** Always refer to the error definition: `error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)`. For a user with 0 balance trying to send 100: `.withArgs(user.address, 0n, parseEther("100"))`.
**Warning signs:** withArgs assertion fails with unexpected argument ordering.

### Pitfall 4: Infinite Allowance Edge Case
**What goes wrong:** If approval is set to `type(uint256).max`, transferFrom does NOT decrement the allowance (OZ v5 gas optimization at ERC20.sol line 296). Tests that check allowance decrement after transferFrom will fail for max-uint approvals.
**Why it happens:** OZ v5 treats max-uint approval as "infinite" to save gas on repeated transferFrom calls.
**How to avoid:** Use a specific finite amount for approval in tests (e.g., `parseEther("500")`), not `ethers.MaxUint256`. The infinite allowance behavior is an OZ feature, not a bug, and does not need testing in this phase.
**Warning signs:** Allowance still equals MaxUint256 after transferFrom.

### Pitfall 5: TEST-09 Overlap with Existing Tests
**What goes wrong:** Writing duplicate cap boundary tests that already exist in Phase 5's "Cap enforcement" describe block.
**Why it happens:** TEST-09 requirement says "mint exactly to cap, then revert" -- this is already tested by the existing "should allow minting exactly to the cap" and "should revert when mint would exceed cap" tests.
**How to avoid:** Evaluate whether the existing tests satisfy TEST-09. If they do, do not duplicate. If the planner wants a more targeted test (single test that does both "mint to cap" and "revert on next"), it can be added alongside existing tests but should not replicate their logic.
**Warning signs:** Duplicate test names or redundant fixture usage.

## Code Examples

Verified patterns from the existing test file and OZ source:

### Transfer Success + Event (TEST-06)
```typescript
// Source: ERC20.sol lines 99-103 (transfer), 176-203 (_update with Transfer emission)
// Verified: owner has 1M RXS from deployFixture
const { token, owner, user1 } = await networkHelpers.loadFixture(deployFixture);
const amount = ethers.parseEther("100");

await expect(token.transfer(user1.address, amount))
  .to.emit(token, "Transfer")
  .withArgs(owner.address, user1.address, amount);

expect(await token.balanceOf(user1.address)).to.equal(amount);
```

### Insufficient Balance Revert (TEST-07)
```typescript
// Source: ERC20.sol lines 182-184, draft-IERC6093.sol line 17
// Verified: user1 starts with 0 balance from deployFixture
const { token, user1, user2 } = await networkHelpers.loadFixture(deployFixture);

await expect(token.connect(user1).transfer(user2.address, ethers.parseEther("1")))
  .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance")
  .withArgs(user1.address, 0n, ethers.parseEther("1"));
```

### Approve + TransferFrom Flow (TEST-08)
```typescript
// Source: ERC20.sol lines 120-123 (approve), 142-147 (transferFrom), 273-283 (_approve with emitEvent)
// Verified: transferFrom does NOT emit Approval (line 302: emitEvent=false)
const { token, owner, user1, user2 } = await networkHelpers.loadFixture(deployFixture);
const amount = ethers.parseEther("500");

// approve emits Approval
await expect(token.approve(user1.address, amount))
  .to.emit(token, "Approval")
  .withArgs(owner.address, user1.address, amount);

expect(await token.allowance(owner.address, user1.address)).to.equal(amount);

// transferFrom emits Transfer only
await expect(token.connect(user1).transferFrom(owner.address, user2.address, amount))
  .to.emit(token, "Transfer")
  .withArgs(owner.address, user2.address, amount);

expect(await token.balanceOf(user2.address)).to.equal(amount);
expect(await token.allowance(owner.address, user1.address)).to.equal(0n);
```

### TransferFrom Revert on Insufficient Allowance (Supporting)
```typescript
// Source: ERC20.sol lines 297-299, draft-IERC6093.sol line 37
// ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)
const { token, owner, user1, user2 } = await networkHelpers.loadFixture(deployFixture);

await expect(
  token.connect(user1).transferFrom(owner.address, user2.address, ethers.parseEther("1"))
)
  .to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance")
  .withArgs(user1.address, 0n, ethers.parseEther("1"));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `transferFrom` emitting Approval | `transferFrom` does NOT emit Approval (gas optimization) | OZ v5 (Oct 2023) | Tests must NOT expect Approval from transferFrom |
| String reverts: `"ERC20: transfer amount exceeds balance"` | Custom error: `ERC20InsufficientBalance(sender, balance, needed)` | OZ v5 (Oct 2023) | Use `.revertedWithCustomError()` not `.revertedWith()` |
| `_beforeTokenTransfer` / `_afterTokenTransfer` hooks | Single `_update()` hook | OZ v5 (Oct 2023) | All transfer/mint/burn logic passes through `_update()` |

**Deprecated/outdated:**
- String revert messages in ERC-20: Fully replaced by ERC-6093 custom errors in OZ v5.
- Approval event on transferFrom: Explicitly suppressed in OZ v5 `_spendAllowance()`.

## Open Questions

1. **Does TEST-09 require new tests or are existing Phase 5 tests sufficient?**
   - What we know: The existing "Cap enforcement" describe block has two tests that together cover "mint exactly to cap" and "revert on next mint." Both pass. The block uses `nearCapFixture` and has a 120s timeout.
   - What's unclear: Whether the planner should mark TEST-09 as already covered or add a distinct test.
   - Recommendation: The existing tests satisfy TEST-09's behavioral requirement. The planner can either (a) reference the existing tests as covering TEST-09, or (b) add a single focused test that explicitly labels itself as the TEST-09 verification. Option (a) avoids duplication; option (b) provides traceability. Either approach is valid.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Mocha + Chai via @nomicfoundation/hardhat-toolbox-mocha-ethers ^3.0.3 |
| Config file | hardhat.config.ts (plugins: [hardhatToolboxMochaEthers]) |
| Quick run command | `npx hardhat test test/RoxasToken.test.ts` |
| Full suite command | `npx hardhat test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-06 | transfer() succeeds and emits Transfer event | unit | `npx hardhat test test/RoxasToken.test.ts --grep "transfer"` | Partial -- file exists, test does not yet |
| TEST-07 | transfer() reverts on insufficient balance | unit | `npx hardhat test test/RoxasToken.test.ts --grep "insufficient"` | Partial -- file exists, test does not yet |
| TEST-08 | approve() + transferFrom() flow works correctly | unit | `npx hardhat test test/RoxasToken.test.ts --grep "approve\|transferFrom"` | Partial -- file exists, test does not yet |
| TEST-09 | Cap boundary (mint exactly to cap, then revert) | unit | `npx hardhat test test/RoxasToken.test.ts --grep "cap"` | Possibly covered by existing Phase 5 cap tests |

### Sampling Rate
- **Per task commit:** `npx hardhat test test/RoxasToken.test.ts` (all tests including Phase 5's 15 must pass)
- **Per wave merge:** `npx hardhat test` (full suite)
- **Phase gate:** All 4 TEST requirements (TEST-06 through TEST-09) have passing tests. Total test count should be 15 + new tests. `npx hardhat test` exits with 0.

### Wave 0 Gaps
None -- test infrastructure is fully established from Phase 5. The file `test/RoxasToken.test.ts` exists with working fixtures, imports, and 15 passing tests. No new dependencies, config, or framework setup needed.

## Sources

### Primary (HIGH confidence)
- `node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol` (v5.5.0) -- Full source read. Confirmed: `transfer()` (line 99), `_transfer()` (line 159), `_update()` with Transfer event (line 203), `approve()` (line 120), `_approve()` with emitEvent flag (line 273), `transferFrom()` (line 142), `_spendAllowance()` with `false` emitEvent (line 302), `ERC20InsufficientBalance` revert (line 183).
- `node_modules/@openzeppelin/contracts/interfaces/draft-IERC6093.sol` (v5.5.0) -- Full source read. Confirmed exact error signatures: `ERC20InsufficientBalance(address, uint256, uint256)`, `ERC20InsufficientAllowance(address, uint256, uint256)`.
- `node_modules/@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol` (v5.4.0) -- Full source read. Confirmed `ERC20ExceededCap(uint256 increasedSupply, uint256 cap)` at line 17, enforcement in `_update()` at lines 46-52.
- `test/RoxasToken.test.ts` -- Existing 189-line test file. Verified: 15 passing tests, `deployFixture` (owner/user1/user2), `nearCapFixture`, established patterns for emit/revert assertions.
- `contracts/RoxasToken.sol` -- Contract under test (71 lines). Verified: `_update()` override, constructor mints 1M to deployer, public `mint()` with limit/cooldown.

### Secondary (MEDIUM confidence)
- `.planning/phases/03-erc-20-transfers-and-approvals/03-RESEARCH.md` -- Prior phase research confirming OZ v5 Approval suppression on transferFrom, ERC-6093 error names.
- `.planning/phases/05-deployment-and-minting-tests/05-RESEARCH.md` -- Prior phase research confirming HH3 test patterns, loadFixture usage, cap test strategy.

### Tertiary (LOW confidence)
None -- all findings verified from installed source code.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies. All tools established and verified in Phase 5.
- Architecture: HIGH -- Test patterns are direct extensions of Phase 5's established patterns. ERC20 source code read for all assertion targets.
- Pitfalls: HIGH -- OZ v5 Approval suppression confirmed from actual source code line 302. Error signatures confirmed from draft-IERC6093.sol. Existing cap test overlap identified from running the actual test suite.

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable -- testing patterns and OZ v5 behavior are well-established)
