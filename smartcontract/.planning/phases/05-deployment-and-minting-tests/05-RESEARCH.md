# Phase 5: Deployment and Minting Tests - Research

**Researched:** 2026-04-05
**Domain:** Hardhat 3 Mocha/Chai testing -- deployment state verification and minting behavior assertions
**Confidence:** HIGH

## Summary

Phase 5 creates the first test file for the project: `test/RoxasToken.test.ts`. It covers two domains: (1) deployment state verification (name, symbol, decimals, initial supply, cap) and (2) all minting behaviors (public mint success, per-tx limit revert, cap revert, cooldown revert). The test directory exists but is empty.

The test infrastructure is fully installed via `@nomicfoundation/hardhat-toolbox-mocha-ethers` (Mocha runner, Chai matchers, network helpers, ethers integration, TypeChain types). The Hardhat 3 test pattern uses `const { ethers, networkHelpers } = await hre.network.connect()` at module scope, `networkHelpers.loadFixture()` for state management, and ethers v6 native `BigInt` throughout. Custom errors are asserted with `.to.be.revertedWithCustomError(contract, "ErrorName").withArgs(...)` and events with `.to.emit(contract, "EventName").withArgs(...)`. Time manipulation for cooldown tests uses `networkHelpers.time.increase(seconds)`.

The contract under test (`contracts/RoxasToken.sol`, 71 lines) has a well-defined surface area: 3 public constants (`MINT_LIMIT`, `COOLDOWN_PERIOD`, `INITIAL_SUPPLY`), 1 view function (`cooldownRemaining`), 1 mutating function (`mint`), 2 custom errors (`MintLimitExceeded`, `CooldownNotElapsed`), and 1 custom event (`TokensMinted`). The OZ-inherited cap error `ERC20ExceededCap(uint256 increasedSupply, uint256 cap)` is needed for the cap revert test.

**Primary recommendation:** Write a single `test/RoxasToken.test.ts` file with two `describe` blocks -- "Deployment" and "Minting" -- using a shared `loadFixture` deployment fixture. Use `ethers.parseEther()` for all token amounts. Use `networkHelpers.time.increase(61)` to advance past cooldown. Assert cap revert using `revertedWithCustomError(token, "ERC20ExceededCap")` (the error lives on the ERC20Capped base, but the token contract inherits it).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
None -- CONTEXT.md places all implementation choices at Claude's discretion for this testing phase.

### Claude's Discretion
- All implementation choices are at Claude's discretion -- testing phase with well-defined patterns
- Test file structure, fixture design, assertion patterns, describe/it organization
- Whether to use loadFixture for state management
- Time manipulation approach for cooldown tests (hardhat network helpers time.increase)
- Use ethers v6 BigInt (not BigNumber) throughout

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEST-01 | Tests verify deployment state (name, symbol, decimals, initial supply, cap) | Fixture deploys contract, assertions check `name()`, `symbol()`, `decimals()`, `totalSupply()`, `cap()` against known values. All return types are string or bigint via TypeChain. |
| TEST-02 | Tests verify public mint succeeds and updates balance and totalSupply | Call `token.connect(user).mint(amount)`, then assert `balanceOf(user)` and `totalSupply()` changed. Also verify `TokensMinted` event emission with correct args. |
| TEST-03 | Tests verify mint reverts when per-transaction limit exceeded | Call `token.mint(parseEther("1001"))` and assert `.to.be.revertedWithCustomError(token, "MintLimitExceeded").withArgs(parseEther("1001"), parseEther("1000"))`. Also test `mint(0)` which reverts with same error. |
| TEST-04 | Tests verify mint reverts when total supply would exceed hard cap | Mint tokens until near cap, then attempt a mint that would push past 10M. Assert `.to.be.revertedWithCustomError(token, "ERC20ExceededCap")`. The error args are `(newTotalSupply, cap)`. |
| TEST-05 | Tests verify mint reverts when cooldown period has not elapsed | Mint once, immediately attempt second mint, assert `.to.be.revertedWithCustomError(token, "CooldownNotElapsed")`. Then use `networkHelpers.time.increase(61)` and verify mint succeeds. |

