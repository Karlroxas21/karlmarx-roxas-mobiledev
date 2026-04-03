# Ethereum Address API

REST API that returns gas price, current block number, and account balance for a given Ethereum address.

## Tech Stack

- **Runtime:** Node.js 24 + TypeScript 6
- **Framework:** Express 5
- **Database:** PostgreSQL 17 (via TypeORM)
- **Cache:** Redis 7 (via ioredis)
- **Ethereum Data:** Etherscan API
- **Architecture:** Hexagonal (ports & adapters) with manual dependency injection

## Getting Started

### Prerequisites

- Node.js 24+
- PostgreSQL 17
- Redis 7
- [Etherscan API key](https://etherscan.io/apis) (free tier)

### Setup

```bash
npm install
cp .env.example .env
# Edit .env and set your ETHERSCAN_API_KEY
```

### Run (Development)

```bash
npm run dev
```

### Run (Docker)

```bash
cp .env.example .env
# Edit .env:
#   - Set ETHERSCAN_API_KEY
#   - Uncomment Docker connection strings (postgres:5432, redis:6379)
#   - Comment out localhost connection strings

docker compose up --build
```

The API will be available at `http://localhost:3000`.

## API Documentation (Swagger)

Interactive API docs are available at:

```
http://localhost:3000/api-docs
```

The OpenAPI spec is auto-generated from JSDoc annotations on route handlers using `swagger-jsdoc`. No manual spec file to maintain — add `@openapi` comments to new routes and they appear automatically.

## API Endpoints

### Get Ethereum Data

```
GET /api/ethereum/:address
```

Returns gas price, block number, and balance for the given Ethereum address.

**Example:**

```bash
curl http://localhost:3000/api/ethereum/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

**Success Response (200):**

```json
{
  "data": {
    "gasPrice": {
      "wei": "496840168000",
      "gwei": "496840168"
    },
    "blockNumber": "23468896",
    "balance": {
      "wei": "1234567890000000000",
      "eth": "1.234567890000000000"
    },
    "timestamp": "2026-04-02T12:00:00.000Z"
  }
}
```

**Invalid Address (400):**

```json
{
  "error": {
    "message": "Invalid Ethereum address: not-an-address",
    "code": "VALIDATION_ERROR"
  }
}
```

**Etherscan Failure (502):**

```json
{
  "error": {
    "message": "Etherscan API error: Max rate limit reached",
    "code": "UPSTREAM_ERROR"
  }
}
```

### Health Check

```
GET /api/health
```

```json
{ "status": "ok" }
```

## Architecture

This project follows **Hexagonal Architecture** (Ports & Adapters) with **Domain-Driven Design** principles:

- **Domain layer** (`component/`) — Business logic and port interfaces. Zero infrastructure dependencies. The `EthereumService` orchestrates all operations against abstract ports, making it fully testable with mocks.
- **Adapter layer** (`infrastructure/`) — Concrete implementations of ports for external systems (Etherscan API, Redis, PostgreSQL). Each adapter is independently swappable.
- **Entrypoint layer** (`entrypoint/`) — HTTP controllers that translate requests/responses. No business logic lives here.
- **Composition root** (`wire.ts`) — Manual dependency injection wires adapters into services into controllers. No DI container library — dependencies are explicit and traceable.

### Caching Strategy

Gas price and block number are **global values** (same for all users) that change every ~12 seconds (Ethereum block time). These are cached in Redis with a **15-second TTL** to reduce Etherscan API calls (free tier: 5 req/sec).

Account balance is **per-address** and changes with every transaction, so it is **never cached** — always fetched live from Etherscan. Each balance fetch is stored in PostgreSQL as a **historical log** (append-only, not upsert) for auditing purposes.

| Data | Cached | TTL | Storage | Rationale |
|------|--------|-----|---------|-----------|
| Gas Price | Redis | 15s | — | Global, changes slowly, reduces API calls |
| Block Number | Redis | 15s | — | Global, changes every ~12s |
| Balance | Never | — | PostgreSQL | Per-address, stale data is worse than slow |

On cache miss, all three data points are fetched in parallel via `Promise.all`. On cache hit, only the balance is fetched (1 API call instead of 3).

### Directory Structure

```
src/
├── index.ts                          # Entry point
├── server.ts                         # Express server + health endpoint
├── config.ts                         # Env validation + logger
├── wire.ts                           # Composition root (DI wiring)
├── component/ethereum/               # Business logic (ports & service)
│   ├── interfaces.ts                 # Port interfaces
│   ├── service.ts                    # EthereumService
│   ├── response-models.ts            # DTOs + envelope types
│   ├── requests-models.ts            # Request DTOs
│   ├── errors.ts                     # ValidationError, EtherscanApiError
│   └── constants.ts                  # Cache keys + TTL
├── entrypoint/controller/            # HTTP controllers
│   └── ethereum-controller.ts        # GET /api/ethereum/:address
└── infrastructure/                   # External adapters
    ├── etherscan/EtherscanAdapter.ts  # Etherscan API client
    ├── redis/RedisAdapter.ts          # Redis cache adapter
    └── postgres/
        ├── Balance.entity.ts          # TypeORM entity
        └── TypeOrmBalanceRepository.ts
```

### Data Flow

1. Request hits `EthereumController`
2. Controller calls `EthereumService.getEthereumData(address)`
3. Service validates address (ethers.js `isAddress` + `getAddress` normalization)
4. Service checks Redis cache for gas price + block number
5. On cache miss: fetches all 3 from Etherscan via `Promise.all`
6. On cache hit: fetches only balance from Etherscan
7. Stores balance in PostgreSQL (fire-and-forget, non-blocking)
8. Returns structured response with dual units + timestamp

### Resilience

- **Redis down:** Cache reads/writes silently fail, falls back to live Etherscan fetch
- **PostgreSQL down:** Balance insert silently skipped, response still returned
- **Etherscan down:** Returns 502 with structured error

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (nodemon + ts-node) |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled output |
| `npm test` | Run tests (Jest) |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run format` | Prettier format |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HOSTNAME` | No | `0.0.0.0` | Server bind address |
| `PORT` | No | `3000` | Server port |
| `LOG_LEVEL` | No | `info` | Winston log level |
| `NODE_ENV` | No | — | `development` enables TypeORM synchronize |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | Yes | — | Redis connection string |
| `ETHERSCAN_API_KEY` | Yes | — | Etherscan API key |
| `ETHERSCAN_BASE_URL` | Yes | — | Etherscan API base URL |

## Testing

```bash
npm test          # Run all 31 tests
npm test -- --verbose  # With details
```

**Test suites:**
- `config.test.ts` — Env validation
- `ethereum.service.test.ts` — Service business logic (10 tests)
- `ethereum.controller.test.ts` — Controller error mapping (5 tests)
- `etherscan.adapter.test.ts` — Etherscan API client (7 tests)
- `redis.adapter.test.ts` — Redis cache adapter (5 tests)
- `balance.repository.test.ts` — PostgreSQL repository (2 tests)
