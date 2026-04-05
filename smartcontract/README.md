# RoxasToken (RXS)

An ERC-20 smart contract with public minting, hard supply cap, and per-address cooldown. Built with Hardhat 3 and OpenZeppelin v5, deployable to Sepolia testnet.

## Token Specifications

| Property | Value |
|----------|-------|
| **Name** | Roxas Token |
| **Symbol** | RXS |
| **Decimals** | 18 |
| **Initial Supply** | 1,000,000 RXS (minted to deployer) |
| **Max Supply (Cap)** | 10,000,000 RXS |
| **Mint Limit** | 1,000 RXS per transaction |
| **Cooldown** | 60 seconds between mints per address |
| **Solidity** | 0.8.28 |
| **License** | MIT |

## How It Works

**Anyone can mint tokens** by calling the `mint(uint256 amount)` function. Minting is constrained by three rules:

1. **Per-transaction limit** — Each mint call can create at most 1,000 RXS
2. **Hard cap** — Total supply can never exceed 10,000,000 RXS (enforced on-chain via ERC20Capped)
3. **Cooldown** — Each address must wait 60 seconds between mints

The deployer receives 1,000,000 RXS at deployment. The remaining 9,000,000 RXS is available for public minting.

Standard ERC-20 functions (transfer, approve, transferFrom) work as expected with no restrictions.

## Contract Interface

### Public Functions

| Function | Description |
|----------|-------------|
| `mint(uint256 amount)` | Mint tokens to caller (max 1000 RXS, 60s cooldown) |
| `cooldownRemaining(address account)` | Seconds until address can mint again (0 if ready) |
| `transfer(address to, uint256 value)` | Transfer tokens to another address |
| `approve(address spender, uint256 value)` | Approve spender to transfer on your behalf |
| `transferFrom(address from, address to, uint256 value)` | Transfer tokens on behalf of approved owner |
| `balanceOf(address account)` | Get token balance of an address |
| `totalSupply()` | Current total supply |
| `cap()` | Maximum supply cap (10M RXS) |
| `allowance(address owner, address spender)` | Check approved spending allowance |
| `name()` / `symbol()` / `decimals()` | Token metadata |

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `MINT_LIMIT` | 1,000 * 10^18 | Max tokens per mint call |
| `COOLDOWN_PERIOD` | 60 | Seconds between mints per address |
| `INITIAL_SUPPLY` | 1,000,000 * 10^18 | Tokens minted to deployer |

### Events

| Event | Emitted When |
|-------|-------------|
| `TokensMinted(address indexed minter, uint256 amount)` | Successful mint |
| `Transfer(address indexed from, address indexed to, uint256 value)` | Any token movement |
| `Approval(address indexed owner, address indexed spender, uint256 value)` | Allowance change |

### Custom Errors

