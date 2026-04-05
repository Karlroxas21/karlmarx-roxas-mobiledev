# Domain Pitfalls

**Domain:** ERC-20 Smart Contract (Hardhat 3 + OpenZeppelin v5 + Sepolia)
**Project:** RoxasToken (RXS) -- public mint, 10M hard cap, Sepolia testnet
**Researched:** 2026-04-05

---

## Critical Pitfalls

Mistakes that cause rewrites, security vulnerabilities, or broken deployments.

### Pitfall 1: Using Hardhat 2 Patterns in a Hardhat 3 Project

**What goes wrong:** Copying config, test, or deployment patterns from Hardhat 2 tutorials (which dominate search results and AI training data). Hardhat 3 is fundamentally different: ESM-first, declarative config with `defineConfig()`, explicit plugin registration, `configVariable()` replacing dotenv, and `hre.network.connect()` in tests.

**Why it happens:** Most tutorials, Stack Overflow answers, blog posts, and AI models were trained on Hardhat 2 (which was standard until late 2025). Hardhat 3 documentation ecosystem is still growing.

**Consequences:**
- `require()` in config fails (ESM does not support require)
- Side-effect plugin imports silently do nothing (plugins are not registered)
- Tests reference global `ethers` or `loadFixture` that do not exist in HH3
- Hours of debugging cryptic import errors

**Prevention:**
- ONLY reference hardhat.org docs (NOT v2.hardhat.org)
- Config uses `import { defineConfig, configVariable } from "hardhat/config"`, NOT `require`
- Plugins go in the `plugins: []` array, NOT as side-effect imports at top of file
- package.json must have `"type": "module"`
- Tests use `const { ethers, networkHelpers } = await hre.network.connect()`
- If any code sample has `require("dotenv").config()` or `module.exports`, it is Hardhat 2 -- do not use it

**Detection:** Any `require()` call, any `module.exports`, any side-effect plugin import, missing `"type": "module"`.

---

### Pitfall 2: Decimals Miscalculation in Supply Cap and Mint Limits

**What goes wrong:** Using raw numbers (e.g., `10_000_000`) instead of accounting for 18 decimals (`10_000_000 * 10**18`). The token appears to have a cap of `0.00000000001` tokens, or the initial mint overflows the cap because the math is inconsistent.

**Why it happens:** ERC-20 tokens store values in the smallest unit (like wei for ETH). `1 RXS` is actually `1 * 10^18` in storage. Developers think in human-readable numbers but the contract operates on raw integers.

**Consequences:**
- Cap of 10M raw = effectively zero usable tokens
- Or initial supply of `1_000_000 * 10**18` exceeds a cap set as raw `10_000_000`
- Contract deployed but functionally broken; requires redeployment

**Prevention:**
- Define constants consistently: `uint256 public constant MAX_SUPPLY = 10_000_000 * 10 ** 18;`
- Use `ethers.parseEther("10000000")` in tests and deploy modules
- Write explicit tests comparing `totalSupply()` against `ethers.parseEther()` values

**Detection:** First test checking `totalSupply()` shows an unexpected number.

---

### Pitfall 3: OpenZeppelin v5 Breaking Changes from v4 Tutorials

**What goes wrong:** Following v4.x patterns: `Ownable()` with no args, overriding `_beforeTokenTransfer`, using `SafeMath`, `Counters`, or revert strings.

**Why it happens:** OpenZeppelin v5 breaking changes:
1. `Ownable` requires explicit `initialOwner`: `Ownable(msg.sender)` (but RoxasToken should NOT use Ownable -- see Anti-Pattern 2 in ARCHITECTURE.md)
2. `_beforeTokenTransfer` and `_afterTokenTransfer` removed -- use `_update()` instead
3. `_transfer`, `_mint`, `_burn` are no longer virtual
4. Custom errors replaced revert strings
5. `SafeMath` and `Counters` removed (unnecessary in Solidity 0.8+)

**Consequences:**
- Compilation failures with confusing errors
- Hours wasted following outdated tutorials

**Prevention:**
- Pin to `@openzeppelin/contracts@^5.6.1` and only reference v5 docs at docs.openzeppelin.com/contracts/5.x/
- Test custom errors: `expect(...).to.be.revertedWithCustomError(contract, "ERC20ExceededCap")`
- Reject any code that mentions `_beforeTokenTransfer`, `SafeMath`, or `Counters`

