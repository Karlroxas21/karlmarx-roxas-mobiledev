# Phase 7: Sepolia Deployment - Research

**Researched:** 2026-04-05
**Domain:** Hardhat Ignition deployment module (code only)
**Confidence:** HIGH

## Summary

Phase 7 creates a single Hardhat Ignition deployment module for RoxasToken. Since the constructor is parameterless, the module is minimal: one `buildModule` call with one `m.contract("RoxasToken")` invocation and no constructor arguments. The entire deliverable is a single file: `ignition/modules/RoxasToken.ts`.

The project infrastructure already supports this: the `ignition/modules/` directory exists (currently empty), `tsconfig.json` already includes `ignition/**/*.ts`, `.gitignore` already excludes `ignition/deployments/`, and the Sepolia network configuration in `hardhat.config.ts` is complete with `configVariable()` for secrets.

**Primary recommendation:** Create a single-file Ignition module using `buildModule("RoxasTokenModule", (m) => { const token = m.contract("RoxasToken"); return { token }; })`. No parameters, no post-deployment calls, no supporting files needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use Hardhat Ignition (not raw deploy scripts) -- Hardhat 3's official deployment system
- RoxasToken constructor takes no arguments -- Ignition module is simple
- Module file: `ignition/modules/RoxasToken.ts`
- User deploys manually with: `npx hardhat ignition deploy ignition/modules/RoxasToken.ts --network sepolia`
- User chose "create deploy code only" -- no actual Sepolia deployment in this phase
- Phase deliverable: Ignition module file that compiles and is ready to deploy

### Claude's Discretion
- Ignition module naming conventions
- Whether to add a deploy script as fallback alongside Ignition
- README/documentation for deployment steps

### Deferred Ideas (OUT OF SCOPE)
- Actual Sepolia deployment -- user deploys manually when credentials are ready
- Etherscan verification -- handled in Phase 8
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPL-01 | Hardhat Ignition module deploys RoxasToken to Sepolia testnet | Ignition module pattern documented with exact code, import path, and deploy command. Infrastructure (directory, tsconfig, gitignore, network config) already in place. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nomicfoundation/hardhat-ignition | (bundled via toolbox) | Declarative deployment modules | Ships with hardhat-toolbox-mocha-ethers. Official Hardhat 3 deployment system. Already installed as transitive dependency. |
| @nomicfoundation/hardhat-ignition-ethers | (bundled via toolbox) | Returns deployed contracts as ethers.js instances | Bridge between Ignition and ethers.js. Already installed. |

### Supporting

No additional libraries needed. Everything required is already installed via `@nomicfoundation/hardhat-toolbox-mocha-ethers`.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hardhat Ignition | Raw ethers.js deploy script (`scripts/deploy.ts`) | Ignition provides idempotent re-runs, error recovery, deployment state tracking, and integrated verification. Raw scripts have none of these. User locked Ignition as the approach. |

**Installation:**

No installation needed. All dependencies are already present.

## Architecture Patterns

### Project Structure (existing, no changes needed)

```
smartcontract/
  ignition/
    modules/
      RoxasToken.ts    # NEW - the only file this phase creates
  contracts/
    RoxasToken.sol     # existing
  hardhat.config.ts    # existing, Sepolia network already configured
  tsconfig.json        # existing, already includes ignition/**/*.ts
  .gitignore           # existing, already excludes ignition/deployments/
```

### Pattern 1: Ignition Module for Parameterless Constructor

**What:** A minimal Ignition module that deploys a contract with no constructor arguments. The `m.contract()` method accepts just the contract name when there are no constructor parameters.

**When to use:** Any contract whose constructor takes zero arguments (like RoxasToken, which hardcodes all values).

**Example:**
```typescript
// Source: https://hardhat.org/docs/guides/deployment/using-ignition
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("RoxasTokenModule", (m) => {
  const token = m.contract("RoxasToken");
  return { token };
});
```

Key details:
- Import path is `@nomicfoundation/hardhat-ignition/modules` (not `/module` or the package root)
- `buildModule` takes a module ID string and a callback receiving the `ModuleBuilder` instance `m`
- `m.contract("RoxasToken")` matches the contract name in `contracts/RoxasToken.sol` exactly (case-sensitive)
- No constructor args array needed when constructor is parameterless (can also pass `[]` explicitly, but unnecessary)
- Return the contract future so it is accessible to other modules or tests
- `export default` is required (ESM pattern)

### Pattern 2: Module ID Naming Convention

