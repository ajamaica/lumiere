---
name: dual-brain
description: 'Inject Kimi K2.5 perspective into agent context before responses'
metadata:
  {
    'openclaw':
      {
        'emoji': '🧬',
        'events': ['agent:bootstrap'],
        'handler': 'handler.js',
        'install': [{ 'id': 'workspace', 'kind': 'workspace', 'label': 'Workspace hook' }],
      },
  }
---

# Dual-Brain Hook

Injects the latest Kimi K2.5 perspective into the agent's bootstrap context, so the agent sees it before responding.

## What It Does

On every agent bootstrap (before workspace files are injected):

1. **Extracts last user message** from event.messages
2. **Calls Kimi K2.5** via Moonshot API (api.moonshot.ai) directly
3. **Injects perspective** as a KIMI_PERSPECTIVE.md bootstrap file
4. **Writes audit trail** to ~/.engram/perspectives/<agentId>-latest.md

## Requirements

- Kimi API key at `/Users/chadix/clawd/.kimi-api-key`
- Moonshot API access (api.moonshot.ai)

## Skips

- Heartbeat messages
- System events (GatewayRestart, etc.)
- Messages shorter than 10 chars

## Latency

~15-20s for Kimi API call. Times out at 20s and proceeds without perspective.