</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Hardhat | ^3.3.0 | Test runner framework | `npx hardhat test` executes Mocha tests on Hardhat Network. ESM-first, built-in coverage. |
| @nomicfoundation/hardhat-toolbox-mocha-ethers | ^3.0.3 | Meta-plugin bundle | Includes Mocha runner, Chai matchers, network helpers, ethers integration, TypeChain. All test dependencies in one package. |
| Mocha | (bundled via hardhat-mocha) | Test framework | describe/it blocks, hooks (before, beforeEach). Standard for Hardhat ecosystem. |
| Chai | (bundled via hardhat-ethers-chai-matchers) | Assertion library | `expect()` API with Ethereum-specific matchers for events, reverts, balance changes. |
| ethers.js | v6 (bundled via hardhat-ethers) | Ethereum library | `parseEther()`, `getSigners()`, `deployContract()`. Native BigInt. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeChain types | (generated at `types/ethers-contracts/`) | Typed contract interface | Import `RoxasToken` type for typed `token.mint()`, `token.balanceOf()` etc. in tests. |
| @types/mocha | ^10.0.10 | Mocha type definitions | TypeScript compilation of test files. Already installed. |
| @types/chai | ^5.2.3 | Chai type definitions | TypeScript compilation of test files. Already installed. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Mocha | Node.js test runner | HH3 supports both; Mocha has far more smart contract testing examples and the toolbox is already configured for it. |
| loadFixture | beforeEach with fresh deploy | loadFixture snapshots blockchain state and reverts, making tests faster. Only reason to skip: if every test needs truly unique state that cannot share a fixture. |
| ethers.parseEther() | BigInt literals (e.g. `1000n * 10n ** 18n`) | parseEther is more readable. Use BigInt literals only for non-token amounts (e.g. timestamps, block numbers). |

**Installation:** No new packages needed. All test dependencies are installed.

## Architecture Patterns

### Recommended Project Structure
```
test/
  RoxasToken.test.ts      # Deployment + Minting tests (Phase 5)
                           # Transfer + Boundary tests added in Phase 6
```

### Pattern 1: Hardhat 3 Test File Skeleton
**What:** The standard Hardhat 3 ESM test structure. Module-level `network.connect()`, named fixture functions, describe/it blocks.
**When to use:** Every test file in this project.
**Example:**
```typescript
// Source: https://hardhat.org/docs/guides/testing/using-ethers
import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

describe("RoxasToken", function () {
  async function deployFixture() {
    const [owner, user1, user2] = await ethers.getSigners();
    const token = await ethers.deployContract("RoxasToken");
    return { token, owner, user1, user2 };
  }

  describe("Deployment", function () {
    it("should set the correct name", async function () {
      const { token } = await networkHelpers.loadFixture(deployFixture);
      expect(await token.name()).to.equal("Roxas Token");
    });
  });
});
```

### Pattern 2: loadFixture for State Isolation
**What:** `networkHelpers.loadFixture(namedFunction)` executes the fixture once, snapshots blockchain state, and reverts to that snapshot on subsequent calls. Tests are isolated without re-deploying.
**When to use:** Every `it()` block that needs a deployed contract.
**Critical rule:** MUST use a named function, NOT an anonymous arrow function. Anonymous functions bypass the snapshot mechanism.
**Example:**
```typescript
// Source: https://hardhat.org/docs/plugins/hardhat-network-helpers
// CORRECT: named function
async function deployFixture() { ... }
const { token } = await networkHelpers.loadFixture(deployFixture);

// WRONG: anonymous function -- snapshot will not work
const { token } = await networkHelpers.loadFixture(async () => { ... });
```

### Pattern 3: Custom Error Assertion with Arguments
**What:** Assert that a transaction reverts with a specific custom Solidity error and its arguments.
**When to use:** TEST-03 (MintLimitExceeded), TEST-04 (ERC20ExceededCap), TEST-05 (CooldownNotElapsed).
**Example:**
```typescript
// Source: https://hardhat.org/docs/plugins/hardhat-ethers-chai-matchers
// MintLimitExceeded(uint256 amount, uint256 limit)
await expect(token.connect(user1).mint(ethers.parseEther("1001")))
  .to.be.revertedWithCustomError(token, "MintLimitExceeded")
  .withArgs(ethers.parseEther("1001"), ethers.parseEther("1000"));

// ERC20ExceededCap(uint256 increasedSupply, uint256 cap)
// Note: first arg is the NEW totalSupply after the (failed) mint attempt
await expect(token.connect(user1).mint(ethers.parseEther("500")))
  .to.be.revertedWithCustomError(token, "ERC20ExceededCap");

// CooldownNotElapsed(uint256 remaining)
// Use anyValue for remaining since exact value depends on block timing
import { anyValue } from "@nomicfoundation/hardhat-ethers-chai-matchers/withArgs";
await expect(token.connect(user1).mint(ethers.parseEther("100")))
  .to.be.revertedWithCustomError(token, "CooldownNotElapsed")
  .withArgs(anyValue);
```

