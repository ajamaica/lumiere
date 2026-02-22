# Lumiere — AI Assistant Guide

## Overview

Lumiere is a cross-platform AI chat client built with **React Native** (Expo SDK 54) and **TypeScript**. It connects to 12+ AI providers (OpenClaw/OpenCraw, Claude, OpenAI, OpenRouter, Gemini, Ollama, Kimi, Apple Intelligence, and more) through a unified provider abstraction. The app runs on **iOS, Android, Web, Desktop (Electron), and Chrome Extension**.

## Quick Reference

| Area             | Command / Path       |
| ---------------- | -------------------- |
| Install deps     | `pnpm install`       |
| Start dev server | `pnpm start`         |
| Run tests        | `pnpm test`          |
| Lint (auto-fix)  | `pnpm lint:fix`      |
| Format           | `pnpm format`        |
| Type check       | `npx tsc --noEmit`   |
| Build Chrome ext | `pnpm build:chrome`  |
| Build desktop    | `pnpm build:desktop` |

---

## Package Manager

Prefer **pnpm** over npm/yarn for all dependency management.

## Pre-Push Checks

Before every `git push`, you **must** run the following commands and fix any issues they report:

1. `pnpm lint:fix` — auto-fix ESLint issues, then resolve any remaining errors manually.
2. `pnpm format` — auto-format all files with Prettier.

Do **not** push code that has lint errors or formatting issues. If either command produces unfixable errors, address them in the code before pushing.

---

## Tech Stack

| Layer            | Technology                                            |
| ---------------- | ----------------------------------------------------- |
| Framework        | React Native 0.81, React 19, Expo 54, Expo Router 6   |
| Language         | TypeScript 5.9 (strict mode)                          |
| State management | Jotai (atoms with AsyncStorage persistence)           |
| Navigation       | Expo Router (file-based routing)                      |
| i18n             | i18next + react-i18next (11 languages)                |
| Styling          | React Native StyleSheet + custom theme system         |
| Animations       | React Native Reanimated 4                             |
| Testing          | Jest (jest-expo preset)                               |
| Linting          | ESLint 9 (flat config) + Prettier                     |
| CI/CD            | GitHub Actions, EAS Build, Fastlane, Cloudflare Pages |
| E2E testing      | Maestro                                               |

---

## Project Structure

