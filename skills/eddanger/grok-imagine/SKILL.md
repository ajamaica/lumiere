---
name: grok-imagine
description: Generate images via xAI's Grok Imagine API. Use when the user wants to create AI-generated images using xAI/Grok, or when OpenAI image generation is unavailable.
homepage: https://docs.x.ai/docs/api-reference#image-generation
metadata:
  {
    'openclaw':
      {
        'emoji': '🎨',
        'requires': { 'bins': ['node'], 'env': ['XAI_API_KEY'] },
        'primaryEnv': 'XAI_API_KEY',
      },
  }
---

# Grok Imagine

Generate images via xAI's Grok Imagine API.

## Run

```bash
node {baseDir}/scripts/gen.mjs --prompt "your image description"
```

## Examples

```bash
# Basic image generation
node {baseDir}/scripts/gen.mjs --prompt "a cyberpunk city at sunset"

# Multiple images
node {baseDir}/scripts/gen.mjs --prompt "a friendly robot" --count 4

# Custom output directory
node {baseDir}/scripts/gen.mjs --prompt "mountain landscape" --out-dir ./images

# Image editing (provide input image)
node {baseDir}/scripts/gen.mjs --prompt "add a rainbow to the sky" --input /path/to/image.png
```

## Models

- **grok-imagine-image**: Text-to-image and image editing (default)
- **grok-2-image**: Legacy image generation model

## Parameters

- `--prompt, -p`: Image description (required)
- `--count, -n`: Number of images to generate (default: 1)
- `--model, -m`: Model to use (default: grok-imagine-image)
- `--input, -i`: Input image path for editing tasks (optional)
- `--out-dir, -o`: Output directory (default: ./tmp/grok-imagine-<timestamp>)

## Output

- Generated images saved as PNG files
- `prompts.json` with prompt → file mapping
- `index.html` thumbnail gallery
- `MEDIA:` lines for OpenClaw auto-attach

## API Key

Set `XAI_API_KEY` environment variable, or configure in OpenClaw:

- `skills."grok-imagine".apiKey` in `~/.openclaw/openclaw.json`
