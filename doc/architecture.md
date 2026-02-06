# Architecture

## Directory Structure

```
lumiere/
├── app/                        # Expo Router file-based routes (screens)
│   ├── _layout.tsx             # Root layout: providers, auth gates, navigation
│   ├── index.tsx               # Main chat screen
│   ├── settings.tsx            # App settings
│   ├── servers.tsx             # Server list management
│   ├── add-server.tsx          # Add new server flow
│   ├── edit-server.tsx         # Edit server configuration
│   ├── sessions.tsx            # Session switching (Molt-only)
│   ├── edit-session.tsx        # Session aliasing
│   ├── overview.tsx            # Gateway health dashboard
│   ├── scheduler.tsx           # Cron job scheduler (Molt)
│   ├── favorites.tsx           # Saved messages
│   ├── triggers.tsx            # Automation triggers
│   ├── colors.tsx              # Theme selection
│   ├── ollama-models.tsx       # Ollama model picker
│   ├── gallery.tsx             # Component showcase (dev)
│   └── +not-found.tsx          # 404 fallback
│
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── chat/               # Chat-specific components
│   │   │   ├── ChatScreen.tsx      # Main chat interface
│   │   │   ├── ChatInput.tsx       # Message input with voice/attachments
│   │   │   ├── ChatMessage.tsx     # Message bubble with markdown
│   │   │   ├── ChatWithSidebar.tsx # Layout wrapper for foldables/tablets
│   │   │   └── SessionModal.tsx    # Session selector modal
│   │   ├── ui/                 # Generic UI primitives
│   │   │   ├── Button, Badge, Card, Divider, Dropdown
│   │   │   ├── Text, TextInput, SettingRow, StatusDot
│   │   │   ├── ScreenHeader, StepIndicator, ErrorBoundary
│   │   │   └── ...
│   │   ├── BiometricLockScreen.tsx  # Biometric auth screen
│   │   ├── gallery/            # Dev component showcase
│   │   ├── illustrations/      # SVG illustrations
│   │   └── layout/             # Layout components
│   │
│   ├── services/               # Business logic and API clients
│   │   ├── providers/          # Provider abstraction layer
│   │   │   ├── types.ts            # ChatProvider interface
│   │   │   ├── createProvider.ts   # Factory function
│   │   │   └── CachedChatProvider.ts # Caching decorator
│   │   ├── molt/               # Molt Gateway WebSocket client
│   │   │   ├── client.ts           # MoltGatewayClient
│   │   │   ├── types.ts            # Protocol types
│   │   │   └── useMoltGateway.ts   # React hook wrapper
│   │   ├── claude/             # Anthropic Claude API
│   │   ├── ollama/             # Local Ollama HTTP client
│   │   ├── openai/             # OpenAI API
│   │   ├── openrouter/         # OpenRouter API
│   │   ├── apple-intelligence/ # iOS-only Apple Foundation Models
│   │   ├── gemini-nano/        # Android-only Gemini Nano
│   │   ├── emergent/           # Emergent API
│   │   ├── echo/               # Echo test provider (dev)
│   │   ├── notifications/      # Background fetch service
│   │   └── secureTokenStorage.ts # Keychain API wrapper
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useServers.ts           # Server CRUD + state
│   │   ├── useChatProvider.ts      # Provider lifecycle
│   │   ├── useMessageQueue.ts      # Message queuing
│   │   ├── useSlashCommands.ts     # /command parsing
│   │   ├── useVoiceTranscription.ts # iOS voice input
│   │   ├── useDeepLinking.ts       # Deep link handlers
│   │   ├── useNotifications.ts     # Push notification setup
│   │   ├── useQuickActions.ts      # Home screen shortcuts
│   │   ├── useAppleShortcuts.ts    # Apple Shortcuts integration
│   │   ├── useLanguage.ts          # i18n sync
│   │   └── useClaudeModels.ts      # Claude model listing
│   │
│   ├── store/
│   │   └── atoms.ts            # Jotai atoms (all app state)
│   │
│   ├── theme/                  # Theming system
│   │   ├── ThemeContext.tsx         # Theme provider
│   │   ├── colors.ts               # 8 color theme palettes
│   │   ├── themes.ts               # Theme factory
│   │   ├── spacing.ts              # Spacing scale
│   │   ├── typography.ts           # Font config
│   │   └── useStyles.ts            # Theme access hook
│   │
│   ├── config/                 # App configuration
│   │   ├── gateway.config.ts       # Molt protocol config
│   │   └── providerOptions.tsx     # Provider UI metadata
│   │
│   ├── constants/              # Shared constants
│   │   └── index.ts                # Default keys, models, API config
│   │
│   ├── i18n/                   # Internationalization
│   │   ├── index.ts                # i18next initialization
│   │   └── locales/                # Translation JSON files (en, es, fr)
│   │
│   ├── utils/                  # Utility functions
│   │   ├── logger.ts               # Centralized logging
│   │   ├── device.ts               # Device detection, foldable logic
│   │   ├── chatIntents.ts          # Slash command parsing
│   │   └── generateId.ts           # ID generation
│   │
│   └── screens/                # Full-screen components
│       ├── OnboardingFlow.tsx      # 3-step intro + provider setup
│       └── OnboardingScreen.tsx    # Server configuration setup
│
├── modules/                    # Native Expo modules
│   ├── speech-transcription/   # iOS Speech Recognition
│   ├── apple-intelligence/     # iOS Apple Foundation Models
│   ├── apple-shortcuts/        # Apple Shortcuts integration
│   └── gemini-nano/            # Android Gemini Nano
│
├── assets/                     # Images, icons, logos
├── screenshots/                # Marketing screenshots
└── landing-page/               # External landing page project
```