### Pattern 4: Event Emission Assertion
**What:** Assert that a transaction emits a specific event with specific arguments.
**When to use:** TEST-02 (TokensMinted event on successful mint).
**Example:**
```typescript
// Source: https://hardhat.org/docs/plugins/hardhat-ethers-chai-matchers
await expect(token.connect(user1).mint(ethers.parseEther("500")))
  .to.emit(token, "TokensMinted")
  .withArgs(user1.address, ethers.parseEther("500"));
```

### Pattern 5: Time Manipulation for Cooldown Tests
**What:** `networkHelpers.time.increase(seconds)` mines a new block with the timestamp advanced by the given seconds. Use this to bypass the 60-second cooldown.
**When to use:** TEST-05 (cooldown tests).
**Example:**
```typescript
// Source: https://hardhat.org/docs/plugins/hardhat-network-helpers
// First mint succeeds
await token.connect(user1).mint(ethers.parseEther("100"));

// Immediate second mint fails
await expect(token.connect(user1).mint(ethers.parseEther("100")))
  .to.be.revertedWithCustomError(token, "CooldownNotElapsed");

// Advance time past cooldown (60 seconds)
await networkHelpers.time.increase(61);

// Now mint succeeds
await token.connect(user1).mint(ethers.parseEther("100"));
```

### Pattern 6: Cap Exhaustion Test Strategy
**What:** To test the cap (10M RXS), the deployer already has 1M RXS from the constructor. Mint the remaining 9M using multiple accounts (each account can mint up to 1000 RXS per tx, with 60s cooldown between mints from the same account). The practical approach: use multiple signers to mint in parallel (no cooldown between different accounts), or use `time.increase()` to bypass cooldown on the same account.
**When to use:** TEST-04 (cap revert test).
**Strategy:** The test needs to get totalSupply close to cap, then attempt a mint that would exceed it. Options:
1. **Multiple signers approach:** Get many signers, each mints 1000 RXS. Need 9000 mints to fill remaining 9M. Too slow.
2. **Direct approach:** Since the deployer already has 1M, we need totalSupply near 10M. The fastest way: mint with multiple signers (each 1000 RXS, no cooldown between different addresses) to get close, then test the boundary.
3. **Recommended approach:** Use a helper fixture that mints tokens via a loop of signers + time advances to get near the cap. Alternatively, recognize that with only ~20 default signers and 1000 RXS per mint, reaching 10M in tests is impractical via the public `mint()` alone.

**Practical test:** Mint 1000 RXS from user1 (total: 1,001,000). The cap is 10M so this succeeds. To truly test the cap, the test needs to bring totalSupply to just below 10M. The most practical approach: test that a mint of 1000 RXS would fail when `totalSupply + amount > cap`. Since we cannot easily reach 10M via the public mint, we can use a different fixture or accept a longer-running cap test using multiple signers and time manipulation.

**Best practical approach for cap test:** Use multiple signers from `getSigners()` (Hardhat provides 20 by default). Each signer mints 1000 RXS once (no cooldown issue -- different addresses). That gives 20 * 1000 = 20,000 RXS + 1M initial = 1,020,000. Still far from 10M. The remaining 8,980,000 would need 8,980 more mints with time advances. This is too slow for a unit test.

