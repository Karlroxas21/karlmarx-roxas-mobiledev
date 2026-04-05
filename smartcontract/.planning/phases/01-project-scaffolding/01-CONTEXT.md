# Phase 1: Project Scaffolding - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up a working Hardhat 3 ESM project with TypeScript in the `smartcontract/` directory that compiles successfully. Includes package.json, hardhat.config.ts, tsconfig.json, .gitignore, and .env.example. No contract code — just toolchain configuration.

</domain>

<decisions>
## Implementation Decisions

### Hardhat Version
- Hardhat 3 (v3.1.12+), NOT Hardhat 2
- ESM-first: `"type": "module"` in package.json, `defineConfig` in config
- Use `hardhat-toolbox-mocha-ethers` (NOT default viem toolbox) — existing monorepo uses ethers.js
- Mocha test runner (NOT Node.js test runner) — more community examples for smart contract testing

### Solidity Version
- Solidity 0.8.28 with exact pin: `pragma solidity 0.8.28;`
- Rationale: last stable version before IR pipeline bug (0.8.29-0.8.33), battle-tested since Oct 2024
- Overrides PROJECT.md's original 0.8.24 — user confirmed

### Secrets Management
- Use Hardhat 3's `configVariable()` — NO dotenv dependency
- Use encrypted keystore (`npx hardhat keystore set`) for deployer private key
- configVariable() reads from env vars OR keystore transparently

### RPC Provider
- Infura for Sepolia testnet (user chose over Alchemy)
- .env.example includes placeholder values showing expected format (e.g., `SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID`)

### Claude's Discretion
- Exact tsconfig.json settings (ESM + strict mode standard)
- Package.json script names (compile, test, deploy conventions)
- .gitignore entries beyond the required ones

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Research
- `.planning/research/STACK.md` — Full technology stack with versions, rationale, and Hardhat 3 config patterns
- `.planning/research/PITFALLS.md` — Pitfall #1 (HH2 patterns in HH3) and Pitfall #4 (private key leaks) are directly relevant
- `.planning/research/ARCHITECTURE.md` — Standard Hardhat project layout and component boundaries

### Project
- `.planning/PROJECT.md` — Overall project context, constraints, and key decisions
- `smart-contract-plan.md` — Original plan document (note: some details superseded by research — e.g., Solidity version changed to 0.8.28, Hardhat upgraded to v3)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield `smartcontract/` directory, no existing code

### Established Patterns
- Monorepo uses npm/TypeScript throughout (frontend: Expo/RN, backend: Express.js)
- Backend uses CommonJS — NOT a constraint since smartcontract/ has its own package.json with ESM

### Integration Points
- `smartcontract/` directory sits alongside `frontend/` and `backend/` at project root
- Backend already uses Etherscan API (V2) — contract verification will use same API ecosystem

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for Hardhat 3 ESM project setup.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-project-scaffolding*
*Context gathered: 2026-04-05*
