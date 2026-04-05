# Phase 1: Project Scaffolding - Research

**Researched:** 2026-04-05
**Domain:** Hardhat 3 ESM project initialization, TypeScript toolchain configuration
**Confidence:** HIGH

## Summary

Phase 1 sets up a greenfield Hardhat 3 ESM project in the `smartcontract/` directory. The core challenge is avoiding Hardhat 2 patterns (which dominate AI training data and search results) and getting the ESM + TypeScript configuration correct from the start. Hardhat 3 is fundamentally different: ESM-first with `defineConfig()`, explicit plugin registration via a `plugins` array (not side-effect imports), `configVariable()` replacing dotenv, and `hre.network.connect()` in tests.

The research confirms that all decisions in CONTEXT.md are sound: Hardhat v3.1.12+, `hardhat-toolbox-mocha-ethers` (bundles 10 plugins including ethers, mocha, typechain, verify, ignition, keystore), Solidity 0.8.28 with exact pin, `configVariable()` for secrets management, and Infura for Sepolia RPC. The environment runs Node.js v24.12.0, which exceeds the v22+ minimum requirement.

**Primary recommendation:** Use manual setup (not `npx hardhat --init`) to maintain full control over every file. Create package.json with `"type": "module"`, install hardhat + toolbox, write hardhat.config.ts with `defineConfig`, add a minimal placeholder contract, and verify `npx hardhat compile` succeeds. Create .gitignore BEFORE any .env file exists.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Hardhat 3 (v3.1.12+), NOT Hardhat 2
- ESM-first: `"type": "module"` in package.json, `defineConfig` in config
- Use `hardhat-toolbox-mocha-ethers` (NOT default viem toolbox) -- existing monorepo uses ethers.js
- Mocha test runner (NOT Node.js test runner) -- more community examples for smart contract testing
- Solidity 0.8.28 with exact pin: `pragma solidity 0.8.28;`
- Use Hardhat 3's `configVariable()` -- NO dotenv dependency
- Use encrypted keystore (`npx hardhat keystore set`) for deployer private key
- configVariable() reads from env vars OR keystore transparently
- Infura for Sepolia testnet (user chose over Alchemy)
- .env.example includes placeholder values showing expected format (e.g., `SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID`)

