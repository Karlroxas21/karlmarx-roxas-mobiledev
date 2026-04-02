# CONCERNS.md — Technical Debt & Issues

## Unused Dependencies

- **`swagger-ui-express`** — installed but not imported or used anywhere
- **`typeorm`** — installed, `infrastructure/postgres/` directory exists but is empty; no entities, no data source configured

These add to `node_modules` size and maintenance burden without providing value yet.

## Security

- **CORS wide open:** `cors()` called with no options — allows all origins. Should be restricted to known frontend origins before production.
- **No authentication/authorization layer:** No middleware or service for verifying identity or permissions.
- **No input validation:** No schema validation library (e.g., Zod, Joi, class-validator) — request bodies are unvalidated.
- **No rate limiting:** No protection against brute-force or abuse.
- **No helmet:** Missing standard HTTP security headers.

## Resilience

- **`process.exit(1)` in Server constructor:** Fatal error during controller registration kills the process immediately. This prevents graceful cleanup and makes the server harder to test.
- **No graceful shutdown:** No `SIGTERM`/`SIGINT` handlers to drain connections before exit.
- **No health check endpoint:** No `/health` or `/ready` route for load balancer or orchestrator probes.

## Configuration

- **No environment validation:** `config.ts` reads `process.env` with fallback defaults but doesn't validate that required variables are set. Missing config is silently replaced with defaults.
- **`@types/cors` in dependencies:** Should be in `devDependencies` — it's a type package, not needed at runtime.

## Early-Stage Gaps (Expected)

These are normal for a freshly scaffolded project and not debt per se:

- All component files under `auth/` are empty templates — intentional scaffolding for new components
- Empty directories (`entrypoint/controller/`, `entrypoint/middleware/`, `infrastructure/postgres/`, `tests/`, `utils/`) — placeholder structure
- No API routes registered yet
- No database connection configured
- No test framework installed
