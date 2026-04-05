# Phase 4: Minting Mechanics - Research

**Researched:** 2026-04-05
**Domain:** Solidity public minting with per-tx limit, cooldown, initial supply, custom errors/events (OpenZeppelin v5 ERC20Capped)
**Confidence:** HIGH

## Summary

Phase 4 adds public minting mechanics to the existing `RoxasToken.sol` contract. The contract already inherits ERC20 + ERC20Capped from OpenZeppelin v5 with a correct `_update()` override chain. The work consists of: (1) adding a constructor `_mint()` call to give the deployer 1M RXS initial supply, (2) adding a public `mint(uint256 amount)` function with per-tx limit (1000 RXS) and per-address cooldown (60 seconds), (3) defining custom errors and a custom event per the CONTEXT.md decisions.

The cap enforcement (10M total supply) is already handled by `ERC20Capped._update()` -- it checks `totalSupply() <= cap()` whenever `from == address(0)` (i.e., on any mint). No additional cap check is needed in the `mint()` function. The custom logic is limited to: amount validation, cooldown tracking via a `mapping(address => uint256)` and `block.timestamp`, and emitting a `TokensMinted` event.

All implementation decisions are locked in CONTEXT.md. The contract modification is straightforward -- approximately 25-30 lines of new code added to the existing 24-line contract. No new files are needed. No new dependencies are needed. The contract must compile successfully after modification.

**Primary recommendation:** Add the mint function, constants, custom errors, custom event, cooldown mapping, and constructor mint to `contracts/RoxasToken.sol`. Verify via `npx hardhat compile`. Keep the `_update()` override exactly as-is -- it already chains correctly for cap enforcement.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Per-transaction mint limit: 1000 RXS (1000 * 10**18 wei) as immutable constant
- Cooldown duration: 60 seconds between mints per address
- Initial supply: 1,000,000 RXS minted to deployer in constructor via _mint()
- Mint limit is an immutable constant -- no admin function to change it
- Custom event: `event TokensMinted(address indexed minter, uint256 amount)`
- Use custom errors (Solidity 0.8+ style), not require() strings -- gas efficient
- Error names: `MintLimitExceeded(uint256 amount, uint256 limit)` and `CooldownNotElapsed(uint256 remaining)`
- Cap enforcement via ERC20Capped._update() -- already in place from Phase 2
- `mapping(address => uint256) private _lastMintTimestamp` for cooldown tracking
- `uint256 public constant MINT_LIMIT = 1000 * 10 ** 18`
- `uint256 public constant COOLDOWN_PERIOD = 60` (seconds)
- `uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18`

### Claude's Discretion
- NatSpec documentation depth on mint function
- Whether to expose cooldown state via a public view function (e.g., `canMint(address)`)
- Exact ordering of checks in mint function (limit check before cooldown or vice versa)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MINT-01 | Any address can mint tokens by calling the public `mint()` function | Public `mint(uint256 amount)` function with no access control. Calls internal `_mint(msg.sender, amount)` from ERC20 base. |
| MINT-02 | Each mint call is limited to 1000 RXS maximum per transaction | `MINT_LIMIT` constant (1000 * 10**18). Custom error `MintLimitExceeded` reverts if `amount > MINT_LIMIT`. |
| MINT-03 | Total supply cannot exceed 10,000,000 RXS (hard cap enforced by contract) | Already enforced by ERC20Capped._update() -- checks `totalSupply() <= cap()` on every mint. Reverts with `ERC20ExceededCap`. No new code needed. |
| MINT-04 | Deployer receives 1,000,000 RXS initial supply at deployment | `_mint(msg.sender, INITIAL_SUPPLY)` in constructor. Safe because 1M < 10M cap. Emits Transfer(address(0), deployer, 1M). |
| MINT-05 | Same address cannot mint again within a cooldown period (per-address cooldown) | `_lastMintTimestamp` mapping + `block.timestamp` comparison. Custom error `CooldownNotElapsed` reverts if `block.timestamp - lastMint < COOLDOWN_PERIOD`. |
| MINT-06 | Contract emits custom TokensMinted(minter, amount) event on each mint | Custom event `TokensMinted(address indexed minter, uint256 amount)` emitted in `mint()` after successful `_mint()` call. |

