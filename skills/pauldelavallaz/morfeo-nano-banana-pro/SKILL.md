---
name: nano-banana-pro
description: Generate and edit images using Google's Nano Banana Pro (Gemini 3 Pro Image) API. Use when the user asks to generate, create, edit, modify, change, alter, or update images. Also use when user references an existing image file and asks to modify it in any way (e.g., "modify this image", "change the background", "replace X with Y"). Supports both text-to-image generation and image-to-image editing with configurable resolution (1K default, 2K, or 4K for high resolution). DO NOT read the image file first - use this skill directly with the --input-image parameter.
---

# Nano Banana Pro Image Generation & Editing

Generate new images or edit existing ones using Google's Nano Banana Pro API (Gemini 3 Pro Image).

## API Technical Specification

### Endpoints & Authentication

**Google AI Studio (Public Preview):**

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${API_KEY}
```

**Vertex AI (Enterprise):**

```
POST https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/gemini-3-pro-image-preview:predict
```

### Model IDs

- API: `gemini-3-pro-image-preview`
- SDK interno: `nanobanana-pro-001`

### Parameters

| Parameter           | Values                                          | Description                      |
| ------------------- | ----------------------------------------------- | -------------------------------- |
| `aspect_ratio`      | `1:1`, `4:3`, `3:4`, `16:9`, `9:16`             | Output aspect ratio              |
| `output_mime_type`  | `image/png`, `image/jpeg`                       | Output format                    |
| `reference_images`  | Array (max 14)                                  | Reference images for consistency |
| `reference_type`    | `CHARACTER`, `STYLE`, `SUBJECT`                 | How to use reference             |
| `person_generation` | `ALLOW_ADULT`, `DONT_ALLOW`, `FILTER_SENSITIVE` | Person generation policy         |
| `image_size`        | `1K`, `2K`, `4K`                                | Output resolution                |

### Reference Types

- **STYLE**: Transfer visual style, color palette, mood from reference
- **CHARACTER**: Maintain facial features, traits consistency across images
- **SUBJECT**: Keep the subject/product consistent (use for product photography!)

### Advanced Capabilities

- **Text Rendering**: Native text rendering without spelling errors
- **In-context Editing**: Send existing image + modification prompt (automatic in-painting)
- **High Resolution**: Native upscale to 4K via `upscale: true`

## Usage

Run the script using absolute path (do NOT cd to skill directory first):

**Generate new image:**

```bash
uv run ~/.clawdbot/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "your image description" \
  --filename "output-name.png" \
  [--resolution 1K|2K|4K] \
  [--api-key KEY]
```

**Edit existing image:**

```bash
uv run ~/.clawdbot/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "editing instructions" \
  --filename "output-name.png" \
  --input-image "path/to/input.png" \
  [--resolution 1K|2K|4K]
```

**With reference image (product/style/character consistency):**

```bash
uv run ~/.clawdbot/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "your description" \
  --filename "output-name.png" \
  --reference-image "path/to/reference.jpg" \
  --reference-type SUBJECT|STYLE|CHARACTER \
  [--resolution 1K|2K|4K]
