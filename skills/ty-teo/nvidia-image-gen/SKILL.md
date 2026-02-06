---
name: nvidia-image-gen
version: 1.0.0
description: Generate and edit images using NVIDIA FLUX models. Use when user asks to generate images, create pictures, edit photos, or modify existing images with AI. Supports text-to-image generation and image editing with text prompts.
---

# NVIDIA Image Generation

Generate and edit images using NVIDIA's FLUX models.

## Models

| Model | Use Case | Speed | Quality |
|-------|----------|-------|---------|
| `dev` | High-quality text-to-image | Normal | Best |
| `schnell` | Fast text-to-image | Fast | Good |
| `kontext` | Image editing | Normal | Best |

## Quick Start

```bash
# Generate an image
python scripts/generate.py "A cute cat in space"

# Edit an existing image
python scripts/generate.py "Add sunglasses" -i photo.jpg -o edited.png
```

## Parameters

### Text-to-Image (dev/schnell)

| Parameter | Short | Default | Description |
|-----------|-------|---------|-------------|
| `prompt` | | (required) | Text description |
| `-o, --output` | | output.png | Output file path |
| `--width` | | 1024 | Output width in pixels |
| `--height` | | 1024 | Output height in pixels |
| `--aspect-ratio` | `-ar` | 1:1 | Aspect ratio preset |
| `--steps` | `-s` | 30 | Diffusion steps |
| `--seed` | | 0 | Random seed (0=random) |
| `--model` | `-m` | auto | Model selection |

### Image Editing (kontext)

| Parameter | Short | Default | Description |
|-----------|-------|---------|-------------|
| `prompt` | | (required) | Edit instruction |
| `-i, --input` | | (required) | Input image path |
| `-o, --output` | | output.png | Output file path |
| `--steps` | `-s` | 30 | Diffusion steps |
| `--cfg` | | 3.5 | Guidance scale |
| `--seed` | | 0 | Random seed |

## Supported Aspect Ratios

| Ratio | Resolution |
|-------|------------|
| 1:1 | 1024×1024 |
| 16:9 | 1344×768 |
| 9:16 | 768×1344 |
| 4:3 | 1216×832 |
| 3:4 | 832×1216 |

## Examples

### Basic Generation
```bash
python scripts/generate.py "A mountain landscape at sunset"
```

### Wide Format (16:9)
```bash
python scripts/generate.py "A panoramic beach view" -ar 16:9
```

### Portrait Mode (9:16)
```bash
python scripts/generate.py "A professional headshot" -ar 9:16
```

### Custom Size
```bash
python scripts/generate.py "A banner image" --width 1344 --height 768
```

### Fast Generation
```bash
python scripts/generate.py "Quick sketch of a robot" -m schnell
```

### Edit an Image
```bash
python scripts/generate.py "Make the background a sunset" -i input.jpg -o output.png
```

### Reproducible Results
```bash
python scripts/generate.py "A robot" --seed 12345
```

## Output

The script outputs `MEDIA:/path/to/image.png` which can be sent directly to chat.

## API Key

The API key is embedded in the script. To use a different key, set the `NVIDIA_API_KEY` environment variable.
