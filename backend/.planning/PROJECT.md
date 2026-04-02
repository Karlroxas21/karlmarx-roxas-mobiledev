# Ethereum Address API

## What This Is

A REST API that returns Ethereum network data — gas price, current block number, and account balance — for a given Ethereum address. Built on an existing Express/TypeScript backend with hexagonal architecture. Intended as a learning/interview project demonstrating clean architecture, caching, database integration, and containerization.

## Core Value

Given an Ethereum address, return accurate gas price, block number, and balance in a single clean JSON response.

## Requirements

### Validated

<!-- Existing capabilities from current codebase -->

- ✓ Express 5 HTTP server with hexagonal architecture — existing
- ✓ Manual dependency injection via composition root (`wire.ts`) — existing
- ✓ Winston structured logging with request correlation — existing
- ✓ Controller interface pattern for route registration — existing
- ✓ Component template structure (interfaces, service, DTOs, constants) — existing

### Active

- [ ] REST endpoint `GET /api/ethereum/:address` returning gas price, block number, and balance
- [ ] Etherscan API integration for Ethereum network data
- [ ] Redis caching for gas price and block number (reduce Etherscan API calls)
- [ ] PostgreSQL database to store account balances (via TypeORM)
- [ ] Dockerfile and Docker Compose for the full backend stack
- [ ] Proper error handling for invalid addresses and API failures

### Out of Scope

- Frontend/UI — this is API-only
- Authentication/authorization — not needed for this scope
- Multiple blockchain support — Ethereum only
- WebSocket/real-time updates — REST polling is sufficient
- Production deployment — Docker for local development only

## Context

- Existing codebase has hexagonal architecture scaffolding with empty auth component as template
- TypeORM is already installed but not configured — will be used for PostgreSQL
- Etherscan free API tier (5 calls/sec) — caching with Redis mitigates rate limits
- Target network: Ethereum Mainnet (configurable via env var)
- API design: path parameter for address (`GET /api/ethereum/:address`)
- This is a learning/interview exercise — emphasis on clean code and demonstrating patterns

## Constraints

- **API Provider**: Etherscan — free tier, requires API key
- **Rate Limit**: Etherscan free tier allows 5 calls/second — Redis caching is essential
- **Tech Stack**: Express 5, TypeScript, TypeORM, Redis, PostgreSQL, Docker (aligned with existing codebase)
- **Architecture**: Must follow existing hexagonal architecture pattern

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Etherscan over Alchemy/Covalent | User preference, REST API with straightforward integration | — Pending |
| Path param over query param | Clean REST style (`/api/ethereum/:address`) | — Pending |
| Mainnet with configurable network | Real data for demos, env var to switch | — Pending |
| Redis for caching gas/block only | These change frequently but are same for all users; balance is per-address | — Pending |
| PostgreSQL for balance storage | Persistent storage, TypeORM already installed | — Pending |

---
*Last updated: 2026-04-02 after initialization*
