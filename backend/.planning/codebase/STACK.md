# Technology Stack

**Analysis Date:** 2026-04-02

## Languages

**Primary:**
- TypeScript 6.0.2 - All source code in `src/`

## Runtime

**Environment:**
- Node.js 24.12.0

**Package Manager:**
- npm (with package-lock.json)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Express 5.2.1 - Web framework for HTTP server at `src/server.ts`

**Testing:**
- Not configured yet

**Build/Dev:**
- TypeScript (tsc) - Compilation to `dist/`
- ts-node 10.9.2 - Direct execution for development via nodemon
- Nodemon 3.1.14 - Development server with auto-reload, configured in `nodemon.json`
- Prettier 3.8.1 - Code formatting
- ESLint 10.1.0 - Code linting

## Key Dependencies

**Critical:**
- Express 5.2.1 - Web framework
- CORS 2.8.6 - Cross-origin request handling in `src/server.ts`
- Winston 3.19.0 - Logging library, configured in `src/config.ts`

**Infrastructure:**
- TypeORM 0.3.28 - ORM for database access (installed but not yet configured)
- swagger-ui-express 5.0.1 - API documentation UI (installed but not integrated)

**Development:**
- @typescript-eslint/parser 8.58.0 - TypeScript parser for ESLint
- @typescript-eslint/eslint-plugin 8.58.0 - TypeScript ESLint rules
- eslint-plugin-prettier 5.5.5 - Prettier integration with ESLint
- @types/express 5.0.6 - Express type definitions
- @types/cors 2.8.19 - CORS type definitions
- @types/node 25.5.0 - Node.js type definitions
- eslint-config-prettier 10.1.8 - ESLint config to disable conflicting rules
- Husky 9.1.7 - Git hooks for pre-commit checks

## Configuration

**Environment:**
- Configured via environment variables
- `.env` file required with: `HOSTNAME`, `PORT`, `LOG_LEVEL`, `NODE_ENV`
- `.env.example` provides defaults at `backend/.env.example`

**Build:**
- `tsconfig.json` - TypeScript configuration targeting ES2020, commonjs modules
- `eslint.config.mjs` - ESLint configuration in flat format
- `.prettierrc` - Prettier configuration
- `nodemon.json` - Development server configuration

**Key Configuration Settings:**
- Print width: 80 characters
- Indentation: 4 spaces
- Single quotes enabled
- Trailing commas enabled
- Semicolons required
- TypeScript strict mode: enabled
- Target: ES2020

## Platform Requirements

**Development:**
- Node.js 24.12.0 (or compatible)
- npm (for dependency management)
- Git (for Husky pre-commit hooks)

**Production:**
- Node.js runtime
- Environment variables: `HOSTNAME`, `PORT`, `LOG_LEVEL`, `NODE_ENV`
- Deployment target: Any platform supporting Node.js

## Build Output

- Compilation target: `dist/` directory
- Entrypoint: `dist/index.js`
- Run command: `node dist/index.js`

---

*Stack analysis: 2026-04-02*
