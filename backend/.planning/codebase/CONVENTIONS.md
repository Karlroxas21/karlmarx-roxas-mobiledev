# CONVENTIONS.md — Code Style & Patterns

## Formatting & Linting

- **Prettier:** 4-space indentation, single quotes, trailing commas, semicolons, 80 char print width
- **ESLint:** `@typescript-eslint` plugin with Prettier integration (`eslint-config-prettier`, `eslint-plugin-prettier`)
- **Pre-commit hook:** Husky runs `prettier --check` then `eslint` before each commit
- **TypeScript:** Strict mode enabled, target ES2020, CommonJS modules

### Config Files

| Tool | File |
|---|---|
| TypeScript | `tsconfig.json` |
| Prettier | `.prettierrc` |
| ESLint | `eslint.config.mjs` |
| Nodemon | `nodemon.json` |
| Husky | `.husky/` |

## Naming Conventions

- **Variables/functions:** camelCase (`createServer`, `requestContext`)
- **Classes:** PascalCase (`Server`)
- **Interfaces:** PascalCase (`Controller`)
- **Constants:** camelCase for config objects (`config`, `logger`), UPPER_SNAKE for static class members (`DEFAULT_HOSTNAME`, `DEFAULT_PORT`)
- **Files:** kebab-case for multi-word (`requests-models.ts`), plain lowercase for single word (`config.ts`, `wire.ts`)

## Architecture Patterns

### Hexagonal Architecture (Ports & Adapters)

- **Ports:** Interfaces defined in `component/{name}/interfaces.ts`
- **Adapters:** Implementations in `infrastructure/` and `entrypoint/`
- **No DI container** — manual constructor injection in `wire.ts`

### Controller Contract

```typescript
export interface Controller {
    register(
        server: Express,
        middlewares?: Record<string, RequestHandler>,
    ): void;
}
```

Controllers self-register routes on the Express app via `register()`.

### Component File Convention (Template)

The `src/component/auth/` directory serves as a template for new components:
- `interfaces.ts` — port definitions (what the component exposes)
- `service.ts` — business logic implementation
- `requests-models.ts` — inbound request DTOs
- `response-models.ts` — outbound response DTOs
- `constants.ts` — component-scoped constants

## Error Handling

- Try-catch in `Server` constructor with Winston logging
- `process.exit(1)` on fatal startup errors (in both `server.ts` and `index.ts`)
- No application-level error handling middleware yet

## Logging

- **Winston v3** with structured JSON format
- Console transport with colorized output and timestamp
- Request correlation via `x-request-id` header (auto-generated UUID if missing)
- Request logging middleware logs method, URL, status, and duration on response finish

## Module System

- CommonJS (`"type": "commonjs"` in package.json)
- `esModuleInterop: true` in tsconfig for default import compatibility
- Named exports preferred (`export const`, `export class`)