</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| OpenZeppelin Contracts | ^5.6.1 (v5.5.0 ERC20.sol, v5.4.0 ERC20Capped.sol) | ERC20 + ERC20Capped base. Provides `_mint()` internal function and cap enforcement via `_update()`. | Audited, industry-standard. `_mint()` handles balance updates, totalSupply increment, and Transfer event emission. |
| Solidity | 0.8.28 (pinned) | Custom errors, unchecked arithmetic, `block.timestamp` | Stable, pre-IR-bug version. Custom errors supported since 0.8.4. |
| Hardhat | ^3.3.0 | Compilation | `npx hardhat compile` to verify contract changes. |

### Supporting
No new libraries needed for Phase 4. All minting logic is custom Solidity code that calls the existing `_mint()` internal function from OpenZeppelin ERC20.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom `mint()` function | OpenZeppelin `ERC20Mintable` extension | OZ does not provide a public ERC20Mintable in v5. Their minting examples use custom functions calling `_mint()`. Our approach IS the standard. |
| Custom errors | `require()` with strings | Custom errors are more gas efficient (~100 gas cheaper per revert) and carry typed data. CONTEXT.md locked this decision. |
| `block.timestamp` for cooldown | Block number comparison | Timestamp is human-readable (60 seconds vs ~5 blocks), industry standard for cooldowns. Minor miner manipulation risk (~15s) is irrelevant for 60s cooldown. |

**Installation:** No new packages needed.

## Architecture Patterns

### Contract Modification (No New Files)
```
contracts/
  RoxasToken.sol          # MODIFY: add mint(), constants, errors, event, cooldown mapping, constructor mint
```

### Pattern 1: Calling `_mint()` from Public Function
**What:** The public `mint()` function validates inputs (amount, cooldown), updates cooldown state, calls the internal `_mint(msg.sender, amount)`, and emits the custom event. The internal `_mint()` (ERC20.sol line 214-219) calls `_update(address(0), account, value)` which chains through: RoxasToken._update() -> ERC20Capped._update() (cap check) -> ERC20._update() (balance + totalSupply + Transfer event).
**When to use:** Always for public minting. Never call `_update()` directly -- always go through `_mint()` which validates the recipient is not address(0).
**Call chain:**
```
mint(amount)                          [Phase 4 -- custom validation]
  -> _mint(msg.sender, amount)        [ERC20.sol -- validates account != address(0)]
    -> _update(address(0), msg.sender, amount)  [RoxasToken override]
      -> super._update()              [ERC20Capped -- checks totalSupply() <= cap()]
        -> super._update()            [ERC20 base -- balance update + Transfer event]
```

**Source:** Direct reading of `node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol` (lines 214-219) and `ERC20Capped.sol` (lines 43-53).

### Pattern 2: Cooldown via `block.timestamp` Mapping
**What:** Store `block.timestamp` in a mapping after each mint. Before minting, check that enough time has elapsed since the last mint. Use subtraction to compute remaining time for the error parameter.
**When to use:** Per-address rate limiting.
**Example:**
```solidity
// Source: Standard Solidity pattern, verified against Solidity 0.8.28 docs
mapping(address => uint256) private _lastMintTimestamp;

function mint(uint256 amount) external {
    // Cooldown check
    uint256 lastMint = _lastMintTimestamp[msg.sender];
    if (block.timestamp < lastMint + COOLDOWN_PERIOD) {
        revert CooldownNotElapsed(lastMint + COOLDOWN_PERIOD - block.timestamp);
    }

    // Update cooldown BEFORE external interaction (CEI pattern)
    _lastMintTimestamp[msg.sender] = block.timestamp;

    _mint(msg.sender, amount);
}
```

### Pattern 3: Custom Errors with Parameters
**What:** Solidity 0.8.4+ custom errors are cheaper than `require(condition, "string")` and carry typed data for off-chain consumption.
**When to use:** All input validation in this contract. CONTEXT.md locks this decision.
**Example:**
```solidity
// Source: Solidity 0.8 docs, matches CONTEXT.md locked error names
error MintLimitExceeded(uint256 amount, uint256 limit);
error CooldownNotElapsed(uint256 remaining);

// Usage in mint():
if (amount > MINT_LIMIT) {
    revert MintLimitExceeded(amount, MINT_LIMIT);
}
```

