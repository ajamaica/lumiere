<p align="center">
  <a href="https://lumiere.chat">
    <img src="assets/icon.png" alt="Lumiere" width="120" />
  </a>
</p>

<h1 align="center">Lumiere</h1>

<p align="center">
  A cross-platform AI chat client built with React Native (Expo SDK 54) and TypeScript. Connects to 12+ AI providers including OpenClaw, Claude, OpenRouter, OpenAI, Gemini, Ollama, Kimi, Apple Intelligence, and more through a unified provider abstraction. Runs on iOS, Android, Web, Desktop (Electron), and Chrome Extension.
</p>

<p align="center">
  <a href="https://lumiere.chat">Website</a> •
  <a href="#features">Features</a> •
  <a href="#ai-providers">AI Providers</a> •
  <a href="#screens">Screens</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#testing">Testing</a> •
  <a href="#cicd">CI/CD</a> •
  <a href="#internationalization">Internationalization</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

## Features

### Core

- **Multi-provider support** — Connect to 12+ AI providers including OpenClaw, Claude, OpenRouter, OpenAI, Gemini, Ollama, Apple Intelligence, and more
- **Multi-server management** — Configure, switch between, and backup/restore multiple AI servers
- **Real-time streaming** — Streamed AI responses with markdown rendering
- **Image attachments** — Attach images, documents, and other files to chat messages (provider-dependent)
- **Message queue** — Queue messages while the agent is responding
- **Slash commands** — 38 built-in commands with autocomplete
- **Missions** _(Beta)_ — Multi-step AI-driven task planning with subtask execution and streaming progress
- **Skills** — Teach agents custom capabilities via skill packs (OpenClaw)

### Voice & Input

- **Voice transcription** — Dictate messages using native iOS speech recognition
- **Recording overlay** — Visual feedback with real-time transcription preview
- **Text-to-speech** — Play/pause TTS on any message

### Personalization

- **Color themes** — 8 color palettes (Default, Pink, Green, Red, Blue, Purple, Orange, Glass)
- **Light & dark modes** — System-aware theming with manual override
- **Session aliases** — Custom display names for chat sessions
- **11 languages** — English, Spanish, French, German, Hindi, Japanese, Korean, Portuguese (BR), Russian, Simplified Chinese, Traditional Chinese

### Automation

- **Triggers** — Create deep links that auto-send messages to specific sessions
- **Quick actions** — Home screen shortcuts (iOS 3D Touch / Android) linked to triggers
- **Cron scheduler** — Schedule recurring agent tasks (OpenClaw only)
- **Background notifications** — Get notified of new messages when app is backgrounded

### Security

- **Face ID / Touch ID** — Biometric authentication on app launch and resume
- **Secure storage** — API keys and tokens stored in the device keychain
- **Encrypted web storage** — AES-GCM encryption via Web Crypto API for server credentials on web

### Platform

- **iOS & Android** — Full mobile support
- **iPad** — Responsive layouts with form sheet modals on tablet
- **Web** — Browser support via Metro bundler
- **Desktop** — Electron app builds
- **Chrome Extension** — Browser extension build
- **Deep linking** — Open screens and execute triggers via `lumiere://` URLs

## AI Providers

| Provider               | Type                | Chat | Images | Sessions | History | Scheduler | Skills |
| ---------------------- | ------------------- | :--: | :----: | :------: | :-----: | :-------: | :----: |
| **OpenClaw**           | `molt`              |  ✅  |   ✅   |    ✅    |   ✅    |    ✅     |   ✅   |
| **Claude**             | `claude`            |  ✅  |   ✅   |    —     |    —    |     —     |   —    |
| **OpenRouter**         | `openrouter`        |  ✅  |   ✅   |    —     |    —    |     —     |   —    |
| **OpenAI**             | `openai`            |  ✅  |   ✅   |    —     |    —    |     —     |   —    |
| **OpenAI Compatible**  | `openai-compatible` |  ✅  |   ✅   |    —     |    —    |     —     |   —    |
| **Gemini**             | `gemini`            |  ✅  |   ✅   |    —     |    —    |     —     |   —    |
| **Gemini Nano**        | `gemini-nano`       |  ✅  |   —    |    —     |    —    |     —     |   —    |
| **Kimi**               | `kimi`              |  ✅  |   ✅   |    —     |    —    |     —     |   —    |
| **Ollama**             | `ollama`            |  ✅  |   —    |    —     |    —    |     —     |   —    |
| **Apple Intelligence** | `apple`             |  ✅  |   —    |    —     |    —    |     —     |   —    |
| **Echo Server**        | `echo`              |  ✅  |   —    |    —     |    —    |     —     |   —    |

