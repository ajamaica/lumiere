# Sessions

## Overview

Lumiere uses sessions to organize conversations. Session behavior varies significantly between providers — OpenCraw Gateway supports full server-side sessions, while other providers use local-only session tracking with cached history.

## Session Types

### Server-Side Sessions (OpenCraw Gateway)

OpenCraw is the only provider with native server-side session support. Sessions are:

- **Persistent** — Stored on the OpenCraw gateway server
- **Identifiable** — Formatted as `agent:{agentId}:{sessionName}` (e.g., `agent:main:main`)
- **Listable** — Users can list, switch between, and reset sessions via the provider API
- **Multi-agent** — Different agent IDs can have independent sessions

Key operations:

- `listSessions()` — Returns all sessions on the server
- `getChatHistory(sessionKey)` — Retrieves history for a specific session
- `resetSession(sessionKey)` — Clears a session's history on the server
- `sendMessage({ sessionKey, ... })` — Sends a message within a specific session

### Local Sessions (All Other Providers)

Claude, OpenAI, Ollama, OpenRouter, and on-device providers do not have server-side sessions. For these providers:

- The app tracks the conversation locally
- Chat history is cached in AsyncStorage via `CachedChatProvider`
- Sessions are ephemeral from the provider's perspective — each API call sends the relevant conversation history
- Resetting a session clears the local cache

## Session State Management

### Atoms

Session state is managed through Jotai atoms in `src/store/atoms.ts`:

| Atom                    | Type                     | Persistence  | Description                                |
| ----------------------- | ------------------------ | ------------ | ------------------------------------------ |
| `currentSessionKeyAtom` | `string`                 | AsyncStorage | Active session key                         |
| `serverSessionsAtom`    | `Record<string, string>` | AsyncStorage | Maps server UUID to its active session key |
| `sessionAliasesAtom`    | `Record<string, string>` | AsyncStorage | User-defined display names for sessions    |

### Default Session

The default session key is `agent:main:main`, defined in `src/constants/index.ts` as `DEFAULT_SESSION_KEY`. This is used when:

- A new server is added
- No session has been explicitly selected
- The active session is reset

## Session Aliases

Users can assign custom display names to sessions via `edit-session.tsx`:

```typescript
// Example alias mapping
{
  "agent:main:main": "Daily Assistant",
  "agent:main:debug": "Bug Investigation",
  "agent:code:main": "Code Review"
}
```

Aliases are:

- Stored in `sessionAliasesAtom` (AsyncStorage)
- Displayed in the session list and session modal
- Independent of the actual session key — renaming an alias does not affect the server-side session

## Message Caching

**File**: `src/services/providers/CachedChatProvider.ts`

`CachedChatProvider` wraps every provider with an AsyncStorage caching layer:

### Cache Key Format

```
chat_cache:{serverId}:{sessionKey}
```

Example: `chat_cache:abc-123:agent:main:main`

### Cache Behavior

| Action        | Behavior                                                      |
| ------------- | ------------------------------------------------------------- |
| Send message  | Message and response appended to cache                        |
| Load history  | Cache used as fallback if provider has no `persistentHistory` |
| Reset session | Cache for that session is cleared                             |
| Switch server | Different cache namespace is used                             |
| App restart   | Cache is loaded from AsyncStorage on connect                  |

### Cache Limits

- **Max messages per session**: 200
- **Storage**: AsyncStorage (unencrypted, OS-sandboxed)
- **Eviction**: Oldest messages removed when limit is exceeded

## Session Lifecycle

### Creating a Session

```
1. User adds or selects a server
2. Default session key is assigned (agent:main:main)
3. Provider connects
4. CachedChatProvider loads cached history (if any)
5. Chat screen displays cached messages
```

### Switching Sessions (OpenCraw)

```
1. User opens Sessions screen (app/sessions.tsx)
2. listSessions() fetches available sessions from server
3. User selects a session
4. serverSessionsAtom updated with new session key
5. currentSessionKeyAtom updated
6. Provider loads history for new session
7. Chat screen re-renders with new conversation
```

### Resetting a Session

```
1. User triggers reset (settings or session management)
2. Provider.resetSession(sessionKey) called
   - OpenCraw: Server-side history cleared
   - Others: No-op on provider, local-only
3. CachedChatProvider clears local cache for that session
4. Chat screen shows empty conversation
```

### Deleting a Server

```
1. User deletes a server from Servers screen
2. Server config removed from serversAtom
3. Server token deleted from secure storage
4. Cached messages for all sessions of that server remain in
   AsyncStorage (orphaned) — they are not actively cleaned up
   but won't be accessible without the server config
```

## Session Modal

**File**: `src/components/chat/SessionModal.tsx`

A slide-up modal accessible from the chat screen that allows quick session switching. Features:

- Lists available sessions with aliases
- Shows the currently active session
- Available only when the provider supports `serverSessions` capability

## Per-Server Session Tracking

The `serverSessionsAtom` maintains a mapping of which session is active for each server:

```typescript
{
  "server-uuid-1": "agent:main:main",
  "server-uuid-2": "agent:code:review",
  "server-uuid-3": "agent:main:main"
}
```

When switching between servers, the app restores the last active session for that server automatically.
