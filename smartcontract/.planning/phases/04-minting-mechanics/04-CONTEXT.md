# Phase 4: Minting Mechanics - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Add public minting to RoxasToken.sol: a mint() function anyone can call, constrained by per-transaction limit (1000 RXS), hard cap (10M via ERC20Capped), per-address cooldown (60 seconds), and initial supply (1M RXS minted to deployer in constructor). Custom TokensMinted event emitted on each mint.

</domain>

<decisions>
## Implementation Decisions

### Minting Parameters
- Per-transaction mint limit: 1000 RXS (1000 * 10**18 wei) as immutable constant
- Cooldown duration: 60 seconds between mints per address
- Initial supply: 1,000,000 RXS minted to deployer in constructor via _mint()
- Mint limit is an immutable constant — no admin function to change it

### Custom Event & Error Design
- Custom event: `event TokensMinted(address indexed minter, uint256 amount)`
- Use custom errors (Solidity 0.8+ style), not require() strings — gas efficient
- Error names: `MintLimitExceeded(uint256 amount, uint256 limit)` and `CooldownNotElapsed(uint256 remaining)`
- Cap enforcement via ERC20Capped._update() — already in place from Phase 2

### Storage
- `mapping(address => uint256) private _lastMintTimestamp` for cooldown tracking
- `uint256 public constant MINT_LIMIT = 1000 * 10 ** 18`
- `uint256 public constant COOLDOWN_PERIOD = 60` (seconds)
- `uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18`

### Claude's Discretion
- NatSpec documentation depth on mint function
- Whether to expose cooldown state via a public view function (e.g., `canMint(address)`)
- Exact ordering of checks in mint function (limit check before cooldown or vice versa)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Contract
- `contracts/RoxasToken.sol` — Current contract to modify (add mint function, constructor mint, storage)
- `.planning/research/STACK.md` — OpenZeppelin v5 ERC20Capped pattern, _update() hook
- `.planning/research/PITFALLS.md` — Pitfall #2 (decimals math), Pitfall #5 (missing per-tx mint limit)

### Prior Phases
- `.planning/phases/02-contract-foundation/02-CONTEXT.md` — Inheritance chain, no Ownable
- `.planning/phases/03-erc-20-transfers-and-approvals/03-RESEARCH.md` — OZ v5 _update() chain behavior

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `contracts/RoxasToken.sol` — ERC20 + ERC20Capped with _update() override already in place
- ERC20Capped already enforces 10M cap via _update() — no additional cap check needed in mint()

### Established Patterns
- Solidity 0.8.28 exact pin, MIT SPDX
- OpenZeppelin v5 import style
- _update() override for dual inheritance

### Integration Points
- Constructor _mint() will set initial totalSupply — affects Phase 5 deployment tests
- TypeChain types will regenerate after compile — Phase 5/6 tests consume these

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond the decided parameters.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-minting-mechanics*
*Context gathered: 2026-04-05*
