# Technology Stack

**Project:** RoxasToken (RXS) ERC-20 Smart Contract
**Researched:** 2026-04-05

## Decision: Hardhat 3 (Not Hardhat 2)

Hardhat 3 is the current production-ready release (v3.1.12 as of March 2026). For a greenfield project with Node.js v22+, there is no reason to start on Hardhat 2. Key advantages: ESM-first, built-in code coverage, Hardhat Ignition for deployment, configuration variables (replaces dotenv for secrets), and Rust-powered compilation speed.

The existing monorepo backend uses CommonJS, but this is a non-issue -- the `smartcontract/` directory has its own `package.json` with `"type": "module"`.

**Confidence: HIGH** -- Hardhat 3 is production-ready per official docs and GitHub releases. The team explicitly recommends it for new projects.

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Hardhat | ^3.1.12 | Development framework | Production-ready, ESM-first, built-in coverage, Ignition deployment. The standard for TypeScript-based Ethereum development. | HIGH |
| Solidity | 0.8.28 | Smart contract language | Stable, well-audited target version. OpenZeppelin 5.x requires ^0.8.20. Avoids 0.8.29-0.8.33 IR pipeline bug (patched in 0.8.34, but 0.8.28 predates the bug entirely). | HIGH |
| OpenZeppelin Contracts | ^5.6.1 | Base ERC-20 implementation | Industry-standard audited contracts. v5.x provides ERC20, ERC20Capped, and Ownable. No reason to use anything else for ERC-20. | HIGH |
| ethers.js | ^6.16.0 | Ethereum library | The Hardhat ecosystem's primary JS/TS Ethereum library. v6 is current, bundled via hardhat-ethers plugin. | HIGH |
| TypeScript | ^5.7.0 | Type safety | Hardhat 3 is TypeScript-first. Provides typed artifacts and contracts out of the box via hardhat-typechain. | HIGH |

### Hardhat Plugins (via Toolbox)

| Plugin | Purpose | Why | Confidence |
|--------|---------|-----|------------|
| @nomicfoundation/hardhat-toolbox-mocha-ethers | Meta-plugin bundle | Installs all 10 essential plugins in one package. Use this instead of hardhat-toolbox (which defaults to viem) because the existing monorepo already uses ethers.js. | HIGH |
| @nomicfoundation/hardhat-ethers | ethers.js integration | Adds ethers object to network connections with helper methods (getSigners, getContractFactory, etc.) | HIGH |
| @nomicfoundation/hardhat-mocha | Mocha test runner | Standard test runner. While Hardhat 3 recommends Node.js test runner, Mocha has far more community examples and tutorials for smart contract testing. Pragmatic choice. | MEDIUM |
| @nomicfoundation/hardhat-ethers-chai-matchers | Custom assertions | Provides `.to.emit()`, `.to.be.revertedWith()`, `.to.changeTokenBalance()` -- essential for contract testing. | HIGH |
| @nomicfoundation/hardhat-network-helpers | Test utilities | `loadFixture()` for blockchain state snapshots, `time.increase()` for time manipulation. Standard practice. | HIGH |
| @nomicfoundation/hardhat-typechain | Typed artifacts | Auto-generates TypeScript types for contracts. Type-safe contract interactions in tests and scripts. | HIGH |
| @nomicfoundation/hardhat-verify | Etherscan verification | Verifies source code on Etherscan/Sepolia. Uses Etherscan V2 API (single key for all chains). Integrated with Ignition via `--verify` flag. | HIGH |
| @nomicfoundation/hardhat-ignition | Deployment system | Declarative deployment modules. Replaces raw deploy scripts. Tracks deployment state, supports resumable deployments, integrates verification. | HIGH |
| @nomicfoundation/hardhat-ignition-ethers | Ignition + ethers bridge | Returns deployed contracts as ethers.js Contract instances. | HIGH |
| @nomicfoundation/hardhat-keystore | Secret management | Encrypted keystore for private keys and API keys. Replaces dotenv for secrets. Built into Hardhat 3. | HIGH |

