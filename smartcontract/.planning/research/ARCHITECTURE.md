# Architecture Patterns

**Domain:** ERC-20 Smart Contract (Hardhat 3 + OpenZeppelin v5)
**Researched:** 2026-04-05

## Recommended Architecture

The RoxasToken project lives as a standalone Hardhat 3 workspace (`smartcontract/`) inside the existing monorepo, sibling to `frontend/` and `backend/`. It uses ESM (`"type": "module"`), Hardhat 3's declarative config, and OpenZeppelin v5's composition-via-inheritance model for the Solidity contract.

```
monorepo root/
  frontend/          (Expo/React Native -- existing)
  backend/           (Express.js -- existing)
  smartcontract/     (Hardhat 3 workspace -- new)
    contracts/
      RoxasToken.sol
    test/
      RoxasToken.test.ts
    ignition/
      modules/
        RoxasToken.ts
    hardhat.config.ts
    package.json          ("type": "module")
    tsconfig.json
```

**Why this layout:**
- Hardhat 3 expects `contracts/`, `test/`, and `ignition/modules/` by convention. Do not fight it.
- No `scripts/deploy.ts` needed -- Hardhat Ignition replaces raw deploy scripts with declarative modules that handle ordering, error recovery, and idempotent re-runs.
- No `.env` file needed for secrets -- Hardhat 3's `configVariable()` reads from env vars or the encrypted keystore (`hardhat keystore set`). Keep `.env` only for local development convenience if desired; it is not loaded by Hardhat automatically.
- No `dotenv` dependency -- Hardhat 3's configuration variables system replaces it entirely.
- The `smartcontract/` directory has its own `package.json` with `"type": "module"` (ESM), independent of the backend's CommonJS setup.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **RoxasToken.sol** | On-chain ERC-20 logic: mint, transfer, cap enforcement | Ethereum network (Sepolia), called by Ignition deploy and tests |
| **hardhat.config.ts** | Declarative config: solidity version, plugins array, network definitions, verify settings | All Hardhat tasks (compile, test, deploy, verify) |
| **Ignition Module** | Declarative deployment definition: what to deploy, constructor args | Hardhat Ignition engine, RoxasToken.sol |
| **Test Suite** | Unit tests against local Hardhat network (EDR) | RoxasToken.sol (via TypeChain-generated types), Hardhat Network |
| **TypeChain Types** | Auto-generated TypeScript bindings for contract ABI | Test suite, deploy modules (provides type safety) |
| **Configuration Variables** | Secrets: RPC URL, deployer private key, Etherscan API key | hardhat.config.ts (via `configVariable()` + keystore or env vars) |

### Data Flow

```
Developer
    |
    v
[hardhat compile] --> Solidity Compiler (0.8.28)
    |                       |
    |                       v
    |               artifacts/ (ABI + bytecode)
    |                       |
    |                       v
    |               typechain-types/ (TypeScript bindings -- auto-generated)
    |
    v
[hardhat test] --> Hardhat Network (EDR -- in-memory Rust-based EVM)
    |                       |
    |                       v
    |               Test Suite (Mocha + Chai matchers + ethers v6)
    |                       |
    |                       v
    |               RoxasToken contract (deployed per-fixture to local network)
    |
    v
[hardhat ignition deploy --network sepolia --verify]
    |                                           |
    |                                           v
    |                                   Sepolia RPC (Alchemy/Infura)
    |                                           |
    |                                           v
    |                                   RoxasToken deployed on-chain
    |                                           |
    |                                           v
    |                                   Etherscan V2 API (source code verification)
```

**Key observations:**
1. Compilation produces `artifacts/` and `typechain-types/` -- everything downstream depends on this.
2. Tests run against EDR (Ethereum Development Runtime), Hardhat 3's Rust-based in-memory EVM. Each test resets via `loadFixture`.
3. Deployment + verification happen in a single command with `--verify` flag. No separate verify step needed.
4. No manual `.env` loading. `configVariable("SEPOLIA_RPC_URL")` resolves from env vars or encrypted keystore at runtime.

## Patterns to Follow

### Pattern 1: OpenZeppelin v5 Composition via `_update()` Hook