**Detection:** Immediate compilation errors about missing constructors or non-virtual functions.

---

### Pitfall 4: Private Key Exposure

**What goes wrong:** Hardcoding or accidentally committing a deployer private key.

**Why it happens:** Quick setup, forgetting .gitignore, or misunderstanding `configVariable()`.

**Consequences:** On testnet: faucet ETH drained. On mainnet: total loss. Even on testnet, bad habit that carries over.

**Prevention:**
- Use `hardhat keystore set DEPLOYER_PRIVATE_KEY` (encrypted, stored outside repo)
- Create `.gitignore` BEFORE creating any .env file
- `configVariable()` resolves lazily -- raw values never appear in config
- Use a dedicated deployment wallet with no mainnet funds
- If using .env for local dev: include `.env` in `.gitignore`, commit only `.env.example` with placeholders

**Detection:** `git log --all --diff-filter=A -- '*.env'` shows if .env was ever committed.

---

### Pitfall 5: Public Mint Without Per-Transaction Limit

**What goes wrong:** The contract enforces the global cap (via ERC20Capped) but forgets the per-transaction limit. One caller drains the remaining supply in a single call.

**Why it happens:** `ERC20Capped` only enforces total supply cap. The per-tx limit is custom logic that must be explicitly coded. Developers assume "the cap handles it."

**Consequences:** One user/bot mints the entire remaining supply. Defeats "anyone can mint."

**Prevention:**
- Explicit check: `require(amount <= MAX_MINT_PER_TX, "Exceeds per-tx limit")`
- Define: `uint256 public constant MAX_MINT_PER_TX = 1000 * 10 ** 18;`
- Test: mint `MAX_MINT_PER_TX + 1` and expect revert
- Also test: mint exactly `MAX_MINT_PER_TX` succeeds

**Detection:** Test that mints above the limit and expects failure.

---

## Moderate Pitfalls

### Pitfall 6: ethers v6 BigInt vs BigNumber

**What goes wrong:** Tests use ethers v5 patterns (`ethers.BigNumber.from()`, `.add()`, `.eq()`). ethers v6 uses native JavaScript `BigInt`.

**Prevention:**
- Use `BigInt` literals: `1000n`, `10_000_000n * 10n ** 18n`
- Use `ethers.parseEther("1000")` and `ethers.parseUnits("1000", 18)`
- Use standard operators: `+`, `-`, `*`, `===`
- Set `tsconfig.json` target to `"ES2020"` or later for BigInt support

### Pitfall 7: Node.js Version Too Low for Hardhat 3

**What goes wrong:** Hardhat 3 requires Node.js v22.10.0+. Lower versions fail with cryptic import errors.

**Prevention:** `node --version` before starting. Current environment: v24.12.0 (fine). Set `"engines": { "node": ">=22.10.0" }` in package.json.

### Pitfall 8: Forgetting `"type": "module"` in package.json

**What goes wrong:** Without ESM mode, Hardhat 3's ESM imports fail. Node.js treats files as CommonJS.

**Prevention:** `npm pkg set type=module` immediately after `npm init`.

### Pitfall 9: Sepolia Faucet Limitations

**What goes wrong:** Running out of testnet ETH. Faucets have rate limits (0.1-0.5 ETH/day) and some require verification.

**Prevention:** Get faucet ETH early from multiple sources. Test locally first to minimize deployment attempts.

### Pitfall 10: Etherscan Verification Timing

**What goes wrong:** Verification immediately after deployment fails because Etherscan hasn't indexed the transaction yet.

**Prevention:** Use Hardhat Ignition's `--verify` flag, which waits for confirmations automatically. If verifying manually, wait 30-60 seconds.

### Pitfall 11: Solidity Pragma Floating vs Pinned

**What goes wrong:** Using `pragma solidity ^0.8.28;` (floating) for a deployed contract. Different compiler versions produce different bytecode.

**Prevention:** Pin the pragma: `pragma solidity 0.8.28;` (exact version). Match in hardhat.config.ts: `solidity: "0.8.28"`.

### Pitfall 12: Constructor Inheritance and `_update` Diamond

**What goes wrong:** When combining OZ extensions that override `_update()`, Solidity requires explicit override resolution. For this project, `ERC20Capped` extends `ERC20` and overrides `_update()`. If only inheriting `ERC20Capped`, no explicit override is needed. But if adding more extensions (e.g., Pausable), an explicit override becomes mandatory:

