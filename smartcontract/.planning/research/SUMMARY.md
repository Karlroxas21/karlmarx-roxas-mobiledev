# Project Research Summary

**Project:** RoxasToken (RXS) ERC-20 Smart Contract
**Domain:** Ethereum smart contract development (ERC-20 token)
**Researched:** 2026-04-05
**Confidence:** HIGH

## Executive Summary

RoxasToken is a straightforward ERC-20 token with a public mint function, a 10M hard supply cap, and a per-transaction mint limit of ~1000 RXS. This is a well-understood domain with battle-tested tooling. The recommended stack is Hardhat 3 (v3.1.12) with OpenZeppelin Contracts v5 (v5.6.1), Solidity 0.8.28, and ethers.js v6. Every technology choice has HIGH confidence -- this is a solved problem with industry-standard tools. The contract itself is simple: a single Solidity file inheriting from ERC20Capped, with no access control, no upgradeability, and no DeFi extensions.

The recommended approach is to build linearly following the dependency chain: toolchain setup first, then contract implementation, then tests, then deployment. Hardhat 3 is a major break from Hardhat 2 (ESM-first, declarative config, explicit plugin registration), and most online tutorials and AI-generated code targets Hardhat 2. This version mismatch is the single largest risk -- every phase must guard against Hardhat 2 patterns leaking in. The second risk is decimals math: ERC-20 operates on 18-decimal raw integers, and inconsistent use of `10**18` multipliers will produce a contract that compiles but is functionally broken. Both risks are fully mitigable through awareness and testing.

The project scope is already tight. There are no features to defer -- PROJECT.md requirements map directly to ERC-20 table stakes plus one custom behavior (public mint with per-tx limit). The only optional additions are a custom `TokensMinted` event and a per-address cooldown, both of which are one-liners. The entire project can be structured as 4 sequential phases with no ambiguity about ordering. Research confidence is HIGH across all areas because the domain relies entirely on official, well-maintained documentation (Hardhat, OpenZeppelin, Solidity, EIP-20).

## Key Findings

### Recommended Stack

Hardhat 3 is the correct framework for this greenfield project. It is production-ready (v3.1.12), ESM-first, and includes built-in secret management via `configVariable()`, Rust-powered compilation, and Hardhat Ignition for declarative deployment. The `hardhat-toolbox-mocha-ethers` meta-plugin bundles all 10 needed plugins (ethers integration, Mocha test runner, Chai matchers, TypeChain, Ignition, verification). OpenZeppelin Contracts v5 provides ERC20Capped out of the box.

**Core technologies:**
- **Hardhat ^3.1.12**: Development framework -- ESM-first, built-in coverage, Ignition deployment, production-ready
- **Solidity 0.8.28**: Contract language -- battle-tested, predates the IR pipeline bug (0.8.29-0.8.33), satisfies OZ v5's ^0.8.20 requirement
- **OpenZeppelin Contracts ^5.6.1**: Audited ERC20 + ERC20Capped base -- industry standard, no reason to hand-roll
- **ethers.js ^6.16.0**: Ethereum library -- Hardhat ecosystem standard, consistent with existing monorepo
- **TypeScript ^5.7.0**: Type safety -- Hardhat 3 is TypeScript-first with auto-generated contract types
- **hardhat-toolbox-mocha-ethers**: Meta-plugin -- installs all 10 essential Hardhat plugins in one package

**Rejected alternatives:** Foundry (wrong toolchain for this monorepo), Hardhat 2 (legacy), viem (inconsistent with existing ethers.js usage), dotenv (replaced by configVariable), OpenZeppelin Upgradeable (out of scope, plugin still alpha).

### Expected Features

**Must have (table stakes):**
- ERC-20 standard interface (6 functions + 2 events) -- non-negotiable for wallet/dApp compatibility
- Token metadata (name: "Roxas Token", symbol: "RXS", decimals: 18)
- Hard supply cap of 10M RXS via ERC20Capped -- immutable, enforced on every mint
- Initial supply mint of 1M RXS to deployer in constructor
- Public mint function with per-transaction limit (~1000 RXS)
- Comprehensive test suite covering happy paths AND reverts
- Sepolia deployment with Etherscan source verification

**Should have (low-effort differentiators):**
- Custom `TokensMinted(address indexed minter, uint256 amount)` event -- one line, helps frontend distinguish mints from transfers
- Per-address cooldown (`lastMintBlock` mapping) -- prevents single-address supply drain

**Defer / anti-features (explicitly do NOT build):**
- Upgradeability, governance, flash loans, staking, burn, pause, fee-on-transfer, rebasing, Ownable/access control on mint, mainnet deployment

### Architecture Approach

The project is a standalone Hardhat 3 workspace (`smartcontract/`) inside the existing monorepo, with its own ESM package.json independent of the backend's CommonJS setup. Architecture is minimal and linear: a single Solidity contract using OpenZeppelin v5 composition-via-inheritance (ERC20Capped overrides `_update()` hook), a single test file, a single Ignition deployment module, and a declarative Hardhat config. No custom scripts, no complex multi-contract interactions.

