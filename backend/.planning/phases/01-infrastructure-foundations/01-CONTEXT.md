# Phase 1: Infrastructure Foundations - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Install runtime dependencies (ioredis, pg, reflect-metadata, dotenv, axios@1.14.0 pinned), configure TypeORM DataSource for PostgreSQL, initialize ioredis client with error handler, validate required env vars at startup, and fix tsconfig.json for decorator support.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/config.ts` — existing config module with env var reads and Winston logger
- `src/wire.ts` — composition root, already async (`Promise<Server>`)
- `src/index.ts` — entry point, already awaits createServer()

### Established Patterns
- Environment config via `process.env` with fallback defaults in `config.ts`
- Winston logger singleton exported from `config.ts`
- Manual DI — infrastructure instantiated in `wire.ts`, injected into services

### Integration Points
- `src/index.ts` — must add `import 'reflect-metadata'` as first line
- `src/config.ts` — extend with new env vars (ETHERSCAN_API_KEY, DATABASE_URL, REDIS_URL, etc.)
- `src/wire.ts` — initialize DataSource and Redis client before creating services
- `tsconfig.json` — add experimentalDecorators and emitDecoratorMetadata

</code_context>

<specifics>
## Specific Ideas

- axios must be pinned to exactly "1.14.0" (no caret) due to supply chain attack on 1.14.1
- ioredis preferred over node-redis (TypeORM peer dependency alignment)
- reflect-metadata must be first import in index.ts for TypeORM decorators
- synchronize: true must be gated behind NODE_ENV !== 'production'

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
