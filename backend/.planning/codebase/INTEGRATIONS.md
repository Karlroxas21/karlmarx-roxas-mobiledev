# External Integrations

**Analysis Date:** 2026-04-02

## APIs & External Services

**Not Currently Configured:**
- No external API integrations detected in the codebase
- swagger-ui-express is installed but not yet integrated

## Data Storage

**Databases:**
- TypeORM 0.3.28 installed but not yet configured
- No database connection established
- Infrastructure path: `src/infrastructure/postgres/` (empty directory - not yet implemented)

**File Storage:**
- Local filesystem only

**Caching:**
- None configured

## Authentication & Identity

**Auth Provider:**
- Custom implementation planned
- Auth component exists at `src/component/auth/` with:
  - `interfaces.ts` - Port definitions
  - `service.ts` - Auth service implementation (placeholder)
  - `requests-models.ts` - Auth request models
  - `response-models.ts` - Auth response models
  - `constants.ts` - Auth constants
- No external authentication provider (OAuth, Auth0, etc.) configured

## Monitoring & Observability

**Error Tracking:**
- None configured (no Sentry, LogRocket, etc.)

**Logs:**
- Winston 3.19.0 configured at `src/config.ts`
- Default log level: `info` (configurable via `LOG_LEVEL` env var)
- Format: JSON with timestamp, error stack traces
- Transport: Console output only

## CI/CD & Deployment

**Hosting:**
- Not specified
- Application listens on configurable `HOSTNAME` (default: 0.0.0.0) and `PORT` (default: 3000)

**CI Pipeline:**
- Pre-commit hook via Husky runs:
  - Prettier check (`prettier --check`)
  - ESLint validation
- No CI service configured (no GitHub Actions, GitLab CI, etc.)

## Environment Configuration

**Required env vars:**
- `HOSTNAME` - Server hostname (default: 0.0.0.0)
- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - Winston log level (default: info)
- `NODE_ENV` - Environment type (default: development)

**Secrets location:**
- `.env` file (not committed to git)
- Example template: `.env.example`

## HTTP Features

**CORS:**
- Enabled globally in `src/server.ts`
- All origins allowed (no specific configuration)

**Request Handling:**
- JSON body parser via Express (type: 'application/*')
- Request context middleware:
  - Auto-generates or preserves `x-request-id` header (UUID)
  - Attaches to all requests in `src/server.ts`
- Request logger middleware:
  - Logs HTTP method, URL, status code, duration, request ID
  - Logs on response finish

## Webhooks & Callbacks

**Incoming:**
- Not detected

**Outgoing:**
- Not detected

---

*Integration audit: 2026-04-02*