**Major components:**
1. **RoxasToken.sol** -- On-chain ERC-20 logic: mint, transfer, cap enforcement. Single contract inheriting ERC20Capped.
2. **hardhat.config.ts** -- Declarative ESM config: Solidity version, plugins array, Sepolia network, verification settings, configVariable for secrets.
3. **Ignition module** (ignition/modules/RoxasToken.ts) -- Declarative deployment definition with constructor args. Deploy + verify in one command.
4. **Test suite** (test/RoxasToken.test.ts) -- Mocha + Chai matchers + ethers v6 against Hardhat Network (EDR). Uses `loadFixture` for state isolation.
5. **TypeChain types** -- Auto-generated TypeScript bindings. Compilation must run before tests.

### Critical Pitfalls

1. **Hardhat 2 patterns in Hardhat 3 code** -- Most tutorials target HH2. Symptoms: `require()` in config, side-effect plugin imports, global `ethers`. Prevention: only use hardhat.org docs (not v2.hardhat.org); verify ESM config with `defineConfig`, `configVariable`, explicit `plugins` array.
2. **Decimals miscalculation** -- Raw `10_000_000` vs `10_000_000 * 10**18`. A cap set without decimals makes the token functionally broken. Prevention: use `10 ** 18` multipliers in Solidity, `ethers.parseEther()` in TypeScript, and test `totalSupply()` against expected values.
3. **OpenZeppelin v5 breaking changes** -- v4 patterns (`_beforeTokenTransfer`, `Ownable()` no-arg, `SafeMath`) cause compilation failures. Prevention: pin to ^5.6.1, only reference v5 docs, test custom errors with `revertedWithCustomError`.
4. **Private key exposure** -- Secrets hardcoded or committed to git. Prevention: use `hardhat keystore set`, create `.gitignore` before `.env`, use `configVariable()` for lazy resolution.
5. **Missing per-transaction mint limit** -- ERC20Capped only enforces total cap, not per-call limits. Prevention: explicit `require(amount <= MAX_MINT_PER_TX)` in mint function, with boundary tests.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Project Setup and Toolchain

**Rationale:** Everything depends on the Hardhat 3 toolchain being correctly configured. This is also where the highest-risk pitfall lives (Hardhat 2 patterns). Getting config right first prevents cascading issues.
**Delivers:** Working Hardhat 3 project that compiles an empty contract. package.json, hardhat.config.ts, tsconfig.json, .gitignore, directory structure.
**Addresses:** Infrastructure foundation (no features yet)
**Avoids:** Pitfall 1 (HH2 patterns), Pitfall 4 (key exposure), Pitfall 7 (Node version), Pitfall 8 (missing "type": "module")

### Phase 2: Smart Contract Implementation

**Rationale:** Contract must exist before tests or deployment. Follows naturally from toolchain setup. This is the core deliverable.
**Delivers:** Complete RoxasToken.sol that compiles cleanly. ERC20Capped inheritance, constructor with initial mint, public mint with per-tx limit, optional custom event and cooldown.
**Addresses:** ERC-20 interface, token metadata, hard supply cap, initial supply mint, public minting with per-tx limit, standard event emission
**Avoids:** Pitfall 2 (decimals), Pitfall 3 (OZ v5 breaking changes), Pitfall 5 (missing per-tx limit), Pitfall 11 (floating pragma), Pitfall 12 (diamond inheritance)

### Phase 3: Test Suite

**Rationale:** Tests must validate the contract before any deployment to Sepolia. Tests catch decimals bugs, missing limits, and revert behavior. This is where most pitfalls surface.
**Delivers:** Comprehensive test file covering: deployment state verification, mint happy path, mint boundary (exactly at per-tx limit), mint over per-tx limit (revert), mint at cap boundary, mint over cap (revert with custom error), transfer, approve/transferFrom, zero-address edge cases.
**Addresses:** Comprehensive test suite (table stakes), revert testing, custom error assertions
**Avoids:** Pitfall 6 (ethers v6 BigInt), Pitfall 13 (stale TypeChain types), Pitfall 15 (custom error assertion syntax)

### Phase 4: Deployment and Verification

**Rationale:** Deployment is the final step after tests pass. Requires testnet ETH (get faucet ETH early). Ignition handles deploy + verify atomically.
**Delivers:** RoxasToken deployed on Sepolia with verified source on Etherscan. Ignition deployment module, deployment artifacts.
**Addresses:** Sepolia testnet deployment, Etherscan verification
**Avoids:** Pitfall 9 (faucet limitations), Pitfall 10 (verification timing), Pitfall 14 (Ignition module ID conflicts)

### Phase Ordering Rationale