```solidity
function _update(address from, address to, uint256 value)
    internal
    override(ERC20Capped, ERC20Pausable)
{
    super._update(from, to, value);
}
```

**Prevention:** Keep it simple -- inherit only from `ERC20Capped`. Do not add extensions not in requirements.

---

## Minor Pitfalls

### Pitfall 13: TypeChain Types Not Generated or Stale

**What goes wrong:** Tests reference contract types that don't exist yet. Run `hardhat compile` before tests on first run.

### Pitfall 14: Ignition Module ID Conflicts

**What goes wrong:** Reusing the same Ignition module ID across different deployments causes state conflicts. Ignition tracks state by module ID.

**Prevention:** Use unique module IDs. Clear Ignition state for redeployment if needed.

### Pitfall 15: Custom Error Assertion Syntax

**What goes wrong:** OpenZeppelin v5 uses custom errors (e.g., `ERC20ExceededCap`), not revert strings. Using `.to.be.revertedWith("message")` fails; need `.to.be.revertedWithCustomError(contract, "ERC20ExceededCap")`.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Project setup** | Hardhat 2 patterns (Pitfall 1) | Only use hardhat.org docs; ESM config; explicit plugins |
| **Project setup** | Missing `"type": "module"` (Pitfall 8) | Set immediately after npm init |
| **Project setup** | Private key exposure (Pitfall 4) | .gitignore before .env; use keystore |
| **Contract implementation** | Decimals math wrong (Pitfall 2) | Use `10 ** 18` multipliers consistently |
| **Contract implementation** | OZ v5 API changes (Pitfall 3) | Only v5 docs; no _beforeTokenTransfer |
| **Contract implementation** | Missing per-tx limit (Pitfall 5) | Explicit require in mint function |
| **Contract implementation** | Floating pragma (Pitfall 11) | Pin to exact version |
| **Contract implementation** | Diamond inheritance (Pitfall 12) | Only inherit ERC20Capped; keep it simple |
| **Test development** | ethers v6 BigInt (Pitfall 6) | Native BigInt; parseEther; ES2020 target |
| **Test development** | Custom error syntax (Pitfall 15) | revertedWithCustomError, not revertedWith |
| **Test development** | Stale TypeChain types (Pitfall 13) | Compile before testing |
| **Deployment** | Faucet ETH shortage (Pitfall 9) | Get ETH early from multiple faucets |
| **Deployment** | Verification timing (Pitfall 10) | Use --verify flag with Ignition |

---

## Sources

**Hardhat 3 Migration:**
- [Hardhat 3 Migrate from Hardhat 2](https://hardhat.org/docs/migrate-from-hardhat2) -- HIGH confidence
- [Hardhat 3 Configuration Variables](https://hardhat.org/docs/guides/configuration-variables) -- HIGH confidence
- [Hardhat 3 Node.js Support](https://hardhat.org/docs/reference/nodejs-support) -- HIGH confidence

**OpenZeppelin v5:**
- [OpenZeppelin Contracts v5 Changelog](https://docs.openzeppelin.com/contracts/5.x/changelog) -- HIGH confidence
- [OpenZeppelin ERC20Capped Source](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/ERC20Capped.sol) -- HIGH confidence

**Solidity:**
- [Solidity 0.8.34 Release (IR pipeline bug fix)](https://www.soliditylang.org/blog/2026/02/18/solidity-0.8.34-release-announcement/) -- HIGH confidence

**Security:**
- [SWC-114: ERC-20 Approve Race Condition](http://swcregistry.io/docs/SWC-114/) -- HIGH confidence
- [RareSkills: 20 Common Solidity Beginner Mistakes](https://rareskills.io/post/solidity-beginner-mistakes) -- MEDIUM confidence

**Etherscan:**
- [Etherscan V2 API -- Verify with Hardhat](https://docs.etherscan.io/contract-verification/verify-with-hardhat) -- HIGH confidence
- [Hardhat Etherscan V2 Migration Issue #7623](https://github.com/NomicFoundation/hardhat/issues/7623) -- HIGH confidence

**ethers.js:**
- [ethers.js v6 Migration Guide](https://docs.ethers.org/v6/migrating/) -- HIGH confidence
