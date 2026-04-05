# Roadmap: RoxasToken Smart Contract

## Overview

This roadmap delivers a complete ERC-20 token (RXS) from empty directory to verified contract on Sepolia. The path follows the natural dependency chain: toolchain setup, then contract implementation (split into foundation, transfers, and minting), then comprehensive testing (split into mint tests and transfer tests), then deployment and verification. Each phase builds directly on the previous one -- nothing can be parallelized because every phase depends on its predecessor compiling and working.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Project Scaffolding** - Hardhat 3 ESM project with TypeScript compiles successfully
- [x] **Phase 2: Contract Foundation** - ERC20Capped contract with token metadata compiles cleanly (completed 2026-04-05)
- [x] **Phase 3: ERC-20 Transfers and Approvals** - Standard token transfer and approval flows work in contract (completed 2026-04-05)
- [x] **Phase 4: Minting Mechanics** - Public mint with per-tx limit, hard cap, cooldown, and initial supply (completed 2026-04-05)
- [x] **Phase 5: Deployment and Minting Tests** - Tests verify deployment state and all minting behaviors (completed 2026-04-05)
- [x] **Phase 6: Transfer and Boundary Tests** - Tests verify transfers, approvals, and cap boundary conditions (completed 2026-04-05)
- [ ] **Phase 7: Sepolia Deployment** - Contract deployed to Sepolia testnet via Hardhat Ignition
- [ ] **Phase 8: Etherscan Verification** - Contract source verified and readable on Etherscan

## Phase Details

### Phase 1: Project Scaffolding
**Goal**: A working Hardhat 3 ESM project that compiles an empty contract, with all toolchain configuration correct from the start
**Depends on**: Nothing (first phase)
**Requirements**: INFR-01, INFR-04, INFR-05
**Success Criteria** (what must be TRUE):
  1. Running `npx hardhat compile` succeeds with zero errors in the smartcontract/ directory
  2. The project uses ESM (`"type": "module"` in package.json) with `defineConfig` in hardhat.config.ts
  3. A .gitignore exists that excludes artifacts/, cache/, node_modules/, and .env
  4. A .env.example file documents all required environment variables (RPC URL, private key, Etherscan API key)
**Plans**: 1 plan

Plans:
- [x] 01-01-PLAN.md -- Initialize Hardhat 3 ESM project with all config files, .gitignore, .env.example, and compile verification

### Phase 2: Contract Foundation
**Goal**: A RoxasToken contract that inherits ERC20 and ERC20Capped, has correct metadata (name, symbol, decimals), and compiles with TypeChain type generation
**Depends on**: Phase 1
**Requirements**: INFR-02, INFR-03, TOKN-01
**Success Criteria** (what must be TRUE):
  1. OpenZeppelin v5 contracts are installed and the contract inherits from ERC20 and ERC20Capped
  2. The contract compiles and exposes name() returning "Roxas Token", symbol() returning "RXS", and decimals() returning 18
  3. TypeChain generates typed contract interfaces in the artifacts directory after compilation
  4. The contract constructor accepts and sets a cap of 10,000,000 RXS (with 18 decimals)
**Plans**: 1 plan

Plans:
- [x] 02-01-PLAN.md -- Create RoxasToken.sol with ERC20+ERC20Capped inheritance, update .gitignore, compile and verify TypeChain generation

### Phase 3: ERC-20 Transfers and Approvals
**Goal**: The contract implements the full ERC-20 transfer and approval interface so tokens can move between any addresses
**Depends on**: Phase 2
**Requirements**: TOKN-02, TOKN-03, TOKN-04, TOKN-05, TOKN-06
**Success Criteria** (what must be TRUE):
  1. A token holder can transfer tokens to any address via transfer() and the balances update correctly
  2. A token holder can approve another address to spend tokens via approve() and the allowance is set
  3. An approved address can move tokens on behalf of the owner via transferFrom() and balances update
  4. Every token movement emits a Transfer event with correct from, to, and value fields
  5. Every approval change emits an Approval event with correct owner, spender, and value fields
**Plans**: 1 plan

Plans:
- [ ] 03-01-PLAN.md -- Compile contract and verify ABI contains all ERC-20 transfer/approval functions and events (verification-only, no code changes)

