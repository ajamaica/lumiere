# Security

## Overview

Lumiere handles sensitive data (API keys, chat history) and implements multiple security layers appropriate for a mobile application that communicates with external AI services.

## Authentication & Access Control

### Biometric Lock Screen

**File**: `src/components/BiometricLockScreen.tsx`

The app supports Face ID (iOS) and Touch ID / fingerprint (Android) authentication:

- **Library**: `expo-local-authentication`
- **Activation**: Toggled via `biometricLockEnabledAtom` in settings
- **Trigger**: The lock screen activates when the app transitions from background to foreground (app state change listener)
- **Behavior**: The user must authenticate biometrically before accessing the app. The lock screen overlays all content until authentication succeeds
- **Fallback**: Device passcode fallback is available through the OS-level biometric prompt

### No Remote Authentication

Lumiere does not implement its own user accounts or remote authentication. Access to AI providers is authorized via API keys that the user provides and manages locally.

## Token & Secret Storage

**File**: `src/services/secureTokenStorage.ts`

### Storage Backend

API keys and tokens are stored using `expo-secure-store`, which maps to:

| Platform | Native Backend                     | Security Level             |
| -------- | ---------------------------------- | -------------------------- |
| iOS      | Keychain Services (Secure Enclave) | Hardware-backed encryption |
| Android  | Android KeyStore                   | Hardware-backed encryption |

### Storage Schema

Each server's token is stored with a namespaced key:

```
Key format: server_token_{serverId}
Value: The raw API key or token string
```

### API

```typescript
// Store a token
setServerToken(serverId: string, token: string): Promise<void>

// Retrieve a token
getServerToken(serverId: string): Promise<string | null>

// Delete a token
deleteServerToken(serverId: string): Promise<void>
```

### What is NOT stored in Secure Store

The following are stored in AsyncStorage (unencrypted but sandboxed):

- Server configurations (name, URL, type) — not sensitive
- Chat history cache
- User preferences
- Session aliases

Only API keys/tokens use the encrypted secure store.

## Input Validation

### Server URL Validation

When adding or editing a server, URLs are validated before use:

- Must be a well-formed URL
- HTTP is permitted for local development (e.g., `http://localhost`)
- HTTPS is expected for remote servers

### Message Content

- User input is passed through to providers as-is (providers handle their own sanitization)
- Rendered messages use a markdown parser with safe defaults — no raw HTML injection

### Deep Link Validation

**File**: `src/hooks/useDeepLinking.ts`

Deep links use the `lumiere://` scheme. The handler:

- Validates that the trigger slug exists in the configured triggers
- Only executes pre-configured automation actions
- Does not allow arbitrary command execution via URL

## Network Security

### Transport Layer

| Provider           | Protocol      | Encryption             |
| ------------------ | ------------- | ---------------------- |
| Claude             | HTTPS         | TLS                    |
| OpenAI             | HTTPS         | TLS                    |
| OpenRouter         | HTTPS         | TLS                    |
| Ollama (remote)    | Configurable  | HTTP or HTTPS          |
| Ollama (local)     | HTTP          | Localhost only         |
| OpenCraw Gateway   | WSS           | TLS (WebSocket Secure) |
| Apple Intelligence | Native bridge | N/A (on-device)        |
| Gemini Nano        | Native bridge | N/A (on-device)        |

### API Key Transmission

- **Claude**: Sent as `x-api-key` header
- **OpenAI / OpenRouter**: Sent as `Authorization: Bearer {token}` header
- **OpenCraw**: Sent during WebSocket handshake as part of the client identification
- **Ollama**: Optional token, sent as header if configured

### On-Device Providers

Apple Intelligence and Gemini Nano run entirely on-device through native bridges. No data leaves the device for these providers.

## Data at Rest

### Sandboxing

On both iOS and Android, app data is sandboxed by the OS:

- AsyncStorage data is only accessible to the Lumiere app
- Secure Store entries are protected by the OS keychain/keystore
- Other apps cannot access Lumiere's data without root/jailbreak

### Chat History Cache

Cached messages (via `CachedChatProvider`) are stored in AsyncStorage:

- Key format: `chat_cache:{serverId}:{sessionKey}`
- Maximum 200 messages per session
- Cleared when the user resets a session
- Not encrypted (relies on OS sandboxing)

### No Remote Telemetry

The app does not send analytics, crash reports, or telemetry to any first-party server. Logging via `src/utils/logger.ts` is local only.

## Error Handling

**File**: `src/components/ui/ErrorBoundary.tsx`

- A React error boundary wraps the entire app to prevent crashes from exposing sensitive state
- Errors are logged locally but not transmitted
- The user sees a recovery UI instead of a crash screen

## Security Considerations for Developers

### Adding New Providers

When implementing a new `ChatProvider`:

1. **Never store API keys in code or AsyncStorage** — use `secureTokenStorage.ts`
2. **Use HTTPS** for all remote API communication
3. **Validate server URLs** before making requests
4. **Handle authentication errors** gracefully (expired tokens, invalid keys)
5. **Sanitize streaming responses** before rendering as markdown

### Handling User Data

1. **Minimize stored data** — only cache what's needed for offline support
2. **Clear data on server removal** — when a user deletes a server, remove its token from secure store and its cached messages from AsyncStorage
3. **Respect biometric lock** — ensure new screens cannot bypass the lock screen gate in `_layout.tsx`

### Deep Link Security

1. **Always validate trigger slugs** against the configured triggers list
2. **Never execute arbitrary code** from URL parameters
3. **Log deep link activations** for debugging but don't expose sensitive content in logs
