# Phase 7: Sepolia Deployment - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Create the Hardhat Ignition deployment module for RoxasToken. The module should deploy the contract to Sepolia with no constructor arguments (constructor is parameterless). Actual deployment is manual — this phase creates the deployment code, not the live deployment.

</domain>

<decisions>
## Implementation Decisions

### Deployment Approach
- Use Hardhat Ignition (not raw deploy scripts) — Hardhat 3's official deployment system
- RoxasToken constructor takes no arguments — Ignition module is simple
- Module file: `ignition/modules/RoxasToken.ts`
- User deploys manually with: `npx hardhat ignition deploy ignition/modules/RoxasToken.ts --network sepolia`

### Scope Adjustment
- User chose "create deploy code only" — no actual Sepolia deployment in this phase
- Phase deliverable: Ignition module file that compiles and is ready to deploy
- Verification (Phase 8) will also be code-only: config is already in hardhat.config.ts

### Claude's Discretion
- Ignition module naming conventions
- Whether to add a deploy script as fallback alongside Ignition
- README/documentation for deployment steps

</decisions>

<canonical_refs>
## Canonical References

### Research
- `.planning/research/STACK.md` — Hardhat Ignition patterns, deploy + verify in one command
- `.planning/research/ARCHITECTURE.md` — Ignition module location and patterns

### Contract
- `contracts/RoxasToken.sol` — Contract to deploy (parameterless constructor)
- `hardhat.config.ts` — Sepolia network already configured with configVariable()

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `hardhat.config.ts` — Sepolia network config with Infura RPC already in place
- Verify config (etherscan block) already set up

### Integration Points
- `ignition/modules/` directory needs to be created
- `npx hardhat ignition deploy` reads from this directory

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard Ignition module pattern.

</specifics>

<deferred>
## Deferred Ideas

- Actual Sepolia deployment — user deploys manually when credentials are ready
- Etherscan verification — handled in Phase 8

</deferred>

---

*Phase: 07-sepolia-deployment*
*Context gathered: 2026-04-05*
