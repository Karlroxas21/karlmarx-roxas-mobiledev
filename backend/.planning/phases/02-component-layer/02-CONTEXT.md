# Phase 2: Component Layer - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Define the ethereum component's port interfaces, request/response DTOs, constants, and EthereumService business logic. The service orchestrates cache-check, parallel Etherscan calls via Promise.all, and fire-and-forget DB insert — all against interfaces with no concrete adapters yet.

</domain>

<decisions>
## Implementation Decisions

### Response Shape
- Success envelope: `{ "data": { gasPrice: { wei, gwei }, blockNumber: "...", balance: { wei, eth }, timestamp: "..." } }`
- Gas price dual-units: `gasPrice: { wei: "...", gwei: "..." }` nested object
- Balance dual-units: `balance: { wei: "...", eth: "..." }` nested object
- Error envelope: `{ "error": { message: "...", code: "VALIDATION_ERROR" | "UPSTREAM_ERROR" } }`
- All Wei values typed as `string` — never `number` or `bigint`
- ISO 8601 timestamp on every successful response

### Port Interface Design
- `IEthereumProvider` has three methods: `getGasPrice()`, `getBlockNumber()`, `getBalance(address)` — maps 1:1 to Etherscan endpoints
- `ICacheStore` is generic: `get(key): Promise<string | null>`, `set(key, value, ttlSeconds): Promise<void>` — reusable across components
- `IBalanceRepository` uses plain DTO interface for the port; TypeORM entity stays in the adapter layer (keeps component ORM-free)
- Address validation (`isAddress`/`getAddress` from ethers.js) lives in EthereumService as first step before any port calls

### Service Orchestration
- Cache miss: fetch all 3 data points from Etherscan via `Promise.all` (balance always fetched fresh)
- Cache hit for gas/block: only 1 Etherscan call needed (balance), gas and block served from cache
- Fire-and-forget DB insert: `repository.save(data).catch(err => logger.warn(...))` — non-blocking, gracefully degrades
- Service throws typed `EtherscanApiError` on Etherscan failure — controller catches and maps to 502

### Claude's Discretion
- Exact file organization within `component/ethereum/` (follow established auth template pattern)
- Internal method decomposition within EthereumService
- Exact constant names and cache key formats

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/component/auth/` — template structure for new components (interfaces, service, DTOs, constants)
- `src/config.ts` — exports `config.etherscanApiKey`, `config.etherscanBaseUrl`, `logger`
- `src/wire.ts` — has `dataSource` and `redis` instances ready for injection

### Established Patterns
- Component structure: `interfaces.ts`, `service.ts`, `requests-models.ts`, `response-models.ts`, `constants.ts`
- Manual DI via `wire.ts` — services receive dependencies via constructor
- Controller interface: `register(server, middlewares?)` pattern
- Winston logger singleton for structured logging

### Integration Points
- `src/wire.ts` — will need to instantiate EthereumService with adapter implementations (Phase 3+)
- `src/component/ethereum/interfaces.ts` — ports consumed by infrastructure adapters in Phase 3
- Service methods called by EthereumController in Phase 4

</code_context>

<specifics>
## Specific Ideas

- Blocker from STATE.md: Confirm `ethers.js` CJS named imports (`isAddress`, `getAddress`) work before relying on them
- Use the `component/auth/` template as structural reference for file organization
- Wei values must be strings throughout — Etherscan returns strings, keep them as strings

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