```
lumiere/
├── app/                    # Expo Router file-based routes (22 screens)
│   ├── _layout.tsx         # Root layout: providers, auth gates, navigation
│   ├── index.tsx           # Home screen (main chat interface)
│   ├── settings.tsx        # Settings hub
│   ├── servers.tsx         # Server management
│   ├── sessions.tsx        # Session management
│   ├── missions.tsx        # Mission list (beta)
│   ├── create-mission.tsx  # Mission creation
│   ├── mission-detail.tsx  # Mission execution view
│   ├── scheduler.tsx       # Cron job management (OpenCraw only)
│   ├── skills.tsx          # Skills marketplace (OpenCraw only)
│   └── ...                 # Other screens (colors, language, triggers, etc.)
│
├── src/
│   ├── components/         # React components
│   │   ├── chat/           # ChatScreen, ChatInput, ChatMessage, voice UI
│   │   ├── missions/       # Mission planning and detail UI
│   │   ├── layout/         # Sidebar, layout wrappers
│   │   ├── ui/             # Reusable UI primitives (Button, Card, Badge, Text, etc.)
│   │   ├── gallery/        # Component showcase (dev only)
│   │   └── illustrations/  # SVG illustrations
│   │
│   ├── services/           # Backend integrations and business logic
│   │   ├── providers/      # ChatProvider abstraction layer
│   │   │   ├── types.ts    # ChatProvider interface, ProviderType, capabilities
│   │   │   ├── createProvider.ts  # Factory function
│   │   │   └── CachedChatProvider.ts  # Caching wrapper
│   │   ├── opencraw/           # OpenClaw WebSocket client (protocol v3)
│   │   ├── claude/         # Anthropic API client
│   │   ├── openai/         # OpenAI API client
│   │   ├── openrouter/     # OpenRouter SDK wrapper
│   │   ├── gemini/         # Google Gemini API client
│   │   ├── ollama/         # Local Ollama HTTP client
│   │   ├── kimi/           # Moonshot AI Kimi client
│   │   ├── apple-intelligence/  # iOS 18+ Foundation Models
│   │   ├── gemini-nano/    # Android on-device AI
│   │   ├── echo/           # Echo test provider
│   │   ├── clawhub/        # ClawHub API integration
│   │   ├── intents/        # Chat intent system
│   │   └── notifications/  # Push/background notifications
│   │
│   ├── hooks/              # Custom React hooks (~35 hooks)
│   │   ├── useChatProvider.ts       # Provider lifecycle management
│   │   ├── useServers.ts            # Server CRUD + secure token storage
│   │   ├── useSlashCommands.ts      # 38 built-in slash commands
│   │   ├── useMissionList.ts        # Mission data (read-only)
│   │   ├── useMissionActions.ts     # Mission CRUD operations
│   │   ├── useMissionMessages.ts    # Mission message persistence
│   │   ├── useMessageQueue.ts       # Outbound message queue
│   │   ├── useAttachments.ts        # File/image attachment handling
│   │   ├── useVoiceTranscription.ts # Speech-to-text
│   │   ├── useSpeech.ts             # Text-to-speech
│   │   ├── useDeepLinking.ts        # lumiere:// URL handling
│   │   ├── useLanguage.ts           # i18n language switching
│   │   └── ...                      # Platform-specific variants (.native, .web)
│   │
│   ├── store/              # Jotai state management
│   │   ├── atoms/
│   │   │   ├── serverAtoms.ts       # Server list, current server
│   │   │   ├── sessionAtoms.ts      # Session keys, aliases
│   │   │   ├── uiAtoms.ts           # Theme, language, onboarding state
│   │   │   ├── gatewayAtoms.ts      # Connection state
│   │   │   ├── messagingAtoms.ts    # Message queue, pending share data
│   │   │   ├── userDataAtoms.ts     # Favorites, triggers
│   │   │   ├── notificationAtoms.ts # Background notification config
│   │   │   ├── missionAtoms.ts      # Mission state
│   │   │   └── secureAtom.ts        # Web-only encrypted storage
│   │   ├── storage.ts      # AsyncStorage adapter for Jotai
│   │   └── types.ts        # Store type definitions
│   │
│   ├── theme/              # Theming system
│   │   ├── ThemeContext.tsx # ThemeProvider + useTheme() hook
│   │   ├── colors.ts       # 8 color themes (lumiere, pink, green, red, blue, purple, orange, glass)
│   │   ├── themes.ts       # Light/dark mode compositions
│   │   ├── typography.ts   # Font sizes, weights, line heights
│   │   ├── spacing.ts      # Spacing scale + border radii
│   │   └── useStyles.ts    # Hook for theme-aware StyleSheets
│   │
│   ├── i18n/               # Internationalization
│   │   ├── index.ts        # i18next configuration and language detection
│   │   └── locales/        # 11 translation JSON files
│   │
│   ├── config/             # App configuration
│   │   ├── gateway.config.ts    # OpenClaw protocol v3 methods and events
│   │   └── providerOptions.tsx  # Provider-specific UI field definitions
│   │
│   ├── constants/          # Application constants
│   │   └── index.ts        # Default models, API config, cache config, session keys
│   │
│   └── utils/              # Utility functions (~23 files)
│       ├── platform.ts     # Platform detection helpers
│       ├── device.ts       # Device detection
│       ├── logger.ts       # Logging utility
│       ├── attachments.ts  # Media attachment helpers
│       └── ...             # Image/video compression, URL parsing, etc.
│
├── modules/                # Native modules (Expo autolinking)
│   ├── speech-transcription/     # iOS speech recognition
│   ├── apple-intelligence/       # iOS 18+ Foundation Models
│   ├── apple-shortcuts/          # iOS Shortcuts integration
│   └── gemini-nano/              # Android on-device Gemini
│
├── fastlane/               # iOS/Android build automation and store metadata
├── chrome-extension/       # Chrome extension assets (manifest, service worker)
├── desktop/                # Electron desktop shell
├── landing-page/           # Marketing website
├── .github/workflows/      # 13 GitHub Actions workflows
├── .maestro/               # E2E test flows (6 flows)
├── assets/                 # Images, icons, splash screens
├── public/                 # Static web assets
└── scripts/                # Build scripts (desktop, chrome extension)
```

---

## Architecture Patterns

### Provider Abstraction

