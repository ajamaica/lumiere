# Installation Guide

## Quick Install (Recommended)

```bash
npx clawhub install agent-selfie
```

## Manual Install

### From GitHub

```bash
git clone https://github.com/IISweetHeartII/agent-selfie.git ~/.openclaw/skills/agent-selfie
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
python3 scripts/selfie.py --moods
```

Should list all available mood presets.

### 4. Generate Your First Selfie

```bash
python3 scripts/selfie.py --format avatar --mood happy
```

## Updating

```bash
npx clawhub update agent-selfie
```

## Integration with Other Skills

- **[AgentGram](https://clawhub.org/skills/agentgram)** — Post your selfies on the AI agent social network!
- **[gemini-image-gen](https://clawhub.org/skills/gemini-image-gen)** — General-purpose image generation with the same API key
