# RoxasToken Smart Contract

## What This Is

An ERC-20 smart contract for the Roxas Token (RXS) that supports public minting with a hard supply cap. It extends the existing Ethereum wallet viewer monorepo (Expo/React Native + Express.js) with on-chain token functionality, deployable to Sepolia testnet via Hardhat.

## Core Value

Anyone can mint RXS tokens up to a hard cap, and freely transfer them between addresses — a working, deployable ERC-20 that demonstrates real token mechanics.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Public minting with per-transaction limit
- [ ] 10M hard supply cap enforced by contract
- [ ] 1M initial supply minted to deployer
- [ ] Token transfers between any addresses (ERC-20 standard)
- [ ] Approve + transferFrom flow (ERC-20 standard)
- [ ] Deployable to Sepolia testnet
- [ ] Full test coverage (deploy, mint, transfer, cap enforcement)
- [ ] Etherscan verification support

### Out of Scope

- Frontend integration — planned for a future phase, not this milestone
- ERC-721 (NFT) — ERC-20 chosen for simplicity and wallet viewer compatibility
- Mainnet deployment — testnet only for now
- Tokenomics / governance — this is a straightforward utility token
- Pause/burn functionality — keep it simple

## Context

- The monorepo already has `frontend/` (Expo/React Native) and `backend/` (Express.js) directories
- The wallet viewer already displays ETH balances via Etherscan API
- Rinkeby and Goerli are deprecated; Sepolia is the current Ethereum Foundation testnet
- Project uses npm/TypeScript throughout; Hardhat is the natural toolchain fit
- OpenZeppelin v5.x for base contracts
- Hardhat-toolbox v5 bundles ethers v6, matching the existing project's ethers dependency

## Constraints

- **Tech stack**: Solidity 0.8.24, Hardhat, OpenZeppelin v5, TypeScript
- **Directory**: New `contracts/` directory at project root (sibling to frontend/backend)
- **Testnet**: Sepolia only — no mainnet deployment
- **Mint limit**: ~1000 RXS per transaction to prevent abuse
- **Supply cap**: 10,000,000 RXS maximum total supply (18 decimals)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| ERC-20 over ERC-721 | Simpler, fits wallet viewer (balances), demonstrates mint + transfer | — Pending |
| Public minting with per-tx limit | Open access but prevents single-call supply drain | — Pending |
| 10M hard cap | Reasonable supply ceiling, enforced on-chain | — Pending |
| Hardhat over Foundry | Project is npm/TypeScript; Hardhat is the natural fit | — Pending |
| Sepolia testnet | Rinkeby/Goerli deprecated; Sepolia is current recommendation | — Pending |

---
*Last updated: 2026-04-05 after initialization*
