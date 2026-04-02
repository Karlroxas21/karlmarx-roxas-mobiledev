# TESTING.md — Test Structure & Practices

## Current State

**No testing infrastructure is in place.**

- No test framework installed (no Jest, Vitest, Mocha, etc.)
- No test scripts in `package.json`
- `src/tests/` directory exists but is empty
- No test configuration files

## Test Directory

```
src/tests/    # Empty — reserved for future tests
```

## Recommendations for Setup

Given the hexagonal architecture, the codebase is well-suited for:

- **Unit tests:** Test services in `component/` with mocked infrastructure ports
- **Integration tests:** Test controllers in `entrypoint/` against the wired server
- **The composition root** (`wire.ts`) makes it straightforward to inject test doubles

## Coverage

No coverage tooling configured.
