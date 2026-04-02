# Requirements: Ethereum Wallet Viewer

**Defined:** 2026-04-01
**Core Value:** Users can connect their Ethereum wallet and instantly see their balance and recent transactions.

## v1.0 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [x] **FOUND-01**: App bootstraps with correct polyfill import order (WalletConnect compat, crypto shims)
- [x] **FOUND-02**: EAS development build configured and runnable on device/emulator
- [x] **FOUND-03**: Environment variables configured (Reown Project ID, Etherscan API key, RPC URL)

### Wallet Connection

- [x] **WALLET-01**: User can connect Ethereum wallet via WalletConnect v2 modal (supports MetaMask + 300 wallets)
- [x] **WALLET-02**: User can connect directly via MetaMask deep link
- [x] **WALLET-03**: User's wallet session persists across app restarts
- [x] **WALLET-04**: User can disconnect their wallet

### Balance

- [x] **BAL-01**: User can view their ETH balance (formatted in ETH, 4-6 decimal places)

### Transactions

- [x] **TX-01**: User can view their last 10 transactions with basic details (hash, from/to, value, timestamp)
- [x] **TX-02**: User can pull-to-refresh to update balance and transactions

### Error Handling

- [x] **ERR-01**: User sees clear error message when wallet connection fails
- [x] **ERR-02**: User sees clear error message when API/RPC calls fail
- [x] **ERR-03**: User can retry failed operations via a retry button

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Token Support

- **TOKEN-01**: User can view ERC-20 token balances
- **TOKEN-02**: User can view token transfer history

### Multi-Chain

- **CHAIN-01**: User can switch between Ethereum networks (mainnet, testnets)
- **CHAIN-02**: User can view balances on multiple chains

### Fiat Conversion

- **FIAT-01**: User can see ETH balance converted to fiat currency (USD, EUR, etc.)

## Out of Scope

| Feature                  | Reason                                                     |
| ------------------------ | ---------------------------------------------------------- |
| Transaction sending      | Read-only viewer for v1 — sending adds security complexity |
| ERC-20 token balances    | Focus on native ETH for v1; defer to v2                    |
| Multi-chain support      | Ethereum mainnet only for v1                               |
| Fiat currency conversion | Requires price feed integration; defer to v2               |
| Real-time auto-polling   | Anti-feature — hits Etherscan free tier rate limits        |
| OAuth / social login     | Wallet-based auth only                                     |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase   | Status   |
| ----------- | ------- | -------- |
| FOUND-01    | Phase 1 | Complete |
| FOUND-02    | Phase 1 | Complete |
| FOUND-03    | Phase 1 | Complete |
| WALLET-01   | Phase 2 | Complete |
| WALLET-02   | Phase 2 | Complete |
| WALLET-03   | Phase 2 | Complete |
| WALLET-04   | Phase 2 | Complete |
| BAL-01      | Phase 3 | Complete |
| TX-01       | Phase 4 | Complete |
| TX-02       | Phase 4 | Complete |
| ERR-01      | Phase 5 | Complete |
| ERR-02      | Phase 5 | Complete |
| ERR-03      | Phase 5 | Complete |

**Coverage:**

- v1.0 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---

_Requirements defined: 2026-04-01_
_Last updated: 2026-04-01 after roadmap creation_
