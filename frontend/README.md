# Ethereum Wallet Viewer

A mobile app that lets users connect their Ethereum wallet via MetaMask or WalletConnect, view their ETH balance, and browse recent transaction history. Built with Expo and React Native for a read-only, on-chain wallet viewing experience.

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- **Expo CLI** (`npx expo`)
- **EAS CLI** (`npm install -g eas-cli`) for development builds
- **Android Studio** or **Xcode** for running on emulator/simulator
- A physical device with MetaMask installed (for wallet connection testing)

## Dependencies

- **Expo SDK 54** / **React Native 0.81** / **React 19**
- **Expo Router** — file-based routing with typed routes
- **NativeWind v4** — Tailwind CSS for React Native styling
- **Zustand** — lightweight state management
- **ethers.js v6** — Ethereum blockchain interactions (balance fetching, Wei conversion)
- **Reown AppKit** (`@reown/appkit-react-native`) — WalletConnect v2 modal and MetaMask deep-linking
- **Etherscan API v2** — transaction history (last 10 transactions)
- **TypeScript** (strict mode) with React Compiler enabled experimentally

## Setup

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root with the following variables:

   ```
   EXPO_PUBLIC_REOWN_PROJECT_ID=<your Reown/WalletConnect project ID>
   EXPO_PUBLIC_ETHERSCAN_API_KEY=<your Etherscan API key>
   EXPO_PUBLIC_INFURA_RPC_URL=https://mainnet.infura.io/v3/<your Infura project ID>
   ```

3. Create a development build (required for native modules like WalletConnect):

   ```bash
   npx eas build --profile development --platform android
   # or for iOS:
   npx eas build --profile development --platform ios
   ```

4. Start the dev server:
   ```bash
   npm start
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

### Key Decisions

- **Feature-based modules** — all wallet logic lives in `src/features/wallet/` with scoped components, hooks, stores, and types
- **No cross-feature imports** — features import from shared (`components/`, `hooks/`, `lib/`, `utils/`) but never from each other
- **Thin route screens** — `src/app/` files are minimal wrappers that compose from features
- **No data-fetching library** — plain `useEffect` + async fetch pattern (no React Query) to keep the dependency footprint small
- **Zustand for state** — wallet connection state managed in a Zustand store; AppKit owns session persistence via AsyncStorage
- **NativeWind `className`** — all styling uses Tailwind classes, no inline `style` objects

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

## Code Standards

### Naming Conventions

- **Folders**: `kebab-case` (enforced by ESLint)
- **Files**: `kebab-case` for modules, `PascalCase` for React components
- **Variables/Functions**: `camelCase`
- **Types/Interfaces**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`

### Formatting (Prettier)

| Rule            | Value    |
| --------------- | -------- |
| Semicolons      | Always   |
| Quotes          | Single   |
| Trailing Commas | All      |
| Print Width     | 80       |
| Tab Width       | 2 spaces |

Prettier runs automatically on staged files via a git `pre-commit` hook. To format the entire project manually:

```bash
npm run format
```

### Linting

```bash
npm run lint
```

## Available Scripts

| Script            | Description               |
| ----------------- | ------------------------- |
| `npm start`       | Start Expo dev server     |
| `npm run android` | Start on Android          |
| `npm run ios`     | Start on iOS              |
| `npm run web`     | Start on web              |
| `npm run lint`    | Run ESLint                |
| `npm run format`  | Run Prettier on all files |

## Known Issues and Limitations

- **Read-only** — this is a wallet viewer only; transaction sending is not supported
- **Ethereum mainnet only** — no testnet or multi-chain support
- **Native ETH only** — ERC-20 token balances are not displayed
- **No fiat conversion** — balances are shown in ETH only
- **Etherscan free tier** — transaction history is limited to 5 requests/sec; no auto-polling to avoid rate limits
- **Physical device required** — wallet connection via WalletConnect/MetaMask deep-link cannot be tested on iOS Simulator (no wallet apps available)
- **EAS development build required** — Expo Go does not support the native modules used by WalletConnect
