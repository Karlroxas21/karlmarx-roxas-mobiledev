# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (nodemon + ts-node, watches src/)
npm run build        # Compile TypeScript (tsc → dist/)
npm start            # Run compiled output (node dist/index.js)
npm run lint         # ESLint check on src/
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier format all .ts files in src/
```

Pre-commit hook runs `prettier --check` then `eslint` on the backend.

## Architecture

Hexagonal architecture (ports & adapters) with manual dependency injection.

### Layers

- **`src/entrypoint/`** — HTTP boundary. Controllers and middleware. Controllers implement the `Controller` interface (defined in `server.ts`) and register their own routes via `register(server, middlewares?)`.
- **`src/component/`** — Business logic. Each component (e.g. `auth`) has its own directory with `interfaces.ts` (ports), `service.ts` (implementation), `requests-models.ts`, `response-models.ts`, and `constants.ts`.
- **`src/infrastructure/`** — External adapters (database, third-party APIs). TypeORM is installed but not yet configured.
- **`src/utils/`** — Shared utilities.

### Wiring (IoC)

`src/wire.ts` is the composition root. It manually instantiates infrastructure → services → controllers, then passes the controller array to `Server`. No DI container library — dependencies are constructor-injected by hand.

### Boot sequence

`index.ts` → `wire.ts:createServer()` → `Server` constructor applies middleware (CORS, JSON parser, request context/logger) → registers controllers → `server.start()` listens.

### Controller contract

```typescript
export interface Controller {
    register(server: Express, middlewares?: Record<string, RequestHandler>): void;
}
```

Controllers receive the Express app and an optional middleware map. Each controller mounts its own routes inside `register()`.

## Code Style

- 4-space indentation, single quotes, trailing commas, semicolons (enforced by Prettier/ESLint)
- Print width: 80 characters
- TypeScript strict mode enabled