### OpenClaw (Molt Gateway)

Full-featured provider with WebSocket streaming, server-side sessions, chat history persistence, cron job scheduling, and skill support. Requires a running Molt Gateway instance.

### Claude (Anthropic API)

Direct integration with Anthropic's Messages API. Supports streaming responses and image attachments. Requires an Anthropic API key.

### OpenRouter

Access hundreds of models from multiple providers through a single API. Supports streaming and image attachments. Requires an OpenRouter API key.

### OpenAI

Direct integration with OpenAI's Chat Completions API. Supports streaming and image attachments. Requires an OpenAI API key.

### OpenAI Compatible

Connect to any provider that implements the OpenAI-compatible API format (e.g., LM Studio, vLLM, Together AI).

### Gemini

Google's Gemini models with streaming and image support. Requires a Google AI API key.

### Gemini Nano

On-device AI using Google's Gemini Nano model. Android only. No external server needed.

### Kimi

Moonshot AI's Kimi models with streaming and image support. Requires a Kimi API key.

### Ollama

Connect to a local Ollama instance for offline AI. Includes a model selection screen to switch between installed models.

### Apple Intelligence

On-device AI using Apple Foundation Models. Requires iOS 18+ with Apple Intelligence support. No external server needed.

### Echo Server

Testing provider that echoes messages back. Useful for development and debugging.

## Screens

| Screen              | File                      | Description                                                                                                           |
| ------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Chat**            | `app/index.tsx`           | Main chat interface with streaming responses, markdown rendering, voice input, slash commands, and message favoriting |
| **Settings**        | `app/settings.tsx`        | App configuration including appearance, security, notifications, and account management                               |
| **Servers**         | `app/servers.tsx`         | View, switch, and manage configured AI servers                                                                        |
| **Add Server**      | `app/add-server.tsx`      | Configure a new server with provider-specific fields                                                                  |
| **Edit Server**     | `app/edit-server.tsx`     | Modify or delete existing server configuration                                                                        |
| **Backup Servers**  | `app/backup-servers.tsx`  | Export server configurations for backup                                                                               |
| **Restore Servers** | `app/restore-servers.tsx` | Import server configurations from backup                                                                              |
| **Sessions**        | `app/sessions.tsx`        | Create, switch, and reset chat sessions (OpenClaw)                                                                    |
| **Edit Session**    | `app/edit-session.tsx`    | Rename sessions with custom aliases                                                                                   |
| **Missions**        | `app/missions.tsx`        | View and manage multi-step AI missions (Beta)                                                                         |
| **Create Mission**  | `app/create-mission.tsx`  | Create a new mission with goals and parameters                                                                        |
| **Mission Detail**  | `app/mission-detail.tsx`  | View mission progress, subtasks, and streaming results                                                                |
| **Skills**          | `app/skills.tsx`          | Browse and install agent skill packs (OpenClaw)                                                                       |
| **Overview**        | `app/overview.tsx`        | Gateway monitoring dashboard with health status (OpenClaw)                                                            |
| **Gateway Logs**    | `app/gateway-logs.tsx`    | View gateway log output (OpenClaw)                                                                                    |
| **Scheduler**       | `app/scheduler.tsx`       | Cron job management (OpenClaw)                                                                                        |
| **Favorites**       | `app/favorites.tsx`       | Saved messages viewer                                                                                                 |
| **Triggers**        | `app/triggers.tsx`        | Create and manage auto-send deep links                                                                                |
| **Colors**          | `app/colors.tsx`          | Color theme selection                                                                                                 |
| **Language**        | `app/language.tsx`        | Language selection (11 languages)                                                                                     |
| **Ollama Models**   | `app/ollama-models.tsx`   | Model selection for Ollama provider                                                                                   |
| **Gallery**         | `app/gallery.tsx`         | Component showcase for development                                                                                    |

