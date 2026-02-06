# Lumiere Technical Documentation

Lumiere is a React Native mobile application that provides a unified client for interacting with multiple AI agents and LLM providers. Built with Expo, TypeScript, and React Native, it supports iOS, Android, and web platforms.

## Core Capabilities

- **Multi-provider support** — Chat with Claude, OpenAI, Ollama, OpenRouter, Apple Intelligence, Gemini Nano, and Molt Gateway from a single app
- **Real-time streaming** — Server-Sent Events and WebSocket-based streaming for all providers
- **Biometric authentication** — Face ID / Touch ID lock screen
- **Session management** — Persistent and stateless sessions with aliasing
- **Offline support** — Cached message history via AsyncStorage
- **Voice transcription** — iOS Speech Recognition integration
- **Automation** — Trigger-based deep linking and Apple Shortcuts
- **Theming** — 8 color themes with light/dark mode support
- **Internationalization** — English, Spanish, and French

## Documentation Index

| Document                                | Description                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| [Architecture](./architecture.md)       | System architecture, directory structure, data flow, and provider abstraction |
| [Options & Configuration](./options.md) | Configuration files, feature flags, themes, and provider capabilities         |
| [Security](./security.md)               | Authentication, token storage, biometric lock, input validation               |
| [Sessions](./sessions.md)               | Session lifecycle, caching, aliases, and per-provider behavior                |
| [Developer Guide](./developer-guide.md) | Setup, tooling, testing, CI/CD, and contribution workflow                     |

## Tech Stack Overview

| Layer           | Technology                              |
| --------------- | --------------------------------------- |
| Framework       | React Native 0.81 + Expo 54             |
| Language        | TypeScript 5.9 (strict mode)            |
| Routing         | Expo Router 6 (file-based)              |
| State           | Jotai 2.17 + AsyncStorage               |
| Styling         | React Native StyleSheet + Reanimated 4  |
| Networking      | Fetch (SSE), WebSocket (Molt)           |
| Secure Storage  | expo-secure-store (Keychain / KeyStore) |
| Testing         | Jest 29 + Testing Library               |
| CI/CD           | GitHub Actions + EAS Build              |
| Package Manager | pnpm                                    |