All AI backends implement the `ChatProvider` interface (`src/services/providers/types.ts`):

- **Interface**: `connect()`, `disconnect()`, `sendMessage()`, `getChatHistory()`, `resetSession()`, `listSessions()`, `getHealth()`
- **Factory**: `createChatProvider(config)` in `src/services/providers/createProvider.ts` returns the correct provider
- **Caching**: Every provider is wrapped with `CachedChatProvider` for offline message persistence (max 200 messages per session via AsyncStorage)
- **Hook**: `useChatProvider()` manages provider lifecycle, auto-connects on config change, and tracks connection state

**Provider types**: `opencraw`, `claude`, `openai`, `openai-compatible`, `openrouter`, `gemini`, `gemini-nano`, `kimi`, `ollama`, `apple`, `echo`

### State Management (Jotai)

- Atoms grouped by domain in `src/store/atoms/`
- Persistence via `atomWithStorage()` using an AsyncStorage adapter
- Web uses encrypted `secureAtom` (AES-GCM via Web Crypto API) for server credentials
- Access outside React: `getStore()` from `src/store/storage.ts`
- Session key format: `agent:agentId:sessionName` (mission sessions prefixed with `mission-`)

### Platform-Specific Code

- Files ending in `.native.ts(x)` — iOS/Android only
- Files ending in `.web.ts(x)` — web only
- Default `.ts(x)` — fallback (usually web or shared)
- Examples: `KeyboardProvider`, `useNotifications`, `useQuickActions`, `useAppleShortcuts`

### Theme System

- `ThemeProvider` wraps the app, reads `themeModeAtom` (light/dark/system) and `colorThemeAtom`
- 8 color themes, each with light + dark variants
- Use `useStyles((theme) => createStyles(theme))` for theme-aware StyleSheets
- Use `useTheme()` for direct access to theme values, mode toggling, color switching

### Navigation

- File-based routing via Expo Router in `app/`
- All secondary routes use modal presentation with slide-from-bottom animation
- Root layout gates: onboarding flow -> password lock (web) -> biometric lock (native) -> main app
- Deep linking via `lumiere://` scheme

### Hook Composition

Large hooks are decomposed into focused hooks. Example: `useMissions()` composes `useMissionList()` + `useMissionActions()` + `useMissionMessages()`.

---

## Code Style & Conventions

### ESLint (flat config — `eslint.config.mjs`)

- TypeScript parser with `@typescript-eslint` plugin
- `simple-import-sort/imports` and `simple-import-sort/exports` — both set to **error**
- `@typescript-eslint/no-unused-vars` — **warn** (ignores `_` prefixed vars)
- `@typescript-eslint/no-explicit-any` — **warn**
- `react/react-in-jsx-scope` — off (React 17+ JSX transform)

### Prettier (`.prettierrc`)

- No semicolons
- Single quotes
- Trailing commas everywhere
- 100-character print width
- 2-space indentation
- LF line endings

### TypeScript (`tsconfig.json`)

- Extends `expo/tsconfig.base`
- Strict mode enabled

### Component Conventions

- UI primitives live in `src/components/ui/` — reuse these before creating new ones
- Components use `useStyles()` hook for theme-aware styling
- All user-facing strings must use `t('key')` from react-i18next
- Feature components are grouped by domain (`chat/`, `missions/`, `layout/`)

### Constants

Key constants are centralized in `src/constants/index.ts`:

- `DEFAULT_SESSION_KEY = 'agent:main:main'`
- Default models per provider (e.g., `claude-sonnet-4-5`, `gpt-4o`, `gemini-2.0-flash`)
- API config (max tokens, API versions)
- Cache config (`MAX_CACHED_MESSAGES: 200`)

---

## Testing

### Unit Tests (Jest)

- Config: `jest.config.js` using `jest-expo` preset
- Test files: `__tests__/` directories with `.test.ts(x)` or `.spec.ts(x)` extensions
- Coverage: collects from `src/**/*.{ts,tsx}` (excludes `.d.ts` and `index.ts`)
- Mocks: AsyncStorage and `@openrouter/sdk` are mocked (see `__mocks__/`)
- Commands: `pnpm test`, `pnpm test:watch`, `pnpm test:coverage`

### E2E Tests (Maestro)

- Flows in `.maestro/` directory (6 flows)
- Tests onboarding, chat messaging, server addition, settings navigation, theme switching
- Runs on Maestro Cloud targeting iOS (iPhone 16) and Android (API 34)

