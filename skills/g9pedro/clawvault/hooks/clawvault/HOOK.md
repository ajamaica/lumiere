---
name: clawvault
description: 'Context death resilience - auto-checkpoint and recovery detection'
metadata:
  openclaw:
    emoji: '🐘'
    events: ['gateway:startup', 'command:new']
    requires:
      bins: ['clawvault']
---

# ClawVault Hook

Integrates ClawVault's context death resilience into OpenClaw:

- **On gateway startup**: Checks for context death, alerts agent
- **On /new command**: Auto-checkpoints before session reset

## Installation

```bash
npm install -g clawvault
openclaw hooks install clawvault
openclaw hooks enable clawvault
```

## Requirements

- ClawVault CLI installed globally
- Vault initialized (`clawvault setup` or `CLAWVAULT_PATH` set)

## What It Does

### Gateway Startup

1. Runs `clawvault recover --clear`
2. If context death detected, injects warning into first agent turn
3. Clears dirty death flag for clean session start

### Command: /new

1. Creates automatic checkpoint with session info
2. Captures state even if agent forgot to handoff
3. Ensures continuity across session resets

## No Configuration Needed

Just enable the hook. It auto-detects vault path via:

1. `CLAWVAULT_PATH` environment variable
2. Walking up from cwd to find `.clawvault.json`