- Linear dependency chain: config -> contract -> tests -> deploy. No phase can start without the previous one completing.
- Toolchain first because Hardhat 2/3 mismatch is the highest-risk issue and must be resolved before any code is written.
- Tests before deployment because decimals bugs and missing limits are invisible without tests but catastrophic on-chain.
- Deployment last because it is irreversible (testnet, but still) and requires external resources (faucet ETH, RPC provider, Etherscan API key).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Setup):** Hardhat 3 config patterns are well-documented but differ significantly from what most developers expect. ARCHITECTURE.md includes exact config code. Recommend `/gsd:research-phase` to validate ESM setup if the implementer is new to Hardhat 3.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Contract):** OpenZeppelin ERC20Capped is extremely well-documented. ARCHITECTURE.md includes the exact contract code. Standard pattern.
- **Phase 3 (Tests):** Testing patterns are documented in ARCHITECTURE.md. Hardhat 3 test API differs from HH2 but the research captures the exact pattern. Standard.
- **Phase 4 (Deploy):** Single Ignition command. STACK.md and ARCHITECTURE.md include the exact module and command. Standard.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified against official docs and npm. Hardhat 3.1.12, OZ 5.6.1, Solidity 0.8.28 all confirmed current and stable. |
| Features | HIGH | ERC-20 is the most well-specified token standard. PROJECT.md requirements map cleanly to OpenZeppelin primitives. No ambiguity. |
| Architecture | HIGH | Single-contract architecture with standard Hardhat project layout. No novel patterns. Exact code examples provided. |
| Pitfalls | HIGH | All pitfalls sourced from official migration guides, changelogs, and established community knowledge. HH2/HH3 gap is real and well-documented. |

**Overall confidence:** HIGH

### Gaps to Address

- **Solidity version preference:** Research recommends 0.8.28 but PROJECT.md specifies 0.8.24. Either works. Decide during Phase 2 implementation. Low stakes -- the contract uses no features beyond 0.8.20.
- **Per-address cooldown:** Listed as optional differentiator. Decide during Phase 2 whether to include. One mapping + one require. Low stakes.
- **Custom TokensMinted event:** Listed as optional. Decide during Phase 2. One line of code. Low stakes.
- **RPC provider choice:** Alchemy vs Infura not decided. Either works for Sepolia. Decide during Phase 1 setup based on which the team already has an account for.
- **Faucet ETH sourcing:** Not researched in depth. Multiple Sepolia faucets exist with varying rate limits. Address early in Phase 4 or even Phase 1.
- **hardhat-toolbox-mocha-ethers version pinning:** Exact latest version was not confirmed via npm. Install without pinning and verify what resolves.
- **Hardhat 3 test pattern (`hre.network.connect()`):** This is new API. Verify by running the Hardhat 3 tutorial test during Phase 1 setup.

## Sources

### Primary (HIGH confidence)
- [Hardhat 3 Official Docs](https://hardhat.org/docs/getting-started) -- config, testing, deployment, migration
- [Hardhat 3 Configuration Reference](https://hardhat.org/docs/reference/configuration) -- defineConfig, configVariable, plugins
- [Hardhat 3 Migration Guide](https://hardhat.org/docs/migrate-from-hardhat2) -- HH2 vs HH3 differences
- [Hardhat 3 Testing with Ethers and Mocha](https://hardhat.org/docs/guides/testing/using-ethers) -- test patterns
- [Hardhat 3 Configuration Variables](https://hardhat.org/docs/guides/configuration-variables) -- secret management
- [Hardhat 3 Contract Verification](https://hardhat.org/docs/tutorial/verifying) -- Etherscan integration
- [Hardhat 3 Node.js Support](https://hardhat.org/docs/reference/nodejs-support) -- version requirements
- [Hardhat Ignition](https://hardhat.org/ignition) -- deployment modules, --verify flag
- [hardhat-toolbox-mocha-ethers](https://hardhat.org/docs/plugins/hardhat-toolbox-mocha-ethers) -- plugin bundle
- [OpenZeppelin Contracts v5 ERC20 API](https://docs.openzeppelin.com/contracts/5.x/api/token/erc20) -- ERC20, ERC20Capped
- [OpenZeppelin v5 ERC20 Supply Patterns](https://docs.openzeppelin.com/contracts/5.x/erc20-supply) -- mint patterns
- [OpenZeppelin v5 Changelog](https://docs.openzeppelin.com/contracts/5.x/changelog) -- breaking changes from v4
- [OpenZeppelin ERC20Capped Source](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/ERC20Capped.sol) -- implementation reference
- [EIP-20: Token Standard](https://eips.ethereum.org/EIPS/eip-20) -- specification
- [Solidity 0.8.28 Release](https://www.soliditylang.org/blog/2024/10/09/solidity-0.8.28-release-announcement/) -- version rationale
- [Solidity 0.8.34 Release](https://www.soliditylang.org/blog/2026/02/18/solidity-0.8.34-release-announcement/) -- confirms IR bug in 0.8.29-0.8.33
- [Etherscan V2 API Verification](https://docs.etherscan.io/contract-verification/verify-with-hardhat) -- verification with Hardhat
- [ethers.js v6 Migration Guide](https://docs.ethers.org/v6/migrating/) -- BigInt changes

### Secondary (MEDIUM confidence)
- [RareSkills: Solidity Beginner Mistakes](https://rareskills.io/post/solidity-beginner-mistakes) -- pitfall identification
- [SWC-114: ERC-20 Approve Race Condition](http://swcregistry.io/docs/SWC-114/) -- known ERC-20 edge case

---
*Research completed: 2026-04-05*
*Ready for roadmap: yes*
