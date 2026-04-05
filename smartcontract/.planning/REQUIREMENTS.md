# Requirements: RoxasToken Smart Contract

**Defined:** 2026-04-05
**Core Value:** Anyone can mint RXS tokens up to a hard cap, and freely transfer them between addresses

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Token Core

- [ ] **TOKN-01**: Contract implements ERC-20 standard (name, symbol, decimals, totalSupply, balanceOf)
- [ ] **TOKN-02**: User can transfer tokens to any address via `transfer()`
- [ ] **TOKN-03**: User can approve another address to spend tokens via `approve()`
- [ ] **TOKN-04**: Approved address can transfer tokens on behalf of owner via `transferFrom()`
- [ ] **TOKN-05**: Contract emits Transfer event on every token movement
- [ ] **TOKN-06**: Contract emits Approval event on every approval change

### Minting

- [ ] **MINT-01**: Any address can mint tokens by calling the public `mint()` function
- [ ] **MINT-02**: Each mint call is limited to 1000 RXS maximum per transaction
- [ ] **MINT-03**: Total supply cannot exceed 10,000,000 RXS (hard cap enforced by contract)
- [ ] **MINT-04**: Deployer receives 1,000,000 RXS initial supply at deployment
- [ ] **MINT-05**: Same address cannot mint again within a cooldown period (per-address cooldown)
- [ ] **MINT-06**: Contract emits custom TokensMinted(minter, amount) event on each mint

### Infrastructure

- [x] **INFR-01**: Hardhat 3 ESM project with TypeScript configuration compiles successfully
- [ ] **INFR-02**: OpenZeppelin v5 contracts installed and ERC20Capped inheritance works
- [ ] **INFR-03**: TypeChain generates typed contract interfaces after compilation
- [x] **INFR-04**: .gitignore excludes artifacts/, cache/, node_modules/, .env
- [x] **INFR-05**: .env.example documents required environment variables

### Testing

- [ ] **TEST-01**: Tests verify deployment state (name, symbol, decimals, initial supply, cap)
- [ ] **TEST-02**: Tests verify public mint succeeds and updates balance and totalSupply
- [ ] **TEST-03**: Tests verify mint reverts when per-transaction limit exceeded
- [ ] **TEST-04**: Tests verify mint reverts when total supply would exceed hard cap
- [ ] **TEST-05**: Tests verify mint reverts when cooldown period has not elapsed
- [ ] **TEST-06**: Tests verify transfer succeeds and emits Transfer event
- [ ] **TEST-07**: Tests verify transfer reverts on insufficient balance
- [ ] **TEST-08**: Tests verify approve + transferFrom flow works correctly
- [ ] **TEST-09**: Tests verify cap boundary conditions (mint exactly to cap, then revert)

### Deployment

- [ ] **DEPL-01**: Hardhat Ignition module deploys RoxasToken to Sepolia testnet
- [ ] **DEPL-02**: Contract source is verified on Etherscan after deployment

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Token Extensions

- **EXTV2-01**: Owner can pause all token transfers (Pausable)
- **EXTV2-02**: Token holders can burn their own tokens (Burnable)
- **EXTV2-03**: Gasless approvals via ERC-2612 permit signatures

### Frontend Integration

- **INTV2-01**: Wallet viewer displays RXS token balance
- **INTV2-02**: Users can mint RXS tokens from the frontend
- **INTV2-03**: Users can transfer RXS tokens from the frontend

## Out of Scope

| Feature | Reason |
|---------|--------|
| ERC-721 (NFT) | ERC-20 chosen for simplicity and wallet viewer compatibility |
| Mainnet deployment | Testnet only for this milestone |
| Upgradeability / proxy patterns | Unnecessary complexity for a simple token |
| Governance / voting | Not relevant to project goals |
| Fee-on-transfer / rebasing | Anti-features that break DeFi composability |
| Flash loans | Attack surface with no benefit for this use case |
| Owner-only minting | Replaced by public minting per project decision |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFR-01 | Phase 1 | Complete |
| INFR-04 | Phase 1 | Complete |
| INFR-05 | Phase 1 | Complete |
| INFR-02 | Phase 2 | Pending |
| INFR-03 | Phase 2 | Pending |
| TOKN-01 | Phase 2 | Pending |
| TOKN-02 | Phase 3 | Pending |
| TOKN-03 | Phase 3 | Pending |
| TOKN-04 | Phase 3 | Pending |
| TOKN-05 | Phase 3 | Pending |
| TOKN-06 | Phase 3 | Pending |
| MINT-01 | Phase 4 | Pending |
| MINT-02 | Phase 4 | Pending |
| MINT-03 | Phase 4 | Pending |
| MINT-04 | Phase 4 | Pending |
| MINT-05 | Phase 4 | Pending |
| MINT-06 | Phase 4 | Pending |
| TEST-01 | Phase 5 | Pending |
| TEST-02 | Phase 5 | Pending |
| TEST-03 | Phase 5 | Pending |
| TEST-04 | Phase 5 | Pending |
| TEST-05 | Phase 5 | Pending |
| TEST-06 | Phase 6 | Pending |
| TEST-07 | Phase 6 | Pending |
| TEST-08 | Phase 6 | Pending |
| TEST-09 | Phase 6 | Pending |
| DEPL-01 | Phase 7 | Pending |
| DEPL-02 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-05 after roadmap creation*
