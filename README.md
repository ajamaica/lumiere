<p align="center">
  <img src="assets/logo.png" alt="Lumiere" width="120" />
</p>

<h1 align="center">Lumiere</h1>

<p align="center">
  A React Native mobile client for interacting with AI agents. Supports 12+ providers including OpenClaw, Claude, OpenRouter, OpenAI, Gemini, Ollama, and Apple Intelligence.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#ai-providers">AI Providers</a> •
  <a href="#screens">Screens</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#architecture">Architecture</a> •
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
├── BiometricLockScreen (if Face ID enabled)
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

## Architecture

```
app/                    Expo Router file-based routes
├── _layout.tsx         Root layout with providers and auth gates
└── *.tsx               Screen routes

src/
├── components/
│   ├── chat/           Chat UI (ChatScreen, ChatInput, ChatMessage)
│   ├── missions/       Mission planning and detail UI
│   ├── layout/         Layout wrappers
│   └── ui/             Reusable components (Button, Card, Badge, etc.)
├── screens/            Onboarding and lock screens
├── services/
│   ├── molt/           OpenClaw WebSocket client
│   ├── claude/         Claude/Anthropic API client
│   ├── openrouter/     OpenRouter SDK client
│   ├── openai/         OpenAI API client
│   ├── gemini/         Google Gemini API client
│   ├── kimi/           Kimi API client
│   ├── ollama/         Ollama HTTP client
│   ├── apple-intelligence/  Apple Foundation Models wrapper
│   └── echo/           Echo test provider
├── hooks/              Custom hooks (useServers, useChatProvider, useVoiceTranscription, etc.)
├── store/              Jotai atoms with AsyncStorage persistence
├── i18n/               Internationalization (11 languages)
├── theme/              Theme system (colors, typography, spacing)
└── utils/              Utilities (device detection, encryption, etc.)

modules/
├── speech-transcription/    Native iOS speech recognition
├── apple-intelligence/      Native Apple Foundation Models (iOS 18+)
├── apple-shortcuts/         Apple Shortcuts integration
└── gemini-nano/             Android native Gemini Nano

desktop/                Electron app configuration
chrome-extension/       Chrome extension build
fastlane/               iOS/Android build automation
```

**Key dependencies:** React Native 0.81, Expo 54, Expo Router 6, Jotai (state), React Native Reanimated (animations), react-i18next (i18n).

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

### Desktop

- Electron app builds

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

Please run `pnpm lint` and `pnpm format:check` before submitting.

## License

[MIT](LICENSE)
