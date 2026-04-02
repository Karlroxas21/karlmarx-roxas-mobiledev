# Stack Research: Ethereum Address API

**Date:** 2026-04-02
**Confidence:** HIGH (versions verified via npm registry)

## Existing Stack (Keep)

| Technology | Version | Role |
|-----------|---------|------|
| TypeScript | 6.0.2 | Language |
| Express | 5.2.1 | Web framework |
| Winston | 3.19.0 | Logging |
| TypeORM | 0.3.28 | ORM (installed, not configured) |
| Node.js | 24.12.0 | Runtime |

## New Dependencies (Add)

### Runtime

| Package | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| `axios` | 1.14.0 | HTTP client for Etherscan API | Ships own types, no extra `@types/` needed. Preferred over native `fetch` for interceptors, error handling, and timeout config. |
| `ioredis` | 5.10.1 | Redis client for caching | Ships own types. TypeORM already depends on `ioredis ^5.0.4` as peer dep — promoting to direct dep avoids version conflicts. Preferred over `node-redis` for this reason. |
| `pg` | 8.20.0 | PostgreSQL driver for TypeORM | Required peer dependency for TypeORM's `postgres` driver. |
| `reflect-metadata` | 0.2.2 | Decorator metadata for TypeORM entities | **CRITICAL:** TypeORM decorators silently fail without this. Must be imported at app entry point (`index.ts`). |
| `dotenv` | 17.4.0 | Environment variable loading | Load `.env` file for API keys and connection strings. |

### Development

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/pg` | 8.20.0 | TypeScript types for pg driver |

### Install Command

```bash
npm install axios ioredis pg reflect-metadata dotenv
npm install -D @types/pg
```

## Required tsconfig.json Changes

**CRITICAL:** The existing `tsconfig.json` is missing decorator support:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

Without these, TypeORM entity decorators compile but fail silently at runtime.

## What NOT to Use

| Package | Why Not |
|---------|---------|
| `ethers` / `ethers.js` v6 | Designed for contract interaction, not REST reads. Over-engineering for simple HTTP GET calls to Etherscan. |
| `viem` v2 | ESM-only — incompatible with project's `"type": "commonjs"` in package.json. |
| `web3.js` | Same as ethers — heavyweight, designed for contract interaction. |
| `node-redis` | Would add a second Redis client alongside ioredis (TypeORM peer dep). Unnecessary version conflict risk. |
| `@types/axios` | Axios 1.x ships own types. Installing `@types/axios` would shadow them. |

## Docker Stack

| Image | Tag | Purpose |
|-------|-----|---------|
| `node` | `24-alpine` | App container (matches runtime) |
| `postgres` | `17-alpine` | Database |
| `redis` | `7-alpine` | Cache |

## Environment Variables (New)

```env
ETHERSCAN_API_KEY=      # Required — Etherscan API key
ETHERSCAN_BASE_URL=https://api.etherscan.io/api  # Mainnet default
DATABASE_URL=postgres://user:pass@localhost:5432/ethapi
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=15    # Gas price/block number cache TTL
```

---
*Stack research: 2026-04-02*