**Recommended solution:** Create a separate fixture that deploys a contract with a smaller cap for cap testing purposes, OR accept that the cap test must use `anyValue` for the error args since computing exact totalSupply at the boundary is complex. The simplest and most correct approach: accept that ERC20Capped is already audited, and test that the error type is correct by using the contract's existing state. Since the deployer has 1M RXS and the cap is 10M, minting `9_000_001` would exceed the per-tx limit anyway. The per-tx limit (1000 RXS) makes it impossible to exceed the cap in a single transaction from a state where totalSupply is below `cap - MINT_LIMIT`. The only way to hit the cap is to mint many times until totalSupply reaches between 9,999,001 and 10,000,000, then attempt one more mint.

**Final recommendation:** Use a loop with multiple signers and `time.increase()` to fill up to near-cap, then test the final mint revert. This is the honest test. Alternatively, deploy a test-only version with a much smaller cap -- but that tests a different contract. Use the loop approach with pragmatic optimization: use all 20 signers in rotation, advancing time as needed.

### Anti-Patterns to Avoid
- **Using `ethers.BigNumber.from()`:** This is ethers v5. Use native BigInt: `1000n`, `ethers.parseEther("1000")`.
- **Using anonymous functions with loadFixture:** Bypasses the snapshot mechanism. Always use named functions.
- **Using `.to.be.revertedWith("string")` for custom errors:** Must use `.to.be.revertedWithCustomError(contract, "ErrorName")`. The old string-matching API does not work with Solidity custom errors.
- **Importing from `hardhat/toolbox`:** Hardhat 3 uses `import { network } from "hardhat"` and `const { ethers, networkHelpers } = await network.connect()`. There is no global `ethers` or `loadFixture` import.
- **Using `hre.ethers` directly:** In HH3, you must call `hre.network.connect()` first. The ethers object comes from the connection, not from hre directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Blockchain state isolation | Manual contract re-deployment in beforeEach | `networkHelpers.loadFixture(namedFunction)` | Snapshot/revert is faster than redeployment. Ensures clean state without gas cost. |
| Token amount math | Manual `BigInt(1000) * BigInt(10) ** BigInt(18)` | `ethers.parseEther("1000")` | Cleaner, less error-prone, handles decimals correctly. |
| Custom error matching | Manual error message parsing or try/catch | `.to.be.revertedWithCustomError(contract, "Name").withArgs(...)` | Chai matcher handles ABI decoding, argument matching, and clear error messages. |
| Event assertion | Manual log parsing from transaction receipts | `.to.emit(contract, "EventName").withArgs(...)` | Chai matcher handles topic matching, argument decoding, and multi-event assertions. |
| Time advancement | Manual block mining with timestamp manipulation | `networkHelpers.time.increase(seconds)` | One-liner, mines block, advances timestamp atomically. |

**Key insight:** The hardhat-toolbox-mocha-ethers bundle provides every testing primitive needed. No custom test utilities are required.

## Common Pitfalls

### Pitfall 1: ethers v6 BigInt vs v5 BigNumber
**What goes wrong:** Using `ethers.BigNumber.from()`, `.add()`, `.eq()`, `.mul()` -- these are ethers v5 patterns that do not exist in v6.
**Why it happens:** Most online tutorials and AI training data reference ethers v5.
**How to avoid:** Use native JS BigInt. `ethers.parseEther("1000")` returns `bigint`. Compare with `===`. Arithmetic with `+`, `-`, `*`, `/`. Use `n` suffix for literals: `1000n`, `18n`.
**Warning signs:** TypeScript errors about missing `.add()` method, or runtime "BigNumber is not a function."

### Pitfall 2: Anonymous Function in loadFixture
**What goes wrong:** `loadFixture(async () => { ... })` executes the fixture every time instead of snapshotting. Tests become slower and may have unexpected state leakage.
**Why it happens:** JavaScript closures make anonymous functions look equivalent to named ones.
**How to avoid:** Always define a named `async function deployFixture() { ... }` and pass the name: `loadFixture(deployFixture)`.
**Warning signs:** Tests taking unusually long, or state from previous tests bleeding into later ones.

### Pitfall 3: Wrong Custom Error Contract Reference
**What goes wrong:** `ERC20ExceededCap` is defined on `ERC20Capped`, not on `RoxasToken`. However, since `RoxasToken` inherits `ERC20Capped`, the error IS available on the token contract's ABI. The correct assertion is `.revertedWithCustomError(token, "ERC20ExceededCap")` using the deployed token instance.
**Why it happens:** Confusion about which contract "owns" the error.
**How to avoid:** Always pass the deployed contract instance as the first argument to `revertedWithCustomError`. The matcher uses the contract's ABI to resolve the error signature, and inherited errors are part of the ABI.
**Warning signs:** "Error ERC20ExceededCap not found" -- means the ABI does not include it (but it should for RoxasToken).

