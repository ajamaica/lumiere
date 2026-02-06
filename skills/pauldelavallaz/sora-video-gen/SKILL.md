---
name: sora
description: Generate videos using OpenAI's Sora API. Use when the user asks to generate, create, or make videos from text prompts or reference images. Supports image-to-video generation with automatic resizing.
---

# Sora Video Generation

Generate videos using OpenAI's Sora API.

## API Reference

**Endpoint:** `POST https://api.openai.com/v1/videos`

### Parameters

| Parameter         | Values                                           | Description                              |
| ----------------- | ------------------------------------------------ | ---------------------------------------- |
| `prompt`          | string                                           | Text description of the video (required) |
| `input_reference` | file                                             | Optional image that guides generation    |
| `model`           | `sora-2`, `sora-2-pro`                           | Model to use (default: sora-2)           |
| `seconds`         | `4`, `8`, `12`                                   | Video duration (default: 4)              |
| `size`            | `720x1280`, `1280x720`, `1024x1792`, `1792x1024` | Output resolution                        |

### Important Notes

- **Image dimensions must match video size exactly** - the script auto-resizes
- Video generation takes 1-3 minutes typically
- Videos expire after ~1 hour - download immediately

## Usage

```bash
# Basic text-to-video
uv run ~/.clawdbot/skills/sora/scripts/generate_video.py \
  --prompt "A cat playing piano" \
  --filename "output.mp4"

# Image-to-video (auto-resizes image)
uv run ~/.clawdbot/skills/sora/scripts/generate_video.py \
  --prompt "Slow dolly shot, steam rising, warm lighting" \
  --filename "output.mp4" \
  --input-image "reference.png" \
  --seconds 8 \
  --size 720x1280

# With specific model
uv run ~/.clawdbot/skills/sora/scripts/generate_video.py \
  --prompt "Cinematic scene" \
  --filename "output.mp4" \
  --model sora-2-pro \
  --seconds 12
```

## Script Parameters

| Flag                  | Description                  | Default  |
| --------------------- | ---------------------------- | -------- |
| `--prompt`, `-p`      | Video description (required) | -        |
| `--filename`, `-f`    | Output file path (required)  | -        |
| `--input-image`, `-i` | Reference image path         | None     |
| `--seconds`, `-s`     | Duration: 4, 8, or 12        | 8        |
| `--size`, `-sz`       | Resolution                   | 720x1280 |
| `--model`, `-m`       | sora-2 or sora-2-pro         | sora-2   |
| `--api-key`, `-k`     | OpenAI API key               | env var  |
| `--poll-interval`     | Check status every N seconds | 10       |

## API Key

Set `OPENAI_API_KEY` environment variable or pass `--api-key`.

## Prompt Engineering for Video

### Good prompts include:

1. **Camera movement**: dolly, pan, zoom, tracking shot
2. **Motion description**: swirling, rising, falling, shifting
3. **Lighting**: golden hour, candlelight, dramatic rim lighting
4. **Atmosphere**: steam, particles, bokeh, haze
5. **Mood/style**: cinematic, commercial, lifestyle, editorial

### Example prompts:

**Food commercial:**

```
Slow dolly shot of gourmet dish, soft morning sunlight streaming through window,
subtle steam rising, warm cozy atmosphere, premium food commercial aesthetic
```

**Lifestyle:**

```
Golden hour light slowly shifting across mountains, gentle breeze rustling leaves,
serene morning atmosphere, premium lifestyle commercial
```

**Product shot:**

```
Cinematic close-up, dramatic lighting with warm highlights,
slow reveal, luxury commercial style
```

## Workflow: Image → Video

1. Generate image with Nano Banana Pro (or use existing)
2. Pass image as `--input-image` to Sora
3. Write prompt describing desired motion/atmosphere
4. Script auto-resizes image to match video dimensions

## Output

- Videos saved as MP4
- Typical file size: 1.5-3MB for 8 seconds
- Resolution matches `--size` parameter