### Infrastructure

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Sepolia testnet | -- | Deployment target | Current Ethereum Foundation testnet. Rinkeby and Goerli are deprecated. | HIGH |
| Alchemy or Infura | -- | RPC provider | Need a Sepolia RPC endpoint. Alchemy has a generous free tier. Either works. | HIGH |
| Etherscan API | V2 | Contract verification & explorer | Standard block explorer. V2 API uses single key across chains. Project backend already uses Etherscan API. | HIGH |

### NOT Using (and Why Not)

| Technology | Why Not |
|------------|---------|
| **Hardhat 2** | Legacy. Hardhat 3 is production-ready and recommended for new projects. No point starting on a deprecated version. |
| **Foundry / Forge** | The monorepo is npm/TypeScript throughout. Foundry uses Rust toolchain and Solidity-only tests. Hardhat fits the existing developer workflow. |
| **viem** (hardhat-toolbox-viem) | Hardhat 3 defaults to viem, but the existing monorepo uses ethers.js. Consistency across the project matters more than viem's marginal advantages. Use hardhat-toolbox-mocha-ethers instead. |
| **dotenv** | Hardhat 3 has built-in `configVariable()` that reads env vars, plus `hardhat-keystore` for encrypted secrets. dotenv adds unnecessary dependency. |
| **hardhat-deploy** (wighawag) | Incompatible with Hardhat 3. Hardhat Ignition is the official replacement and ships with the toolbox. |
| **Solidity 0.8.24** | PROJECT.md specifies 0.8.24, but 0.8.28 is recommended instead. 0.8.24 works but 0.8.28 adds transient storage support (useful future-proofing) without hitting the IR pipeline bug in 0.8.29-0.8.33. Both are fine for this ERC-20; 0.8.28 is simply more current. |
| **Solidity 0.8.34** (latest) | While this patches the IR bug, it is very new (Feb 2026). 0.8.28 is battle-tested and predates the bug entirely. Conservative choice for a learning project. |
| **OpenZeppelin Upgradeable Contracts** | Not needed. The token is not upgradeable (out of scope per PROJECT.md). Also, the OZ upgrades plugin for Hardhat 3 is still alpha. |
| **Truffle** | Discontinued by Consensys in 2023. Dead project. |

## Solidity Version Rationale

The PROJECT.md specifies Solidity 0.8.24. This works, but I recommend **0.8.28** because:

1. It is the last version before the IR pipeline bug introduced in 0.8.29
2. It adds transient storage support (EIP-1153), useful for future extensions
3. OpenZeppelin 5.x requires ^0.8.20, so both 0.8.24 and 0.8.28 satisfy this
4. 0.8.28 has been in production since October 2024 -- well battle-tested

If the team prefers to match PROJECT.md exactly, 0.8.24 is perfectly fine. The ERC-20 contract uses no features beyond 0.8.20.

## Hardhat 3 Configuration Pattern

Hardhat 3 uses a declarative ESM config. Key differences from Hardhat 2:

```typescript
// hardhat.config.ts (Hardhat 3 - ESM)
import { defineConfig, configVariable } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

export default defineConfig({
  solidity: "0.8.28",
  plugins: [hardhatToolboxMochaEthers],
  networks: {
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
  },
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
});
```

Key changes from Hardhat 2:
- `defineConfig` + `configVariable` replace `require("dotenv")` and `module.exports`
- Plugins are explicitly listed in `plugins` array (no side-effect imports)
- Networks use `type: "http"` and `chainType: "l1"` 
- `configVariable()` reads from env vars OR encrypted keystore
- File must be ESM (`"type": "module"` in package.json)

## Deployment Pattern (Hardhat Ignition)

