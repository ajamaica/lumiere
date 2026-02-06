# Developer Guide

## Prerequisites

- **Node.js** 20+
- **pnpm** 10+ (required — do not use npm or yarn)
- **Xcode** 16+ (for iOS development)
- **Android Studio** (for Android development)
- **Expo CLI** (`npx expo`)

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Start Development Server

```bash
# Start Expo dev server
pnpm start

# Start for specific platform
pnpm ios       # iOS simulator
pnpm android   # Android emulator
pnpm web       # Web browser
```

### Available Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `pnpm start`         | Start Expo development server            |
| `pnpm ios`           | Run on iOS simulator                     |
| `pnpm android`       | Run on Android emulator                  |
| `pnpm web`           | Run in web browser                       |
| `pnpm test`          | Run test suite                           |
| `pnpm test:watch`    | Run tests in watch mode                  |
| `pnpm test:coverage` | Run tests with coverage report           |
| `pnpm lint`          | Run ESLint                               |
| `pnpm lint:fix`      | Run ESLint with auto-fix                 |
| `pnpm format`        | Format code with Prettier                |
| `pnpm format:check`  | Check formatting without modifying files |

## Code Quality

### Linting

ESLint is configured with a flat config in `eslint.config.mjs`:

- TypeScript rules (`@typescript-eslint`)
- React and React Hooks rules
- React Native rules
- Import sorting (`simple-import-sort`)
- Prettier compatibility

Run linting:

```bash
pnpm lint          # Check for issues
pnpm lint:fix      # Auto-fix what's possible
```

### Formatting

Prettier is configured in `.prettierrc`:

```bash
pnpm format        # Format all files
pnpm format:check  # Check without modifying
```

### Pre-Push Checklist

Before pushing code, always run:

```bash
pnpm lint:fix    # Fix lint issues
pnpm format      # Format code
```

Both must pass cleanly before pushing. This is enforced by project convention (see `CLAUDE.md`).

## Testing

### Framework

- **Jest 29** with `jest-expo` preset
- **@testing-library/react-native** for component tests
- Test files live in `__tests__/` directories alongside the code they test

### Configuration

`jest.config.js`:

- Test pattern: `/__tests__/.*\.(test|spec)\.[jt]sx?$`
- Coverage from: `src/**/*.{ts,tsx}` (excluding `.d.ts` and `index.ts` barrel files)
- Mocks: AsyncStorage, OpenRouter SDK

### Running Tests

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
```

### Writing Tests

Place test files in `__tests__/` directories:

```
src/
  hooks/
    useServers.ts
    __tests__/
      useServers.test.ts
  services/
    providers/
      CachedChatProvider.ts
      __tests__/
        CachedChatProvider.test.ts
```

## Project Structure Conventions

### File Naming

- **Components**: PascalCase (`ChatScreen.tsx`, `BiometricLockScreen.tsx`)
- **Hooks**: camelCase with `use` prefix (`useServers.ts`, `useChatProvider.ts`)
- **Services**: PascalCase for classes (`ClaudeChatProvider.ts`), camelCase for utilities (`secureTokenStorage.ts`)
- **Config**: camelCase (`gateway.config.ts`)
- **Constants**: camelCase (`index.ts`)

### Route Files

Route files in `app/` follow Expo Router conventions:

- `_layout.tsx` — Layout wrapper
- `index.tsx` — Default route for a directory
- `+not-found.tsx` — 404 handler
- All other files map to URL paths (e.g., `settings.tsx` → `/settings`)

## Adding a New Provider

To add a new AI provider:

### 1. Create the Provider

Create `src/services/{provider-name}/{ProviderName}ChatProvider.ts`:

```typescript
import { ChatProvider, ProviderCapabilities, ... } from '../providers/types';

export class NewChatProvider implements ChatProvider {
  capabilities: ProviderCapabilities = {
    chat: true,
    imageAttachments: false,
    serverSessions: false,
    persistentHistory: false,
    scheduler: false,
    gatewaySnapshot: false,
  };

