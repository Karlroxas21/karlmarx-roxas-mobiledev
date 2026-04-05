# Phase 3: ERC-20 Transfers and Approvals - Research

**Researched:** 2026-04-05
**Domain:** ERC-20 transfer/approval interface verification (OpenZeppelin v5 ERC20 inheritance)
**Confidence:** HIGH

## Summary

Phase 3 requires zero Solidity code changes. The RoxasToken contract already inherits from OpenZeppelin's ERC20 base contract, which provides complete implementations of `transfer()`, `approve()`, `transferFrom()`, `allowance()`, and `balanceOf()`, along with automatic `Transfer` and `Approval` event emission. This has been verified by reading the actual OpenZeppelin v5.5.0 ERC20.sol source code installed at `node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol` and by inspecting the compiled ABI artifact which confirms all 10 functions (allowance, approve, balanceOf, cap, decimals, name, symbol, totalSupply, transfer, transferFrom) and both events (Approval, Transfer) are present.

The `_update()` override in RoxasToken resolves the ERC20/ERC20Capped diamond and calls `super._update()` which chains through ERC20Capped (cap check on minting only) and then ERC20 (balance updates + Transfer event emission). For non-minting transfers (where `from != address(0)`), the cap check is skipped entirely -- ERC20Capped only checks supply on mint. This means standard transfers work identically to plain ERC20.

**Primary recommendation:** This phase is a verification-only phase. Confirm the interface is complete via compilation and ABI inspection. No contract modifications needed. The planner should create a minimal plan that verifies existing behavior rather than implementing new features.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- All transfer/approval functions are inherited from OpenZeppelin ERC20 -- no custom overrides needed
- transfer(), approve(), transferFrom() all work out of the box via inheritance
- Transfer and Approval events are emitted automatically by ERC20 base
- No custom transfer restrictions or hooks -- standard ERC-20 behavior

### Claude's Discretion
- All implementation choices are at Claude's discretion -- the ERC20 inheritance already provides everything needed
- Whether to add any NatSpec comments documenting inherited functions
- Whether this phase produces any code changes at all (it may be purely a verification/compilation step)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TOKN-02 | User can transfer tokens to any address via `transfer()` | ERC20.sol line 99-103: `transfer()` is public, calls `_transfer()` which calls `_update()`. Already in compiled ABI. No code needed. |
| TOKN-03 | User can approve another address to spend tokens via `approve()` | ERC20.sol line 120-123: `approve()` is public, calls `_approve()` which sets allowance and emits Approval. Already in compiled ABI. No code needed. |
| TOKN-04 | Approved address can transfer tokens on behalf of owner via `transferFrom()` | ERC20.sol line 142-147: `transferFrom()` is public, calls `_spendAllowance()` then `_transfer()`. Already in compiled ABI. No code needed. |
| TOKN-05 | Contract emits Transfer event on every token movement | ERC20.sol line 203: `_update()` emits `Transfer(from, to, value)` on every call. The RoxasToken `_update()` override chains to `super._update()` which reaches this emission. Already in compiled ABI events. No code needed. |
| TOKN-06 | Contract emits Approval event on every approval change | ERC20.sol line 273-283: `_approve()` emits `Approval(owner, spender, value)` when `emitEvent` is true (default). Called by public `approve()`. Already in compiled ABI events. No code needed. |

</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| OpenZeppelin Contracts | ^5.6.1 (v5.5.0 ERC20.sol) | ERC-20 base implementation | Audited, industry-standard. Provides all transfer/approval logic. |
| Hardhat | ^3.3.0 | Compilation & verification | Already configured in hardhat.config.ts |
| hardhat-toolbox-mocha-ethers | ^3.0.3 | Test runner & chai matchers | Already installed. Provides `.to.emit()` for event verification. |

### Supporting (For Verification Tests)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nomicfoundation/hardhat-ethers-chai-matchers | (bundled) | `.to.emit()`, `.to.changeTokenBalance()`, `.to.be.revertedWithCustomError()` | Event emission assertions, balance change assertions in tests |
| @nomicfoundation/hardhat-network-helpers | (bundled) | `loadFixture()` for test state management | Test fixtures for deploying contract with initial state |
| ethers.js | ^6.16.0 | Contract interaction, BigInt math | `parseEther()`, `getSigners()`, contract calls |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inherited ERC20 functions | Custom transfer/approve overrides | Never do this -- OpenZeppelin's implementation is audited and battle-tested. Custom overrides introduce bugs. |

**Installation:** No new packages needed. Everything is already installed.

## Architecture Patterns

### No New Files or Structures Needed

This phase does not create or modify any files in `contracts/`. The existing structure is sufficient:

```
contracts/
  RoxasToken.sol          # Already has full ERC-20 interface via inheritance
test/
  (empty -- tests are Phase 5/6)
```