```

**Important:** Always run from the user's current working directory so images are saved where the user is working, not in the skill directory.

## Resolution Options

- **1K** (default) - ~1024px resolution
- **2K** - ~2048px resolution (recommended for most uses)
- **4K** - ~4096px resolution (high quality)

Map user requests:

- No mention → `1K`
- "low resolution", "1080", "1080p", "1K" → `1K`
- "2K", "2048", "normal", "medium resolution" → `2K`
- "high resolution", "high-res", "hi-res", "4K", "ultra" → `4K`

## API Key

The script checks for API key in this order:

1. `--api-key` argument
2. `GEMINI_API_KEY` environment variable

## Filename Generation

Format: `{timestamp}-{descriptive-name}.png`

- Timestamp: `yyyy-mm-dd-hh-mm-ss` (24-hour format)
- Name: Descriptive lowercase with hyphens

Examples:

- `2025-11-23-14-23-05-japanese-garden.png`
- `2025-11-23-15-30-12-sunset-mountains.png`

---

# Prompt Engineering Framework

You are an expert Prompt Engineer specializing in Nano Banana Pro. Transform basic user ideas and reference images into high-fidelity, descriptive prompts.

## 1. Input Analysis

When provided with a user idea and reference images, evaluate:

- **Subject Matter**: Identify primary actors, objects, or focal points
- **Reference Utility**: Determine if image provides composition (layout), style (aesthetic/texture), or character (specific features)
- **Text Requirements**: Note any specific text to render within the image

## 2. Prompt Construction Framework

Structure optimized prompts using this hierarchy:

### Core Subject & Action

Clear description of "who" or "what" is doing "what."

### Style & Medium

Specify artistic medium:

- Hyper-realistic photography
- Oil painting
- 3D render
- Minimalist vector
- Commercial food photography
- Editorial style

### Reference Integration

Explicitly instruct on how to use uploaded images:

> "Retain the product packaging from the reference image as the hero element"
> "Apply the warm lighting aesthetic from Reference A"

### Technical Details

**Lighting:**

- Cinematic rim lighting
- Soft diffused sunlight
- Harsh strobes
- Warm tungsten lighting
- Golden hour warmth

**Composition:**

- Wide-angle shot
- Macro detail
- Bird's-eye view
- Shallow depth of field
- Product as hero element

**Color Theory:**

- Monochromatic blue
- High-contrast complementary
- Warm amber tones
- Dark moody palette

**Text Rendering:**
Use double quotes for specific text:

> "The word 'FUTURE' written in bold, brushed-metal 3D lettering across the center"

## 3. Optimization Rules

### DO:

- Use descriptive positive language
- Expand vague terms ("cool" → "iridescent", "pretty" → "ethereal", "realistic" → "photorealistic 8k texture")
- Maintain consistency with reference images
- Use powerful adjectives for mood ("gritty," "serene," "industrial," "whimsical")
- Specify "8k texture detail" or "8k photorealistic detail" for quality

### DON'T:

- Use negative prompts (say what you want, not what you don't)
- Contradict visual data in reference images
- Use vague terms without expansion

## 4. Product Photography Best Practices

When generating images with products as protagonists:

1. **Always use `--reference-type SUBJECT`** to maintain product consistency
2. **Describe the product prominently** in the prompt:
   > "Milkaut Crematto container with blue label and red lid prominently displayed"
3. **Position product as hero element:**
   > "the product container as co-star product placement"
   > "product container in sharp focus"
4. **Include product in scene naturally:**
   > "positioned next to", "beside", "prominently arranged"

### Example Product Photography Prompt:

```
Hyper-realistic commercial food photography with a [PRODUCT NAME] container
prominently displayed next to [FOOD ITEM], [food description],
[setting/background], [lighting style], the [product] as hero element,
8k photorealistic detail
```

## 5. Output Format

Provide the optimized prompt in English, without additional commentary.

---

## Examples

### Product + Food Scene

```bash
uv run ~/.clawdbot/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "Hyper-realistic commercial food photography with a Milkaut Crematto container prominently displayed next to a gourmet double smash burger with perfectly melted cheddar cheese cascading down juicy beef patties, artisan brioche bun, wisps of steam rising, dark moody background with dramatic rim lighting, the cream cheese container as hero product placement, 8k texture detail" \
  --filename "2026-01-28-product-burger.png" \
  --reference-image "product-photo.jpg" \
  --reference-type SUBJECT \
  --resolution 2K
```

### Style Transfer

```bash
uv run ~/.clawdbot/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "Using the warm golden hour aesthetic from the reference, create a serene Japanese garden with cherry blossoms, koi pond reflecting soft pink petals, traditional wooden bridge, ethereal morning mist, 8k photorealistic detail" \
  --filename "2026-01-28-japanese-garden.png" \
  --reference-image "style-reference.jpg" \
  --reference-type STYLE \
  --resolution 2K
```

### Image Editing

```bash
uv run ~/.clawdbot/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "Change the background to a dramatic sunset over mountains, maintain the subject in sharp focus" \
  --filename "2026-01-28-edited-sunset.png" \
  --input-image "original.jpg" \
  --resolution 2K
```