### Pattern 4: Constructor Initial Supply Mint
**What:** Call `_mint(msg.sender, INITIAL_SUPPLY)` in the constructor to give the deployer initial tokens. This runs through the full `_update()` chain, so the cap check applies. Since 1M < 10M, this is safe.
**When to use:** Once, in the constructor.
**Important:** The constructor `_mint()` will emit a `Transfer(address(0), deployer, INITIAL_SUPPLY)` event (from ERC20 base). It will NOT emit `TokensMinted` because the constructor mint is not going through the public `mint()` function -- this is correct behavior (initial supply is a deployment action, not a user mint action).

### Anti-Patterns to Avoid
- **Checking cap manually in `mint()`:** ERC20Capped already handles this in `_update()`. Adding a second check wastes gas and creates maintenance burden. If `totalSupply() + amount > cap()`, ERC20Capped reverts with `ERC20ExceededCap(supply, maxSupply)`.
- **Using `require()` strings instead of custom errors:** CONTEXT.md explicitly locks custom errors. Strings are gas-wasteful and the old OZ v4 pattern.
- **Forgetting to multiply by `10 ** 18`:** MINT_LIMIT must be `1000 * 10 ** 18` (1000 full RXS tokens), not raw `1000` (which would be 0.000000000000001 RXS). See Pitfall 2 in PITFALLS.md.
- **Setting cooldown timestamp AFTER `_mint()`:** Violates Checks-Effects-Interactions (CEI) pattern. Although `_mint()` here calls only internal functions (no external calls), following CEI is best practice.
- **Accepting `amount == 0`:** While `_mint()` with zero amount is technically valid (it would just emit a Transfer event), it is wasteful and misleading. The mint function should validate `amount > 0`. This can be a simple `if (amount == 0) revert` or included in the limit check.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cap enforcement | Manual `totalSupply() + amount <= cap` check in mint() | ERC20Capped._update() (already in place) | Already enforced in _update() chain. Duplicate check wastes gas. |
| Token balance tracking | Manual balance mapping updates | `_mint()` from ERC20 base | _mint() handles totalSupply increment, balance credit, Transfer event emission, and zero-address validation. |
| Transfer event on mint | Manual `emit Transfer(address(0), ...)` | `_mint()` -> `_update()` -> automatic Transfer emission | ERC20._update() emits Transfer(from, to, value) for every call including mints (where from == address(0)). |

**Key insight:** The only custom logic in Phase 4 is: (a) per-tx limit check, (b) cooldown enforcement, (c) custom event emission, and (d) constructor initial supply call. Everything else (balances, totalSupply, cap, Transfer events) is handled by OpenZeppelin internally.

## Common Pitfalls

### Pitfall 1: Decimals Miscalculation in Constants
**What goes wrong:** Defining `MINT_LIMIT = 1000` instead of `MINT_LIMIT = 1000 * 10 ** 18`. The limit becomes 0.000000000000001 RXS instead of 1000 RXS.
**Why it happens:** Thinking in "token units" but the contract operates in wei (smallest unit).
**How to avoid:** All constants use `* 10 ** 18` multiplier. CONTEXT.md already specifies this correctly.
**Warning signs:** Tests passing with suspiciously small amounts.

### Pitfall 2: Cooldown Arithmetic Overflow
**What goes wrong:** `lastMint + COOLDOWN_PERIOD` could theoretically overflow, but in Solidity 0.8.x this is checked by default. The real pitfall is the opposite: using unchecked arithmetic for the remaining time calculation.
**Why it happens:** Over-optimization with `unchecked {}` blocks.
**How to avoid:** Keep all cooldown arithmetic checked (default Solidity 0.8 behavior). The gas cost of checked arithmetic is negligible for these operations.
**Warning signs:** Using `unchecked` around timestamp calculations.

### Pitfall 3: Constructor Mint Emitting TokensMinted Event
**What goes wrong:** If the constructor calls the public `mint()` function instead of `_mint()` directly, the constructor mint would be subject to cooldown and limit checks, and would emit `TokensMinted`. The initial supply (1M) exceeds the per-tx MINT_LIMIT (1000), so calling `mint()` would revert.
**Why it happens:** Confusing "initial supply" with "regular minting."
**How to avoid:** Constructor calls `_mint(msg.sender, INITIAL_SUPPLY)` directly -- bypasses all public mint validation. This is intentional and correct.
**Warning signs:** Constructor calling the public `mint()` function.