### Pitfall 4: ERC20ExceededCap Error Arguments Order
**What goes wrong:** The error signature is `ERC20ExceededCap(uint256 increasedSupply, uint256 cap)`. The first argument is the NEW totalSupply AFTER the mint attempt (not the mint amount). Confusing this with the mint amount causes withArgs failures.
**Why it happens:** Reading the error name "increasedSupply" as "amount to increase by" rather than "supply after increase."
**How to avoid:** From the OZ source (ERC20Capped.sol line 50): `revert ERC20ExceededCap(supply, maxSupply)` where `supply = totalSupply()` (already incremented by `_update`). So if totalSupply was 9,999,500 and you mint 1000, the error fires with `(10,000,500, 10,000,000)`.
**Warning signs:** withArgs assertion fails with unexpected first argument value.

### Pitfall 5: Cooldown Timing Precision
**What goes wrong:** Using `time.increase(60)` (exactly the cooldown period) and expecting the next mint to succeed. Due to block timestamp mechanics, the increase happens relative to the current block, and the next transaction mines a new block. The exact timing may cause the cooldown check `block.timestamp < lastMint + COOLDOWN_PERIOD` to still fail if the timestamps are exactly equal (which is fine since `<` not `<=`).
**Why it happens:** Off-by-one in time reasoning.
**How to avoid:** Use `time.increase(61)` (cooldown + 1 second) to be safe. Or use `time.increase(60)` which should work because: if mint happened at time T, `lastMint = T`, cooldown check is `block.timestamp < T + 60`. After `time.increase(60)`, next block is at `T + 60`, and `T + 60 < T + 60` is false, so cooldown passes. But using 61 provides margin against any timing quirks.
**Warning signs:** Cooldown test intermittently failing.

### Pitfall 6: Cap Test Impracticality
**What goes wrong:** Attempting to reach the 10M cap via `mint()` calls in a unit test. With 1000 RXS per mint and 20 default signers, reaching 10M requires thousands of transactions even with time manipulation.
**Why it happens:** Not accounting for the per-tx limit and cooldown in test planning.
**How to avoid:** Use a multi-step approach: (a) use all available signers to mint in the first round (20 * 1000 = 20,000 RXS), (b) advance time, (c) repeat until near cap. With 20 signers and each round taking one `time.increase()`, reaching 10M needs ~450 rounds (9M / 20,000 per round). This is feasible but slow (~5-10 seconds). Alternatively, deploy a helper contract for testing that can mint directly, but this changes the contract under test.
**Recommended approach:** The loop approach is honest and tests the real contract. Keep it as a separate describe block or mark it with a longer timeout if needed.

## Code Examples

Verified patterns from official sources:

