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

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

Please run `pnpm lint` and `pnpm format:check` before submitting.

## License

[MIT](LICENSE)
