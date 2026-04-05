# Feature Landscape

**Domain:** ERC-20 Token Smart Contract (RoxasToken / RXS)
**Researched:** 2026-04-05

## Table Stakes

Features users expect. Missing = contract is non-compliant or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **ERC-20 Standard Interface** (6 mandatory functions + 2 events) | Wallets, exchanges, dApps all expect `transfer`, `approve`, `transferFrom`, `allowance`, `balanceOf`, `totalSupply` plus `Transfer`/`Approval` events. Without this, the token is invisible to the ecosystem. | Low | OpenZeppelin ERC20 base provides all of this out of the box. |
| **Token Metadata** (`name`, `symbol`, `decimals`) | Every wallet and block explorer expects these. A token without name/symbol is unusable. | Low | OpenZeppelin ERC20 constructor handles this. Use 18 decimals (Ethereum standard). |
| **Hard Supply Cap** (10M RXS) | PROJECT.md requirement. Prevents infinite inflation. Users need to trust the supply ceiling is immutable. | Low | Use OpenZeppelin `ERC20Capped` -- immutable cap set at construction, enforced on every mint via `_update` override. |
| **Initial Supply Mint** (1M to deployer) | PROJECT.md requirement. Deployer needs tokens for distribution and testing. | Low | Single `_mint()` call in constructor. Must be under the 10M cap. |
| **Public Minting with Per-Transaction Limit** (~1000 RXS per tx) | PROJECT.md requirement. Anyone can mint, but single-call supply drain is prevented. | Low | Custom `mint(uint256 amount)` function with `require(amount <= MAX_MINT_PER_TX)`. Cap enforcement comes from ERC20Capped. |
| **Sepolia Testnet Deployment** | PROJECT.md requirement. Token must be deployable to the current Ethereum Foundation testnet. | Low | Hardhat 3 config with Sepolia RPC (Alchemy/Infura), deployer key via configVariable. |
| **Etherscan Verification** | PROJECT.md requirement. Users need to read and trust the contract source. Unverified contracts are suspicious. | Low | `hardhat ignition deploy --verify` handles deploy + verify in one command. |
| **Comprehensive Test Suite** | PROJECT.md requirement. Deploy, mint, transfer, cap enforcement, edge cases all need coverage. | Medium | Hardhat 3 + Mocha + ethers v6 + Chai matchers. Test: deploy state, mint happy path, mint at cap boundary, mint over cap revert, transfer, approve/transferFrom, zero-address checks. |
| **Standard Event Emission** | Off-chain services rely on `Transfer` and `Approval` events. | Low | Automatic from OpenZeppelin ERC20. Minting emits `Transfer(address(0), to, amount)`. |

## Differentiators

Features that add value beyond the minimum. Low effort, high signal for a portfolio project.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Custom Mint Event** | Emit `TokensMinted(address indexed minter, uint256 amount)` beyond the standard `Transfer` event. Makes it trivial for the frontend to distinguish mints from transfers. | Low | One extra `emit` in the mint function. Useful for future frontend integration. |
| **View Functions for Constants** | Public getters for `MAX_MINT_PER_TX` and `cap()` so frontends can read parameters without hardcoding. | Low | Public constants are automatically exposed as view functions. Nearly free. |
| **Per-Address Cooldown** | Prevents a single address from calling `mint()` repeatedly to drain supply. Adds anti-abuse beyond per-tx limit. | Low | `mapping(address => uint256) lastMintBlock` + `require(block.number > lastMintBlock[msg.sender])`. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Upgradeability / Proxy Pattern** | Massive complexity. OZ upgrades plugin for HH3 is still alpha. Testnet token does not need it. Immutability is a feature. | Deploy immutable. Redeploy if changes needed (it is testnet). |
| **Governance / Voting** (ERC20Votes) | Out of scope per PROJECT.md. Requires delegation, checkpointing, Governor contract. | Omit entirely. |
| **Flash Loans** (ERC20FlashMint) | No DeFi integration planned. Adds attack surface with zero value. | Omit entirely. |
| **Staking / Yield** | Requires separate contract, reward calculations, time-weighted logic. Way out of scope. | Omit entirely. |
| **Whitelist / KYC** | Contradicts public minting. Adds centralization. | Keep minting fully public. |
| **Fee-on-Transfer / Tax** | Breaks composability. Creates accounting nightmares. Users hate it. | Standard transfers with no fees. |
| **Rebasing / Elastic Supply** | Complex accounting that breaks DeFi integrations. | Fixed supply with standard mint. |
| **Pause/Unpause** | PROJECT.md explicitly excludes this. Adds admin power that contradicts "anyone can mint" design. | Omit. Keep it simple. |
| **Burn** | PROJECT.md explicitly excludes this. | Omit. Can add in v2 if needed. |
| **Mainnet Deployment** | PROJECT.md constraint -- testnet only. | Sepolia only. |
| **Ownable / Access Control on Mint** | Contradicts "public minting" requirement. No admin functions needed in scope. | No Ownable import. Mint is fully public. |

## Feature Dependencies

```
ERC20 Base (name, symbol, decimals, 6 functions, 2 events)
  |
  +-- ERC20Capped (requires ERC20 _update override)
  |     |
  |     +-- Public Mint Function (requires cap enforcement)
  |     |     |
  |     |     +-- Per-Transaction Limit (enforced in mint)
  |     |     +-- Per-Address Cooldown [OPTIONAL]
  |     |     +-- Custom Mint Event [OPTIONAL]
  |     |
  |     +-- Initial Supply Mint (in constructor, under cap)
  |
  +-- Test Suite (requires all features)
  |
  +-- Ignition Module (requires compilation)
        |
        +-- Sepolia Deployment + Etherscan Verify (one command)
```

## MVP Recommendation

This project is already scoped to MVP. Every active requirement in PROJECT.md is table-stakes for the stated goal.

**Build order (follows dependency chain):**

1. **ERC20 + ERC20Capped contract** with cap, initial supply, and public mint -- all in one contract
2. **Full test suite** -- deploy, mint, transfer, cap enforcement, edge cases
3. **Ignition deployment module** -- declarative deployment definition
4. **Sepolia deployment + verification** -- single command with `--verify` flag

**Include if time allows (low effort, high value):**
- Custom `TokensMinted` event (one line of code)
- View functions for constants (free with public constants)

**Defer (per PROJECT.md):**
- Frontend integration (future phase)
- Pause/burn (explicitly excluded)
- Governance, staking, bridging (explicitly excluded)

## Sources

- [EIP-20: Token Standard](https://eips.ethereum.org/EIPS/eip-20) -- HIGH confidence
- [OpenZeppelin Contracts v5 ERC20 API](https://docs.openzeppelin.com/contracts/5.x/api/token/erc20) -- HIGH confidence
- [OpenZeppelin ERC20Capped Source](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/ERC20Capped.sol) -- HIGH confidence
- [OpenZeppelin ERC20 Supply Patterns](https://docs.openzeppelin.com/contracts/5.x/erc20-supply) -- HIGH confidence