```typescript
// ignition/modules/RoxasToken.ts
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("RoxasToken", (m) => {
  const initialSupply = m.getParameter("initialSupply");
  const token = m.contract("RoxasToken", [initialSupply]);
  return { token };
});
```

Deploy + verify in one command:
```bash
hardhat ignition deploy ignition/modules/RoxasToken.ts --network sepolia --verify
```

## Installation

```bash
# Initialize (from smartcontract/ directory)
npm init -y
# Set ESM mode
npm pkg set type=module

# Core
npm install --save-dev hardhat@^3 @nomicfoundation/hardhat-toolbox-mocha-ethers

# Smart contract dependencies (not dev -- imported by Solidity)
npm install @openzeppelin/contracts@^5.6.1

# Type definitions (dev)
npm install --save-dev @types/mocha @types/chai
```

Note: `hardhat-toolbox-mocha-ethers` auto-installs its 10 peer dependencies (hardhat-ethers, hardhat-mocha, hardhat-verify, hardhat-ignition, hardhat-typechain, etc.) so you do not need to install them individually.

## Project Structure

```
smartcontract/
  contracts/
    RoxasToken.sol          # ERC-20 contract
  test/
    RoxasToken.test.ts      # Mocha + ethers + chai matchers
  ignition/
    modules/
      RoxasToken.ts         # Deployment module
  hardhat.config.ts         # Hardhat 3 config (ESM)
  package.json              # "type": "module"
  tsconfig.json
  .env                      # Local env vars (gitignored)
```

## Sources

- [Hardhat 3 Official Docs -- Getting Started](https://hardhat.org/docs/getting-started) -- HIGH confidence
- [Hardhat 3 -- What's New](https://hardhat.org/docs/hardhat3/whats-new) -- HIGH confidence
- [Hardhat 3 -- Migrate from Hardhat 2](https://hardhat.org/docs/migrate-from-hardhat2) -- HIGH confidence
- [Hardhat 3 -- Configuration Reference](https://hardhat.org/docs/reference/configuration) -- HIGH confidence
- [Hardhat 3 -- Testing with Ethers and Mocha](https://hardhat.org/docs/guides/testing/using-ethers) -- HIGH confidence
- [Hardhat 3 -- Configuration Variables](https://hardhat.org/docs/guides/configuration-variables) -- HIGH confidence
- [Hardhat 3 -- Contract Verification](https://hardhat.org/docs/tutorial/verifying) -- HIGH confidence
- [Hardhat 3 -- Ignition Getting Started](https://hardhat.org/ignition) -- HIGH confidence
- [hardhat-toolbox-mocha-ethers plugin docs](https://hardhat.org/docs/plugins/hardhat-toolbox-mocha-ethers) -- HIGH confidence
- [OpenZeppelin Contracts 5.x -- ERC20 API](https://docs.openzeppelin.com/contracts/5.x/api/token/erc20) -- HIGH confidence
- [OpenZeppelin Contracts 5.x -- ERC20 Supply](https://docs.openzeppelin.com/contracts/5.x/erc20-supply) -- HIGH confidence
- [OpenZeppelin Contracts npm](https://www.npmjs.com/package/@openzeppelin/contracts) -- v5.6.1 confirmed
- [Solidity 0.8.28 Release](https://www.soliditylang.org/blog/2024/10/09/solidity-0.8.28-release-announcement/) -- HIGH confidence
- [Solidity 0.8.34 Release](https://www.soliditylang.org/blog/2026/02/18/solidity-0.8.34-release-announcement/) -- HIGH confidence (confirms IR bug in 0.8.29-0.8.33)
- [ethers.js v6 npm](https://www.npmjs.com/package/ethers) -- v6.16.0 confirmed
- [Hardhat npm](https://www.npmjs.com/package/hardhat) -- v3.1.12 confirmed
- [Etherscan V2 API -- Verify with Hardhat](https://docs.etherscan.io/contract-verification/verify-with-hardhat) -- HIGH confidence
