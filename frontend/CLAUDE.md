# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expo SDK 54 + React Native 0.81 mobile app using TypeScript (strict mode), Expo Router (file-based routing with typed routes), NativeWind v4 (Tailwind CSS for RN), and Zustand for state management. React Compiler is enabled experimentally.

## Commands

- `npm start` — Start Expo dev server
- `npm run android` / `npm run ios` / `npm run web` — Platform-specific dev
- `npm run lint` — ESLint (expo config + kebab-case folder enforcement)
- `npm run format` — Prettier (runs automatically on commit via pre-commit hook)

## Architecture

Follows [Bulletproof React](https://github.com/alan2207/bulletproof-react) adapted for Expo/React Native.

### Dependency rule

```
shared (components/, hooks/, lib/, utils/, types/, config/)
    ↓
features/<name>/ (imports from shared, NEVER from other features)
    ↓
app/ (composes screens from features and shared)
```

- **`src/app/`** — Expo Router file-based routes. Screens should be thin wrappers that compose from features and shared components.
- **`src/features/<name>/`** — Feature modules with optional `api/`, `components/`, `hooks/`, `stores/`, `types/` sub-folders. Features must not import from other features.
- **`src/providers/app-provider.tsx`** — Single root provider that wraps the app. Stack new global providers (auth, theme, query client) here.
- **`src/components/ui/`** — Shared UI primitives. **`src/components/layouts/`** — Screen layout wrappers.
- **`src/stores/`** — Global Zustand stores. Feature-scoped stores go in `src/features/<name>/stores/`.

### Path alias

`@/*` maps to the project root (e.g., `@/src/components/...`, `@/global.css`).

## Conventions

- **Folders**: `kebab-case` (enforced by ESLint `check-file/folder-naming-convention`)
- **Files**: `kebab-case` for modules, `PascalCase` for React components
- **Styling**: Use NativeWind `className` prop with Tailwind classes, not inline `style` objects
- **Formatting**: Single quotes, semicolons, trailing commas, 2-space indent, 80 char width
