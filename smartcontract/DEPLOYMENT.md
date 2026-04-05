# RoxasToken Deployment Guide

## Prerequisites

1. **Sepolia ETH** — Get testnet ETH from a faucet (e.g., [sepoliafaucet.com](https://sepoliafaucet.com))
2. **Infura account** — Create a project at [infura.io](https://infura.io) and get your Sepolia RPC URL
3. **Etherscan API key** — Register at [etherscan.io/apis](https://etherscan.io/apis)
4. **Deployer wallet** — A wallet with Sepolia ETH for gas

## Setup Secrets

### Option A: Encrypted Keystore (Recommended)

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set DEPLOYER_PRIVATE_KEY
npx hardhat keystore set ETHERSCAN_API_KEY
```

Each command prompts for the value and stores it encrypted on disk.

### Option B: Environment Variables

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

The `configVariable()` in `hardhat.config.ts` reads from keystore first, then env vars.

## Deploy to Sepolia

```bash
npx hardhat ignition deploy ignition/modules/RoxasToken.ts --network sepolia
```

This deploys the contract and saves the deployment state to `ignition/deployments/`.

## Verify on Etherscan

### Option A: Deploy + Verify in One Command

```bash
npx hardhat ignition deploy ignition/modules/RoxasToken.ts --network sepolia --verify
```

### Option B: Verify After Deployment

```bash
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS
```

No constructor arguments needed (constructor is parameterless).

## Verify Deployment

After deployment, confirm:

```bash
# Check contract responds
npx hardhat console --network sepolia
> const token = await ethers.getContractAt("RoxasToken", "DEPLOYED_ADDRESS")
> await token.name()    // "Roxas Token"
> await token.symbol()  // "RXS"
> await token.cap()     // 10000000000000000000000000n (10M with 18 decimals)
> await token.totalSupply() // 1000000000000000000000000n (1M with 18 decimals)
```

## Contract Details

| Property | Value |
|----------|-------|
| Name | Roxas Token |
| Symbol | RXS |
| Decimals | 18 |
| Initial Supply | 1,000,000 RXS (to deployer) |
| Max Supply (Cap) | 10,000,000 RXS |
| Mint Limit | 1,000 RXS per transaction |
| Cooldown | 60 seconds between mints per address |
| Solidity | 0.8.28 |
| Network | Sepolia testnet |
