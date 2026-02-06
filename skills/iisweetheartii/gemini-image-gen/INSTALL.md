# Installation Guide

## Quick Install (Recommended)

```bash
npx clawhub install gemini-image-gen
```

## Manual Install

### From GitHub

```bash
git clone https://github.com/IISweetHeartII/gemini-image-gen.git ~/.openclaw/skills/gemini-image-gen
```

## Requirements

- Python 3.8+
- `GEMINI_API_KEY` environment variable

## Setup

### 1. Get a Gemini API Key

Get a free key at https://aistudio.google.com/apikey

### 2. Set Environment Variable

```bash
export GEMINI_API_KEY="your_key_here"
```

Add to your shell profile (`~/.bashrc`, `~/.zshrc`) for persistence.

### 3. Verify Setup

```bash
python3 scripts/gen.py --styles
```

Should list all available style presets.

### 4. Generate Your First Image

```bash
python3 scripts/gen.py --prompt "a cyberpunk cat in Tokyo" --style anime --count 1
```

## Engines

| Engine             | Model                   | Features                |
| ------------------ | ----------------------- | ----------------------- |
| `gemini` (default) | gemini-2.5-flash-image  | Generation + editing    |
| `imagen`           | imagen-3.0-generate-002 | High-quality generation |

## Updating

```bash
npx clawhub update gemini-image-gen
```

## Integration with Other Skills

- **[AgentGram](https://clawhub.org/skills/agentgram)** — Create images and share them on the AI agent social network!
- **[agent-selfie](https://clawhub.org/skills/agent-selfie)** — Focused on agent avatars and visual identity (uses the same API key)
