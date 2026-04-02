# Phase 3: Adapters - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement three infrastructure adapters that fulfill the port interfaces defined in Phase 2: EtherscanAdapter (IEthereumProvider), RedisAdapter (ICacheStore), and TypeOrmBalanceRepository (IBalanceRepository). Each adapter handles its own failure mode without propagating errors to the service. Also creates the TypeORM Balance entity.

</domain>

<decisions>
## Implementation Decisions

### Balance Entity (TypeORM)
- Table name: `balance_history` (explicit about being a historical log)
- Columns: `id` (PK auto-increment), `address` (varchar, indexed), `balanceWei` (varchar), `fetchedAt` (timestamp, default now)
- Address column is indexed for lookup queries
- Entity lives in `src/infrastructure/postgres/` — not in the component layer

### Etherscan Adapter
- Uses `ProposeGasPrice` field from gasoracle endpoint for gas price
- Parses hex block number to decimal string: `parseInt(hex, 16).toString()`
- Adapter converts gas price from Gwei (Etherscan returns Gwei) to Wei before returning — service expects Wei from all provider methods
- Checks `data.status !== '1'` on every response (ETH-02) — throws if Etherscan returns error
- Uses axios@1.14.0 (pinned exact) for HTTP calls

### Redis Adapter
- Every `get`/`set` call wrapped in try-catch — returns `null`/void on failure with warning log
- Cache values stored as plain strings (gas price and block number are single values)
- Graceful degradation is in the adapter layer, not the service

### Claude's Discretion
- Internal method decomposition within adapters
- Exact Etherscan URL construction patterns
- Redis key serialization details

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/component/ethereum/interfaces.ts` — IEthereumProvider, ICacheStore, IBalanceRepository port interfaces
- `src/component/ethereum/errors.ts` — EtherscanApiError for adapter error wrapping
- `src/config.ts` — exports `config.etherscanApiKey`, `config.etherscanBaseUrl`, `config.redisUrl`, `config.databaseUrl`
- `src/wire.ts` — has `dataSource` and `redis` instances ready for injection

### Established Patterns
- Port interfaces return promises with string types for Wei values
- `ICacheStore.get()` returns `string | null`, `set()` takes key/value/ttl
- `IBalanceRepository.save()` takes `BalanceSaveDto` (address + balanceWei)
- `IEthereumProvider` has 3 methods: `getGasPrice(): Promise<string>`, `getBlockNumber(): Promise<string>`, `getBalance(address: string): Promise<string>`

### Integration Points
- `src/wire.ts` — must register Balance entity in DataSource `entities: []` array
- `src/wire.ts` — will instantiate all 3 adapters and inject into EthereumService (Phase 4)
- Adapters import `logger` from `config.ts` for warning logs

</code_context>

<specifics>
## Specific Ideas

- Etherscan endpoints: `?module=account&action=balance`, `?module=gastracker&action=gasoracle`, `?module=proxy&action=eth_blockNumber`
- Etherscan returns HTTP 200 for errors — must check response body `status` field
- Balance entity must be registered in wire.ts DataSource entities array for synchronize to create the table
- axios@1.14.0 pinned exactly (no caret)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
