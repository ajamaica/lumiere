# Lumiere

A mobile chat application built with React Native and Expo for interacting with AI agents through the Molt Gateway.

## Features

- **Real-time AI Chat**: Connect to AI agents via WebSocket for real-time conversations
- **Message Queue System**: Continuous chat interaction with queued message handling
- **Session Management**: Manage multiple chat sessions and view session history
- **Interactive Keyboard**: Smooth keyboard dismissal that follows scroll gestures
- **Secure Credentials**: Hide/show toggle for sensitive gateway information
- **Auto-updates**: Automatic deployment to Expo on push to main branch
- **Slash Commands**: Autocomplete support for chat commands
- **Settings Management**: Configure gateway URL, tokens, and preferences

## Tech Stack

- **React Native** 0.81.5
- **Expo** ~54.0
- **TypeScript** ~5.9
- **Expo Router** for navigation
- **Jotai** for state management
- **React Native Markdown** for message rendering
- **WebSocket** for real-time communication

## Getting Started

### Prerequisites

- Node.js 22.x
- pnpm 10.x
- Expo CLI
- iOS Simulator or Android Emulator (or Expo Go app on physical device)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ajamaica/lumiere.git
   cd lumiere
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Configure your gateway settings in the app settings screen or update the default values in `src/store/index.ts`

### Development

Start the development server:

```bash
# Start Expo dev server
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android

# Run on web
pnpm web
```

### Code Quality

```bash
# Format code
pnpm format

# Check formatting
pnpm format:check

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix
```

## Deployment

### Automatic Deployment

The app automatically deploys to Expo when pushing to the `main` branch via GitHub Actions.

**Setup required:**
1. Create an Expo access token at https://expo.dev/accounts/[your-account]/settings/access-tokens
2. Add the token as a GitHub secret named `EXPO_TOKEN`

### Manual Deployment

Publish an update manually:

```bash
npx eas-cli update --branch production --message "Your update message"
```

## Project Structure

```
lumiere/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab-based navigation
│   ├── _layout.tsx        # Root layout
│   ├── overview.tsx       # Gateway overview
│   ├── sessions.tsx       # Session management
│   └── settings.tsx       # App settings
├── src/
│   ├── components/        # React components
│   │   └── chat/          # Chat-related components
│   ├── config/            # Configuration files
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API and WebSocket services
│   ├── store/             # Jotai state management
│   └── theme/             # Theme configuration
├── assets/                # Images and icons
├── .github/workflows/     # CI/CD workflows
└── eas.json              # EAS configuration
```

## Features in Detail

### Chat Interface
- Real-time message streaming
- Markdown rendering for formatted responses
- Message queue for continuous conversations
- Interactive keyboard dismissal on scroll
- Auto-scroll to latest messages

### Gateway Management
- WebSocket connection status monitoring
- Health checks and uptime tracking
- Session and instance count monitoring
- Secure credential storage with show/hide toggle

### Session Management
- View and manage chat sessions
- Session preview and metadata
- Quick session switching

## Configuration

Key configuration files:
- `app.json` - Expo app configuration
- `eas.json` - EAS Build and Update configuration
- `src/config/gateway.config.ts` - Gateway settings
- `src/store/index.ts` - Default state values

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private.

## Acknowledgments

- Built with [Expo](https://expo.dev)
- UI components powered by [React Native](https://reactnative.dev)
- State management with [Jotai](https://jotai.org)
