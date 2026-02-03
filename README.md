<p align="center">
  <img src="assets/logo.png" alt="Lumiere" width="120" />
</p>

<h1 align="center">Lumiere</h1>

<p align="center">
  A React Native mobile client for interacting with AI agents through the <a href="#">Molt Gateway</a>.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#screens">Screens</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

## Features

- **Multi-server support** — Connect and manage multiple Molt Gateway servers simultaneously
- **Real-time streaming chat** — WebSocket connection to Molt Gateway with streamed AI responses
- **Image attachments** — Attach images to chat messages via the + button in the input bar
- **Message queue** — Queue messages while the agent is responding for continuous conversation flow
- **Slash commands** — 30+ built-in commands with autocomplete across core, model, execution, and admin categories
- **Session management** — Create, switch, and reset independent chat sessions
- **Cron scheduler** — Schedule and manage recurring agent tasks
- **Gateway monitoring** — Live health checks, uptime, and connection status
- **Favorites** — Save and manage favorite messages with persistent storage
- **Face ID lock** — Biometric authentication on app launch and resume
- **Deep linking** — Open app screens directly via `lumiere://` URLs
- **Light & dark themes** — System-aware theming with manual override and dark mode support
- **Onboarding flow** — Guided first-time setup for gateway credentials

## Screens

Lumiere uses [Expo Router](https://docs.expo.dev/router/introduction/) for file-based navigation. Screens are organized as stack routes with modal presentations.

### Screens

| Screen        | File                | Description                                                                                                                                                                                                                                                                         |
| ------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chat**      | `app/index.tsx`     | Main chat interface. Connects to Molt Gateway via WebSocket for real-time streamed AI responses. Supports markdown rendering, message queuing, slash command autocomplete, image attachments, and message favoriting. |
| **Settings**  | `app/settings.tsx`  | App configuration. Sections for Appearance (theme selection), Security (Face ID toggle), Control (links to Overview and Cron Jobs), About (version info), and Account (logout with credential clearing).              |
| **Overview**  | `app/overview.tsx`  | Gateway monitoring dashboard. Displays connection status, uptime, tick interval, and last refresh time. Shows resource counts for instances (presence beacons), sessions, and cron status. Includes gateway access credentials with show/hide toggle, and connect/refresh controls. |
| **Servers**   | `app/servers.tsx`   | Multi-server management. Add, edit, switch between, and remove Molt Gateway server configurations. Each server stores a name, WebSocket URL, token, and client ID. The active server is highlighted with a primary-color border.                                                    |
| **Sessions**  | `app/sessions.tsx`  | Chat session management. Create new sessions, reset the current session (clears message history on the gateway), and switch between available sessions fetched from the gateway. Active session is visually indicated.                                                              |
| **Scheduler** | `app/scheduler.tsx` | Cron job management. Displays scheduler status (enabled/disabled, job count, next wake time). Lists all gateway cron jobs with their schedule, agent, system prompt, and tags. Supports enabling/disabling, running on-demand, and removing jobs.                                   |
| **Favorites** | `app/favorites.tsx` | Saved messages viewer. Displays favorited chat messages with sender badges, timestamps, and message previews. Favorites are persisted via Jotai with AsyncStorage.                                                                                                                  |
| **Gallery**   | `app/gallery.tsx`   | Component gallery for development. Showcases all reusable UI components (Button, Card, Badge, TextInput, etc.) in a single scrollable view.                                                                                                                                         |

### Special Screens

| Screen             | File                                     | Description                                                                                                                                                                     |
| ------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Onboarding**     | `src/screens/OnboardingScreen.tsx`       | First-time setup wizard. Collects Gateway URL and token with optional advanced fields (Client ID, Default Session Key). Shown before main app when onboarding is not completed. |
| **Biometric Lock** | `src/components/BiometricLockScreen.tsx` | Face ID authentication screen. Displayed on app launch and when returning from background if biometric lock is enabled in Settings.                                             |
| **Home (Root)**    | `app/index.tsx`                          | Entry point that loads server config and renders the Chat screen, or shows a "No Server Configured" prompt if no server is set up.                                              |

### Navigation Flow

```
RootLayout (ThemeProvider + KeyboardProvider)
├── OnboardingScreen (if first launch)
├── BiometricLockScreen (if Face ID enabled)
└── Stack Navigator
    ├── Chat (index)
    ├── Settings
    ├── Overview
    ├── Servers
    ├── Sessions
    ├── Scheduler
    ├── Favorites
    └── Gallery
```

## Screenshots

<p align="center">
  <img src="assets/screenshots/onboarding.png" alt="Onboarding" width="200" />
  <img src="assets/screenshots/chat.png" alt="Chat Interface" width="200" />
  <img src="assets/screenshots/overview.png" alt="Gateway Overview" width="200" />
  <img src="assets/screenshots/chat-conversation.png" alt="Chat Conversation" width="200" />
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

### Chat Interface

- Real-time message streaming via WebSocket
- Markdown rendering for formatted responses
- Image attachment support via + button
- Message queue for continuous conversations
- Slash command autocomplete (30+ commands)
- Message favoriting with long-press
- Interactive keyboard dismissal on scroll
- Auto-scroll to latest messages

### Gateway Management

- Multi-server support for connecting to multiple Molt Gateway instances
- WebSocket connection status monitoring
- Health checks and uptime tracking
- Session and instance count monitoring
- Secure credential storage with show/hide toggle

### Session Management

- View and manage chat sessions
- Create new sessions and reset existing ones
- Quick session switching with visual active indicator
- Chat messages clear immediately on session switch

### Deep Linking

Open screens directly using `lumiere://` URLs:

- `lumiere://chat` — Chat screen
- `lumiere://settings` — Settings screen
- `lumiere://servers` — Server management
- `lumiere://sessions` — Session management
- `lumiere://overview` — Gateway overview
- `lumiere://scheduler` — Cron scheduler
- `lumiere://favorites` — Favorites

## Architecture

```
app/                    Expo Router file-based routes
├── _layout.tsx         Root layout with providers and auth gates
└── *.tsx               Screen routes

src/
├── components/
│   ├── chat/           Chat UI (ChatScreen, ChatInput, ChatMessage, SessionModal)
│   ├── ui/             Reusable components (Button, Card, Badge, TextInput, etc.)
│   └── gallery/        Component showcase for development
├── screens/            Legacy screens (OnboardingScreen)
├── services/molt/      Molt Gateway WebSocket client
├── hooks/              Custom hooks (useServers, useMessageQueue, useSlashCommands, useDeepLinking)
├── store/              Jotai atoms with AsyncStorage persistence
├── theme/              Theme system (colors, typography, spacing, dark mode)
├── config/             Configuration management
└── constants/          App constants
```

**Key dependencies:** React Native 0.81, Expo 54, Expo Router 6, Jotai (state), React Native Reanimated (animations), WebSocket (real-time streaming).

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

Please run `pnpm lint` and `pnpm format:check` before submitting.

## License

[MIT](LICENSE)
