# Architecture Research: Ethereum Address API

**Date:** 2026-04-02
**Confidence:** HIGH (derived from codebase analysis)

## Integration with Existing Hexagonal Architecture

The existing structure maps cleanly to three new outbound ports:

```
src/component/ethereum/
├── interfaces.ts       # IEthereumProvider, ICacheStore, IBalanceRepository
├── service.ts          # EthereumService (orchestrates ports)
├── requests-models.ts  # EthereumAddressRequest
├── response-models.ts  # EthereumDataResponse
└── constants.ts        # Cache TTLs, Etherscan endpoints

src/infrastructure/
├── etherscan/
│   └── etherscan-adapter.ts    # Implements IEthereumProvider
├── redis/
│   └── redis-adapter.ts        # Implements ICacheStore
└── postgres/
    └── balance-repository.ts   # Implements IBalanceRepository

src/entrypoint/controller/
└── ethereum-controller.ts      # GET /api/ethereum/:address
```

## Component Boundaries

### Ports (defined in `component/ethereum/interfaces.ts`)

| Port | Responsibility | Adapter |
|------|---------------|---------|
| `IEthereumProvider` | Fetch gas price, block number, balance from chain | `EtherscanAdapter` |
| `ICacheStore` | Get/set cached values with TTL | `RedisAdapter` |
| `IBalanceRepository` | Store/retrieve account balances | `TypeOrmBalanceRepository` |

### Key Rule: Service Owns Cache Logic

Cache-or-fetch logic belongs in `EthereumService`, **not** in the Etherscan adapter. The adapter is a pure HTTP translator. The service decides:
1. Check cache for gas price + block number
2. If miss → call `IEthereumProvider`
3. Store result in cache
4. Always fetch balance fresh (per-address, not cacheable globally)
5. Store balance in PostgreSQL (non-blocking, fire-and-forget)

## Data Flow

```
HTTP Request → EthereumController
    → validates address format
    → calls EthereumService.getAccountData(address)

EthereumService:
    1. Check ICacheStore for gas price + block number
    2. If cache miss → call IEthereumProvider (parallel: gas, block, balance)
    3. If cache hit → call IEthereumProvider (balance only)
    4. Store gas/block in ICacheStore (TTL ~15s)
    5. Store balance in IBalanceRepository (fire-and-forget, non-blocking)
    6. Return EthereumDataResponse

EthereumController → JSON response
```

### Graceful Degradation

- **Redis down:** Skip cache reads/writes, always fetch from Etherscan. Log warning.
- **PostgreSQL down:** Skip balance storage. Log warning. Response still returned.
- **Etherscan down:** Return error to client (this is critical path).

## Build Order (Dependency Graph)

```
Phase 1: Infrastructure Foundations
    ├── TypeORM DataSource + Balance entity
    ├── Redis client setup
    ├── reflect-metadata + tsconfig fixes
    └── Environment validation

Phase 2: Component Layer
    ├── Port interfaces (interfaces.ts)
    ├── DTOs (requests-models.ts, response-models.ts)
    ├── Constants (cache keys, TTLs)
    └── EthereumService (business logic)

Phase 3: Adapters
    ├── EtherscanAdapter (implements IEthereumProvider)
    ├── RedisAdapter (implements ICacheStore)
    └── TypeOrmBalanceRepository (implements IBalanceRepository)

Phase 4: Wiring & HTTP
    ├── EthereumController
    ├── wire.ts update (async init for DataSource)
    └── Docker Compose (Redis + PostgreSQL + App)
```

### Critical: wire.ts Must Become Async

Current `wire.ts` is synchronous. TypeORM's `DataSource.initialize()` is async. The composition root must await initialization before creating services:

```typescript
export const createServer = async (): Promise<Server> => {
    // Infra (async)
    const dataSource = new DataSource({...});
    await dataSource.initialize();
    const redisClient = new Redis(config.redisUrl);

    // Services
    const ethereumService = new EthereumService(
        new EtherscanAdapter(config.etherscanApiKey),
        new RedisAdapter(redisClient),
        new TypeOrmBalanceRepository(dataSource),
    );

    // Controllers
    const controllers: Controller[] = [
        new EthereumController(ethereumService),
    ];

    return new Server(app, controllers, config.hostname, config.port);
};
```

This works because `wire.ts` already returns `Promise<Server>` and `index.ts` already `await`s it.

## Anti-Patterns to Avoid

| Anti-Pattern | Why |
|-------------|-----|
| Cache in adapter layer | Mixing infrastructure concern with HTTP translation |
| Blocking balance insert | Database writes should not slow response time |
| Synchronize: true without NODE_ENV guard | TypeORM will DROP tables in production |
| Skipping address normalization | Cache misses and DB duplicates from mixed case |

---
*Architecture research: 2026-04-02*