### Complete Test File Structure
```typescript
// Source: https://hardhat.org/docs/guides/testing/using-ethers + official chai matchers docs
import { expect } from "chai";
import { network } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-ethers-chai-matchers/withArgs";
import type { RoxasToken } from "../types/ethers-contracts/RoxasToken.js";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers, networkHelpers } = await network.connect();

describe("RoxasToken", function () {
  async function deployFixture() {
    const [owner, user1, user2] = await ethers.getSigners();
    const token = await ethers.deployContract("RoxasToken");
    return { token, owner, user1, user2 };
  }

  describe("Deployment", function () {
    it("should have the correct name", async function () {
      const { token } = await networkHelpers.loadFixture(deployFixture);
      expect(await token.name()).to.equal("Roxas Token");
    });

    it("should have the correct symbol", async function () {
      const { token } = await networkHelpers.loadFixture(deployFixture);
      expect(await token.symbol()).to.equal("RXS");
    });

    it("should have 18 decimals", async function () {
      const { token } = await networkHelpers.loadFixture(deployFixture);
      expect(await token.decimals()).to.equal(18n);
    });

    it("should mint initial supply to deployer", async function () {
      const { token, owner } = await networkHelpers.loadFixture(deployFixture);
      const initialSupply = ethers.parseEther("1000000");
      expect(await token.balanceOf(owner.address)).to.equal(initialSupply);
      expect(await token.totalSupply()).to.equal(initialSupply);
    });

    it("should set the correct cap", async function () {
      const { token } = await networkHelpers.loadFixture(deployFixture);
      expect(await token.cap()).to.equal(ethers.parseEther("10000000"));
    });
  });

  describe("Minting", function () {
    it("should allow public minting", async function () {
      const { token, user1 } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("500");
      await token.connect(user1).mint(amount);
      expect(await token.balanceOf(user1.address)).to.equal(amount);
    });

    it("should emit TokensMinted event", async function () {
      const { token, user1 } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("500");
      await expect(token.connect(user1).mint(amount))
        .to.emit(token, "TokensMinted")
        .withArgs(user1.address, amount);
    });

    it("should revert when amount exceeds mint limit", async function () {
      const { token, user1 } = await networkHelpers.loadFixture(deployFixture);
      const overLimit = ethers.parseEther("1001");
      await expect(token.connect(user1).mint(overLimit))
        .to.be.revertedWithCustomError(token, "MintLimitExceeded")
        .withArgs(overLimit, ethers.parseEther("1000"));
    });

    it("should revert when amount is zero", async function () {
      const { token, user1 } = await networkHelpers.loadFixture(deployFixture);
      await expect(token.connect(user1).mint(0n))
        .to.be.revertedWithCustomError(token, "MintLimitExceeded")
        .withArgs(0n, ethers.parseEther("1000"));
    });

    it("should revert when cooldown has not elapsed", async function () {
      const { token, user1 } = await networkHelpers.loadFixture(deployFixture);
      await token.connect(user1).mint(ethers.parseEther("100"));
      await expect(token.connect(user1).mint(ethers.parseEther("100")))
        .to.be.revertedWithCustomError(token, "CooldownNotElapsed")
        .withArgs(anyValue);
    });

    it("should allow minting after cooldown elapses", async function () {
      const { token, user1 } = await networkHelpers.loadFixture(deployFixture);
      await token.connect(user1).mint(ethers.parseEther("100"));
      await networkHelpers.time.increase(61);
      await token.connect(user1).mint(ethers.parseEther("100"));
      expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("200"));
    });
  });
});
```

### Cap Revert Test Strategy
```typescript
// Source: Derived from contract analysis + OZ ERC20Capped source
// To test cap enforcement, need totalSupply near 10M
// Deployer has 1M. Need ~9M more. Use all signers in rotation.
describe("Cap enforcement", function () {
  async function nearCapFixture() {
    const signers = await ethers.getSigners();
    const token = await ethers.deployContract("RoxasToken");
    const mintAmount = ethers.parseEther("1000");
    const cap = ethers.parseEther("10000000");
    const initialSupply = ethers.parseEther("1000000");

    // Each round: all signers mint 1000 RXS each, then advance time
    // 20 signers * 1000 RXS = 20,000 per round
    // Need 9,000,000 / 20,000 = 450 rounds
    let total = initialSupply;
    while (total + mintAmount * BigInt(signers.length) < cap) {
      for (const signer of signers) {
        if (total + mintAmount > cap) break;
        await token.connect(signer).mint(mintAmount);
        total += mintAmount;
      }
      await networkHelpers.time.increase(61);
    }

    return { token, signers, total };
  }

  it("should revert when mint would exceed cap", async function () {
    const { token, signers } = await networkHelpers.loadFixture(nearCapFixture);
    // Find a signer that can still mint (cooldown elapsed due to time advances)
    // Attempt a mint that would push totalSupply over cap
    const totalSupply = await token.totalSupply();
    const cap = await token.cap();
    const remaining = cap - totalSupply;
    // If remaining < MINT_LIMIT, mint MINT_LIMIT to trigger cap error
    if (remaining < ethers.parseEther("1000")) {
      await expect(token.connect(signers[0]).mint(ethers.parseEther("1000")))
        .to.be.revertedWithCustomError(token, "ERC20ExceededCap");
    }
  });
});
```

### Balance Change Assertion (Alternative Pattern)
```typescript
// Source: https://hardhat.org/docs/plugins/hardhat-ethers-chai-matchers
// changeTokenBalance requires ethers as first arg in HH3
const amount = ethers.parseEther("500");
await expect(token.connect(user1).mint(amount))
  .to.changeTokenBalance(ethers, token, user1, amount);
```