| Error | Trigger |
|-------|---------|
| `MintLimitExceeded(uint256 amount, uint256 limit)` | Mint amount is 0 or exceeds 1,000 RXS |
| `CooldownNotElapsed(uint256 remaining)` | Address tried to mint before cooldown expired |

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| [Hardhat 3](https://hardhat.org) | ^3.3.0 | Development framework (ESM-first) |
| [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts) | ^5.6.1 | ERC20 + ERC20Capped base contracts |
| [Solidity](https://docs.soliditylang.org) | 0.8.28 | Smart contract language |
| [ethers.js](https://docs.ethers.org/v6/) | v6 (via toolbox) | Ethereum library |
| [Hardhat Ignition](https://hardhat.org/ignition) | via toolbox | Declarative deployment |
| [TypeChain](https://github.com/dethcrypto/TypeChain) | via toolbox | Typed contract interfaces |

## Project Structure

```
smartcontract/
  contracts/
    RoxasToken.sol          # Token contract (71 lines)
  test/
    RoxasToken.test.ts      # Unit tests — deployment, minting, transfers, approvals, cap (23 tests)
    RoxasToken.ignition.test.ts  # Ignition deployment smoke tests (5 tests)
  ignition/
    modules/
      RoxasToken.ts         # Hardhat Ignition deployment module
  hardhat.config.ts         # Hardhat 3 ESM config (Sepolia network, Etherscan verify)
  tsconfig.json             # TypeScript config (ESM, module: "node16")
  .env.example              # Environment variable template
  DEPLOYMENT.md             # Step-by-step deployment guide
```

## Getting Started

### Prerequisites

- Node.js >= 22
- npm

### Install

```bash
cd smartcontract
npm install
```

### Compile

```bash
npx hardhat compile
```

### Run Tests

```bash
npx hardhat test
```

Output:

```
  RoxasToken
    Deployment
      ✔ should have the correct name
      ✔ should have the correct symbol
      ✔ should have 18 decimals
      ✔ should mint initial supply to deployer
      ✔ should set the correct cap
    Minting
      ✔ should allow public minting
      ✔ should emit TokensMinted event
      ✔ should update totalSupply after minting
      ✔ should revert when amount exceeds mint limit
      ✔ should revert when amount is zero
      ✔ should revert when cooldown has not elapsed
      ✔ should allow minting after cooldown elapses
      ✔ should report cooldown remaining
    Cap enforcement
      ✔ should revert when mint would exceed cap
      ✔ should allow minting exactly to the cap
      ✔ should revert even 1 wei mint at cap
    Transfers
      ✔ should transfer tokens and emit Transfer event
      ✔ should allow recipient to transfer received tokens
      ✔ should revert transfer on insufficient balance
      ✔ should revert when transfer amount exceeds balance
    Approvals
      ✔ should approve spender and emit Approval event
      ✔ should allow transferFrom after approval
      ✔ should revert transferFrom without approval

  28 passing
```

### Test Coverage

| Category | Tests | What's Covered |
|----------|-------|----------------|
| Deployment | 5 | Name, symbol, decimals, initial supply, cap |
| Minting | 8 | Public mint, event, supply update, limit revert, zero revert, cooldown revert, post-cooldown, cooldownRemaining |
| Cap Enforcement | 3 | Revert at cap, mint exactly to cap, 1 wei boundary |
| Transfers | 4 | Transfer + event, chain transfer, zero balance revert, exceed balance revert |
| Approvals | 3 | Approve + event, transferFrom flow, unapproved revert |
| Ignition | 5 | Deploy via module, name, symbol, cap, initial supply |

## Deploy to Sepolia

See [DEPLOYMENT.md](DEPLOYMENT.md) for full instructions.

Quick version:

```bash
# 1. Set up secrets (encrypted keystore)
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set DEPLOYER_PRIVATE_KEY
npx hardhat keystore set ETHERSCAN_API_KEY

# 2. Deploy and verify in one command
npx hardhat ignition deploy ignition/modules/RoxasToken.ts --network sepolia --verify
```

### Required Accounts

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| [Infura](https://infura.io) | Sepolia RPC endpoint | Yes |
| [Etherscan](https://etherscan.io/apis) | Contract verification | Yes |
| Sepolia Faucet | Testnet ETH for gas | Free |

## Architecture

```
                    ┌─────────────────────────┐
                    │     RoxasToken.sol       │
                    │                         │
                    │  ERC20 ──── ERC20Capped │
                    │   │              │       │
                    │   └──┬───────────┘       │
                    │      │                   │
                    │   _update() override     │
                    │   (cap enforcement)      │
                    │                         │
                    │  + mint() public        │
                    │  + cooldownRemaining()  │
                    │  + MINT_LIMIT           │
                    │  + COOLDOWN_PERIOD      │
                    │  + INITIAL_SUPPLY       │
                    └─────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        ┌─────────┐   ┌─────────────┐  ┌──────────┐
        │  Tests  │   │  Ignition   │  │  Config  │
        │ 28 pass │   │  Module     │  │  Sepolia │
        └─────────┘   └─────────────┘  └──────────┘
```

The contract inherits from OpenZeppelin's `ERC20` and `ERC20Capped`. The `_update()` internal hook is overridden to satisfy Solidity's diamond inheritance — it delegates to `ERC20Capped._update()` which enforces the 10M cap on every mint. The custom `mint()` function adds per-transaction limit and per-address cooldown on top.

## Part of a Monorepo

This smart contract lives in the `smartcontract/` directory alongside:

- `frontend/` — Expo/React Native wallet viewer
- `backend/` — Express.js API server (uses Etherscan API)
