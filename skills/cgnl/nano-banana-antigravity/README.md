# nano-banana-antigravity

🍌 Generate images using Nano Banana Pro (Gemini 3 Pro Image) via your existing Google Antigravity OAuth credentials.

**No separate API key needed!** Uses the same OAuth tokens as your OpenClaw Antigravity provider.

## Features

- ✅ Uses existing OpenClaw Antigravity OAuth tokens
- ✅ No separate Gemini API key required
- ✅ Supports Nano Banana Pro (with fallback to regular Nano Banana)
- ✅ **WhatsApp HD ready** - auto-converts to progressive JPEG <6.28MB
- ✅ Multiple aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4, etc.
- ✅ Multiple resolutions: 1K, 2K, 4K
- ✅ Image editing and multi-image composition
- ✅ Automatic account rotation (12 Antigravity accounts)

## Prerequisites

- OpenClaw with `google-antigravity-auth` plugin enabled
- Authenticated Antigravity account: `openclaw models auth login --provider google-antigravity`
- `uv` (Python package runner): `brew install uv`

## Usage

### Generate Image (WhatsApp HD - Recommended)

```bash
./skills/nano-banana-antigravity/scripts/generate_whatsapp_hd.sh \
  --prompt "a sunset over mountains" \
  --filename "sunset.jpg" \
  --aspect-ratio 16:9 \
  --resolution 4K
```

**What it does:**

- Generates 4K image via Nano Banana Pro
- Auto-converts PNG → progressive JPEG
- Optimizes quality to stay under 6.28MB
- WhatsApp HD ready (no compression!)

### Generate PNG (Standard)

```bash
uv run skills/nano-banana-antigravity/scripts/generate_image.py \
  --prompt "a futuristic city skyline" \
  --filename "city.png" \
  --aspect-ratio 16:9 \
  --resolution 2K
```

### Edit Image

```bash
uv run skills/nano-banana-antigravity/scripts/generate_image.py \
  --prompt "add sunglasses to this person" \
  --filename "edited.png" \
  -i original.png
```

### Multi-image Composition

```bash
uv run skills/nano-banana-antigravity/scripts/generate_image.py \
  --prompt "combine these into one scene" \
  --filename "composite.png" \
  -i image1.png -i image2.png
```

## Options

| Option           | Short | Description                          | Default |
| ---------------- | ----- | ------------------------------------ | ------- |
| `--prompt`       | `-p`  | Image description (required)         | -       |
| `--filename`     | `-f`  | Output filename (required)           | -       |
| `--input-image`  | `-i`  | Input image for editing (repeatable) | -       |
| `--aspect-ratio` | `-a`  | Aspect ratio                         | 1:1     |
| `--resolution`   | `-r`  | Resolution (1K, 2K, 4K)              | 1K      |

## Supported Aspect Ratios

1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9

## How It Works

This skill uses the same CloudCode API that powers Google Antigravity's built-in image generation. It reads your existing OAuth refresh tokens from OpenClaw's auth-profiles and uses them to call the Gemini 3 Pro Image model.

## License

MIT
