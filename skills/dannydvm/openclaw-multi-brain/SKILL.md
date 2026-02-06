# Multi-Brain Protocol

**What it does:** Gives your AI agents cognitive diversity by calling multiple LLMs (Kimi K2.5 + GPT 5.3 Codex) in parallel before the primary agent responds. Three brains instead of one.

## For Agents

Multi-Brain is system-enforced via a `turn:before` hook. No manual steps needed.

When triggered (user types `mb` as first word), the hook:

1. Calls Kimi K2.5 and GPT 5.3 Codex in parallel
2. Injects their perspectives into your system context
3. You synthesize all viewpoints into your response
4. Never mention the other AIs to the user

Perspectives appear in your context as:

```
[KIMI K2.5 PERSPECTIVE]
<perspective text>

[CODEX 5.3 PERSPECTIVE]
<perspective text>
```

## For Humans

### Setup

1. Install the hook:

```bash
mkdir -p hooks/turn-preflight
# Copy HOOK.md and handler.js from this package
```

2. Set Kimi API key:

```bash
echo "your-moonshot-api-key" > .kimi-api-key
```

3. Install Codex CLI:

```bash
npm install -g @openai/codex
codex auth   # OAuth login
```

4. Enable in openclaw.json:

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

### Trigger Modes

Configure `TRIGGER_MODE` in handler.js:

| Mode                | Behavior                                               |
| ------------------- | ------------------------------------------------------ |
| `keyword` (default) | Only fires when `mb` or `multibrain` is the first word |
| `hybrid`            | Keyword forces it, auto on messages >50 chars          |
| `auto`              | Fires on every message (token-expensive)               |

### LLMs

| LLM             | Role               | Provider             | Latency |
| --------------- | ------------------ | -------------------- | ------- |
| Claude Opus 4.6 | Primary agent      | OpenClaw (Anthropic) | n/a     |
| Kimi K2.5       | Second perspective | Moonshot API         | ~5s     |
| GPT 5.3 Codex   | Third perspective  | codex exec CLI       | ~4s     |

## Architecture

```
User types: "mb should we change pricing?"
    |
    v
[turn:before hook detects "mb" keyword]
    |
    +---> Kimi K2.5 (Moonshot API, parallel)
    +---> GPT 5.3 Codex (CLI, parallel)
    |
    v (~5s combined)
[Perspectives injected into system content]
    |
    v
Claude Opus 4.6 responds with all 3 viewpoints
```

## Benefits

- **Cognitive diversity**: three different AI architectures
- **Bias mitigation**: different training data and approaches
- **On-demand**: only burns tokens when you ask for it
- **Fail-open**: if any LLM fails, the others still work
- **System-enforced**: no protocol compliance needed from agents

---

**Source:** <https://github.com/Dannydvm/openclaw-multi-brain>
