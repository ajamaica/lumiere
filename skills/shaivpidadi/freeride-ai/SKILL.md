---
name: freeride
description: Manages free AI models from OpenRouter for OpenClaw. Automatically ranks models by quality, configures fallbacks for rate-limit handling, and updates openclaw.json. Use when the user mentions free AI, OpenRouter, model switching, rate limits, or wants to reduce AI costs.
---

# FreeRide - Free AI for OpenClaw

Configures OpenClaw to use free AI models from OpenRouter with automatic fallback switching.

## Quick Start

```bash
# Set API key (free at openrouter.ai/keys)
export OPENROUTER_API_KEY="sk-or-v1-..."

# Auto-configure best model + fallbacks
freeride auto
```

## Commands

### `list` - View available models

```bash
freeride list              # Top 15 models
freeride list -n 30        # More models
freeride list --refresh    # Force API refresh
```

### `auto` - Auto-configure

```bash
freeride auto              # Best model + 5 fallbacks
freeride auto -f           # Fallbacks only (keep current primary)
freeride auto -c 10        # 10 fallbacks
freeride auto --setup-auth # Also configure auth profile
```

### `switch` - Set specific model

```bash
freeride switch qwen3-coder         # Set as primary
freeride switch deepseek -f         # Add to fallbacks only
freeride switch nvidia/nemotron --no-fallbacks
```

### `status` - Check configuration

```bash
freeride status
```

### `fallbacks` - Update fallbacks only

```bash
freeride fallbacks         # 5 fallbacks
freeride fallbacks -c 10   # 10 fallbacks
```

### `refresh` - Update model cache

```bash
freeride refresh
```

## Behavior

**Primary model**: Best specific model (not router) for consistent responses.

**First fallback**: Always `openrouter/free` - OpenRouter's smart router that auto-selects based on request features (vision, tools, etc.).

**Additional fallbacks**: Ranked by quality score.

**Config preservation**: Only updates model-related sections; preserves gateway, channels, plugins, etc.

## Model Ranking

Score (0-1) based on:

- Context length (40%)
- Capabilities (30%)
- Recency (20%)
- Provider trust (10%)

## Flags

| Flag             | Commands        | Description                 |
| ---------------- | --------------- | --------------------------- |
| `-f`             | switch, auto    | Fallback only, keep primary |
| `-c N`           | auto, fallbacks | Number of fallbacks         |
| `--no-fallbacks` | switch          | Skip fallback configuration |
| `--setup-auth`   | switch, auto    | Add OpenRouter auth profile |
| `-n N`           | list            | Models to display           |
| `-r`             | list            | Force refresh               |

## Config Output

Updates `~/.openclaw/openclaw.json`:

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "openrouter/qwen/qwen3-coder:free",
        "fallbacks": ["openrouter/free:free", "nvidia/nemotron-3-nano-30b-a3b:free"]
      }
    }
  }
}
```

## Troubleshooting

**"OPENROUTER_API_KEY not set"**: Export the key or add to shell profile.

**Config not updating**: Check file permissions on `~/.openclaw/openclaw.json`.

**Changes not taking effect**: Restart OpenClaw.