## Component Tree

The app follows a layered architecture with clear separation of concerns:

```
RootLayout (app/_layout.tsx)
├── KeyboardProvider           ← keyboard handling
├── ThemeProvider               ← color theme + light/dark mode
├── ErrorBoundary              ← crash recovery
└── AppContent
    ├── OnboardingFlow         ← first-time setup (shown once)
    ├── BiometricLockScreen    ← Face ID / Touch ID gate
    └── Stack Navigator        ← main navigation
        ├── Chat (index)       ← primary screen
        ├── Settings
        ├── Servers / AddServer / EditServer
        ├── Sessions / EditSession
        ├── Overview / Scheduler
        ├── Favorites / Triggers
        ├── Colors / OllamaModels
        └── Gallery (dev)
```

## Provider Abstraction

All chat providers implement a shared `ChatProvider` interface defined in `src/services/providers/types.ts`:

```
┌─────────────────────────────────────────────┐
│              ChatProvider Interface          │
├─────────────────────────────────────────────┤
│  capabilities: ProviderCapabilities         │
│  connect(): Promise<void>                   │
│  disconnect(): void                         │
│  isConnected(): boolean                     │
│  onConnectionStateChange(listener): unsub   │
│  sendMessage(params, onEvent): Promise      │
│  getChatHistory(session, limit?): Promise   │
│  resetSession(session): Promise<void>       │
│  listSessions(): Promise<unknown>           │
│  getHealth(): Promise<HealthStatus>         │
├─────────────────────────────────────────────┤
│  Implementations:                           │
│  ├── MoltChatProvider     (WebSocket)       │
│  ├── ClaudeChatProvider   (REST + SSE)      │
│  ├── OllamaChatProvider   (REST + SSE)      │
│  ├── OpenAIChatProvider   (REST + SSE)      │
│  ├── OpenRouterChatProvider (REST + SSE)    │
│  ├── AppleChatProvider    (Native bridge)   │
│  ├── GeminiNanoChatProvider (Native bridge) │
│  ├── EmergentChatProvider (REST + SSE)      │
│  └── EchoChatProvider     (In-memory)       │
└─────────────────────────────────────────────┘
```

### Provider Instantiation Flow

```
User selects server
    └─> useServers() retrieves ServerConfig
        └─> useChatProvider() calls createProvider(config)
            └─> createProvider() (factory) returns concrete provider
                └─> CachedChatProvider wraps it with AsyncStorage caching
                    └─> Provider is connected and ready
```

1. **Factory** (`createProvider.ts`) — Instantiates the correct provider based on the server's `type` field
2. **Core Provider** — Handles API communication for that specific backend
3. **Cached Decorator** (`CachedChatProvider.ts`) — Wraps every provider with local AsyncStorage caching
4. **Hook Layer** (`useChatProvider.ts`) — Manages connection lifecycle, reconnection, and cleanup

## State Management

Lumiere uses **Jotai** for global state with `atomWithStorage` for AsyncStorage persistence. All atoms are defined in `src/store/atoms.ts`.

### State Categories

**Persisted (AsyncStorage)**:

- Server configurations and active server ID
- Session keys and aliases
- User preferences (theme, language, biometric lock)
- Favorites and triggers
- Notification settings

**In-memory (Jotai defaults)**:

- Gateway connection status
- Message queue
- Loading states

### Data Flow

```
User Action
    └─> React Component
        └─> Jotai atom (useAtom)
            ├─> AsyncStorage (persisted atoms)
            └─> Re-render subscribed components

Provider Event (message stream)
    └─> ChatProvider callback
        └─> useChatProvider hook
            └─> State update (Jotai atom)
                └─> ChatScreen re-renders
```

## Networking

| Provider           | Protocol      | Streaming Method            |
| ------------------ | ------------- | --------------------------- |
| Molt Gateway       | WebSocket     | WebSocket frames (JSON-RPC) |
| Claude             | HTTPS         | Server-Sent Events (SSE)    |
| OpenAI             | HTTPS         | Server-Sent Events (SSE)    |
| Ollama             | HTTP          | Server-Sent Events (SSE)    |
| OpenRouter         | HTTPS         | Server-Sent Events (SSE)    |
| Apple Intelligence | Native bridge | Callback-based              |
| Gemini Nano        | Native bridge | Callback-based              |

### API Endpoints

**Claude (Anthropic)**:

- `POST /v1/messages` — Send message with streaming

**OpenAI**:

- `POST /v1/chat/completions` — Chat completion with streaming

**Ollama**:

- `POST /api/chat` — Chat with local model
- `GET /api/tags` — List available models

**Molt Gateway**:

- WebSocket connection with JSON-RPC protocol (protocol version 3)
- Supports: `agent.send`, `history.get`, `session.reset`, `sessions.list`, `gateway.health`, `gateway.snapshot`, `scheduler.create`

## Native Modules

The `modules/` directory contains custom Expo native modules:

| Module                 | Platform | Purpose                                             |
| ---------------------- | -------- | --------------------------------------------------- |
| `speech-transcription` | iOS      | Real-time speech-to-text using iOS Speech framework |
| `apple-intelligence`   | iOS      | Apple Foundation Models (iOS 18+)                   |
| `apple-shortcuts`      | iOS      | Siri Shortcuts integration                          |
| `gemini-nano`          | Android  | On-device Gemini Nano inference                     |

These modules use Expo's native module system with TypeScript bindings in `src/` and platform implementations in `ios/` or `android/` subdirectories.
