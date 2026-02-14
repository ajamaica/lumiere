# Options & Configuration

## App Configuration

### `app.json`

The main Expo configuration file defining app metadata, permissions, and plugins:

```json
{
  "expo": {
    "name": "lumiere",
    "slug": "lumiere",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "lumiere",
    "ios": {
      "bundleIdentifier": "bot.lumiere.app",
      "supportsTablet": true
    },
    "android": {
      "package": "bot.lumiere.app"
    }
  }
}
```

Key settings:

- **Bundle ID**: `bot.lumiere.app` (both platforms)
- **Deep link scheme**: `lumiere://`
- **Orientation**: Portrait only
- **Tablet support**: Enabled on iOS

### iOS Permissions (Info.plist)

| Permission         | Key                                   | Reason               |
| ------------------ | ------------------------------------- | -------------------- |
| Microphone         | `NSMicrophoneUsageDescription`        | Voice transcription  |
| Speech Recognition | `NSSpeechRecognitionUsageDescription` | Voice-to-text        |
| Calendar           | `NSCalendarsUsageDescription`         | Calendar integration |

### Android Permissions

| Permission              | Reason              |
| ----------------------- | ------------------- |
| `RECORD_AUDIO`          | Voice transcription |
| Deep link intent filter | `lumiere://` scheme |

## Build Configuration

### `eas.json`

EAS Build profiles for different environments:

| Profile       | Purpose          | Key Settings                                 |
| ------------- | ---------------- | -------------------------------------------- |
| `development` | Local dev builds | `developmentClient: true`, simulator support |
| `preview`     | Internal testing | `distribution: "internal"`                   |
| `production`  | Store release    | Default EAS settings                         |

### App Store IDs

- **iOS App Store ID**: `6758534255`
- **Android**: Internal testing track

## Provider Capabilities

Each provider declares its capabilities via `ProviderCapabilities`. These act as implicit feature flags:

| Capability          | Description            | Molt | Claude | Ollama | OpenAI | OpenRouter | Apple | Gemini |
| ------------------- | ---------------------- | ---- | ------ | ------ | ------ | ---------- | ----- | ------ |
| `chat`              | Basic chat messaging   | yes  | yes    | yes    | yes    | yes        | yes   | yes    |
| `imageAttachments`  | Image upload support   | no   | yes    | no     | no     | no         | no    | no     |
| `serverSessions`    | Server-side sessions   | yes  | no     | no     | no     | no         | no    | no     |
| `persistentHistory` | Remote history storage | yes  | no     | no     | no     | no         | no    | no     |
| `scheduler`         | Cron job scheduling    | yes  | no     | no     | no     | no         | no    | no     |
| `gatewaySnapshot`   | Health snapshots       | yes  | no     | no     | no     | no         | no    | no     |

> Note: `CachedChatProvider` adds local caching to all providers regardless of their declared `persistentHistory` capability.

## Molt Gateway Configuration

Defined in `src/config/gateway.config.ts`:

```typescript
// Client identification
clientConfig = {
  id: 'cli',
  mode: 'cli',
  version: '1.0.0',
  platform: 'ios',
}

// Protocol negotiation
protocolConfig = {
  minProtocol: 3,
  maxProtocol: 3,
}

// Default agent settings
agentConfig = {
  defaultAgentId: 'main',
  defaultSessionKey: 'agent:main:main',
  defaultModel: 'claude-sonnet-4-5',
}
```

## Theme Configuration

### Color Themes

Defined in `src/theme/colors.ts`. Each theme provides a full palette for both light and dark modes:

| Theme     | Primary Accent | Description          |
| --------- | -------------- | -------------------- |
| `default` | Orange/Yellow  | Default warm tones   |
| `pink`    | Pink           | Vibrant pink accents |
| `green`   | Green          | Nature-inspired      |
| `red`     | Red            | Bold red accents     |
| `blue`    | Blue           | Cool blue tones      |
| `purple`  | Purple         | Rich purple palette  |
| `orange`  | Orange         | Deep orange accents  |
| `glass`   | Translucent    | Glassmorphism effect |

### Theme Mode

Controlled by `themeModeAtom` in `src/store/atoms.ts`:

| Value      | Behavior                          |
| ---------- | --------------------------------- |
| `'system'` | Follows device light/dark setting |
| `'light'`  | Always light mode                 |
| `'dark'`   | Always dark mode                  |

### Spacing Scale

Defined in `src/theme/spacing.ts` — consistent spacing values used throughout the UI.

### Typography

Defined in `src/theme/typography.ts` — font families, sizes, and weights.

## Internationalization

Configured in `src/i18n/index.ts` using `i18next`:

| Language | Code | Translation File           |
| -------- | ---- | -------------------------- |
| English  | `en` | `src/i18n/locales/en.json` |
| Spanish  | `es` | `src/i18n/locales/es.json` |
| French   | `fr` | `src/i18n/locales/fr.json` |

The `languageAtom` controls the active language:

- Empty string (`""`) — use device default locale
- Language code (e.g., `"es"`) — force that language

## Server Configuration

Each server is stored as a `ServerConfig` object in the `serversAtom`:

```typescript
{
  id: string           // UUID
  name: string         // Display name
  url: string          // Server URL (HTTPS for remote, HTTP for local)
  type: ProviderType   // 'molt' | 'claude' | 'ollama' | 'openai' | 'openrouter' | ...
  model?: string       // Selected model (provider-specific)
  // Token stored separately in secure storage
}
```

Users can configure multiple servers and switch between them. The `currentServerIdAtom` tracks which server is active.

## Notification Settings

Background notification settings stored in atoms. The background task fetches
chat history directly from the server gateway (`chat.history` RPC) and compares
against the last seen message timestamp to detect new assistant messages.

| Atom                                 | Type      | Default | Description                                            |
| ------------------------------------ | --------- | ------- | ------------------------------------------------------ |
| `backgroundNotificationsEnabledAtom` | `boolean` | `false` | Enable background fetch                                |
| `backgroundFetchIntervalAtom`        | `number`  | `900`   | Fetch interval in seconds (15 min)                     |
| `gatewayLastSeenTimestampAtom`       | `object`  | `{}`    | Last seen message timestamp per server+session gateway |

## Metro Bundler Configuration

`metro.config.js` adds SVG transformer support:

- SVG files are handled by `react-native-svg-transformer` instead of the default asset loader
- SVG is removed from `assetExts` and added to `sourceExts`

## Babel Configuration

`babel.config.js`:

- Preset: `babel-preset-expo`
- Plugin: `react-native-reanimated/plugin` (must be last)

## TypeScript Configuration

`tsconfig.json`:

- Extends: `expo/tsconfig.base`
- Strict mode: enabled