### Pattern 1: OpenZeppelin v5 Hook-Based Architecture
**What:** OpenZeppelin v5 ERC20 uses a single `_update()` hook for ALL token movements (transfers, mints, burns). All customizations go through this one override point.
**When to use:** When you need to add custom logic to transfers (NOT this phase -- standard behavior is correct).
**How it works in RoxasToken:**
```
transfer() -> _transfer() -> _update() [RoxasToken override] -> super._update() [ERC20Capped] -> super._update() [ERC20 base: balance updates + Transfer event]
approve() -> _approve() -> sets allowance + Approval event
transferFrom() -> _spendAllowance() + _transfer() -> same _update() chain
```

### Pattern 2: ERC-6093 Custom Errors (OpenZeppelin v5)
**What:** OpenZeppelin v5 uses ERC-6093 custom errors instead of string revert messages. This is important for test assertions.
**Key errors for transfer/approval testing:**
- `ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)` -- when transfer exceeds balance
- `ERC20InvalidSender(address(0))` -- when transferring from zero address
- `ERC20InvalidReceiver(address(0))` -- when transferring to zero address
- `ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)` -- when transferFrom exceeds allowance
- `ERC20InvalidApprover(address(0))` -- when approving from zero address
- `ERC20InvalidSpender(address(0))` -- when approving zero address as spender

**Test assertion pattern:**
```typescript
// Source: OpenZeppelin ERC20.sol + Hardhat chai matchers
await expect(token.connect(addr1).transfer(addr2, amount))
  .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance")
  .withArgs(addr1.address, balance, amount);
```

### Anti-Patterns to Avoid
- **Overriding transfer() or approve() directly:** OpenZeppelin marks `_transfer()` as non-virtual intentionally. Override `_update()` only if you need custom logic (which this phase does not).
- **Adding redundant event emissions:** The base ERC20 already emits Transfer in `_update()` and Approval in `_approve()`. Adding extra emissions would double-emit.
- **Writing NatSpec for inherited functions that are not overridden:** This adds noise to the contract. The functions are documented in the OpenZeppelin source. Only add NatSpec if you override a function.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token transfers | Custom balance mapping + transfer logic | OpenZeppelin ERC20 inheritance | Audited, handles edge cases (zero address checks, overflow protection), emits correct events |
| Approval mechanism | Custom allowance mapping + approve/transferFrom | OpenZeppelin ERC20 inheritance | Race condition handling (infinite allowance optimization), proper event emission |
| Transfer events | Manual `emit Transfer()` calls | Inherited from ERC20._update() | Already emitted in the correct location with correct arguments |
| Approval events | Manual `emit Approval()` calls | Inherited from ERC20._approve() | Already emitted with correct arguments, with opt-out for `_spendAllowance` gas optimization |

**Key insight:** Every requirement (TOKN-02 through TOKN-06) is already satisfied by the existing OpenZeppelin ERC20 inheritance. This phase is purely about verification, not implementation.

## Common Pitfalls

### Pitfall 1: Thinking Code Changes Are Needed
**What goes wrong:** Adding unnecessary overrides or wrapper functions that duplicate what ERC20 already provides.
**Why it happens:** Phase requirements list behaviors (transfer, approve, etc.) which suggests they need to be "implemented." But they are already implemented via inheritance.
**How to avoid:** Verify via ABI inspection that all functions exist. The compiled ABI at `artifacts/contracts/RoxasToken.sol/RoxasToken.json` already lists: allowance, approve, balanceOf, cap, decimals, name, symbol, totalSupply, transfer, transferFrom, plus Transfer and Approval events.
**Warning signs:** Any diff to `contracts/RoxasToken.sol` in this phase is suspicious.

### Pitfall 2: Transfer Cannot Work Without Tokens
**What goes wrong:** Trying to test transfers before any tokens exist. The current contract has zero totalSupply because no minting function exists yet (deferred to Phase 4).
**Why it happens:** Constructor does not mint initial supply -- minting is Phase 4.
**How to avoid:** For Phase 6 (transfer tests), the test must first give tokens to test accounts. Since there is no public `mint()` yet, tests will need to either: (a) use a test helper that calls internal `_mint()` via a test contract, or (b) wait until Phase 4 adds the public `mint()` function. This is a Phase 5/6 concern, not Phase 3.
**Warning signs:** Attempting to write transfer tests in Phase 3 when test infrastructure is Phase 5/6.

