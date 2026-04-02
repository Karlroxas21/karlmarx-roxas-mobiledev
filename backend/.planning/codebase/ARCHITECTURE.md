# Architecture

**Analysis Date:** 2026-04-02

## Pattern Overview

**Overall:** Hexagonal Architecture (Ports & Adapters)

**Key Characteristics:**
- Manual dependency injection with composition root pattern
- Layered separation: entrypoint → component → infrastructure
- Interface-driven service design (ports for abstractions)
- Express.js as HTTP boundary adapter
- TypeScript strict mode enforced

## Layers

**Entrypoint (`src/entrypoint/`):**
- Purpose: HTTP boundary and request handling. Controllers receive Express app and register their own routes.
- Location: `src/entrypoint/`
- Contains: Controllers (implementing `Controller` interface), middleware definitions
- Depends on: Component services, shared utilities
- Used by: Server for route registration

**Component (`src/component/`):**
- Purpose: Business logic and domain models organized by feature/domain.
- Location: `src/component/`
- Contains: Service implementations, request/response DTOs, interfaces (ports), constants per component
- Depends on: Infrastructure adapters for external calls
- Used by: Entrypoint controllers

**Infrastructure (`src/infrastructure/`):**
- Purpose: External adapters for databases, APIs, third-party services.
- Location: `src/infrastructure/`
- Contains: Database clients (TypeORM configured here), API clients, external service adapters
- Depends on: Config for connection strings/credentials
- Used by: Component services

**Utilities (`src/utils/`):**
- Purpose: Shared helpers and cross-cutting functions.
- Location: `src/utils/`
- Contains: Helper functions, validators, formatters
- Depends on: None (isolated utilities)
- Used by: All layers

## Data Flow

**HTTP Request → Response Flow:**

1. Express receives HTTP request
2. Request context middleware adds request ID (`x-request-id`) if absent
3. Request logger middleware records timing
4. Router matches controller route
5. Controller receives Request, calls appropriate service method
6. Service executes business logic, may call infrastructure adapters
7. Service returns response DTO
8. Controller sends HTTP response
9. Request logger completes and emits structured log with status and duration

**Service to Infrastructure Flow:**

- Services define ports (interfaces in `component/[name]/interfaces.ts`)
- Infrastructure implements ports (adapters in `infrastructure/`)
- Services receive infrastructure implementations via constructor injection from wire module

## Key Abstractions

**Controller Interface:**
- Purpose: Contract for HTTP route handlers
- Location: `src/server.ts`
- Pattern: Each controller implements `register(server: Express, middlewares?: Record<string, RequestHandler>): void` and mounts routes directly on Express app
- Example structure: Controller receives dependency-injected services in constructor, mounts routes in `register()` method

**Component Structure:**
- Purpose: Organize business logic by domain boundary
- Pattern: Each component (e.g., `auth`) has standardized structure:
  - `interfaces.ts` - Port definitions (dependencies component exposes or requires)
  - `service.ts` - Implementation (business logic)
  - `requests-models.ts` - Incoming DTO schemas
  - `response-models.ts` - Outgoing DTO schemas
  - `constants.ts` - Component-specific constants

**Config Module:**
- Purpose: Centralized configuration and logger initialization
- Location: `src/config.ts`
- Contains: Environment variable parsing, Winston logger configuration

## Entry Points

**Application Startup (`src/index.ts`):**
- Location: `src/index.ts`
- Triggers: `npm start` or `npm run dev` (via nodemon)
- Responsibilities: Call `createServer()` from wire, start HTTP server, handle startup errors

**Server Composition (`src/wire.ts`):**
- Location: `src/wire.ts`
- Triggers: Called by index.ts as async function
- Responsibilities: Instantiate infrastructure → services → controllers, pass to Server constructor, log wiring completion

**HTTP Server (`src/server.ts`):**
- Location: `src/server.ts`
- Triggers: Instantiated by wire.ts
- Responsibilities: Apply CORS, JSON parsing, request context, request logging middleware; register controllers; listen on hostname:port

## Error Handling

**Strategy:** Synchronous try-catch with logger.error, process.exit(1) for fatal errors

**Patterns:**
- Server constructor wraps controller registration in try-catch with logger.error and process.exit(1)
- Startup in index.ts catches createServer() promise rejection with logger.error and process.exit(1)
- Application level: Controllers and services should implement error handling per domain (pattern TBD in component implementation)

## Cross-Cutting Concerns

**Logging:** Winston logger initialized in `src/config.ts`, exported as singleton. Used in Server for lifecycle events and request logging. Request logging middleware logs method, URL, status code, duration, and request ID.

**Request Context:** Middleware in `src/server.ts` injects unique request ID via `x-request-id` header if not present. Logged on each request completion.

**Authentication:** To be implemented in component layer (auth service planned in `src/component/auth/`).

---

*Architecture analysis: 2026-04-02*