### Phase 4: Minting Mechanics
**Goal**: Anyone can mint RXS tokens through a public mint function, constrained by per-transaction limit, hard cap, cooldown, and with initial supply minted to deployer
**Depends on**: Phase 3
**Requirements**: MINT-01, MINT-02, MINT-03, MINT-04, MINT-05, MINT-06
**Success Criteria** (what must be TRUE):
  1. Any address can call mint(amount) and receive newly minted tokens in their balance
  2. Minting more than 1000 RXS in a single transaction reverts
  3. Minting that would push totalSupply above 10,000,000 RXS reverts
  4. The deployer address holds 1,000,000 RXS immediately after deployment
  5. An address that just minted cannot mint again until the cooldown period elapses
  6. Each successful mint emits a TokensMinted(minter, amount) event
**Plans**: 1 plan

Plans:
- [ ] 04-01-PLAN.md -- Add mint function, constants, custom errors/event, cooldown mapping, constructor initial supply, and verify ABI completeness

### Phase 5: Deployment and Minting Tests
**Goal**: Automated tests prove the contract deploys correctly and all minting behaviors (success, limits, cap, cooldown) work as specified
**Depends on**: Phase 4
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. Tests pass that verify deployment state: name is "Roxas Token", symbol is "RXS", decimals is 18, initial supply is 1M RXS, cap is 10M RXS
  2. Tests pass that verify a public mint call succeeds and correctly updates both balance and totalSupply
  3. Tests pass that verify minting over the 1000 RXS per-tx limit reverts with an appropriate error
  4. Tests pass that verify minting reverts when totalSupply would exceed the 10M hard cap
  5. Tests pass that verify minting reverts when the caller's cooldown period has not elapsed
**Plans**: 1 plan

Plans:
- [ ] 05-01-PLAN.md -- Create test file with deployment state, minting behavior, and cap enforcement tests

### Phase 6: Transfer and Boundary Tests
**Goal**: Automated tests prove all transfer and approval flows work correctly, plus cap boundary edge cases are handled
**Depends on**: Phase 5
**Requirements**: TEST-06, TEST-07, TEST-08, TEST-09
**Success Criteria** (what must be TRUE):
  1. Tests pass that verify transfer() succeeds between addresses and emits a Transfer event
  2. Tests pass that verify transfer() reverts when the sender has insufficient balance
  3. Tests pass that verify the full approve() + transferFrom() flow works correctly end-to-end
  4. Tests pass that verify minting exactly to the cap succeeds, then any further mint reverts
**Plans**: 1 plan

Plans:
- [ ] 06-01-PLAN.md -- Add transfer, approval, and cap boundary tests to existing test suite (TEST-06 through TEST-09)

### Phase 7: Sepolia Deployment
**Goal**: The RoxasToken contract is live on the Sepolia testnet, deployed via Hardhat Ignition with correct constructor parameters
**Depends on**: Phase 6
**Requirements**: DEPL-01
**Success Criteria** (what must be TRUE):
  1. A Hardhat Ignition module exists that deploys RoxasToken with the correct constructor arguments
  2. The contract is deployed to Sepolia and the deployment transaction is confirmed on-chain
  3. The deployed contract responds correctly to name(), symbol(), and totalSupply() calls on Sepolia
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

### Phase 8: Etherscan Verification
**Goal**: The contract source code is verified on Etherscan so anyone can read and audit the contract
**Depends on**: Phase 7
**Requirements**: DEPL-02
**Success Criteria** (what must be TRUE):
  1. The contract source code is verified on Sepolia Etherscan and shows a green checkmark
  2. The contract's read functions (name, symbol, totalSupply, cap) are callable from the Etherscan UI
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Scaffolding | 1/1 | Complete    | 2026-04-05 |
| 2. Contract Foundation | 1/1 | Complete    | 2026-04-05 |
| 3. ERC-20 Transfers and Approvals | 0/1 | Complete    | 2026-04-05 |
| 4. Minting Mechanics | 0/1 | Complete    | 2026-04-05 |
| 5. Deployment and Minting Tests | 1/1 | Complete    | 2026-04-05 |
| 6. Transfer and Boundary Tests | 1/1 | Complete    | 2026-04-05 |
| 7. Sepolia Deployment | 0/0 | Not started | - |
| 8. Etherscan Verification | 0/0 | Not started | - |
