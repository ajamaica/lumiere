# Molt WebSocket Protocol — Chat Stream Reference

This document describes the OpenClaw Molt Gateway Protocol v3 as it flows through the Lumiere chat stream. It covers the WebSocket frame types, the agent event lifecycle, and how each protocol event maps to UI elements in the chat.

---

## Table of Contents

- [Protocol Overview](#protocol-overview)
- [Frame Types](#frame-types)
  - [Request Frame (Client → Server)](#request-frame-client--server)
  - [Response Frame (Server → Client)](#response-frame-server--client)
  - [Event Frame (Server → Client)](#event-frame-server--client)
- [Agent Event Streams](#agent-event-streams)
  - [Lifecycle Stream](#lifecycle-stream)
  - [Assistant Stream](#assistant-stream)
  - [Tool Stream](#tool-stream)
  - [Subagent Stream](#subagent-stream)
- [Full Message Flow](#full-message-flow)
- [Chat Stream Mapping](#chat-stream-mapping)
- [Available Tools](#available-tools)
- [Session Key Format](#session-key-format)
- [Connection Lifecycle](#connection-lifecycle)
- [Error Handling](#error-handling)

---

## Protocol Overview

Lumiere communicates with the Molt gateway over a single WebSocket connection using JSON frames. The protocol uses three frame types (`req`, `res`, `event`) and supports streaming agent responses through sequenced events.

| Property         | Value                     |
| ---------------- | ------------------------- |
| Protocol version | 3                         |
| Client ID        | `lumiere-mobile`          |
| Transport        | WebSocket (JSON frames)   |
| Auth             | Token + optional password |
| Keepalive        | Server `tick` events      |

---

## Frame Types

Every message on the WebSocket is a JSON object with a `type` field that determines its shape.

### Request Frame (Client → Server)

Sent by the client to invoke an RPC method on the gateway.

```json
{
  "type": "req",
  "id": "lum-1-1708525200000",
  "method": "agent",
  "params": {
    "message": "Search for the latest AI news",
    "idempotencyKey": "idem-abc123",
    "agentId": "main",
    "sessionKey": "agent:main:main",
    "model": "anthropic/claude-sonnet-4-5"
  }
}
```

| Field    | Type   | Description                                     |
| -------- | ------ | ----------------------------------------------- |
| `type`   | string | Always `"req"`                                  |
| `id`     | string | Unique request ID (`lum-{counter}-{timestamp}`) |
| `method` | string | RPC method name (see [Methods](#rpc-methods))   |
| `params` | object | Method-specific parameters                      |

### Response Frame (Server → Client)

Server reply to a request. Correlates with the request via `id`.

```json
{
  "type": "res",
  "id": "lum-1-1708525200000",
  "ok": true,
  "payload": {
    "sessionKey": "agent:main:main",
    "runId": "run-xyz789"
  }
}
```

| Field     | Type    | Description                                                  |
| --------- | ------- | ------------------------------------------------------------ |
| `type`    | string  | Always `"res"`                                               |
| `id`      | string  | Matches the originating request ID                           |
| `ok`      | boolean | `true` if the request succeeded                              |
| `payload` | object  | Method-specific response data                                |
| `error`   | object  | Present when `ok` is `false` (see [Errors](#error-handling)) |

### Event Frame (Server → Client)

Asynchronous server-pushed events. Not tied to a specific request.

```json
{
  "type": "event",
  "event": "agent",
  "seq": 3,
  "payload": { ... }
}
```

| Field     | Type   | Description                                   |
| --------- | ------ | --------------------------------------------- |
| `type`    | string | Always `"event"`                              |
| `event`   | string | Event name (see [Events](#well-known-events)) |
| `seq`     | number | Monotonically increasing sequence number      |
| `payload` | object | Event-specific data                           |

---

## Agent Event Streams

When a message is sent to the agent (`chat.send` or `agent` method), the server emits a series of `agent` events. Each event has a `stream` field that determines its purpose.

```typescript
type AgentEvent = {
  stream: 'assistant' | 'lifecycle' | 'tool' | 'subagent'
  data: { ... }
  runId: string
  seq: number
  sessionKey: string
  ts: number
}
```

### Lifecycle Stream

Marks the beginning and end of an agent run. Every run starts with `phase: "start"` and ends with `phase: "end"`.

**Start event:**

```json
{
  "type": "event",
  "event": "agent",
  "payload": {
    "runId": "run-xyz789",
    "sessionKey": "agent:main:main",
    "stream": "lifecycle",
    "seq": 1,
    "ts": 1708525200000,
    "data": {
      "phase": "start",
      "startedAt": 1708525200000
    }
  }
}
```

**End event:**

```json
{
  "type": "event",
  "event": "agent",
  "payload": {
    "runId": "run-xyz789",
    "sessionKey": "agent:main:main",
    "stream": "lifecycle",
    "seq": 20,
    "ts": 1708525210000,
    "data": {
      "phase": "end",
      "endedAt": 1708525210000
    }
  }
}
```

**Chat stream mapping:** Lifecycle events are not rendered as visible messages. They control the streaming state:

- `start` → sets `isAgentResponding = true`, clears the streaming message
- `end` → finalizes the accumulated text into a completed agent message, sets `isAgentResponding = false`

### Assistant Stream

Carries incremental text chunks (deltas) of the agent's response.

```json
{
  "type": "event",
  "event": "agent",
  "payload": {
    "runId": "run-xyz789",
    "sessionKey": "agent:main:main",
    "stream": "assistant",
    "seq": 2,
    "ts": 1708525201000,
    "data": {
      "delta": "Let me search for that information...\n"
    }
  }
}
```

| Field        | Type   | Description                          |
| ------------ | ------ | ------------------------------------ |
| `data.delta` | string | Incremental text chunk               |
| `data.text`  | string | Complete text (alternative to delta) |

**Chat stream mapping:** Each delta is appended to an accumulator. The UI renders a streaming message bubble (`streaming: true`) that updates in real time as deltas arrive. When the lifecycle `end` event fires, the streaming bubble is replaced with the finalized agent message.

### Tool Stream

Emitted when the agent invokes a tool. Two events per tool call: one when the tool starts running, and one when it completes.

**Tool call start:**

```json
{
  "type": "event",
  "event": "agent",
  "payload": {
    "runId": "run-xyz789",
    "sessionKey": "agent:main:main",
    "stream": "tool",
    "seq": 3,
    "ts": 1708525202000,
    "data": {
      "toolName": "web_search",
      "toolCallId": "tc-001",
      "toolInput": {
        "query": "latest AI news",
        "count": 5
      },
      "toolStatus": "running"
    }
  }
}
```

**Tool call completed:**

```json
{
  "type": "event",
  "event": "agent",
  "payload": {
    "runId": "run-xyz789",
    "sessionKey": "agent:main:main",
    "stream": "tool",
    "seq": 4,
    "ts": 1708525203000,
    "data": {
      "toolName": "web_search",
      "toolCallId": "tc-001",
      "toolStatus": "completed"
    }
  }
}
```

| Field             | Type   | Description                                            |
| ----------------- | ------ | ------------------------------------------------------ |
| `data.toolName`   | string | Tool identifier (e.g., `web_search`, `exec`, `canvas`) |
| `data.toolCallId` | string | Unique ID correlating start and end events             |
| `data.toolInput`  | object | Parameters passed to the tool                          |
| `data.toolStatus` | string | `"running"`, `"completed"`, or `"error"`               |

**Chat stream mapping:** When `showToolEventsInChat` is enabled, each tool event renders as a `ToolEventBubble` inline in the message stream. The bubble shows:

- An icon mapped from the tool name (e.g., globe for `web_fetch`, terminal for `exec`)
- A localized description of the tool action
- A detail subtitle extracted from the tool input (e.g., the URL for `web_fetch`, the command for `exec`)
- A status indicator: spinner while running, checkmark when completed, alert on error

### Subagent Stream

Emitted when a sub-agent (spawned session) starts or completes.

```json
{
  "type": "event",
  "event": "agent",
  "payload": {
    "runId": "run-xyz789",
    "sessionKey": "agent:main:main",
    "stream": "subagent",
    "seq": 10,
    "ts": 1708525205000,
    "data": {
      "runId": "run-child-001",
      "childSessionKey": "agent:main:subtask-1",
      "phase": "end",
      "result": "Task completed successfully"
    }
  }
}
```

**Chat stream mapping:** Subagent events are tracked internally but not rendered as individual chat messages. They update the sub-agent run status in the mission/subagent management UI.

---

## Full Message Flow

The complete lifecycle of a user message through the protocol:

```
┌─────────┐                              ┌─────────┐
│  Client  │                              │ Gateway │
└────┬─────┘                              └────┬────┘
     │                                         │
     │  1. req { method: "chat.send" }         │
     │ ───────────────────────────────────────► │
     │                                         │
     │  2. event { stream: "lifecycle",        │
     │            phase: "start" }             │
     │ ◄─────────────────────────────────────── │
     │                                         │
     │  3. event { stream: "assistant",        │
     │            delta: "Let me..." }         │
     │ ◄─────────────────────────────────────── │
     │                                         │
     │  4. event { stream: "tool",             │
     │            toolName: "web_search",      │
     │            toolStatus: "running" }      │
     │ ◄─────────────────────────────────────── │
     │                                         │
     │  5. event { stream: "tool",             │
     │            toolName: "web_search",      │
     │            toolStatus: "completed" }    │
     │ ◄─────────────────────────────────────── │
     │                                         │
     │  6. event { stream: "assistant",        │
     │            delta: "Here are the..." }   │
     │ ◄─────────────────────────────────────── │
     │                                         │
     │  7. event { stream: "lifecycle",        │
     │            phase: "end" }               │
     │ ◄─────────────────────────────────────── │
     │                                         │
     │  8. res { ok: true,                     │
     │          payload: { runId: "..." } }    │
     │ ◄─────────────────────────────────────── │
     │                                         │
```

**What appears in the chat stream:**

| Step | Protocol Event       | Chat UI Element                    |
| ---- | -------------------- | ---------------------------------- |
| —    | User types and sends | User message bubble                |
| 2    | Lifecycle `start`    | _(internal)_ streaming state begin |
| 3    | Assistant delta      | Streaming agent bubble appears     |
| 4    | Tool `running`       | Tool event bubble with spinner     |
| 5    | Tool `completed`     | Tool event bubble with checkmark   |
| 6    | Assistant delta      | Streaming bubble text updates      |
| 7    | Lifecycle `end`      | Streaming bubble finalized         |
| 8    | Response             | _(internal)_ promise resolves      |

---

## Chat Stream Mapping

This section summarizes how protocol events translate to visual elements in the Lumiere chat stream.

### Provider Event Translation

The `MoltChatProvider` translates raw `AgentEvent` objects into provider-agnostic `ChatProviderEvent` objects:

| AgentEvent stream | AgentEvent data      | ChatProviderEvent type | ChatProviderEvent fields                          |
| ----------------- | -------------------- | ---------------------- | ------------------------------------------------- |
| `assistant`       | `{ delta: "..." }`   | `delta`                | `{ delta: "..." }`                                |
| `lifecycle`       | `{ phase: "start" }` | `lifecycle`            | `{ phase: "start" }`                              |
| `lifecycle`       | `{ phase: "end" }`   | `lifecycle`            | `{ phase: "end" }`                                |
| `tool`            | `{ toolName, ... }`  | `tool_event`           | `{ toolName, toolCallId, toolInput, toolStatus }` |

### Message Types in the Chat Stream

The chat renders two message types:

**TextMessage** — User and agent text bubbles:

```typescript
{
  id: string
  type?: 'text'
  text: string
  sender: 'user' | 'agent'
  timestamp: Date
  streaming?: boolean        // true while deltas are arriving
  attachments?: MessageAttachment[]
}
```

**ToolEventMessage** — Inline tool call indicators:

```typescript
{
  id: string
  type: 'tool_event'
  toolName: string
  toolCallId: string
  toolInput?: Record<string, unknown>
  status: 'running' | 'completed' | 'error'
  sender: 'agent'
  timestamp: Date
  text: string               // tool name (used for search/filter)
}
```

---

## Available Tools

The Molt gateway exposes the following tools to the agent. When used, they appear as tool events in the chat stream.

### File Operations

| Tool          | Icon                    | Description                  | Detail Key     |
| ------------- | ----------------------- | ---------------------------- | -------------- |
| `file_read`   | `document-text-outline` | Read file contents           | `path`, `file` |
| `file_write`  | `create-outline`        | Create or overwrite files    | `path`, `file` |
| `apply_patch` | `git-merge-outline`     | Apply precise edits to files | `path`, `file` |

### Execution

| Tool             | Icon                 | Description                     | Detail Key        |
| ---------------- | -------------------- | ------------------------------- | ----------------- |
| `exec`           | `terminal-outline`   | Run shell commands              | `command`, `cmd`  |
| `code_execution` | `code-slash-outline` | Execute code snippets           | `code`, `command` |
| `process`        | `cog-outline`        | Manage background exec sessions | —                 |

### Web & Browser

| Tool         | Icon               | Description                        | Detail Key      |
| ------------ | ------------------ | ---------------------------------- | --------------- |
| `web_search` | `search-outline`   | Search the web                     | `query`         |
| `web_fetch`  | `globe-outline`    | Fetch and extract content from URL | `url`           |
| `browser`    | `browsers-outline` | Control web browser                | `action`, `url` |

### Display & UI

| Tool     | Icon            | Description                          | Detail Key        |
| -------- | --------------- | ------------------------------------ | ----------------- |
| `canvas` | `easel-outline` | Present/evaluate/snapshot the Canvas | `action`, `title` |

### Search & File System

| Tool   | Icon                  | Description             | Detail Key                |
| ------ | --------------------- | ----------------------- | ------------------------- |
| `grep` | `search-outline`      | Search file contents    | `pattern`, `query`        |
| `find` | `folder-open-outline` | Find files by pattern   | `pattern`, `glob`, `path` |
| `ls`   | `folder-outline`      | List directory contents | `path`                    |

### Devices & Automation

| Tool    | Icon                  | Description                              |
| ------- | --------------------- | ---------------------------------------- |
| `nodes` | `git-network-outline` | List/describe/notify/camera/screen nodes |
| `cron`  | `timer-outline`       | Manage cron jobs and wake events         |

### Sessions & Agents

| Tool               | Icon                 | Description                | Detail Key          |
| ------------------ | -------------------- | -------------------------- | ------------------- |
| `sessions_list`    | `list-outline`       | List sessions with filters | —                   |
| `sessions_history` | `time-outline`       | Fetch session history      | —                   |
| `sessions_send`    | `send-outline`       | Send message to session    | `target`, `session` |
| `sessions_spawn`   | `git-branch-outline` | Spawn a sub-agent session  | `target`, `agent`   |

### Memory

| Tool            | Icon               | Description                   | Detail Key  |
| --------------- | ------------------ | ----------------------------- | ----------- |
| `memory_search` | `library-outline`  | Search memory files           | `query`     |
| `memory_get`    | `bookmark-outline` | Read specific memory snippets | `key`, `id` |

### Additional Tools

The agent may also have access to 30+ skill-based tools (Apple Music, Gmail, GitHub, Home Assistant, Plex, iMessage, etc.) that appear with the default `build-outline` icon.

---

## Session Key Format

Session keys determine which conversation context is used.

```
agent:{agentId}:{sessionName}
```

| Segment       | Description                   | Example          |
| ------------- | ----------------------------- | ---------------- |
| `agentId`     | Agent identifier              | `main`           |
| `sessionName` | Session name within the agent | `main`, `coding` |

Special prefixes:

- `mission-{missionId}` — Sessions associated with a mission

Default session key: `agent:main:main`

---

## Connection Lifecycle

### Handshake

The client initiates the connection with a `connect` request:

```json
{
  "type": "req",
  "id": "lum-0-1708525199000",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "role": "client",
    "device": {
      "id": "device-abc",
      "name": "iPhone"
    },
    "caps": ["attachments", "canvas"],
    "auth": {
      "token": "server-token",
      "password": "optional-password"
    },
    "locale": "en"
  }
}
```

The server responds with protocol confirmation and a snapshot:

```json
{
  "type": "res",
  "id": "lum-0-1708525199000",
  "ok": true,
  "payload": {
    "protocol": 3,
    "gateway": {
      "version": "1.5.0",
      "capabilities": ["attachments", "canvas", "scheduler"]
    },
    "snapshot": {
      "tickInterval": 15000,
      "connectedAt": 1708525199000,
      "health": {
        "sessions": { "count": 3 }
      },
      "presence": [{ "host": "macbook.local", "ts": 1708525100000, "mode": "cli" }]
    },
    "tickIntervalMs": 15000
  }
}
```

### Connection States

```
disconnected ──► connecting ──► connected
                                    │
                                    ▼
                              reconnecting ──► connecting ──► connected
```

| State          | Description                              |
| -------------- | ---------------------------------------- |
| `disconnected` | No WebSocket connection                  |
| `connecting`   | WebSocket opening, handshake in progress |
| `connected`    | Handshake complete, ready for messages   |
| `reconnecting` | Connection lost, waiting before retry    |

### Keepalive

The server sends `tick` events at a regular interval (default 15s). The client monitors for missed ticks and forces a reconnect if more than 3 are missed consecutively.

```json
{
  "type": "event",
  "event": "tick",
  "payload": {
    "timestamp": 1708525215000
  }
}
```

### Reconnection

On unexpected disconnection, the client reconnects with exponential backoff:

- Base delay: 1 second
- Maximum delay: 30 seconds
- Jitter: ±25%
- Pending requests are rejected with `"Client disconnected"`

---

## Error Handling

### Gateway Error Shape

When a request fails, the response includes an error object:

```json
{
  "type": "res",
  "id": "lum-5-1708525220000",
  "ok": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "retryable": true,
    "retryAfterMs": 5000
  }
}
```

| Field          | Type    | Description                         |
| -------------- | ------- | ----------------------------------- |
| `code`         | string  | Machine-readable error code         |
| `message`      | string  | Human-readable description          |
| `details`      | unknown | Optional additional context         |
| `retryable`    | boolean | Whether the client should retry     |
| `retryAfterMs` | number  | Suggested wait before retrying (ms) |

### Sequence Gap Detection

If the client detects a gap in the `seq` numbers of incoming events, it emits a local `seq.gap` event:

```json
{
  "event": "seq.gap",
  "payload": {
    "expected": 5,
    "received": 8
  }
}
```

This indicates events 5–7 were lost in transit. The client logs a warning but continues processing.

---

## RPC Methods

All available gateway RPC methods:

| Method            | Description                         |
| ----------------- | ----------------------------------- |
| `connect`         | Authenticate and negotiate protocol |
| `health`          | Get gateway health status           |
| `status`          | Get gateway status                  |
| `chat.send`       | Send a message to the agent         |
| `chat.history`    | Retrieve chat history               |
| `chat.abort`      | Abort the current agent run         |
| `sessions.list`   | List available sessions             |
| `sessions.reset`  | Reset a session's history           |
| `sessions.delete` | Delete a session                    |
| `sessions.spawn`  | Spawn a sub-agent session           |
| `cron.status`     | Get scheduler status                |
| `cron.list`       | List scheduled jobs                 |
| `cron.update`     | Create or update a cron job         |
| `cron.run`        | Manually trigger a cron job         |
| `cron.remove`     | Remove a cron job                   |
| `cron.runs`       | List recent cron run history        |
| `skills.teach`    | Teach a new skill                   |
| `skills.list`     | List available skills               |
| `skills.remove`   | Remove a skill                      |
| `skills.update`   | Update an existing skill            |
| `logs.tail`       | Tail gateway logs                   |
| `agent`           | Send a direct agent request         |
| `subagents.list`  | List active sub-agents              |
| `subagents.stop`  | Stop a running sub-agent            |

## Well-Known Events

| Event                   | Description                        |
| ----------------------- | ---------------------------------- |
| `agent`                 | Agent streaming events (see above) |
| `subagent`              | Sub-agent lifecycle events         |
| `presence`              | Device presence updates            |
| `tick`                  | Keepalive heartbeat                |
| `shutdown`              | Gateway shutting down              |
| `health`                | Health status change               |
| `seq.gap`               | Missed event sequence detected     |
| `connect.challenge`     | Authentication challenge           |
| `device.pair.requested` | Device pairing request             |
| `device.pair.resolved`  | Device pairing resolved            |