### Pitfall 4: Cooldown Not Updated Before Mint
**What goes wrong:** If `_lastMintTimestamp[msg.sender] = block.timestamp` is placed after `_mint()`, a reentrancy-like pattern (though unlikely here since _mint has no external calls) could bypass cooldown.
**Why it happens:** Not following CEI (Checks-Effects-Interactions) pattern.
**How to avoid:** Update state (cooldown timestamp) BEFORE calling `_mint()`. Follow CEI: check conditions -> update state -> interact with external/inherited functions.
**Warning signs:** State updates appearing after `_mint()` call.

### Pitfall 5: Missing Zero-Amount Check
**What goes wrong:** Calling `mint(0)` succeeds, emits TokensMinted with 0 amount, wastes gas, and resets the caller's cooldown timer. Functionally useless but state-changing.
**Why it happens:** ERC20's `_mint()` does not revert on zero amount -- it just does nothing meaningful.
**How to avoid:** Add `if (amount == 0) revert` or check `amount > 0` at the start of `mint()`. Could use a custom error or a simple revert. Given CONTEXT.md only specifies `MintLimitExceeded` and `CooldownNotElapsed`, a simple approach is: validate `amount > 0 && amount <= MINT_LIMIT` before proceeding. If `amount == 0`, the `MintLimitExceeded` error does not semantically fit -- consider whether a separate error or a combined check is cleaner.
**Recommendation (Claude's discretion):** Check `amount == 0` as part of the limit check, or add a dedicated `MintAmountZero()` error. The simplest approach: `if (amount == 0 || amount > MINT_LIMIT)` with `MintLimitExceeded`.

### Pitfall 6: Forgetting to Update Inheritance Override List
**What goes wrong:** If adding new virtual functions that require override resolution. Not applicable here -- the existing `_update()` override already lists `(ERC20, ERC20Capped)` and no new overrides are needed.
**Why it happens:** Adding more OZ extensions without updating the override list.
**How to avoid:** Phase 4 does NOT change the inheritance chain. The `_update()` override stays exactly as-is. Only add new members (constants, mapping, event, errors, mint function) to the contract body.

## Code Examples

Verified patterns from official sources (OpenZeppelin v5 source code + Solidity 0.8 docs):

### Complete Modified Contract Structure
```solidity
// Source: Derived from existing RoxasToken.sol + CONTEXT.md decisions
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

/// @title RoxasToken (RXS) - ERC-20 with capped supply and public minting
/// @notice ERC-20 token with a hard cap of 10,000,000 RXS and public minting
/// @dev Inherits ERC20 and ERC20Capped from OpenZeppelin v5.
contract RoxasToken is ERC20, ERC20Capped {
    // --- Constants ---
    uint256 public constant MINT_LIMIT = 1000 * 10 ** 18;
    uint256 public constant COOLDOWN_PERIOD = 60;
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18;

    // --- Storage ---
    mapping(address => uint256) private _lastMintTimestamp;

    // --- Events ---
    event TokensMinted(address indexed minter, uint256 amount);

    // --- Errors ---
    error MintLimitExceeded(uint256 amount, uint256 limit);
    error CooldownNotElapsed(uint256 remaining);

    constructor()
        ERC20("Roxas Token", "RXS")
        ERC20Capped(10_000_000 * 10 ** 18)
    {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /// @notice Mint RXS tokens to the caller
    /// @param amount The number of tokens to mint (in wei, max 1000 * 10**18)
    function mint(uint256 amount) external {
        if (amount == 0 || amount > MINT_LIMIT) {
            revert MintLimitExceeded(amount, MINT_LIMIT);
        }

        uint256 lastMint = _lastMintTimestamp[msg.sender];
        if (block.timestamp < lastMint + COOLDOWN_PERIOD) {
            revert CooldownNotElapsed(lastMint + COOLDOWN_PERIOD - block.timestamp);
        }

        _lastMintTimestamp[msg.sender] = block.timestamp;

        _mint(msg.sender, amount);

        emit TokensMinted(msg.sender, amount);
    }

    /// @dev Required override to resolve ERC20 vs ERC20Capped diamond.
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped)
    {
        super._update(from, to, value);
    }
}
```

### How `_mint()` Chains Through `_update()`
```
// Source: node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol lines 214-219
_mint(msg.sender, amount)
  -> validates account != address(0)              [ERC20.sol:215]
  -> _update(address(0), msg.sender, amount)      [ERC20.sol:218]
    -> RoxasToken._update()                       [calls super._update()]
      -> ERC20Capped._update()                    [lines 43-53]
        -> super._update()                        [ERC20 base: totalSupply += amount, balances[to] += amount]
        -> if (from == address(0)): check totalSupply() <= cap()  [reverts with ERC20ExceededCap if exceeded]
      -> ERC20 base emits Transfer(address(0), msg.sender, amount)  [line 203]
```

### Custom Error Test Assertion Pattern
```typescript
// Source: Hardhat chai matchers + Phase 3 research
// For Phase 5 tests (not implemented in Phase 4, shown for reference)
await expect(token.connect(user1).mint(ethers.parseEther("1001")))
  .to.be.revertedWithCustomError(token, "MintLimitExceeded")
  .withArgs(ethers.parseEther("1001"), ethers.parseEther("1000"));

await expect(token.connect(user1).mint(ethers.parseEther("100")))
  .to.be.revertedWithCustomError(token, "CooldownNotElapsed");
```

### Custom Event Test Assertion Pattern
```typescript
// Source: Hardhat chai matchers
await expect(token.connect(user1).mint(ethers.parseEther("500")))
  .to.emit(token, "TokensMinted")
  .withArgs(user1.address, ethers.parseEther("500"));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `require(amount <= limit, "Exceeds mint limit")` | `if (amount > MINT_LIMIT) revert MintLimitExceeded(amount, MINT_LIMIT)` | Solidity 0.8.4+ (Feb 2021) | ~100 gas cheaper per revert, typed error data for off-chain consumption |
| `_beforeTokenTransfer` hook for mint validation | `_update()` hook (OZ v5) | OpenZeppelin v5.0 (Oct 2023) | Single override point for all token movements. But RoxasToken does NOT need to modify `_update()` for mint validation -- validation goes in the public `mint()` function instead. |
| SafeMath for arithmetic | Native checked arithmetic | Solidity 0.8.0 (Dec 2020) | No SafeMath import needed. Overflow/underflow reverts by default. |

**Deprecated/outdated:**
- `require()` with string messages: Still valid Solidity but CONTEXT.md locks custom errors for gas efficiency.
- `_beforeTokenTransfer()` / `_afterTokenTransfer()`: Removed in OZ v5. Not relevant here since mint validation goes in the public function, not the hook.

## Open Questions

1. **Should `mint(0)` revert with `MintLimitExceeded(0, MINT_LIMIT)` or a separate error?**
   - What we know: CONTEXT.md only defines two custom errors: `MintLimitExceeded` and `CooldownNotElapsed`. Minting zero tokens is pointless but technically valid in ERC20.
   - What's unclear: Whether `MintLimitExceeded(0, 1000e18)` semantically makes sense for a zero-amount mint.
   - Recommendation (Claude's discretion): Use `MintLimitExceeded(0, MINT_LIMIT)` with a combined check `amount == 0 || amount > MINT_LIMIT`. This avoids adding an undecided error while still preventing zero-amount mints. The semantics are acceptable -- zero exceeds the minimum implicit requirement of "at least 1 wei."

2. **Should a public `canMint(address)` view function be included?**
   - What we know: CONTEXT.md lists this as Claude's discretion. It would read `_lastMintTimestamp` and return whether the address can currently mint.
   - Recommendation: Include it. It costs no gas for callers (view function), improves frontend integration (can show cooldown status), and is a common pattern for rate-limited contracts. Returns `bool` based on whether `block.timestamp >= _lastMintTimestamp[addr] + COOLDOWN_PERIOD`.
   - Alternative: A `cooldownRemaining(address)` function that returns seconds until the address can mint (0 if ready). This is more informative than a boolean.

3. **Check ordering in `mint()`: limit first or cooldown first?**
   - What we know: CONTEXT.md lists this as Claude's discretion.
   - Recommendation: Limit check first, then cooldown check. Rationale: limit check is cheaper (no SLOAD), and checking the simpler condition first follows the "fail fast" principle. Also, if someone passes an invalid amount, they get the relevant error immediately rather than a confusing "cooldown not elapsed" message.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Mocha + Chai via @nomicfoundation/hardhat-toolbox-mocha-ethers ^3.0.3 |
| Config file | hardhat.config.ts (plugins: [hardhatToolboxMochaEthers]) |
| Quick run command | `npx hardhat compile` |
| Full suite command | `npx hardhat test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MINT-01 | Public mint() callable by any address | unit (Phase 5) | `npx hardhat test test/RoxasToken.test.ts --grep "mint"` | No -- Phase 5 |
| MINT-02 | Mint limited to 1000 RXS per tx | unit (Phase 5) | `npx hardhat test test/RoxasToken.test.ts --grep "limit"` | No -- Phase 5 |
| MINT-03 | Total supply capped at 10M | unit (Phase 5) | `npx hardhat test test/RoxasToken.test.ts --grep "cap"` | No -- Phase 5 |
| MINT-04 | Deployer gets 1M initial supply | unit (Phase 5) | `npx hardhat test test/RoxasToken.test.ts --grep "initial"` | No -- Phase 5 |
| MINT-05 | Per-address cooldown enforced | unit (Phase 5) | `npx hardhat test test/RoxasToken.test.ts --grep "cooldown"` | No -- Phase 5 |
| MINT-06 | TokensMinted event emitted | unit (Phase 5) | `npx hardhat test test/RoxasToken.test.ts --grep "TokensMinted"` | No -- Phase 5 |

### Sampling Rate
- **Per task commit:** `npx hardhat compile` (Phase 4 is contract modification only -- compilation is the gate)
- **Per wave merge:** `npx hardhat compile` (no tests exist yet for mint)
- **Phase gate:** Successful compilation + ABI inspection confirming: mint function, MINT_LIMIT/COOLDOWN_PERIOD/INITIAL_SUPPLY constants, TokensMinted event, MintLimitExceeded/CooldownNotElapsed errors

### Wave 0 Gaps
None -- Phase 4 modifies only `contracts/RoxasToken.sol`. Test files are created in Phase 5. The compilation and ABI check are sufficient verification for this phase.

## Sources

### Primary (HIGH confidence)
- `node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol` (v5.5.0) -- Full source read. Confirmed `_mint()` implementation (lines 214-219), `_update()` chain (lines 176-204), Transfer event emission (line 203).
- `node_modules/@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol` (v5.4.0) -- Full source read. Confirmed `_update()` override checks `totalSupply() <= cap()` only when `from == address(0)` (lines 43-53). Confirmed `ERC20ExceededCap` custom error (line 17).
- `contracts/RoxasToken.sol` -- Current contract source. Confirmed existing inheritance (ERC20, ERC20Capped), `_update()` override, hardcoded constructor args.
- `artifacts/contracts/RoxasToken.sol/RoxasToken.json` -- Compiled ABI. Confirmed current functions (no mint), events (Transfer, Approval only), and errors (ERC20ExceededCap, etc.).
- `.planning/phases/04-minting-mechanics/04-CONTEXT.md` -- All locked decisions and discretion areas.

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` -- Stack decisions (Solidity 0.8.28, OZ v5.6.1, Hardhat 3).
- `.planning/research/PITFALLS.md` -- Pitfall #2 (decimals math), Pitfall #5 (missing per-tx limit), Pitfall #15 (custom error assertion syntax).
- `.planning/research/ARCHITECTURE.md` -- Minting pattern example, CEI pattern, anti-patterns.
- `.planning/phases/03-erc-20-transfers-and-approvals/03-RESEARCH.md` -- `_update()` chain behavior, ERC-6093 custom errors.

### Tertiary (LOW confidence)
None -- all findings verified from primary sources (actual installed source code and compiled artifacts).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies. All libraries already installed and verified from actual source code.
- Architecture: HIGH -- `_mint()` chain traced through all three contracts in the installed OZ source. Constructor mint behavior verified.
- Pitfalls: HIGH -- Based on direct reading of OZ v5 source code and Solidity 0.8.28 behavior.
- Custom errors/events: HIGH -- Exact names and parameters locked in CONTEXT.md. Solidity custom error syntax verified against 0.8.28.

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable -- OpenZeppelin v5 ERC20/ERC20Capped APIs are standardized)