### Claude's Discretion
- Exact tsconfig.json settings (ESM + strict mode standard)
- Package.json script names (compile, test, deploy conventions)
- .gitignore entries beyond the required ones

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFR-01 | Hardhat 3 ESM project with TypeScript configuration compiles successfully | Full stack documented: package.json with ESM, hardhat.config.ts with defineConfig, tsconfig.json with module:"node16", placeholder contract, npx hardhat compile verified |
| INFR-04 | .gitignore excludes artifacts/, cache/, node_modules/, .env | Standard Hardhat .gitignore pattern documented with additional entries for typechain-types/, ignition/deployments/, coverage/ |
| INFR-05 | .env.example documents required environment variables | Three required variables documented: SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, ETHERSCAN_API_KEY with Infura placeholder format |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| hardhat | ^3.1.12 | Development framework | ESM-first, built-in coverage, Ignition deployment, Rust-powered compilation (EDR). Production-ready since late 2025. |
| @nomicfoundation/hardhat-toolbox-mocha-ethers | ^3.0.0 | Meta-plugin bundle | Installs 10 essential plugins in one package: ethers, mocha, typechain, chai-matchers, network-helpers, verify, ignition, ignition-ethers, keystore. Chosen over default viem toolbox for ethers.js compatibility with existing monorepo. |
| @openzeppelin/contracts | ^5.6.1 | Base ERC-20 contracts | Industry-standard audited contracts. Not needed in Phase 1, but listed for completeness -- install as regular dep (not dev) since Solidity imports it. |
| TypeScript | ^5.7.0 | Type safety | Hardhat 3 is TypeScript-first. Provides typed artifacts via hardhat-typechain. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/mocha | latest | Mocha type definitions | Needed for TypeScript test files (Phase 5+) |
| @types/chai | latest | Chai type definitions | Needed for TypeScript test files (Phase 5+) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| hardhat-toolbox-mocha-ethers | hardhat-toolbox (viem) | Hardhat 3 default uses viem; ethers chosen for consistency with existing monorepo |
| Manual plugin installation | Individual @nomicfoundation/* plugins | Toolbox installs all 10 as peer deps; no reason to manage individually |
| npx hardhat --init | Manual setup | Init generates boilerplate sample contract/test; manual gives full control over every file |

### NOT Using

| Technology | Why Not |
|------------|---------|
| dotenv | Hardhat 3 has `configVariable()` + keystore. dotenv is unnecessary. |
| hardhat-deploy (wighawag) | Incompatible with Hardhat 3. Hardhat Ignition is the replacement. |
| Foundry/Forge | Project is npm/TypeScript throughout; Hardhat fits the workflow. |

**Installation:**
```bash
# From smartcontract/ directory
npm init -y
npm pkg set type=module

# Core framework + toolbox (dev dependency)
npm install --save-dev hardhat@^3 @nomicfoundation/hardhat-toolbox-mocha-ethers

# OpenZeppelin (regular dep -- imported by Solidity, not just dev tooling)
npm install @openzeppelin/contracts@^5.6.1

# Type definitions for tests
npm install --save-dev @types/mocha @types/chai
```

Note: `hardhat-toolbox-mocha-ethers` automatically installs its 10 peer dependencies. No need to install hardhat-ethers, hardhat-mocha, hardhat-verify, hardhat-ignition, hardhat-typechain, etc. individually.

## Architecture Patterns

### Recommended Project Structure
```
smartcontract/
  contracts/
    Placeholder.sol         # Minimal contract for Phase 1 compile check
  test/                     # Empty dir -- tests come in Phase 5+
  ignition/
    modules/                # Empty dir -- deploy module comes in Phase 7
  hardhat.config.ts         # Hardhat 3 ESM config with defineConfig
  package.json              # "type": "module", scripts, dependencies
  tsconfig.json             # module: "node16", strict: true
  .gitignore                # artifacts/, cache/, node_modules/, .env, etc.
  .env.example              # Documents required env vars with placeholders
```

### Pattern 1: Hardhat 3 ESM Configuration
**What:** The hardhat.config.ts file uses `defineConfig()` and `configVariable()` from `"hardhat/config"`. Plugins are registered explicitly in the `plugins` array.
**When to use:** Always. This is the only correct pattern for Hardhat 3.
**Example:**
```typescript
// hardhat.config.ts
// Source: https://hardhat.org/docs/reference/configuration
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

### Pattern 2: ESM-Compatible tsconfig.json
**What:** TypeScript configuration that supports Hardhat 3's ESM mode.
**When to use:** Every Hardhat 3 TypeScript project.
**Example:**
```json
// tsconfig.json
// Source: https://hardhat.org/docs/migrate-from-hardhat2 (module: "node16" requirement)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "node16",
    "moduleResolution": "node16",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": [
    "hardhat.config.ts",
    "contracts/**/*.sol",
    "test/**/*.ts",
    "ignition/**/*.ts"
  ]
}
```

**Key requirement:** `"module": "node16"` is mandatory for Hardhat 3 ESM. The migration guide explicitly states this. `"nodenext"` is also valid but `"node16"` is what Hardhat recommends.

### Pattern 3: Placeholder Contract for Compilation Verification
**What:** A minimal valid Solidity contract that proves the toolchain compiles correctly.
**When to use:** Phase 1 -- replaced by RoxasToken.sol in Phase 2.
**Example:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Placeholder contract to verify Hardhat 3 toolchain compiles.
/// @dev Replace with RoxasToken in Phase 2.
contract Placeholder {
    // Intentionally empty -- validates compilation pipeline
}
```

