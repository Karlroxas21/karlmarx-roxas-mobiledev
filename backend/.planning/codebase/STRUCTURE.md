# STRUCTURE.md — Directory Layout & Organization

## Directory Tree

```
backend/
├── src/
│   ├── index.ts                    # Application entry point
│   ├── server.ts                   # Express server class, Controller interface, middleware
│   ├── wire.ts                     # Composition root (manual DI wiring)
│   ├── config.ts                   # App config (hostname, port) and Winston logger
│   ├── component/                  # Business logic layer
│   │   └── auth/                   # Auth component (template/example)
│   │       ├── interfaces.ts       # Port definitions
│   │       ├── service.ts          # Service implementation
│   │       ├── requests-models.ts  # Request DTOs
│   │       ├── response-models.ts  # Response DTOs
│   │       └── constants.ts        # Constants
│   ├── entrypoint/                 # HTTP boundary layer
│   │   ├── controller/             # Route controllers
│   │   └── middleware/             # Express middleware
│   ├── infrastructure/             # External adapters
│   │   └── postgres/               # Database adapter
│   ├── tests/                      # Test files
│   └── utils/                      # Shared utilities
├── dist/                           # Compiled JS output (tsc)
├── package.json
├── tsconfig.json
├── nodemon.json
├── .prettierrc
├── eslint.config.mjs
└── .husky/                         # Git hooks (pre-commit)
```

## Key Locations

| Purpose | Path |
|---|---|
| Entry point | `src/index.ts` |
| Server + Controller interface | `src/server.ts` |
| Composition root (DI wiring) | `src/wire.ts` |
| Config + Logger | `src/config.ts` |
| Business logic components | `src/component/{name}/` |
| HTTP controllers | `src/entrypoint/controller/` |
| Express middleware | `src/entrypoint/middleware/` |
| Database/external adapters | `src/infrastructure/` |
| Tests | `src/tests/` |
| Utilities | `src/utils/` |

## Naming Conventions

- **Directories:** lowercase, singular (`component`, `entrypoint`, `infrastructure`)
- **Files:** kebab-case for multi-word (`requests-models.ts`, `response-models.ts`)
- **Component structure:** Each component gets its own directory under `component/` with a standard set of files:
  - `interfaces.ts` — port/contract definitions
  - `service.ts` — business logic implementation
  - `requests-models.ts` — inbound DTOs
  - `response-models.ts` — outbound DTOs
  - `constants.ts` — component-scoped constants

## Where to Add New Code

| Adding... | Location |
|---|---|
| New business domain | `src/component/{name}/` with standard file set |
| New API endpoint | `src/entrypoint/controller/{name}-controller.ts` |
| New middleware | `src/entrypoint/middleware/{name}.ts` |
| New external service adapter | `src/infrastructure/{service}/` |
| New utility function | `src/utils/{name}.ts` |
| New test | `src/tests/` |
| Wire new dependencies | `src/wire.ts` — instantiate and inject |