### Pitfall 3: Approval Event Not Emitted on transferFrom
**What goes wrong:** Expecting an Approval event on every `transferFrom()` call.
**Why it happens:** The ERC-20 spec is ambiguous. OpenZeppelin v5 explicitly does NOT emit Approval during `transferFrom()` for gas optimization (see ERC20.sol line 129-130: "_spendAllowance during the transferFrom operation sets the flag to false"). The Approval event is only emitted on explicit `approve()` calls.
**How to avoid:** Tests should check for Transfer event on `transferFrom()`, not Approval. The Approval event is tested via `approve()` calls only.
**Warning signs:** Test expecting `Approval` event from `transferFrom()`.

### Pitfall 4: Confusing Phase 3 Scope with Phase 6
**What goes wrong:** Writing comprehensive transfer tests in Phase 3 when testing is explicitly Phase 5/6.
**Why it happens:** The success criteria mention "balances update correctly" and "events emit" which sounds like test assertions.
**How to avoid:** Phase 3 success criteria are about the contract HAVING the interface, not about testing it exhaustively. Verification can be done via compilation and ABI inspection. Comprehensive tests belong in Phase 6 (TEST-06, TEST-07, TEST-08).

## Code Examples

Verified patterns from the actual installed OpenZeppelin source:

### How transfer() Works (ERC20.sol lines 99-103, 159-167, 176-204)
```solidity
// Source: node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol
// Public entry point
function transfer(address to, uint256 value) public virtual returns (bool) {
    address owner = _msgSender();
    _transfer(owner, to, value);
    return true;
}

// Internal transfer (validates from/to are not zero)
function _transfer(address from, address to, uint256 value) internal {
    if (from == address(0)) { revert ERC20InvalidSender(address(0)); }
    if (to == address(0)) { revert ERC20InvalidReceiver(address(0)); }
    _update(from, to, value);  // -> RoxasToken._update() -> ERC20Capped._update() -> ERC20._update()
}

// _update: updates balances and emits Transfer
function _update(address from, address to, uint256 value) internal virtual {
    // Deduct from sender (with underflow check)
    // Add to receiver (unchecked -- safe because value <= totalSupply)
    emit Transfer(from, to, value);
}
```

### How approve() + transferFrom() Works
```solidity
// Source: node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol
function approve(address spender, uint256 value) public virtual returns (bool) {
    address owner = _msgSender();
    _approve(owner, spender, value);  // Sets allowance, emits Approval
    return true;
}

function transferFrom(address from, address to, uint256 value) public virtual returns (bool) {
    address spender = _msgSender();
    _spendAllowance(from, spender, value);  // Decrements allowance (NO Approval event)
    _transfer(from, to, value);              // Moves tokens (emits Transfer event)
    return true;
}
```

