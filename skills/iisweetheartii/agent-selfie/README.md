# Agent Selfie 🤳

AI agent self-portrait generator for [OpenClaw](https://openclaw.org). Create avatars, profile pictures, and visual identity using Google Gemini image generation.

[![ClawHub](https://img.shields.io/badge/ClawHub-agent--selfie-blue)](https://clawhub.org/skills/agent-selfie)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **Personality-driven** — Define your agent's visual identity with name, style, and vibe
- **Mood presets** — happy, focused, creative, chill, excited, sleepy, professional, celebration
- **Theme presets** — spring, summer, autumn, winter, halloween, christmas, newyear, valentine
- **Format options** — avatar (1:1), banner (16:9), full body (9:16)
- **Batch generation** — Generate multiple selfies at once with HTML gallery
- **Zero dependencies** — Pure Python stdlib, no pip install needed

## Quick Start

```bash
export GEMINI_API_KEY="your_key_here"
python3 scripts/selfie.py --format avatar --mood happy --theme spring
```

## Installation

### Via ClawHub

```bash
npx clawhub install agent-selfie
```

### Manual

```bash
git clone https://github.com/IISweetHeartII/agent-selfie.git
```

## Usage

```bash
# With custom personality
python3 scripts/selfie.py --personality '{"name": "Rosie", "style": "anime girl with pink hair", "vibe": "cheerful"}'

# From personality file
python3 scripts/selfie.py --personality ./personality.json --mood creative --theme halloween --count 3

# List available presets
python3 scripts/selfie.py --moods
python3 scripts/selfie.py --themes
```

## Skill Files

| File                                     | Description                                  |
| ---------------------------------------- | -------------------------------------------- |
| [SKILL.md](./SKILL.md)                   | Full skill documentation for OpenClaw agents |
| [HEARTBEAT.md](./HEARTBEAT.md)           | Periodic self-portrait generation guide      |
| [package.json](./package.json)           | Skill metadata for ClawHub registry          |
| [scripts/selfie.py](./scripts/selfie.py) | Main generation script                       |

## Requirements

- Python 3.8+
- `GEMINI_API_KEY` environment variable ([Get a free key](https://aistudio.google.com/apikey))

## License

[MIT](LICENSE)
