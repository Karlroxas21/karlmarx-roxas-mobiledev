# Phase 2: Contract Foundation - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning
**Source:** Auto-selected defaults (user approved all)

<domain>
## Phase Boundary

Write the RoxasToken.sol contract that inherits ERC20 and ERC20Capped from OpenZeppelin v5, with correct token metadata (name, symbol, decimals) and a 10M cap. Must compile successfully with TypeChain type generation. No minting logic, no transfer customization — just the ERC-20 foundation with capped supply.

</domain>

<decisions>
## Implementation Decisions

### Constructor Design
- Hardcode name ("Roxas Token"), symbol ("RXS"), and cap (10,000,000 * 10**18) in the contract
- No constructor parameters — values are fixed and known
- Constructor calls `ERC20("Roxas Token", "RXS")` and `ERC20Capped(10_000_000 * 10 ** 18)`

### Placeholder Cleanup
- Delete contracts/Placeholder.sol — it was scaffolding for Phase 1
- Replace with contracts/RoxasToken.sol as the actual contract

### Initial Supply Scope
- Do NOT mint initial supply in constructor — defer to Phase 4 (Minting Mechanics)
- Phase 2 constructor only sets up ERC20 metadata and cap
- totalSupply() will be 0 after deployment in Phase 2

### Inheritance Chain
- `contract RoxasToken is ERC20, ERC20Capped` — OpenZeppelin v5 pattern
- Must override `_update()` to satisfy both ERC20 and ERC20Capped (OZ v5 requirement)
- No Ownable — minting is public (decided in project questioning)

### Claude's Discretion
- SPDX license identifier (MIT standard)
- NatSpec documentation level
- Whether to add any custom errors at this stage

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Research
- `.planning/research/STACK.md` — OpenZeppelin v5.6.1, ERC20Capped pattern, `_update()` hook
- `.planning/research/ARCHITECTURE.md` — Contract component boundaries, inheritance chain
- `.planning/research/PITFALLS.md` — Pitfall #3 (OZ v5 breaking changes from v4), Pitfall #2 (decimals miscalculation)

### Prior Phase
- `.planning/phases/01-project-scaffolding/01-CONTEXT.md` — Solidity 0.8.28 exact pin, Hardhat 3 ESM config
- `.planning/phases/01-project-scaffolding/01-01-SUMMARY.md` — What was actually built in Phase 1

### Project
- `.planning/PROJECT.md` — Token name "Roxas Token", symbol "RXS", 10M cap, 1M initial supply (deferred)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `contracts/Placeholder.sol` — Will be deleted and replaced with RoxasToken.sol
- `hardhat.config.ts` — Already configured with Solidity 0.8.28, TypeChain via toolbox
- OpenZeppelin v5 already installed in node_modules (done in Phase 1)

### Established Patterns
- ESM imports throughout (`import` not `require`)
- Solidity 0.8.28 exact pin pragma
- Hardhat 3 compile command: `npx hardhat compile`

### Integration Points
- TypeChain types generated after compile — will be used in Phase 5/6 tests
- Contract ABI in artifacts/ — will be used by Ignition module in Phase 7

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard OpenZeppelin v5 ERC20Capped pattern.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-contract-foundation*
*Context gathered: 2026-04-05*