  async connect(): Promise<void> { /* ... */ }
  disconnect(): void { /* ... */ }
  isConnected(): boolean { /* ... */ }
  onConnectionStateChange(listener: (connected: boolean) => void): () => void { /* ... */ }
  async sendMessage(params: SendMessageParams, onEvent: StreamCallback): Promise<void> { /* ... */ }
  async getChatHistory(sessionKey: string, limit?: number): Promise<ChatHistoryResponse> { /* ... */ }
  async resetSession(sessionKey: string): Promise<void> { /* ... */ }
  async listSessions(): Promise<unknown> { /* ... */ }
  async getHealth(): Promise<HealthStatus> { /* ... */ }
}
```

### 2. Register in the Factory

Update `src/services/providers/createProvider.ts` to include the new provider type in the switch statement.

### 3. Add Provider Metadata

Update `src/config/providerOptions.tsx` with the provider's display name, icon, and description.

### 4. Store Tokens Securely

Use `secureTokenStorage.ts` for API keys — never store them in AsyncStorage or code.

### 5. Add Tests

Create `src/services/{provider-name}/__tests__/{ProviderName}ChatProvider.test.ts`.

## Adding a Native Module

Native modules live in `modules/`:

```
modules/
  my-module/
    src/
      index.ts              # TypeScript bindings
      MyModule.types.ts     # Type definitions
    ios/
      MyModule.swift        # iOS implementation
    android/
      src/.../MyModule.kt   # Android implementation
    expo-module.config.json # Expo module config
```

Register the module in `app.json` plugins if needed.

## CI/CD

### GitHub Actions Workflows

Located in `.github/workflows/`:

| Workflow                      | Trigger          | Purpose                        |
| ----------------------------- | ---------------- | ------------------------------ |
| `build-check.yml`             | PR, push to main | TypeScript check + Expo export |
| `lint.yml`                    | PR, push to main | ESLint + Prettier              |
| `test.yml`                    | PR, push to main | Jest with coverage             |
| `ios-build.yml`               | Manual           | EAS iOS build                  |
| `android-build.yml`           | Manual           | EAS Android build              |
| `deploy-ios-testing.yml`      | Manual           | TestFlight submission          |
| `deploy-android-testing.yml`  | Manual           | Google Play internal testing   |
| `deploy-cloudflare-pages.yml` | Manual           | Web static export              |

All CI workflows use Node.js 20 and pnpm 10.

### EAS Build

Build and submit using Expo Application Services:

```bash
# Development build (simulator)
eas build --platform ios --profile development

# Production build
eas build --platform ios --profile production

# Submit to App Store
eas submit -p ios

# Submit to Play Store
eas submit -p android
```

Profiles are defined in `eas.json`.

## Debugging

### Logging

Use the centralized logger from `src/utils/logger.ts` instead of `console.log`:

```typescript
import { logger } from '../utils/logger'

logger.info('Server connected', { serverId })
logger.error('Connection failed', error)
```

### Component Gallery

The `gallery.tsx` route (`/gallery`) provides a component showcase for visual testing during development. Access it from the app navigation during development.

### Error Boundary

`src/components/ui/ErrorBoundary.tsx` catches rendering errors app-wide. During development, you'll see the error details; in production, users see a recovery UI.

## Key Architecture Decisions

| Decision                             | Rationale                                                                |
| ------------------------------------ | ------------------------------------------------------------------------ |
| **Jotai over Redux/Zustand**         | Minimal boilerplate, atom-based reactivity fits provider-switching model |
| **AsyncStorage over SQLite**         | Simple key-value needs, no relational queries required                   |
| **Provider abstraction**             | Enables multi-provider support without coupling UI to specific APIs      |
| **CachedChatProvider decorator**     | Adds caching uniformly without modifying individual providers            |
| **File-based routing (Expo Router)** | Convention over configuration, matches web mental model                  |
| **pnpm**                             | Faster installs, strict dependency resolution                            |