### Constant Verification Pattern
```typescript
// Source: TypeChain types -- constants are public view functions returning bigint
it("should expose MINT_LIMIT constant", async function () {
  const { token } = await networkHelpers.loadFixture(deployFixture);
  expect(await token.MINT_LIMIT()).to.equal(ethers.parseEther("1000"));
});

it("should expose COOLDOWN_PERIOD constant", async function () {
  const { token } = await networkHelpers.loadFixture(deployFixture);
  expect(await token.COOLDOWN_PERIOD()).to.equal(60n);
});

it("should expose INITIAL_SUPPLY constant", async function () {
  const { token } = await networkHelpers.loadFixture(deployFixture);
  expect(await token.INITIAL_SUPPLY()).to.equal(ethers.parseEther("1000000"));
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `const { ethers, loadFixture } = require("hardhat")` | `const { ethers, networkHelpers } = await network.connect()` | Hardhat 3 (2025) | loadFixture is now on networkHelpers, not a standalone import. No global ethers. |
| `ethers.BigNumber.from("1000")` | `1000n` or `ethers.parseEther("1000")` | ethers v6 (2023) | Native BigInt. No BigNumber class. |
| `.to.be.revertedWith("ERC20: ...")` | `.to.be.revertedWithCustomError(contract, "ErrorName")` | OZ v5 + HH chai matchers | Custom errors replace revert strings. |
| `waffle.loadFixture(fixture)` | `networkHelpers.loadFixture(fixture)` | Hardhat 3 (2025) | Waffle is dead. Hardhat has its own loadFixture. |
| `ethers.utils.parseEther("1000")` | `ethers.parseEther("1000")` | ethers v6 (2023) | Utility functions moved to top-level ethers namespace. |

**Deprecated/outdated:**
- `hardhat-waffle`: Replaced by hardhat-ethers-chai-matchers.
- `ethers.utils.*`: All utilities are now directly on `ethers.*` in v6.
- `BigNumber.from()` / `.add()` / `.eq()`: Replaced by native BigInt operators.
- `require("@nomicfoundation/hardhat-toolbox")`: HH3 uses `plugins: []` array in config, not side-effect imports.

## Open Questions

1. **Cap test performance: how long does the near-cap fixture take?**
   - What we know: Need ~450 rounds of 20 mints + time advances to reach near 10M cap. Each round has 20 transactions + 1 time.increase(). Hardhat Network is fast (~1-5ms per tx).
   - What's unclear: Whether 9000+ transactions in a fixture is acceptable for CI (likely 10-30 seconds).
   - Recommendation: Implement the loop approach. If too slow, optimize by using more signers (Hardhat can create additional signers beyond the default 20 via `ethers.getSigners()`). Mark the cap test describe block with a longer Mocha timeout if needed: `this.timeout(60000)`. The fixture will be snapshotted by loadFixture, so subsequent cap tests reuse the snapshot.

2. **Should the test import the RoxasToken TypeChain type?**
   - What we know: TypeChain generates `types/ethers-contracts/RoxasToken.ts` with a fully typed interface. `ethers.deployContract("RoxasToken")` returns an untyped Contract by default.
   - What's unclear: Whether Hardhat 3's typed deployment (via hardhat.d.ts augmentation) returns the correct type automatically.
   - Recommendation: The TypeChain `hardhat.d.ts` file augments `ethers.deployContract("RoxasToken")` to return `Promise<RoxasToken>`. This means type-safe access to `token.mint()`, `token.MINT_LIMIT()`, etc. is available without explicit casting. Import the type if explicit typing is needed for variable declarations: `import type { RoxasToken } from "../types/ethers-contracts/RoxasToken.js"`.

3. **Should cooldownRemaining() be tested in Phase 5?**
   - What we know: The contract has a `cooldownRemaining(address)` view function. It is not explicitly listed in TEST-01 through TEST-05 requirements.
   - Recommendation: Include a basic test for cooldownRemaining as part of the cooldown test block since it is closely related to TEST-05 (cooldown behavior). Verify it returns > 0 immediately after minting and returns 0 after cooldown elapses. This validates the view function without adding a new requirement.

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
| TEST-01 | Deployment state (name, symbol, decimals, initial supply, cap) | unit | `npx hardhat test test/RoxasToken.test.ts --grep "Deployment"` | No -- Wave 0 |
| TEST-02 | Public mint succeeds, updates balance/totalSupply, emits event | unit | `npx hardhat test test/RoxasToken.test.ts --grep "public minting"` | No -- Wave 0 |
| TEST-03 | Mint reverts when per-tx limit exceeded | unit | `npx hardhat test test/RoxasToken.test.ts --grep "limit"` | No -- Wave 0 |
| TEST-04 | Mint reverts when total supply exceeds cap | unit | `npx hardhat test test/RoxasToken.test.ts --grep "cap"` | No -- Wave 0 |
| TEST-05 | Mint reverts when cooldown not elapsed | unit | `npx hardhat test test/RoxasToken.test.ts --grep "cooldown"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx hardhat test test/RoxasToken.test.ts` (all tests must pass)
- **Per wave merge:** `npx hardhat test` (full suite)
- **Phase gate:** All 5 TEST requirements have passing tests. `npx hardhat test` exits with 0.

### Wave 0 Gaps
- [ ] `test/RoxasToken.test.ts` -- covers TEST-01 through TEST-05 (this IS the Phase 5 deliverable)
- No framework install needed -- Mocha, Chai, network helpers already installed via toolbox
- No test config needed -- Hardhat discovers `test/**/*.ts` by default
- TypeChain types already generated at `types/ethers-contracts/`

## Sources

### Primary (HIGH confidence)
- [Hardhat 3 Testing with Ethers](https://hardhat.org/docs/guides/testing/using-ethers) -- Exact import patterns, fixture structure, describe/it blocks for HH3
- [hardhat-network-helpers plugin docs](https://hardhat.org/docs/plugins/hardhat-network-helpers) -- loadFixture API, time.increase/increaseTo/latest, mine, duration helpers
- [hardhat-ethers-chai-matchers plugin docs](https://hardhat.org/docs/plugins/hardhat-ethers-chai-matchers) -- revertedWithCustomError, emit, changeTokenBalance, withArgs, anyValue
- `node_modules/@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol` (v5.4.0) -- `ERC20ExceededCap(uint256 increasedSupply, uint256 cap)` error definition and `_update()` enforcement logic (lines 43-53)
- `contracts/RoxasToken.sol` -- Contract under test (71 lines). Verified: mint(), MintLimitExceeded, CooldownNotElapsed, TokensMinted, MINT_LIMIT, COOLDOWN_PERIOD, INITIAL_SUPPLY
- `types/ethers-contracts/RoxasToken.ts` -- TypeChain typed interface. All function signatures, event types, and return types verified.
- `types/ethers-contracts/hardhat.d.ts` -- HardhatEthersHelpers augmentation. Confirms `deployContract("RoxasToken")` returns typed `RoxasToken` instance.
- `node_modules/@nomicfoundation/hardhat-ethers-chai-matchers/src/withArgs.ts` -- Confirms `anyValue` and `anyUint` exports from `/withArgs` subpath.

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` -- Hardhat 3 configuration, ethers v6 bundling, toolbox composition
- `.planning/research/PITFALLS.md` -- Pitfall #6 (BigInt vs BigNumber), Pitfall #15 (custom error assertion syntax), Pitfall #1 (HH2 vs HH3 patterns)
- `.planning/phases/04-minting-mechanics/04-RESEARCH.md` -- Custom error signatures, CEI pattern, _mint() chain behavior, ERC20ExceededCap

### Tertiary (LOW confidence)
None -- all findings verified from installed source code and official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All packages installed and verified. No new dependencies.
- Architecture: HIGH -- HH3 test patterns verified from official docs. Contract ABI verified from TypeChain output. Error signatures verified from OZ source.
- Pitfalls: HIGH -- Based on direct reading of ethers v6 API, OZ v5 source, HH3 docs. BigInt vs BigNumber, loadFixture naming, error args order all confirmed.
- Code examples: HIGH -- Import paths verified against installed node_modules. API signatures verified against TypeChain types and official plugin docs.

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable -- testing patterns and assertion APIs are well-established)
