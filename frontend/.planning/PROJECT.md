# Ethereum Wallet Viewer

## What This Is

A mobile app (Expo/React Native) that lets users connect their Ethereum wallet via MetaMask or WalletConnect, view their ETH balance, and browse recent transaction history. Built for crypto users who want a quick, read-only view of their on-chain activity.

## Core Value

Users can connect their Ethereum wallet and instantly see their balance and recent transactions.

## Current Milestone: v1.0 Wallet UI

**Goal:** Build the foundational wallet connection and viewing experience.

**Target features:**
- Ethereum wallet connection (MetaMask / WalletConnect)
- ETH balance display
- Transaction history (last 10 transactions)
- Error handling for failed connections and API calls

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

- [ ] Wallet connection via MetaMask and WalletConnect
- [ ] ETH balance display
- [ ] Transaction history viewing (last 10)
- [ ] Connection error handling
- [ ] API error handling

### Out of Scope

- Token balances (ERC-20) — focus on native ETH for v1
- Transaction sending — read-only for v1
- Multiple chain support — Ethereum mainnet only for v1
- Fiat currency conversion — defer to v2

## Context

- Codebase is Expo SDK 54 + React Native 0.81 with NativeWind styling and Zustand state management
- Expo Router for file-based routing
- Follows Bulletproof React architecture (features-based)
- Will use ethers.js or web3.js for blockchain interactions
- WalletConnect and MetaMask for wallet connection protocols

## Constraints

- **Tech stack**: Must use existing Expo/React Native setup — no ejecting
- **Blockchain library**: web3.js or ethers.js (per task requirements)
- **Architecture**: Follow existing Bulletproof React feature-based structure

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Expo/React Native (not plain web) | Existing codebase is RN — build on what exists | — Pending |
| ethers.js vs web3.js | TBD during research | — Pending |

---
*Last updated: 2026-04-01 after milestone v1.0 initialization*
