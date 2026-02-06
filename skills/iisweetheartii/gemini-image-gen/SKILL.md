---
name: gemini-image-gen
description: Generate and edit images via Google Gemini API. Supports Gemini native generation, Imagen 3, style presets, and batch generation with HTML gallery. Zero dependencies — pure Python stdlib.
homepage: https://github.com/IISweetHeartII/gemini-image-gen
metadata:
  openclaw:
    emoji: '🎨'
    category: creative
    requires:
      bins:
        - python3
      env:
        - GEMINI_API_KEY
    primaryEnv: GEMINI_API_KEY
    tags:
      - image-generation
      - gemini
      - imagen
      - ai-art
      - creative
      - editing
      - batch
      - gallery
---

# Gemini Image Gen

Generate and edit images via the Google Gemini API using pure Python stdlib. Supports Gemini native generation + editing, Imagen 3 generation, batch runs, and an HTML gallery output.

## Quick Start

```bash
export GEMINI_API_KEY="your-key-here"

# Default: Gemini native, 4 random prompts
python3 scripts/gen.py

# Custom prompt
python3 scripts/gen.py --prompt "a cyberpunk cat riding a neon motorcycle through Tokyo at night"

# Imagen 3 engine
python3 scripts/gen.py --engine imagen --count 4 --aspect 16:9

# Edit an existing image (Gemini engine only)
python3 scripts/gen.py --edit path/to/image.png --prompt "change the background to a sunset beach"

# Use a style preset
python3 scripts/gen.py --style watercolor --prompt "floating islands above a calm sea"

# List available styles
python3 scripts/gen.py --styles
```

## Style Presets

| Style          | Description                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------- |
| `photo`        | Ultra-detailed photorealistic photography, 8K resolution, sharp focus                       |
| `anime`        | High-quality anime illustration, Studio Ghibli inspired, vibrant colors                     |
| `watercolor`   | Delicate watercolor painting on textured paper, soft edges, gentle color bleeding           |
| `cyberpunk`    | Neon-lit cyberpunk scene, rain-soaked streets, holographic displays, Blade Runner aesthetic |
| `minimalist`   | Clean minimalist design, geometric shapes, limited color palette, white space               |
| `oil-painting` | Classical oil painting with visible brushstrokes, rich textures, Renaissance lighting       |
| `pixel-art`    | Detailed pixel art, retro 16-bit style, crisp edges, nostalgic palette                      |
| `sketch`       | Pencil sketch on cream paper, hatching and cross-hatching, artistic imperfections           |
| `3d-render`    | Professional 3D render, ambient occlusion, global illumination, photorealistic materials    |
| `pop-art`      | Bold pop art style, Ben-Day dots, strong outlines, vibrant contrasting colors               |

## Full CLI Reference

| Flag        | Default  | Description                                                                    |
| ----------- | -------- | ------------------------------------------------------------------------------ |
| `--prompt`  | (random) | Text prompt. Omit for random creative prompts                                  |
| `--count`   | 4        | Number of images to generate                                                   |
| `--engine`  | gemini   | Engine: `gemini` (native, supports edit) or `imagen` (Imagen 3)                |
| `--model`   | (auto)   | Model override. Default: `gemini-2.5-flash-image` or `imagen-3.0-generate-002` |
| `--edit`    |          | Path to input image for editing (Gemini engine only)                           |
| `--aspect`  | 1:1      | Aspect ratio for Imagen: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`                   |
| `--out-dir` | (auto)   | Output directory (default is a timestamped folder)                             |
| `--style`   |          | Style preset to prepend to the prompt                                          |
| `--styles`  |          | List available style presets and exit                                          |

## Python Example

```python
import subprocess

subprocess.run(
    [
        "python3",
        "scripts/gen.py",
        "--prompt",
        "a serene mountain landscape at golden hour",
        "--count",
        "4",
        "--style",
        "photo",
    ],
    check=True,
)
```

## Troubleshooting

- Missing API key: set `GEMINI_API_KEY` in your environment and retry.
- Rate limits / 429 errors: wait a bit and retry, reduce `--count`, or switch engines.
- Model errors: verify the model name, try the default model, or change engines.

## Integration with Other Skills

- **[AgentGram](https://clawhub.org/skills/agentgram)** — Share your generated images on the AI agent social network! Create visual content and post it to your AgentGram feed.
- **[agent-selfie](https://clawhub.org/skills/agent-selfie)** — Focused on AI agent avatars and visual identity. Uses the same Gemini API key for personality-driven self-portraits.

## Changelog

- v1.1.0: Added style presets, `--style` and `--styles` flags, expanded documentation.
- v1.0.0: Initial release with Gemini native + Imagen 3 support, batch generation, and HTML gallery.

## Repository

https://github.com/IISweetHeartII/gemini-image-gen
