<p align="center">
  <img src="assets/logo.png" alt="Lumiere" width="120" />
</p>

<h1 align="center">Lumiere</h1>

<p align="center">
  A React Native mobile client for interacting with AI agents through the <a href="#">Molt Gateway</a>.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

## Features

- **Real-time streaming chat** — WebSocket connection to Molt Gateway with streamed AI responses
- **Message queue** — Queue messages while the agent is responding for continuous conversation flow
- **Slash commands** — 30+ built-in commands with autocomplete across core, model, execution, and admin categories
- **Session management** — Create, switch, and reset independent chat sessions
- **Cron scheduler** — Schedule and manage recurring agent tasks
- **Gateway monitoring** — Live health checks, uptime, and connection status
- **Light & dark themes** — System-aware theming with manual override
- **Onboarding flow** — Guided first-time setup for gateway credentials

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 10+
- [Expo Go](https://expo.dev/go) app on your device (for development)

### Installation

```bash
git clone https://github.com/your-org/lumiere.git
cd lumiere
pnpm install
```

### Running

```bash
pnpm start       # Start Expo dev server
pnpm ios         # Run on iOS simulator
pnpm android     # Run on Android emulator
pnpm web         # Run in browser
```

On first launch, the onboarding screen will prompt you for your Molt Gateway URL, token, client ID, and session key.

### Linting & Formatting

```bash
pnpm lint         # Run ESLint
pnpm lint:fix     # Auto-fix lint issues
pnpm format       # Format with Prettier
pnpm format:check # Check formatting
```

## Architecture

```
app/                        # Expo Router screens
├── (tabs)/                 # Tab navigation (Chat, Settings)
├── overview.tsx            # Gateway status modal
├── sessions.tsx            # Session management modal
└── scheduler.tsx           # Cron scheduler modal

src/
├── components/chat/        # Chat UI (ChatScreen, ChatInput, ChatMessage)
├── services/molt/          # Molt Gateway WebSocket client & React hook
├── hooks/                  # useMessageQueue, useSlashCommands
├── store/                  # Jotai atoms with AsyncStorage persistence
├── config/                 # Gateway & protocol configuration
├── screens/                # Onboarding screen
└── theme/                  # Colors, typography, spacing, theme provider
```

### Molt Gateway Protocol

Lumiere communicates over WebSocket using a frame-based protocol:

| Frame type | Direction | Purpose |
|------------|-----------|---------|
| `req`      | Client → Server | Method call with params |
| `res`      | Server → Client | Response payload or error |
| `event`    | Server → Client | Streaming events (agent, presence, tick, shutdown) |

Key methods: `connect`, `health`, `send`, `agent`, `sessions.list`, `sessions.reset`, `chat.history`, `cron.*`

## Configuration

All settings are persisted locally via AsyncStorage and configured during onboarding:

| Setting | Description | Default |
|---------|-------------|---------|
| Gateway URL | WebSocket endpoint (`wss://...`) | — |
| Gateway Token | Authentication token | — |
| Client ID | Device identifier | `lumiere-mobile` |
| Session Key | Initial chat session | `agent:main:main` |
| Theme | `light` / `dark` / `system` | `system` |

Gateway defaults are in `src/config/gateway.config.ts`.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | [Expo](https://expo.dev) 54 + [React Native](https://reactnative.dev) 0.81 |
| Language | [TypeScript](https://www.typescriptlang.org/) 5.9 |
| Routing | [expo-router](https://docs.expo.dev/router/introduction/) |
| State | [Jotai](https://jotai.org/) + AsyncStorage |
| Rendering | react-native-markdown-display |
| CI/CD | [EAS Build & Update](https://docs.expo.dev/eas/) + GitHub Actions |

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Build
eas build --platform ios
eas build --platform android

# OTA update
eas update --branch production --message "description"
```

The included GitHub Actions workflow (`.github/workflows/eas-update.yml`) automatically deploys updates on push to `main`.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

Please run `pnpm lint` and `pnpm format:check` before submitting.

## License

[MIT](LICENSE)