---

## CI/CD

### GitHub Actions Workflows

| Workflow                      | Trigger                 | Purpose                                 |
| ----------------------------- | ----------------------- | --------------------------------------- |
| `lint.yml`                    | Push/PR                 | ESLint + Prettier checks                |
| `test.yml`                    | Push/PR                 | Jest with coverage                      |
| `build-check.yml`             | Push/PR                 | TypeScript type check + Expo export     |
| `deploy-web.yml`              | Push/PR                 | Deploy to Cloudflare Pages              |
| `deploy-cloudflare-pages.yml` | Push/PR (landing-page/) | Deploy landing page                     |
| `ios-build.yml`               | Version tag / manual    | iOS production build via EAS            |
| `android-build.yml`           | Version tag / manual    | Android production build via EAS        |
| `deploy-ios-testing.yml`      | Manual                  | iOS testing build to TestFlight         |
| `deploy-android-testing.yml`  | Manual                  | Android testing build to internal track |
| `build-desktop.yml`           | Version tag / manual    | Electron builds (macOS, Win, Linux)     |
| `export-chrome-extension.yml` | Push/PR / manual        | Chrome extension build                  |
| `maestro.yml`                 | Manual                  | E2E tests on Maestro Cloud              |
| `upload-metadata.yml`         | Manual                  | App store metadata via Fastlane         |

### Build Profiles (EAS — `eas.json`)

- **development**: Expo dev client, internal distribution
- **preview**: Internal distribution for beta testing
- **production**: Full app store builds with auto-submission

---

## Internationalization (i18n)

The app supports **11 languages**. Every user-facing string must be translated in **all** locales.

| Language               | Code    | Locale File                   |
| ---------------------- | ------- | ----------------------------- |
| English                | `en`    | `src/i18n/locales/en.json`    |
| Spanish                | `es`    | `src/i18n/locales/es.json`    |
| French                 | `fr`    | `src/i18n/locales/fr.json`    |
| German                 | `de`    | `src/i18n/locales/de.json`    |
| Hindi                  | `hi`    | `src/i18n/locales/hi.json`    |
| Japanese               | `ja`    | `src/i18n/locales/ja.json`    |
| Korean                 | `ko`    | `src/i18n/locales/ko.json`    |
| Portuguese (Brazilian) | `pt-BR` | `src/i18n/locales/pt-BR.json` |
| Russian                | `ru`    | `src/i18n/locales/ru.json`    |
| Simplified Chinese     | `zh-CN` | `src/i18n/locales/zh-CN.json` |
| Traditional Chinese    | `zh-TW` | `src/i18n/locales/zh-TW.json` |

### Rules for every new feature or UI change

1. **Never hardcode user-facing strings.** Use `t('key')` from `react-i18next` and add the key to `en.json`.
2. **Add translations to ALL 11 locale files** whenever you add or modify a key in `en.json`.
3. **Keep all locale files in sync** — every key present in `en.json` must exist in every other locale file.
4. **Fastlane metadata** lives under `fastlane/metadata/` (iOS) and `fastlane/metadata/android/` (Play Store). If the app description or feature list changes, update the store metadata for all locales too.
5. **Language config** is in `src/i18n/index.ts` — imports, `resources`, and `languageNames` must stay in sync with the locale files.

---

## Adding a New AI Provider

1. Create a new directory under `src/services/<provider-name>/`
2. Implement the `ChatProvider` interface from `src/services/providers/types.ts`
3. Register the provider type in `ProviderType` union
4. Add a case in `createChatProvider()` in `src/services/providers/createProvider.ts`
5. Add default model constants to `src/constants/index.ts`
6. Add provider UI options to `src/config/providerOptions.tsx`
7. Add translated provider name and config labels to all 11 locale files

## Adding a New Screen

1. Create the route file in `app/<screen-name>.tsx`
2. The root `_layout.tsx` auto-registers it as a modal route
3. Use `useStyles()` for theme-aware styling
4. All user-facing strings must use `t('key')` with translations in all 11 locales

## Adding a New Jotai Atom

1. Add the atom in the appropriate file under `src/store/atoms/`
2. Use `atomWithStorage()` if persistence is needed
3. Export from `src/store/index.ts`
4. Add TypeScript types to `src/store/types.ts` if needed