### Navigation Flow

```
RootLayout (ThemeProvider + KeyboardProvider + i18n)
├── OnboardingScreen (if first launch)
├── PasswordLockScreen (web, if enabled)
├── BiometricLockScreen (native, if Face ID enabled)
└── Stack Navigator
    ├── Chat (index)
    ├── Settings
    ├── Servers / Add Server / Edit Server
    ├── Backup Servers / Restore Servers
    ├── Sessions / Edit Session
    ├── Missions / Create Mission / Mission Detail
    ├── Skills
    ├── Overview / Gateway Logs (OpenClaw)
    ├── Scheduler (OpenClaw)
    ├── Favorites
    ├── Triggers
    ├── Colors
    ├── Language
    ├── Ollama Models (Ollama)
    └── Gallery
```

## Screenshots

<p align="center">
  <img src="screenshots/chat-conversation.png" alt="Chat Light Mode" width="200" />
  <img src="screenshots/chat-dark-mode.png" alt="Chat Dark Mode" width="200" />
  <img src="screenshots/settings.png" alt="Settings" width="200" />
</p>

<p align="center">
  <img src="screenshots/add-server.png" alt="Add Server" width="200" />
  <img src="screenshots/colors-theme.png" alt="Color Themes" width="200" />
  <img src="screenshots/favorites.png" alt="Favorites" width="200" />
</p>

## Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/) package manager
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- iOS Simulator (macOS) or Android Emulator

### Quick Reference

| Area             | Command              |
| ---------------- | -------------------- |
| Install deps     | `pnpm install`       |
| Start dev server | `pnpm start`         |
| Run tests        | `pnpm test`          |
| Lint (auto-fix)  | `pnpm lint:fix`      |
| Format           | `pnpm format`        |
| Type check       | `npx tsc --noEmit`   |
| Build Chrome ext | `pnpm build:chrome`  |
| Build desktop    | `pnpm build:desktop` |

### Installation

```bash
pnpm install
pnpm start
```

### Adding a Server

1. Open the app and tap the settings gear icon
2. Tap the + button next to "Servers"
3. Select a provider type
4. Fill in the required fields:
   - **OpenClaw**: Name, WebSocket URL, Token, Client ID
   - **Claude**: Name, API Key
   - **OpenRouter**: Name, API Key
   - **OpenAI**: Name, API Key
   - **OpenAI Compatible**: Name, Server URL, API Key
   - **Gemini**: Name, API Key
   - **Kimi**: Name, API Key
   - **Ollama**: Name, Server URL (default: `http://localhost:11434`)
   - **Apple Intelligence**: Name only (on-device)
   - **Gemini Nano**: Name only (on-device, Android)
   - **Echo**: Name only (for testing)
5. Tap "Add Server"

### Deep Linking

Open screens directly using `lumiere://` URLs:

| URL                                    | Action             |
| -------------------------------------- | ------------------ |
| `lumiere://chat`                       | Chat screen        |
| `lumiere://settings`                   | Settings           |
| `lumiere://servers`                    | Server management  |
| `lumiere://sessions`                   | Session management |
| `lumiere://missions`                   | Missions           |
| `lumiere://overview`                   | Gateway overview   |
| `lumiere://scheduler`                  | Cron scheduler     |
| `lumiere://favorites`                  | Favorites          |
| `lumiere://triggers`                   | Triggers           |
| `lumiere://colors`                     | Color themes       |
| `lumiere://language`                   | Language selection |
| `lumiere://trigger/autotrigger/{slug}` | Execute a trigger  |

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

## Architecture

### Project Structure

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
│   ├── scheduler.tsx       # Cron job management (Molt only)
│   ├── skills.tsx          # Skills marketplace (Molt only)
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
│   │   ├── molt/           # OpenClaw WebSocket client (protocol v3)
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

### Provider Abstraction

All AI backends implement the `ChatProvider` interface (`src/services/providers/types.ts`):