**What:** OpenZeppelin v5 replaced v4's `_beforeTokenTransfer`/`_afterTokenTransfer` with a single `_update(from, to, value)` function. All balance-modifying operations route through `_update()`. Extensions override it, call `super._update()`, forming a chain.

**When:** Any time custom logic is needed on transfers or minting. For this project, `ERC20Capped` overrides `_update()` to enforce `totalSupply() <= cap()` on every mint.

**Example:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

contract RoxasToken is ERC20Capped {
    uint256 public constant MAX_MINT_PER_TX = 1000 * 10 ** 18;

    constructor(uint256 cap_)
        ERC20("Roxas Token", "RXS")
        ERC20Capped(cap_)
    {
        _mint(msg.sender, 1_000_000 * 10 ** 18);
    }

    function mint(address to, uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(amount <= MAX_MINT_PER_TX, "Exceeds per-tx mint limit");
        _mint(to, amount);
    }
}
```

**Confidence:** HIGH -- OpenZeppelin v5 official docs and GitHub source.

### Pattern 2: Hardhat 3 Declarative Config with configVariable

**What:** Hardhat 3 uses `defineConfig()` for type-safe config and `configVariable()` for lazy-loaded secrets. No dotenv import, no side-effect plugin loading.

**When:** Always. This is how Hardhat 3 works.

**Example:**
```typescript
// hardhat.config.ts (ESM)
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

**Confidence:** HIGH -- Hardhat 3 official docs.

### Pattern 3: Test Fixtures with `loadFixture`

**What:** `loadFixture` from `@nomicfoundation/hardhat-network-helpers` executes a setup function once, snapshots the EVM state, and reverts to that snapshot before each test. Faster and more isolated than `beforeEach` re-deployment.

**When:** Every test file. Always.

**Example (Hardhat 3 with Mocha + ethers):**
```typescript
import hre from "hardhat";
import { expect } from "chai";

describe("RoxasToken", function () {
  async function deployFixture() {
    const { ethers, networkHelpers } = await hre.network.connect();
    const [deployer, user1, user2] = await ethers.getSigners();
    const cap = ethers.parseEther("10000000"); // 10M
    const Token = await ethers.getContractFactory("RoxasToken");
    const token = await Token.deploy(cap);
    return { token, deployer, user1, user2, cap, ethers, networkHelpers };
  }

  it("should have correct name and symbol", async function () {
    const { networkHelpers } = await deployFixture();
    const { token } = await networkHelpers.loadFixture(deployFixture);
    expect(await token.name()).to.equal("Roxas Token");
    expect(await token.symbol()).to.equal("RXS");
  });
});
```

**Note:** Hardhat 3 test pattern differs from Hardhat 2. The `hre.network.connect()` call is new -- it returns `ethers` and `networkHelpers` from the connection object, not from global imports.

**Confidence:** HIGH -- Hardhat 3 testing docs.

### Pattern 4: Hardhat Ignition for Deployment

**What:** Declarative deployment modules that describe *what* to deploy. Ignition handles transaction ordering, error recovery, and idempotent re-runs. Deploy + verify in one command.

**When:** All deployments. No raw deploy scripts needed.

**Example:**
```typescript
// ignition/modules/RoxasToken.ts
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "ethers";

const CAP = parseEther("10000000"); // 10M RXS

export default buildModule("RoxasToken", (m) => {
  const token = m.contract("RoxasToken", [CAP]);
  return { token };
});
```

**Deploy command:**
```bash
hardhat ignition deploy ignition/modules/RoxasToken.ts --network sepolia --verify
```

**Confidence:** HIGH -- Hardhat Ignition official docs.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Minting Without Per-Transaction Limits

**What:** Exposing a public `mint()` with no per-call cap on amount.
**Why bad:** A single caller drains the remaining supply in one transaction.
**Instead:** `require(amount <= MAX_MINT_PER_TX)` in the mint function. The cap prevents over-minting, but the per-tx limit prevents supply drain.

### Anti-Pattern 2: Using `onlyOwner` for Public Minting

**What:** Adding Ownable + onlyOwner to the mint function.
**Why bad:** Contradicts "anyone can mint" requirement from PROJECT.md. Makes it a centralized token.
**Instead:** Public mint with per-tx limit. No Ownable needed since there are no admin functions in scope.

