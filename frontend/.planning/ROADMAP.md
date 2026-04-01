# Roadmap: Ethereum Wallet Viewer

## Overview

Five phases built in strict dependency order. Phase 1 installs polyfills and confirms the EAS development build runs on device — nothing else can proceed without this. Phase 2 delivers wallet connection end-to-end (WalletConnect modal, MetaMask deep-link, session persistence, disconnect). Phase 3 adds ETH balance display, validating the ethers.js integration through a real connected session. Phase 4 adds transaction history via the Etherscan API. Phase 5 hardens all error paths and applies polish (pull-to-refresh, copy-to-clipboard, relative timestamps, direction color-coding).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Polyfills** - Wire polyfills, Babel/Metro config, and EAS dev build so the app boots on device without errors (completed 2026-04-01)
- [ ] **Phase 2: Wallet Connection** - User can connect, persist, and disconnect an Ethereum wallet via WalletConnect v2 and MetaMask deep-link
- [ ] **Phase 3: Balance Display** - Connected user sees their ETH balance formatted in ETH at the top of the wallet screen
- [ ] **Phase 4: Transaction History** - Connected user sees their last 10 transactions with direction, amount, counterparty, and timestamp
- [ ] **Phase 5: Error Handling & Polish** - All error states surface with retry affordances; pull-to-refresh, address copy, and visual polish are applied

## Phase Details

### Phase 1: Foundation & Polyfills
**Goal**: App boots on a physical device without polyfill or crypto errors, and all environment variables and build tooling are in place for feature development
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03
**Success Criteria** (what must be TRUE):
  1. App launches on a physical device (iOS or Android) built via EAS development build without any polyfill or crypto-related runtime crash
  2. `babel.config.js` has both `unstable_transformImportMeta: true` and `unstable_transformProfile: 'hermes-stable'` set, and the app compiles without BigInt errors
  3. `@walletconnect/react-native-compat` is the first import in `lib/appkit.ts` and the AppKit singleton initializes without errors visible in the Metro log
  4. All three environment variables (Reown Project ID, Etherscan API key, RPC URL) are readable from `config/env.ts` in the running app
**Plans:** 2/2 plans complete
Plans:
- [x] 01-01-PLAN.md — Install packages, create Babel/Metro configs, set up env vars
- [x] 01-02-PLAN.md — Create AppKit singleton, wire provider, build smoke test screen, verify on device

### Phase 2: Wallet Connection
**Goal**: Users can connect their Ethereum wallet, have their session survive app restarts, and disconnect when needed
**Depends on**: Phase 1
**Requirements**: WALLET-01, WALLET-02, WALLET-03, WALLET-04
**Success Criteria** (what must be TRUE):
  1. User taps "Connect Wallet" and the WalletConnect v2 modal opens showing a QR code and a list of wallet options (including MetaMask)
  2. User can connect via the MetaMask deep-link path and is returned to the app with their address displayed after approving in MetaMask
  3. After connecting, the user closes and reopens the app and their wallet address is still shown without needing to reconnect
  4. User taps "Disconnect" and their session is cleared — the app returns to the disconnected state
**Plans:** 2 plans
Plans:
- [ ] 02-01-PLAN.md — Install deps, configure wallet detection (app.json, queries.js), build data layer (types, store, hooks), wire AppProvider
- [ ] 02-02-PLAN.md — Build wallet UI components (6 components), replace smoke test with wallet screen, verify on device

### Phase 3: Balance Display
**Goal**: A connected user can see their ETH balance formatted in human-readable ETH on the wallet screen
**Depends on**: Phase 2
**Requirements**: BAL-01
**Success Criteria** (what must be TRUE):
  1. After connecting a wallet, the user sees their ETH balance displayed in ETH (not Wei) with 4-6 decimal places on the wallet screen
  2. While the balance is loading, a loading indicator is visible in place of the balance value
**Plans**: TBD

### Phase 4: Transaction History
**Goal**: A connected user can see their last 10 Ethereum transactions with enough detail to understand each one
**Depends on**: Phase 3
**Requirements**: TX-01, TX-02
**Success Criteria** (what must be TRUE):
  1. The wallet screen shows up to 10 recent transactions, each displaying the transaction hash (truncated), from/to address (truncated), ETH value, and a timestamp
  2. User can distinguish incoming from outgoing transactions visually (direction indicator)
  3. User pulls down on the transaction list and the balance and transactions both refresh with updated data from the network
**Plans**: TBD

### Phase 5: Error Handling & Polish
**Goal**: All async failures surface clear, actionable error messages with retry affordances, and the experience is polished with copy, relative timestamps, and amount color-coding
**Depends on**: Phase 4
**Requirements**: ERR-01, ERR-02, ERR-03
**Success Criteria** (what must be TRUE):
  1. When wallet connection fails, the user sees a readable error message (not a raw exception) explaining what went wrong
  2. When the ETH balance or transaction history fetch fails, the user sees an error message specific to that section
  3. User can tap a retry button on any failed section and the app re-attempts the failed operation without requiring a full restart
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Polyfills | 2/2 | Complete   | 2026-04-01 |
| 2. Wallet Connection | 0/2 | Planning complete | - |
| 3. Balance Display | 0/? | Not started | - |
| 4. Transaction History | 0/? | Not started | - |
| 5. Error Handling & Polish | 0/? | Not started | - |
