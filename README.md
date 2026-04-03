# Ethereum Wallet Viewer

A full-stack mobile application for viewing Ethereum wallet data. Connect your wallet via WalletConnect to view your ETH balance and recent transaction history, backed by a REST API that aggregates blockchain data from Etherscan.

## Architecture

```
frontend/                         backend/
Expo + React Native               Express.js 5
NativeWind (Tailwind)             Hexagonal Architecture
Zustand state                     Redis cache + PostgreSQL
WalletConnect v2                  Etherscan API v2
        │                                 │
        └──── GET /v1/api/ethereum/:address ───┘
```

**Frontend** — Expo SDK 54, React Native 0.81, TypeScript. Feature-based module structure following Bulletproof React. Connects to Ethereum wallets via Reown AppKit (WalletConnect v2) and displays balances and transactions.

**Backend** — Express 5, TypeScript (strict), hexagonal ports-and-adapters architecture with manual DI. Fetches gas prices, block numbers, and balances from Etherscan. Caches global data (gas/block) in Redis with 15s TTL and logs balance history to PostgreSQL.

## Tech Stack

| Layer    | Technology                                                         |
| -------- | ------------------------------------------------------------------ |
| Mobile   | Expo 54, React Native 0.81, TypeScript, NativeWind, Zustand       |
| Wallet   | Reown AppKit, WalletConnect v2, ethers.js v6                      |
| API      | Express 5, TypeScript, Winston logging                             |
| Cache    | Redis 7                                                            |
| Database | PostgreSQL 17, TypeORM                                             |
| External | Etherscan API v2, Infura RPC                                       |
| Docs     | Swagger UI + OpenAPI 3.0.3                                         |
| DevOps   | Docker Compose, ESLint, Prettier, Husky pre-commit hooks           |
| Testing  | Jest + ts-jest (backend)                                           |

## Prerequisites

- Node.js >= 18, npm >= 9
- Docker & Docker Compose (for backend services)
- Expo CLI & EAS CLI (for frontend)
- API keys: [Etherscan](https://etherscan.io/apis), [Infura](https://infura.io/), [Reown (WalletConnect)](https://cloud.reown.com/)

## Getting Started

### Backend

```bash
cd backend
cp .env.example .env         # fill in ETHERSCAN_API_KEY
docker compose up -d          # starts Postgres, Redis, and the API
```

Or run without Docker:

```bash
npm install
npm run dev                   # http://localhost:3000
```

API docs are served at `http://localhost:3000/api-docs`.

### Frontend

```bash
cd frontend
cp .env.example .env          # fill in REOWN_PROJECT_ID, ETHERSCAN_API_KEY, INFURA_RPC_URL
npm install
npm start                     # Expo dev server
```

> Requires an EAS development build — Expo Go does not support WalletConnect's native modules. A physical device is needed to test wallet connections (simulators lack wallet apps).

## API

| Method | Endpoint                        | Description                                  |
| ------ | ------------------------------- | -------------------------------------------- |
| GET    | `/v1/api/ethereum/:address`     | Gas price, block number, and balance for address |
| GET    | `/v1/api/health`                | Health check                                 |
| GET    | `/api-docs`                     | Swagger UI                                   |

**Example:**

```bash
curl http://localhost:3000/v1/api/ethereum/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

```json
{
  "data": {
    "gasPrice": { "wei": "496840168000", "gwei": "496840168" },
    "blockNumber": "23468896",
    "balance": { "wei": "1234567890000000000", "eth": "1.23456789" },
    "timestamp": "2026-04-02T12:00:00.000Z"
  }
}
```

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── component/ethereum/    # Business logic (service, ports, DTOs)
│   │   ├── entrypoint/controller/ # HTTP controllers + OpenAPI specs
│   │   ├── infrastructure/        # Redis, PostgreSQL, Etherscan adapters
│   │   ├── tests/                 # Jest unit tests
│   │   ├── wire.ts                # Composition root (DI wiring)
│   │   ├── server.ts              # Express app setup
│   │   └── config.ts              # Env validation + logger
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── frontend/
│   ├── src/
│   │   ├── app/                   # Expo Router screens
│   │   ├── features/wallet/       # Wallet feature (components, hooks, store)
│   │   ├── lib/                   # AppKit setup, API client
│   │   ├── providers/             # Root AppProvider
│   │   └── config/                # Environment variables
│   ├── app.json
│   └── tailwind.config.js
│
└── LICENSE
```

## Scripts

### Backend

```bash
npm run dev       # Dev server with hot reload
npm run build     # Compile TypeScript
npm start         # Run compiled output
npm test          # Run Jest tests
npm run lint      # ESLint
npm run format    # Prettier
```

### Frontend

```bash
npm start         # Expo dev server
npm run android   # Run on Android
npm run ios       # Run on iOS
npm run web       # Run on web
npm run lint      # ESLint
npm run format    # Prettier
```

## Further Reading

Each package has its own detailed README with in-depth setup, architecture, and configuration docs:

- [`backend/README.md`](backend/README.md) — Hexagonal architecture details, caching strategy, data flow, environment variables, Docker setup, and test suite
- [`frontend/README.md`](frontend/README.md) — Expo/React Native setup, wallet connection flow, feature module structure, and platform-specific notes

## License

MIT No Attribution License with No Reproduction Clause -- Copyright (c) 2026 Karl Marx Roxas
