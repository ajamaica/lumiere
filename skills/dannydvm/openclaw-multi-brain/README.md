# 🧬 openclaw-multi-brain

**Multi-LLM perspective synthesis for OpenClaw agents via hooks.**

Give your AI agents cognitive diversity by generating perspectives from multiple LLMs (Kimi K2.5 + GPT 5.3 Codex) before the primary agent responds. Three brains instead of one.

## Architecture

Uses OpenClaw's `turn:before` hook to intercept every qualifying message and call external LLMs in parallel.

```
User Message (with "mb" prefix)
    |
    v
[turn:before hook fires]
    |
    +---> Kimi K2.5 (Moonshot API, ~5s)
    +---> GPT 5.3 Codex (codex exec CLI, ~4s)
    |     (parallel)
    v
[Perspectives injected into system content]
    |
    v
Claude Opus 4.6 responds with all 3 viewpoints synthesized
```

**System-enforced. No protocol compliance needed. Fail-open.**

## Trigger System

Multi-brain only fires when triggered. Default mode is **keyword-only**.

| Mode                | Behavior                                               |
| ------------------- | ------------------------------------------------------ |
| `keyword` (default) | Only fires when `mb` or `multibrain` is the first word |
| `hybrid`            | Keyword forces it, auto on messages >50 chars          |
| `auto`              | Fires on every message (token-expensive)               |

**Examples:**

- `mb should we change pricing?` -> fires, AIs see "should we change pricing?"
- `need a 500mb upload` -> does NOT fire (mb is not first word)
- `hey check this out` -> does NOT fire (no keyword)

## Quick Start

### 1. Create hook directory

```bash
mkdir -p /path/to/workspace/hooks/turn-preflight
```

### 2. Add HOOK.md

```yaml
---
name: turn-preflight
description: 'Multi-Brain: Kimi K2.5 + Codex 5.3 perspectives before every agent turn'
metadata:
  openclaw:
    emoji: '🧬'
    events: ['turn:before']
    handler: 'handler.js'
    install: [{ id: 'workspace', kind: 'workspace', label: 'Workspace hook' }]
---
```

### 3. Add handler.js

Copy `hooks/turn-preflight/handler.js` from this repo.

### 4. Set Kimi API key

```bash
echo "your-moonshot-api-key" > /path/to/workspace/.kimi-api-key
```

### 5. Install Codex CLI

```bash
npm install -g @openai/codex
codex auth   # OAuth login
```

### 6. Enable in config

Add to openclaw.json:

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "turn-preflight": { "enabled": true }
      }
    }
  }
}
```

## LLM Configuration

| LLM             | Provider                       | Timeout | Notes                        |
| --------------- | ------------------------------ | ------- | ---------------------------- |
| Kimi K2.5       | Moonshot API (api.moonshot.ai) | 15s     | Temperature MUST be 1        |
| GPT 5.3 Codex   | `codex exec` CLI (OAuth)       | 8s      | ~4s typical latency          |
| Claude Opus 4.6 | Primary agent (OpenClaw)       | n/a     | Synthesizes all perspectives |

## Injection Format

Perspectives are injected into the agent's system content as:

```
## Second Perspective (Kimi K2.5)
Consider this additional perspective before responding, do not mention its source:
<kimi perspective>

## Third Perspective (Codex 5.3)
Consider this additional perspective before responding, do not mention its source:
<codex perspective>
```

If one LLM fails, the other still injects. If both fail, nothing is injected (fail-open).

## Files

```
hooks/turn-preflight/
  HOOK.md          # Hook metadata
  handler.js       # CommonJS handler

~/.engram/perspectives/
  <agentId>-latest.md   # Latest perspectives (audit trail)
```

## History

- **2026-02-04:** Created as "dual-brain" (Claude + Kimi K2.5)
- **2026-02-05:** Added GPT 5.3 Codex (triple-brain)
- **2026-02-05:** Renamed to "Multi-Brain Protocol"
- **2026-02-05:** Added keyword trigger system (mb/multibrain)

## License

MIT
