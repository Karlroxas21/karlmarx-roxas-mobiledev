# Phase 1: Foundation & Polyfills - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire polyfills, Babel/Metro config, environment variables, and local Android dev build so the app boots on a physical device without crypto or polyfill errors. This phase produces no user-facing features — it unblocks all subsequent phases.

</domain>

<decisions>
## Implementation Decisions

### Environment Variables

- Extend the existing `config/env.ts` with three new vars: Reown Project ID, Etherscan API key, Infura RPC URL
- Use standard `EXPO_PUBLIC_` prefixed vars — no expo-dotenv dependency
- Validate all required env vars at startup; throw a clear error if any are missing
- Commit a `.env.example` to the repo listing all required var names with placeholder values
- Use placeholders for now — real keys will be added later
- Default network is Ethereum mainnet (not testnet) — read-only app, no fund risk

### EAS Build Target

- Android only for development
- Physical device (not emulator) for testing
- Local builds using `npx expo run:android` — no EAS cloud builds
- User is first-time with EAS/local builds — plan should include setup guidance

### RPC Provider

- Infura for Ethereum mainnet RPC
- User does not have an Infura account yet — plan must note this as an external dependency (sign up at infura.io)
- RPC URL format: `https://mainnet.infura.io/v3/{PROJECT_ID}`

### AppKit Bootstrap

- Initialize Reown AppKit singleton in `lib/appkit.ts`
- `@walletconnect/react-native-compat` must be the absolute first import in `lib/appkit.ts`
- Integrate AppKit provider into existing `providers/app-provider.tsx` (stack inside the existing fragment — comment says "Stack global providers here")
- Do NOT create a separate wallet-provider file

### Validation

- Include a temporary smoke test screen on the index route that displays:
  - AppKit initialization status (OK / Error)
  - All three env var values (masked for keys)
- This screen will be replaced in Phase 2 with the actual wallet UI

### Claude's Discretion

- Exact polyfill import order beyond the documented `@walletconnect/react-native-compat` first requirement
- Babel config flags and Metro resolver setup
- `react-native-quick-crypto` registration approach
- Any additional polyfills needed (Buffer, TextEncoder, etc.)

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Research outputs

- `.planning/research/STACK.md` — Package list, versions, install commands, import order, Metro config
- `.planning/research/PITFALLS.md` — Polyfill order pitfalls, Expo Go limitations, BigInt/Hermes issues
- `.planning/research/ARCHITECTURE.md` — System architecture, AppKit bootstrap pattern, provider wiring
- `.planning/research/SUMMARY.md` — Synthesized findings across all research

### Existing code

- `src/config/env.ts` — Current env var pattern to extend
- `metro.config.js` — Must merge polyfill resolver with existing `withNativeWind` wrapper
- `src/providers/app-provider.tsx` — Where AppKit provider gets stacked
- `src/app/_layout.tsx` — Root layout importing global.css and AppProvider

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `config/env.ts`: ENV object pattern — extend with three new blockchain vars
- `providers/app-provider.tsx`: Empty provider shell ready for AppKit wrapping
- `metro.config.js`: NativeWind wrapper — polyfill resolvers must compose with this

### Established Patterns

- Zustand stores in `stores/` and `features/*/stores/` — AppKit state sync (Phase 2) will follow this
- `lib/` directory for pre-configured library wrappers — `lib/appkit.ts` fits this convention
- `EXPO_PUBLIC_` env vars via `process.env` — standard Expo pattern already in use

### Integration Points

- `_layout.tsx` → `AppProvider` → AppKit provider (nested inside existing provider)
- `metro.config.js` — must not break existing NativeWind config when adding polyfill resolvers
- `app/index.tsx` — will become the smoke test screen temporarily
- No `babel.config.js` exists — needs creation (Expo uses default Babel config without one)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for polyfill/build setup.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 01-foundation-polyfills_
_Context gathered: 2026-04-01_