**What:** The string passed to `buildModule()` is the module ID. Convention is to use the contract name or a descriptive name with "Module" suffix.

**Recommendation:** Use `"RoxasTokenModule"` as the module ID. This distinguishes the module from the contract name and follows the convention seen in official examples (`CounterModule`, `Apollo`, etc.).

**Why it matters:** The module ID becomes the deployment directory name under `ignition/deployments/chain-<chainId>/`. A clear name helps when inspecting deployment artifacts.

### Anti-Patterns to Avoid

- **Passing constructor args when there are none:** Do not pass `m.contract("RoxasToken", [])` with arguments that the constructor does not expect. The RoxasToken constructor is parameterless -- all values (name, symbol, cap, initial supply) are hardcoded in the contract. Passing unexpected arguments will cause a deployment error.
- **Adding a fallback deploy script:** Do not create `scripts/deploy.ts` alongside the Ignition module. It adds a second deployment path to maintain and can cause confusion about which to use. Ignition is the standard. (Claude's discretion recommendation: skip the fallback.)
- **Using `m.getParameter()` for hardcoded values:** Since cap and initial supply are hardcoded in the Solidity constructor, do not expose them as Ignition parameters. There is nothing configurable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Contract deployment | Raw `ethers.getContractFactory().deploy()` script | Hardhat Ignition module | Ignition provides idempotent re-runs, deployment journaling, error recovery, integrated Etherscan verification, and deployment state tracking |
| Deployment state tracking | Custom JSON file tracking deployed addresses | `ignition/deployments/` directory (auto-managed) | Ignition automatically tracks deployment state per chain ID, enabling resume-on-failure and re-deployment detection |

## Common Pitfalls

### Pitfall 1: Wrong Import Path for buildModule

**What goes wrong:** Importing from `@nomicfoundation/hardhat-ignition` instead of `@nomicfoundation/hardhat-ignition/modules`.
**Why it happens:** The package has multiple entry points. The `/modules` subpath is specific to module definitions.
**How to avoid:** Always use `import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";`
**Warning signs:** TypeScript error: `Module '"@nomicfoundation/hardhat-ignition"' has no exported member 'buildModule'`

### Pitfall 2: Contract Name Mismatch

**What goes wrong:** Using a different case or name in `m.contract()` than the Solidity contract name.
**Why it happens:** `m.contract("roxasToken")` or `m.contract("RoxasTokenContract")` does not match `contract RoxasToken is ERC20, ERC20Capped`.
**How to avoid:** Match exactly: `m.contract("RoxasToken")` -- same as `contract RoxasToken` in the `.sol` file.
**Warning signs:** Hardhat error about contract artifact not found.

### Pitfall 3: Forgetting export default

**What goes wrong:** Using a named export instead of default export for the module.
**Why it happens:** ESM habit of using named exports. Ignition expects the default export.
**How to avoid:** Always `export default buildModule(...)`.
**Warning signs:** Ignition deploy command fails to find the module.

### Pitfall 4: Passing Constructor Args to Parameterless Constructor

**What goes wrong:** Writing `m.contract("RoxasToken", [someArg])` when the constructor takes no parameters.
**Why it happens:** Copying from examples that have constructor args (the STACK.md example incorrectly shows `[CAP]` as an argument for a version of the contract that hardcodes the cap).
**How to avoid:** Check the actual contract constructor. RoxasToken's constructor takes zero arguments -- `constructor() ERC20("Roxas Token", "RXS") ERC20Capped(10_000_000 * 10 ** 18)`.
**Warning signs:** Deployment reverts or ABI mismatch error.

## Code Examples

### The Complete Ignition Module (the entire deliverable)

```typescript
// ignition/modules/RoxasToken.ts
// Source: Hardhat Ignition docs pattern adapted for parameterless RoxasToken
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("RoxasTokenModule", (m) => {
  const token = m.contract("RoxasToken");
  return { token };
});
```

### Deploy Command (for user reference, not executed in this phase)

```bash
# Deploy to Sepolia (user runs this manually when ready)
npx hardhat ignition deploy ignition/modules/RoxasToken.ts --network sepolia

# Deploy + verify in one command (combines Phase 7 + Phase 8)
npx hardhat ignition deploy ignition/modules/RoxasToken.ts --network sepolia --verify

# Verify an existing deployment separately
npx hardhat ignition verify chain-11155111
```

### Using the Module in Tests (optional, for validation)

```typescript
// In a test file, you can deploy via the Ignition module
import hre from "hardhat";
import RoxasTokenModule from "../ignition/modules/RoxasToken.js";

const { token } = await hre.ignition.deploy(RoxasTokenModule);
expect(await token.name()).to.equal("Roxas Token");
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `scripts/deploy.ts` with raw ethers.js | Hardhat Ignition modules | Hardhat 3 (2025) | Declarative deployment with state tracking, error recovery, integrated verification |
| `hardhat-deploy` plugin (wighawag) | Hardhat Ignition (official) | Hardhat 3 (2025) | `hardhat-deploy` is incompatible with Hardhat 3. Ignition is the official replacement. |
| `require("dotenv")` for secrets | `configVariable()` + keystore | Hardhat 3 (2025) | Built-in, no extra dependency, supports encrypted keystore |

## Open Questions

1. **Module ID naming convention (RoxasToken vs RoxasTokenModule)**
   - What we know: Official examples use both patterns (e.g., `"Apollo"`, `"CounterModule"`). No enforced convention.
   - What's unclear: Whether to suffix with "Module" or not.
   - Recommendation: Use `"RoxasTokenModule"` to distinguish from the contract name. This is Claude's discretion per CONTEXT.md.

2. **Whether to add a README section for deployment steps**
   - What we know: The deploy command is straightforward (`npx hardhat ignition deploy ... --network sepolia`).
   - Recommendation: Skip a separate README. The command is documented in CONTEXT.md and is standard Hardhat usage. This is Claude's discretion per CONTEXT.md -- not worth a separate file for a single command.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Mocha + Chai (via @nomicfoundation/hardhat-toolbox-mocha-ethers) |
| Config file | hardhat.config.ts (Mocha configured via plugin) |
| Quick run command | `npx hardhat test` |
| Full suite command | `npx hardhat test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPL-01 | Ignition module deploys RoxasToken successfully | smoke | `npx hardhat test test/RoxasToken.ignition.test.ts` | No -- Wave 0 |

**Note on DEPL-01 testing:** The Ignition module itself is trivially correct (3 lines of logic). The most meaningful validation is:
1. **Static:** The file compiles (TypeScript finds the `buildModule` import and `"RoxasToken"` contract artifact).
2. **Smoke test:** Deploy via the Ignition module on the local Hardhat network and verify the resulting contract has expected state (name, symbol, cap, initial supply). This proves the module works end-to-end without touching Sepolia.

### Sampling Rate

- **Per task commit:** `npx hardhat test` (all existing tests still pass)
- **Per wave merge:** `npx hardhat test` (full suite)
- **Phase gate:** Full suite green + Ignition module TypeScript compiles

### Wave 0 Gaps

- [ ] `test/RoxasToken.ignition.test.ts` -- smoke test that deploys via Ignition module on local network and checks basic contract state (covers DEPL-01)

*(Alternatively, this smoke test could be skipped since the module is 3 lines of code and correctness is obvious. The existing test suite already deploys RoxasToken via `ethers.deployContract("RoxasToken")` and validates all behavior. The Ignition module just wraps the same deployment.)*

## Sources

### Primary (HIGH confidence)
- [Hardhat Ignition -- Creating Modules](https://hardhat.org/ignition/docs/guides/creating-modules) -- buildModule API, m.contract() syntax, return patterns
- [Hardhat Ignition -- Getting Started](https://hardhat.org/ignition) -- Module structure, deploy command, Hardhat 3 requirements
- [Hardhat 3 -- Deploying with Ignition](https://hardhat.org/docs/guides/deployment/using-ignition) -- Full deployment guide, Sepolia deploy command, parameterless contract example (`m.contract("Counter")`)
- [Hardhat Ignition -- Verification](https://hardhat.org/ignition/docs/guides/verify) -- `--verify` flag, separate verify command, Etherscan config
- [Hardhat Ignition -- Deploy Guide](https://hardhat.org/ignition/docs/guides/deploy) -- Deployment state tracking, `ignition/deployments/` directory, `--deployment-id` flag

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` -- Project stack decisions (Hardhat 3, ethers toolbox, Ignition)
- `.planning/research/ARCHITECTURE.md` -- Project structure, Ignition module placement

### Tertiary (LOW confidence)
None -- all findings verified with official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Ignition is already installed via toolbox, no new dependencies
- Architecture: HIGH -- single file creation, directory and config already exist
- Pitfalls: HIGH -- verified import paths and API against official docs

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable domain, Hardhat Ignition API unlikely to change)