### Anti-Pattern 3: Using dotenv in Hardhat 3

**What:** Installing dotenv and calling `require("dotenv").config()` at the top of hardhat.config.ts.
**Why bad:** Hardhat 3 is ESM-first (no `require`), and has built-in `configVariable()` that replaces dotenv entirely. Adding dotenv is an unnecessary dependency that fights the framework.
**Instead:** Use `configVariable("MY_SECRET")` in config. Set values via env vars or `hardhat keystore set MY_SECRET`.

### Anti-Pattern 4: Side-Effect Plugin Imports (Hardhat 2 Style)

**What:** Writing `import "@nomicfoundation/hardhat-ethers";` at the top of config for plugin registration.
**Why bad:** Hardhat 3 uses explicit plugin registration via the `plugins` array. Side-effect imports do not register plugins in Hardhat 3.
**Instead:** Import the plugin as a default import and add it to the `plugins` array in `defineConfig()`.

### Anti-Pattern 5: Testing Only Happy Paths

**What:** Testing only that mint/transfer succeeds.
**Why bad:** The most critical contract behavior is *rejection* -- rejecting mints exceeding cap, transfers with insufficient balance, mints exceeding per-tx limit.
**Instead:** Test every revert: mint exceeding cap, mint exceeding per-tx limit, mint zero amount, transfer with zero balance, transferFrom without approval.

### Anti-Pattern 6: Hardcoding Secrets in Config

**What:** Putting private keys or RPC URLs directly in hardhat.config.ts.
**Why bad:** Secrets end up in git. Even with .gitignore, accidental commits happen.
**Instead:** `configVariable()` + encrypted keystore for production. Env vars for local dev.

## Suggested Build Order

```
Phase 1: Foundation
  hardhat.config.ts + package.json + tsconfig.json
  (everything depends on the toolchain being configured)
      |
      v
Phase 2: Contract
  contracts/RoxasToken.sol
  (must compile before tests or deployment)
      |
      v
Phase 3: Tests
  test/RoxasToken.test.ts
  (validates contract before deploying to Sepolia)
      |
      v
Phase 4: Deploy + Verify
  ignition/modules/RoxasToken.ts
  hardhat ignition deploy --network sepolia --verify
  (single step, post-testing)
```

## Scalability Considerations

| Concern | At Testnet Scale | At Production Scale | Notes |
|---------|-----------------|---------------------|-------|
| Gas costs | Negligible (faucet ETH) | Matters: mint ~50-70k gas, transfer ~50k gas | Per-tx limit keeps gas predictable |
| Supply management | 10M cap fine for testing | Cap is immutable; choose carefully | ERC20Capped enforces on-chain |
| Public minting abuse | Unlikely on testnet | Bots drain to cap rapidly | Per-tx limit slows but does not prevent. Rate limiting for mainnet. |
| Etherscan rate limits | Free API key: 5 calls/sec | Same | Verification is one-time |

## Sources

- [Hardhat 3 Getting Started](https://hardhat.org/docs/getting-started) -- HIGH confidence
- [Hardhat 3 Configuration Reference](https://hardhat.org/docs/reference/configuration) -- HIGH confidence
- [Hardhat 3 Testing with Ethers and Mocha](https://hardhat.org/docs/guides/testing/using-ethers) -- HIGH confidence
- [Hardhat 3 Configuration Variables](https://hardhat.org/docs/guides/configuration-variables) -- HIGH confidence
- [Hardhat 3 Contract Verification](https://hardhat.org/docs/tutorial/verifying) -- HIGH confidence
- [Hardhat Ignition Getting Started](https://hardhat.org/ignition) -- HIGH confidence
- [hardhat-toolbox-mocha-ethers Plugin](https://hardhat.org/docs/plugins/hardhat-toolbox-mocha-ethers) -- HIGH confidence
- [OpenZeppelin v5 ERC-20 API](https://docs.openzeppelin.com/contracts/5.x/api/token/erc20) -- HIGH confidence
- [OpenZeppelin v5 ERC20Capped Source](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/ERC20Capped.sol) -- HIGH confidence
- [OpenZeppelin v5 ERC20 Supply Patterns](https://docs.openzeppelin.com/contracts/5.x/erc20-supply) -- HIGH confidence