- **Interface**: `connect()`, `disconnect()`, `sendMessage()`, `getChatHistory()`, `resetSession()`, `listSessions()`, `getHealth()`
- **Factory**: `createChatProvider(config)` in `src/services/providers/createProvider.ts` returns the correct provider
- **Caching**: Every provider is wrapped with `CachedChatProvider` for offline message persistence (max 200 messages per session via AsyncStorage)
- **Hook**: `useChatProvider()` manages provider lifecycle, auto-connects on config change, and tracks connection state

**Provider types**: `molt`, `claude`, `openai`, `openai-compatible`, `openrouter`, `gemini`, `gemini-nano`, `kimi`, `ollama`, `apple`, `echo`

### State Management (Jotai)

- Atoms grouped by domain in `src/store/atoms/`
- Persistence via `atomWithStorage()` using an AsyncStorage adapter
- Web uses encrypted `secureAtom` (AES-GCM via Web Crypto API) for server credentials
- Access outside React: `getStore()` from `src/store/storage.ts`
- Session key format: `agent:agentId:sessionName` (mission sessions prefixed with `mission-`)

### Theme System

- `ThemeProvider` wraps the app, reads `themeModeAtom` (light/dark/system) and `colorThemeAtom`
- 8 color themes, each with light + dark variants
- Use `useStyles((theme) => createStyles(theme))` for theme-aware StyleSheets
- Use `useTheme()` for direct access to theme values, mode toggling, color switching

### Platform-Specific Code

- Files ending in `.native.ts(x)` — iOS/Android only
- Files ending in `.web.ts(x)` — web only
- Default `.ts(x)` — fallback (usually web or shared)
- Examples: `KeyboardProvider`, `useNotifications`, `useQuickActions`, `useAppleShortcuts`

### Hook Composition

Large hooks are decomposed into focused hooks. Example: `useMissions()` composes `useMissionList()` + `useMissionActions()` + `useMissionMessages()`.

## Platform-Specific Features

### iOS

- Voice transcription via native Speech Recognition
- Apple Intelligence provider (iOS 18+)
- Apple Shortcuts integration
- 3D Touch quick actions
- Glass effect input styling

### iPad

- Form sheet modals instead of full-screen
- Responsive layouts
- Landscape orientation support

### Android

- Gemini Nano on-device AI
- Quick actions / app shortcuts

### Web

- Full browser support via Metro bundler
- Password lock screen with encrypted storage

### Desktop

- Electron app builds (macOS, Windows, Linux)

### Chrome Extension

- Browser extension build with service worker

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

### Build Profiles (EAS)

- **development**: Expo dev client, internal distribution
- **preview**: Internal distribution for beta testing
- **production**: Full app store builds with auto-submission

## Internationalization

The app supports **11 languages**:

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

All user-facing strings use `react-i18next`. Every key in `en.json` must exist in all other locale files. Fastlane metadata under `fastlane/metadata/` must also be kept in sync.

## Code Style

- **ESLint 9** (flat config) with `@typescript-eslint` and `simple-import-sort` plugins
- **Prettier**: No semicolons, single quotes, trailing commas, 100-char width, 2-space indent, LF endings
- **TypeScript**: Strict mode, extends `expo/tsconfig.base`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

Please run `pnpm lint:fix` and `pnpm format` before submitting.

### Adding a New AI Provider

1. Create a new directory under `src/services/<provider-name>/`
2. Implement the `ChatProvider` interface from `src/services/providers/types.ts`
3. Register the provider type in the `ProviderType` union
4. Add a case in `createChatProvider()` in `src/services/providers/createProvider.ts`
5. Add default model constants to `src/constants/index.ts`
6. Add provider UI options to `src/config/providerOptions.tsx`
7. Add translated provider name and config labels to all 11 locale files

### Adding a New Screen

1. Create the route file in `app/<screen-name>.tsx`
2. The root `_layout.tsx` auto-registers it as a modal route
3. Use `useStyles()` for theme-aware styling
4. All user-facing strings must use `t('key')` with translations in all 11 locales

### Adding a New Jotai Atom

1. Add the atom in the appropriate file under `src/store/atoms/`
2. Use `atomWithStorage()` if persistence is needed
3. Export from `src/store/index.ts`
4. Add TypeScript types to `src/store/types.ts` if needed

## License

[MIT](LICENSE)