### Verification Test Pattern (for Phase 6, shown here for reference)
```typescript
// Source: Hardhat 3 testing guide + chai matchers
import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("RoxasToken Transfers", function () {
  async function deployFixture() {
    const [owner, addr1, addr2] = await hre.ethers.getSigners();
    const Token = await hre.ethers.getContractFactory("RoxasToken");
    const token = await Token.deploy();
    return { token, owner, addr1, addr2 };
  }

  it("should emit Transfer event", async function () {
    const { token, owner, addr1 } = await loadFixture(deployFixture);
    // Note: need tokens first (Phase 4 mint), then:
    await expect(token.transfer(addr1.address, 100n))
      .to.emit(token, "Transfer")
      .withArgs(owner.address, addr1.address, 100n);
  });

  it("should emit Approval event on approve", async function () {
    const { token, owner, addr1 } = await loadFixture(deployFixture);
    await expect(token.approve(addr1.address, 500n))
      .to.emit(token, "Approval")
      .withArgs(owner.address, addr1.address, 500n);
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| String revert messages (`require(balance >= amount, "ERC20: insufficient balance")`) | ERC-6093 custom errors (`ERC20InsufficientBalance(sender, balance, needed)`) | OpenZeppelin v5.0 (Oct 2023) | Tests must use `.revertedWithCustomError()` not `.revertedWith("string")` |
| Separate `_beforeTokenTransfer` / `_afterTokenTransfer` hooks | Single `_update()` hook | OpenZeppelin v5.0 (Oct 2023) | All transfer customization goes through `_update()` override |
| `transferFrom` emitting Approval event | `transferFrom` does NOT emit Approval (gas optimization) | OpenZeppelin v5.0 | Tests must not expect Approval events from `transferFrom()` |

**Deprecated/outdated:**
- `_beforeTokenTransfer()` / `_afterTokenTransfer()`: Removed in OZ v5. Use `_update()` override instead.
- String revert messages: Replaced by ERC-6093 custom errors in OZ v5.

## Open Questions

1. **Should Phase 3 produce any code changes at all?**
   - What we know: All five requirements (TOKN-02 through TOKN-06) are already satisfied by OpenZeppelin ERC20 inheritance. The compiled ABI confirms all functions and events.
   - What's unclear: Whether the planner should create a "verify only" plan or add optional NatSpec documentation.
   - Recommendation: Create a minimal verification-only plan. Adding NatSpec for inherited functions is optional and low-value since they are not overridden. The phase can be satisfied by confirming compilation and ABI completeness.

2. **How will transfer tests work without tokens?**
   - What we know: Current contract has zero totalSupply (no mint function yet, deferred to Phase 4). transfer() and transferFrom() require the sender to have tokens.
   - What's unclear: How Phase 6 tests will seed token balances before the mint function exists.
   - Recommendation: This is a Phase 5/6 concern. Options include: (a) Phase 5/6 tests can use a `TestHelper` contract that exposes `_mint()`, or (b) Phase 6 runs after Phase 4 which adds `mint()`. Per the roadmap, Phase 4 (minting) comes before Phase 6 (transfer tests), so this resolves naturally.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Mocha + Chai via @nomicfoundation/hardhat-toolbox-mocha-ethers ^3.0.3 |
| Config file | hardhat.config.ts (plugins: [hardhatToolboxMochaEthers]) |
| Quick run command | `npx hardhat test` |
| Full suite command | `npx hardhat test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TOKN-02 | transfer() moves tokens between addresses | Verification (Phase 3) / Unit test (Phase 6) | `npx hardhat compile && node -e "..."` (ABI check) | N/A -- verification only in Phase 3; test file created in Phase 6 |
| TOKN-03 | approve() sets allowance | Verification (Phase 3) / Unit test (Phase 6) | `npx hardhat compile && node -e "..."` (ABI check) | N/A -- verification only in Phase 3; test file created in Phase 6 |
| TOKN-04 | transferFrom() moves tokens on behalf of owner | Verification (Phase 3) / Unit test (Phase 6) | `npx hardhat compile && node -e "..."` (ABI check) | N/A -- verification only in Phase 3; test file created in Phase 6 |
| TOKN-05 | Transfer event emitted on token movement | Verification (Phase 3) / Unit test (Phase 6) | `npx hardhat compile && node -e "..."` (ABI check) | N/A -- verification only in Phase 3; test file created in Phase 6 |
| TOKN-06 | Approval event emitted on approval change | Verification (Phase 3) / Unit test (Phase 6) | `npx hardhat compile && node -e "..."` (ABI check) | N/A -- verification only in Phase 3; test file created in Phase 6 |

### Sampling Rate
- **Per task commit:** `npx hardhat compile` (zero-code phase, compilation is the primary check)
- **Per wave merge:** `npx hardhat compile` + ABI inspection script
- **Phase gate:** All 10 ERC-20 functions and 2 events present in compiled ABI

### Wave 0 Gaps
None -- this phase is a verification phase. No test files need to be created. Comprehensive transfer/approval tests are explicitly deferred to Phase 6 (TEST-06, TEST-07, TEST-08). The test framework is already installed and configured.

## Sources

### Primary (HIGH confidence)
- `node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol` (v5.5.0) -- Full source read. Confirmed transfer(), approve(), transferFrom() implementations and event emissions.
- `node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol` (v5.4.0) -- Full source read. Confirmed Transfer and Approval event declarations.
- `node_modules/@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol` (v5.4.0) -- Full source read. Confirmed _update() override only checks cap on mint (from == address(0)), not on transfers.
- `node_modules/@openzeppelin/contracts/interfaces/draft-IERC6093.sol` (v5.5.0) -- Full source read. Confirmed all ERC-20 custom error types.
- `artifacts/contracts/RoxasToken.sol/RoxasToken.json` -- Compiled ABI inspected. Confirmed functions: allowance, approve, balanceOf, cap, decimals, name, symbol, totalSupply, transfer, transferFrom. Events: Approval, Transfer.
- `contracts/RoxasToken.sol` -- Source read. Confirmed ERC20 + ERC20Capped inheritance with _update() override.
- `types/ethers-contracts/RoxasToken.ts` -- TypeChain types confirm typed interfaces for all transfer/approval functions and events.

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` -- Prior stack research confirming Hardhat 3 + OZ v5.6.1 + ethers v6 setup.
- `.planning/phases/02-contract-foundation/02-01-SUMMARY.md` -- Phase 2 completion summary confirming contract compiles and TypeChain generates.

### Tertiary (LOW confidence)
None -- all findings verified from primary sources (actual installed source code).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries already installed and verified from actual source code
- Architecture: HIGH -- OpenZeppelin ERC20 source code read directly, _update() chain traced through all three contracts
- Pitfalls: HIGH -- Based on direct reading of OZ v5 source code behavior (e.g., Approval event suppression in transferFrom is explicitly documented in the source)

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable -- OpenZeppelin v5 ERC20 interface is standardized and unlikely to change)
