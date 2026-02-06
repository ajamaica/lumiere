# Gemini Image Gen

Generate and edit images via Google Gemini API for [OpenClaw](https://openclaw.org). Supports Gemini native generation, Imagen 3, style presets, and batch generation with HTML gallery. Zero dependencies.

[![ClawHub](https://img.shields.io/badge/ClawHub-gemini--image--gen-blue)](https://clawhub.org/skills/gemini-image-gen)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **Dual engine** — Gemini native (generation + editing) and Imagen 3 (high-quality generation)
- **Style presets** — photo, anime, watercolor, cyberpunk, minimalist, oil-painting, pixel-art, sketch, 3d-render, pop-art
- **Image editing** — Edit existing images with text prompts (Gemini engine)
- **Batch generation** — Generate multiple images with automatic HTML gallery
- **Zero dependencies** — Pure Python stdlib, no pip install needed

## Quick Start

```bash
export GEMINI_API_KEY="your-key-here"

# Generate with random prompts
python3 scripts/gen.py

# Custom prompt with style
python3 scripts/gen.py --prompt "a cyberpunk cat in Tokyo" --style anime

# Imagen 3 engine
python3 scripts/gen.py --engine imagen --count 4 --aspect 16:9

# Edit an existing image
python3 scripts/gen.py --edit photo.png --prompt "make it watercolor style"
```

## Installation

### Via ClawHub

```bash
npx clawhub install gemini-image-gen
```

### Manual

```bash
git clone https://github.com/IISweetHeartII/gemini-image-gen.git
```

## Style Presets

| Style          | Description                                              |
| -------------- | -------------------------------------------------------- |
| `photo`        | Ultra-detailed photorealistic photography, 8K resolution |
| `anime`        | Studio Ghibli inspired, vibrant colors                   |
| `watercolor`   | Delicate watercolor on textured paper                    |
| `cyberpunk`    | Neon-lit, rain-soaked Blade Runner aesthetic             |
| `minimalist`   | Clean geometric shapes, limited palette                  |
| `oil-painting` | Classical with visible brushstrokes                      |
| `pixel-art`    | Retro 16-bit style                                       |
| `sketch`       | Pencil sketch with hatching                              |
| `3d-render`    | Professional 3D with global illumination                 |
| `pop-art`      | Bold Ben-Day dots, strong outlines                       |

## Skill Files

| File                               | Description                                  |
| ---------------------------------- | -------------------------------------------- |
| [SKILL.md](./SKILL.md)             | Full skill documentation for OpenClaw agents |
| [HEARTBEAT.md](./HEARTBEAT.md)     | Periodic creative generation guide           |
| [package.json](./package.json)     | Skill metadata for ClawHub registry          |
| [scripts/gen.py](./scripts/gen.py) | Main generation script                       |

## Requirements

- Python 3.8+
- `GEMINI_API_KEY` environment variable ([Get a free key](https://aistudio.google.com/apikey))

## License

[MIT](LICENSE)
