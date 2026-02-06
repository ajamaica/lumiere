---
name: gemini-image-proxy
version: 1.0.0
description: Generate and edit images with Gemini API using the OpenAI Python SDK.
metadata:
  openclaw:
    emoji: "🎨"
    requires:
      env: ["GOOGLE_PROXY_API_KEY", "GOOGLE_PROXY_BASE_URL"]
---

# Gemini Image Simple

Generate and edit images using **Gemini 3 Pro Image** via the OpenAI Python SDK and an OpenAI-compatible API endpoint.

## Why This Skill

| Feature                  | This Skill                | Others (nano-banana-pro, etc.) |
| ------------------------ | ------------------------- | ------------------------------ |
| **Dependencies**         | openai (SDK)              | google-genai, pillow, etc.     |
| **Requires pip/uv**      | ✅ Yes                    | ✅ Yes                         |
| **Works on Fly.io free** | ✅ Yes (with pip)         | ❌ Fails                       |
| **Works in containers**  | ✅ Yes (with pip)         | ❌ Often fails                 |
| **Image generation**     | ✅ Full                   | ✅ Full                        |
| **Image editing**        | ✅ Yes                    | ✅ Yes                         |
| **Setup complexity**     | Install SDK + set API key | Install packages first         |

**Bottom line:** This skill uses the OpenAI SDK, so you must install `openai` once with pip.

## Install

```bash
python3 -m pip install openai
```

## Quick Start

```bash
# Set env
export GOOGLE_PROXY_API_KEY="your_api_key"
export GOOGLE_PROXY_BASE_URL="https://example.com/v1"

# Generate
python3 /data/clawd/skills/gemini-image-simple/scripts/generate.py "A cat wearing a tiny hat" cat.png

# Edit existing image
python3 /data/clawd/skills/gemini-image-simple/scripts/generate.py "Make it sunset lighting" edited.png --input original.png
```

## Usage

### Generate new image

```bash
python3 {baseDir}/scripts/generate.py "your prompt" output.png
```

### Edit existing image

```bash
python3 {baseDir}/scripts/generate.py "edit instructions" output.png --input source.png
```

Supported input formats: PNG, JPG, JPEG, GIF, WEBP

## Environment

Set these environment variables:

- `GOOGLE_PROXY_API_KEY` (your API key)
- `GOOGLE_PROXY_BASE_URL` (OpenAI-compatible base URL, e.g. https://example.com/v1)

## How It Works

Uses **Gemini 3 Pro Image** (`gemini-3-pro-image`) via the OpenAI Python SDK:

- `client.images.generate(...)` for new images
- `client.images.edits(...)` for edits
- Requires the `openai` package

That's it. Works on any Python 3.10+ installation with `openai` installed.

## Model

Currently using: `gemini-3-pro-image`

Other available models (can be changed in generate.py if needed):

- `gemini-3-pro-image-preview` - Preview variant
- `imagen-4.0-ultra-generate-001` - Imagen 4.0 Ultra
- `imagen-4.0-generate-001` - Imagen 4.0
- `gemini-2.5-flash-image` - Gemini 2.5 Flash with image gen

## Examples

```bash
# Landscape
python3 {baseDir}/scripts/generate.py "Misty mountains at sunrise, photorealistic" mountains.png

# Product shot
python3 {baseDir}/scripts/generate.py "Minimalist product photo of a coffee cup, white background" coffee.png

# Edit: change style
python3 {baseDir}/scripts/generate.py "Convert to watercolor painting style" watercolor.png --input photo.jpg

# Edit: add element
python3 {baseDir}/scripts/generate.py "Add a rainbow in the sky" rainbow.png --input landscape.png
```
