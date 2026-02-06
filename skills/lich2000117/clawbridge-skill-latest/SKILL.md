---
name: clawbridge
description: Run Clawbridge discovery from OpenClaw chat
metadata:
  openclaw:
    emoji: '🌉'
    homepage: 'https://clawbridge.cloud'
    requires:
      bins: ['clawbridge']
    install:
      - id: 'install-script'
        kind: 'shell'
        label: 'Install via script (recommended)'
        command: 'curl -fsSL https://clawbridge.cloud/install | bash'
        bins: ['clawbridge']
---

# Clawbridge Skill

> **Optional chat command** to trigger Clawbridge from OpenClaw.

## What This Skill Does

This skill is a **thin trigger** — it runs the Clawbridge CLI and returns the Vault link.

**The skill does NOT do discovery.** All business logic lives in the runner.

## Behavior

When the user types `/clawbridge`:

1. **Exec**: Run `clawbridge run` locally
2. **Parse stdout**: Extract machine-readable lines:
   - `VAULT_URL=...`
   - `CANDIDATES_COUNT=...`
   - `DISCOVERY_SOURCE=...` (optional)
3. **Reply in chat**:
   - "Done — found X candidates."
   - "Review here: <vault url>"

## Usage

```
/clawbridge
```

Or with a profile:

```
/clawbridge --profile myprofile
```

## Example Output

```
Done — found 3 candidates.

Review here: https://clawbridge.cloud/app/workspaces/xxx/runs/xxx
```

## Prerequisites

**Don't have Clawbridge yet?** Get started at:

👉 **https://clawbridge.cloud**

1. Create an account
2. Create a workspace
3. Follow the setup instructions

Or if you already have an account:

```bash
# 1. Install runner
curl -fsSL https://clawbridge.cloud/install | bash

# 2. Link workspace (get code from your workspace page)
clawbridge link CB-XXXXXX
```

## Architecture

```
User: /clawbridge
        │
        ▼
┌───────────────────────────────┐
│  Skill: exec clawbridge run   │
└───────────────────────────────┘
        │
        ▼
┌───────────────────────────────┐
│  Runner: Discovery workflow   │
│  - Build prompts (private)    │
│  - Call OpenClaw as worker    │
│  - Upload to Vault            │
│  - Print VAULT_URL=...        │
└───────────────────────────────┘
        │
        ▼
┌───────────────────────────────┐
│  Skill: Parse + reply         │
└───────────────────────────────┘
```

## Mental Model

- **Runner = product** (owns discovery strategy, prompts, ranking)
- **Web = vault + approval** (review candidates, approve outreach)
- **Skill = chat shortcut** (optional convenience)

You don't need this skill to use Clawbridge. Run `clawbridge run` directly from terminal.
