# Frontend

Expo + React Native mobile application.

## Tech Stack

- **Framework**: Expo SDK 54, React Native 0.81, React 19
- **Routing**: Expo Router (file-based)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: Zustand
- **Language**: TypeScript (strict mode)
- **Linting**: ESLint with Expo config
- **Formatting**: Prettier (auto-runs on commit via git hook)

## Getting Started

```bash
npm install
npx expo start
```

## Project Structure

```
src/
├── app/                 # Expo Router file-based routes (screens only)
├── components/
│   ├── ui/              # Shared UI primitives (Button, Input, Card, etc.)
│   └── layouts/         # Screen layout wrappers (SafeArea, ScrollLayout, etc.)
├── config/              # Environment variables and app-wide constants
├── features/            # Feature-based modules
│   └── <feature>/
│       ├── api/         # API calls scoped to this feature
│       ├── components/  # Components scoped to this feature
│       ├── hooks/       # Hooks scoped to this feature
│       ├── stores/      # Zustand stores scoped to this feature
│       └── types/       # TypeScript types for this feature
├── hooks/               # Shared hooks used across multiple features
├── lib/                 # Pre-configured library wrappers (API client, etc.)
├── providers/           # Global context providers
├── stores/              # Global Zustand stores
├── types/               # Shared TypeScript types
└── utils/               # Shared utility functions
```

## Architecture

This project follows the [Bulletproof React](https://github.com/alan2207/bulletproof-react) architecture adapted for Expo/React Native.

### Dependency Rule

```
shared (components, hooks, lib, utils, types, config)
    |
    v
features (import from shared, NEVER from other features)
    |
    v
app/ (imports from features and shared, composes screens)
```

- **`app/`** screens should be thin. They import and compose from `src/features/` and `src/components/`.
- **Features never import from other features.** If two features need to share something, lift it to a shared folder (`components/`, `hooks/`, `utils/`, etc.).
- Not every feature needs all sub-folders. Only create what you need.

### Adding a New Feature

1. Create a folder under `src/features/<feature-name>/`
2. Add only the sub-folders you need (`api/`, `components/`, `hooks/`, `stores/`, `types/`)
3. Create the corresponding route in `src/app/`
4. Import the feature's components into the route screen

## Code Standards

### Naming Conventions

- **Folders**: `kebab-case` (enforced by ESLint)
- **Files**: `kebab-case` for modules, `PascalCase` for React components
- **Variables/Functions**: `camelCase`
- **Types/Interfaces**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`

### Formatting (Prettier)

| Rule            | Value          |
|-----------------|----------------|
| Semicolons      | Always         |
| Quotes          | Single         |
| Trailing Commas | All            |
| Print Width     | 80             |
| Tab Width       | 2 spaces       |

Prettier runs automatically on staged files via a git `pre-commit` hook. To format the entire project manually:

```bash
npm run format
```

### Linting

```bash
npm run lint
```

## Available Scripts

| Script              | Description                       |
|---------------------|-----------------------------------|
| `npm start`         | Start Expo dev server             |
| `npm run android`   | Start on Android                  |
| `npm run ios`       | Start on iOS                      |
| `npm run web`       | Start on web                      |
| `npm run lint`      | Run ESLint                        |
| `npm run format`    | Run Prettier on all files         |