### Pattern 4: package.json Scripts
**What:** Conventional npm scripts for Hardhat commands.
**When to use:** Every Hardhat project.
**Example (Claude's discretion):**
```json
{
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "clean": "hardhat clean"
  }
}
```

### Anti-Patterns to Avoid
- **Side-effect plugin imports (HH2 style):** Writing `import "@nomicfoundation/hardhat-ethers";` at top of config. In HH3, plugins MUST go in the `plugins` array.
- **require() calls:** ESM does not support `require()`. All imports must be ES module `import` statements.
- **dotenv dependency:** Do NOT install or use dotenv. Hardhat 3's `configVariable()` replaces it entirely.
- **module.exports:** Use `export default defineConfig({...})`, not `module.exports = {...}`.
- **Hardcoding secrets:** Never put private keys or API keys directly in config. Always use `configVariable()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Secrets management | Custom env var loading, dotenv | `configVariable()` + `hardhat keystore` | Built into Hardhat 3; lazy-loaded, reads from env vars OR encrypted keystore transparently |
| Plugin registration | Manual plugin wiring | `hardhat-toolbox-mocha-ethers` | Bundles 10 plugins with correct peer deps; one import, one array entry |
| Contract deployment | Raw ethers deploy scripts | Hardhat Ignition modules | Declarative, idempotent, resumable, integrates verification |
| Type generation | Manual ABI typing | hardhat-typechain (via toolbox) | Auto-generates TypeScript types from compiled contracts |
| Test isolation | Manual beforeEach deploys | `loadFixture()` from network-helpers | Snapshots EVM state, reverts between tests, faster than redeployment |

**Key insight:** Hardhat 3's toolbox bundles everything needed. The main risk is fighting the framework with Hardhat 2 patterns rather than missing a tool.

## Common Pitfalls

### Pitfall 1: Using Hardhat 2 Patterns in Hardhat 3
**What goes wrong:** Copying config, test, or deployment patterns from Hardhat 2 tutorials (which dominate search results and AI training data).
**Why it happens:** Hardhat 3 was released in late 2025. Most tutorials, Stack Overflow answers, and AI training data reflect Hardhat 2.
**How to avoid:** ONLY reference hardhat.org docs (NOT v2.hardhat.org). Reject any code that has `require()`, `module.exports`, or side-effect plugin imports.
**Warning signs:** Any `require()` call, any `module.exports`, any side-effect import like `import "@nomicfoundation/hardhat-ethers"`, missing `"type": "module"` in package.json.

### Pitfall 2: Missing "type": "module" in package.json
**What goes wrong:** Without ESM mode, Hardhat 3's ESM imports fail. Node.js treats .ts files as CommonJS.
**Why it happens:** Forgetting to set it, or `npm init -y` does not include it by default.
**How to avoid:** Run `npm pkg set type=module` immediately after `npm init -y`. Verify it exists before any other configuration.
**Warning signs:** "Cannot use import statement outside a module" errors.

### Pitfall 3: Wrong tsconfig.json module setting
**What goes wrong:** Using `"module": "commonjs"` (TypeScript default) instead of `"module": "node16"`.
**Why it happens:** TypeScript defaults to CommonJS. Most TypeScript tutorials use CommonJS module resolution.
**How to avoid:** Explicitly set `"module": "node16"` in tsconfig.json. The Hardhat 3 migration guide mandates this.
**Warning signs:** Import resolution errors, "ERR_REQUIRE_ESM" errors.

### Pitfall 4: Private Key Exposure
**What goes wrong:** Accidentally committing secrets to git.
**Why it happens:** Creating .env before .gitignore, or hardcoding values in config.
**How to avoid:** Create .gitignore FIRST, before any .env file. Use `configVariable()` in config (never raw strings). Document required vars in .env.example only.
**Warning signs:** `git status` showing .env as untracked without .gitignore present.

### Pitfall 5: Empty contracts/ Directory Fails Compile
**What goes wrong:** `npx hardhat compile` with no .sol files outputs "Nothing to compile" -- which technically succeeds (exit code 0) but does not prove the toolchain works.
**Why it happens:** No Solidity files to feed the compiler.
**How to avoid:** Include a minimal placeholder contract (Placeholder.sol) that compiles successfully. This proves the full pipeline: Solidity compiler, artifact generation, TypeChain type generation.
**Warning signs:** "Nothing to compile" message instead of "Compiled 1 Solidity file successfully".

## Code Examples

Verified patterns from official sources:

### Complete hardhat.config.ts (Phase 1)
```typescript
// Source: https://hardhat.org/docs/reference/configuration
//         https://hardhat.org/docs/plugins/hardhat-toolbox-mocha-ethers
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

### .env.example (Phase 1)
```bash
# Sepolia RPC endpoint (Infura)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Deployer wallet private key (use `npx hardhat keystore set DEPLOYER_PRIVATE_KEY` for encrypted storage)
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Etherscan API key for contract verification (single key works for all chains via V2 API)
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
```

### .gitignore (Phase 1)
```gitignore
# Dependencies
node_modules/

# Hardhat artifacts and cache
artifacts/
cache/
typechain-types/

# Hardhat Ignition deployment state
ignition/deployments/

# Environment and secrets
.env
.env.local

# Coverage reports
coverage/
coverage.json

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

### Placeholder Contract (Phase 1)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Placeholder contract to verify Hardhat 3 toolchain.
/// @dev Replace with RoxasToken in Phase 2.
contract Placeholder {
    // Intentionally empty
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `require("dotenv").config()` | `configVariable()` + keystore | Hardhat 3 (late 2025) | No dotenv dep; encrypted keystore for secrets |
| `module.exports = { ... }` | `export default defineConfig({...})` | Hardhat 3 | ESM-first; TypeScript-native config |
| Side-effect plugin imports | Explicit `plugins: [...]` array | Hardhat 3 | Plugins must be registered explicitly |
| `ethers.BigNumber.from()` | Native `BigInt` (`1000n`) | ethers v6 (2023) | Use JS-native bigint operators |
| `_beforeTokenTransfer` hook | `_update()` hook | OpenZeppelin v5 (2024) | Single override point for all balance changes |
| hardhat-deploy (wighawag) | Hardhat Ignition | Hardhat 3 | Declarative, idempotent deployment modules |
| `require("@nomiclabs/hardhat-ethers")` | `import hardhatToolboxMochaEthers from "..."` in plugins array | Hardhat 3 | No side-effect imports |

**Deprecated/outdated:**
- **v2.hardhat.org patterns**: Any code from v2.hardhat.org is Hardhat 2 -- do not use
- **dotenv**: Replaced by configVariable() + keystore in Hardhat 3
- **hardhat-deploy (wighawag)**: Incompatible with Hardhat 3; use Hardhat Ignition
- **Truffle**: Discontinued by ConsenSys in 2023

## Open Questions

1. **Exact `npx hardhat compile` output format in Hardhat 3**
   - What we know: Hardhat 2 outputs "Compiled X Solidity files successfully". Hardhat 3 likely similar.
   - What's unclear: Exact output message and whether TypeChain types generate on first compile automatically with the toolbox.
   - Recommendation: Verify during implementation. Success = exit code 0 with no errors.

2. **OpenZeppelin install in Phase 1 vs Phase 2**
   - What we know: Phase 1 is "just toolchain," Phase 2 introduces OpenZeppelin ERC20. The placeholder contract does not need OZ.
   - What's unclear: Whether to install OZ now (cleaner single setup) or defer to Phase 2 (separation of concerns).
   - Recommendation: Install in Phase 1. It is a dependency declaration, not contract code. Avoids a second npm install disruption in Phase 2.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Hardhat 3 compile task (no test framework needed for Phase 1) |
| Config file | hardhat.config.ts (created in this phase) |
| Quick run command | `npx hardhat compile` |
| Full suite command | `npx hardhat compile --force` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFR-01 | Hardhat 3 ESM project compiles successfully | smoke | `npx hardhat compile` | N/A -- compile task is built-in |
| INFR-04 | .gitignore excludes required paths | manual-only | Visual inspection of .gitignore contents | N/A -- static file check |
| INFR-05 | .env.example documents required env vars | manual-only | Visual inspection of .env.example contents | N/A -- static file check |

### Sampling Rate
- **Per task commit:** `npx hardhat compile`
- **Per wave merge:** `npx hardhat compile --force`
- **Phase gate:** `npx hardhat compile` exits 0, .gitignore and .env.example exist with correct content

### Wave 0 Gaps
None -- Phase 1 creates the infrastructure from scratch. The test framework (Mocha) is installed via the toolbox but not exercised until Phase 5. The compile task is the only automated verification needed.

## Sources

### Primary (HIGH confidence)
- [Hardhat 3 -- Getting Started](https://hardhat.org/docs/getting-started) -- project init flow
- [Hardhat 3 -- Configuration Reference](https://hardhat.org/docs/reference/configuration) -- defineConfig structure, network types, solidity config
- [Hardhat 3 -- Migrate from Hardhat 2](https://hardhat.org/docs/migrate-from-hardhat2) -- tsconfig.json `module: "node16"` requirement, ESM migration
- [Hardhat 3 -- Configuration Variables](https://hardhat.org/docs/guides/configuration-variables) -- configVariable() behavior, keystore commands
- [Hardhat 3 -- Tutorial: Configuration Variables](https://hardhat.org/docs/tutorial/configuration-variables) -- keystore set usage
- [Hardhat 3 -- Contract Verification](https://hardhat.org/docs/tutorial/verifying) -- verify config block
- [hardhat-toolbox-mocha-ethers plugin](https://hardhat.org/docs/plugins/hardhat-toolbox-mocha-ethers) -- 10 bundled plugins, registration pattern, init option
- [Hardhat 3 -- Testing with Ethers and Mocha](https://hardhat.org/docs/guides/testing/using-ethers) -- hre.network.connect() pattern, loadFixture usage
- [npm: hardhat](https://www.npmjs.com/package/hardhat) -- v3.1.12 confirmed
- [npm: @nomicfoundation/hardhat-toolbox-mocha-ethers](https://www.npmjs.com/package/@nomicfoundation/hardhat-toolbox-mocha-ethers) -- v3.0.0 series confirmed

### Secondary (MEDIUM confidence)
- [Nomic Foundation Blog: Config Variables](https://blog.nomic.foundation/how-to-manage-config-values-and-secrets-safely-in-hardhat-3/) -- configVariable deep dive
- [GitHub: PaulRBerg/hardhat-template .gitignore](https://github.com/paulrberg/hardhat-template/blob/main/.gitignore) -- community .gitignore patterns

### Project Research (HIGH confidence)
- `.planning/research/STACK.md` -- Full technology stack with versions and rationale
- `.planning/research/PITFALLS.md` -- 15 domain pitfalls catalogued with prevention strategies
- `.planning/research/ARCHITECTURE.md` -- Project structure, component boundaries, data flow

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All versions verified via npm and official Hardhat 3 docs
- Architecture: HIGH -- Project structure follows Hardhat 3 conventions from official docs
- Pitfalls: HIGH -- Phase 1 pitfalls (HH2 patterns, ESM config, .gitignore ordering) well documented across multiple sources
- tsconfig.json: MEDIUM -- `module: "node16"` confirmed by migration guide; other settings are standard TypeScript best practices but not explicitly prescribed by Hardhat 3 docs

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable domain -- Hardhat 3 and Solidity 0.8.28 are established)
