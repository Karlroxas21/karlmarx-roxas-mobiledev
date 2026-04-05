# Phase 8: Etherscan Verification - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify the Etherscan verification config is in place and document the manual verification command. The verify block is already in hardhat.config.ts. Actual verification happens after manual Sepolia deployment (Phase 7 deferred). Deliverable: verification config confirmed + deployment documentation.

</domain>

<decisions>
## Implementation Decisions

### Verification Approach
- Etherscan verify config already exists in hardhat.config.ts (`verify.etherscan.apiKey`)
- Ignition supports `--verify` flag: `npx hardhat ignition deploy ... --network sepolia --verify`
- This is a documentation/verification phase — confirm config, add deployment README

### Scope
- Code-only: no actual Etherscan verification (no live contract yet)
- Create a DEPLOYMENT.md with step-by-step instructions for manual deploy + verify

### Claude's Discretion
- DEPLOYMENT.md format and detail level
- Whether to add npm scripts for deploy commands

</decisions>

<canonical_refs>
## Canonical References

- `hardhat.config.ts` — Already has verify.etherscan.apiKey config
- `.env.example` — Already documents ETHERSCAN_API_KEY
- `.planning/research/STACK.md` — Ignition --verify flag, Etherscan V2 API

</canonical_refs>

<code_context>
## Existing Code Insights

### Already In Place
- `hardhat.config.ts` verify block with `configVariable("ETHERSCAN_API_KEY")`
- `.env.example` with `ETHERSCAN_API_KEY` placeholder
- `ignition/modules/RoxasToken.ts` ready to deploy

### Integration Points
- `npx hardhat ignition deploy ignition/modules/RoxasToken.ts --network sepolia --verify` deploys AND verifies in one command

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard deployment documentation.

</specifics>

<deferred>
## Deferred Ideas

- Actual Etherscan verification — after manual deployment

</deferred>

---

*Phase: 08-etherscan-verification*
*Context gathered: 2026-04-05*
