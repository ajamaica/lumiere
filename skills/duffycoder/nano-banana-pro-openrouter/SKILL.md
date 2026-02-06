---
name: nano-banana-pro-openrouter
description: Generate images with Nano Banana Pro via OpenRouter. Use when the user asks for image generation, mentions Nano Banana Pro, Gemini 3 Pro Image, or OpenRouter image generation.
---

# Nano Banana Pro Image Generation

Generate new images using OpenRouter's Nano Banana Pro (Gemini 3 Pro Image Preview).

## Usage

Run the script using an absolute path (do NOT cd to the skill directory first):

Generate new image:

```bash
sh ~/.openclaw/workspace/skills/nano-banana-pro-openrouter/scripts/generate_image.sh --prompt "your image description" [--filename "output-name.png" | --filename auto] [--resolution 1K|2K|4K] [--api-key KEY]
```

Note: the shell version currently supports generation only (no input image editing).

Important:

- Images are always saved under `~/.openclaw/workspace/outputs/nano-banana-pro-openrouter`
- If `--filename` contains a path, only the basename is used

## Default Workflow (draft -> iterate -> final)

Goal: fast iteration without burning time on 4K until the prompt is correct.

- Draft (1K): quick feedback loop
  - `sh ~/.openclaw/workspace/skills/nano-banana-pro-openrouter/scripts/generate_image.sh --prompt "<draft prompt>" --filename auto --resolution 1K`
- Iterate: adjust prompt in small diffs; keep filename new per run
- Final (4K): only when prompt is locked
  - `sh ~/.openclaw/workspace/skills/nano-banana-pro-openrouter/scripts/generate_image.sh --prompt "<final prompt>" --filename auto --resolution 4K`

## Resolution Options

The Gemini 3 Pro Image API supports three resolutions (uppercase K required):

- 1K (default) - ~1024px resolution
- 2K - ~2048px resolution
- 4K - ~4096px resolution

Map user requests to API parameters:

- No mention of resolution -> 1K
- "low resolution", "1080", "1080p", "1K" -> 1K
- "2K", "2048", "normal", "medium resolution" -> 2K
- "high resolution", "high-res", "hi-res", "4K", "ultra" -> 4K

## API Key and Base URL

The script checks for the API key in this order:

1. --api-key argument (use if user provided a key in chat)
2. OPENROUTER_API_KEY environment variable

The API base URL must be set via OPENROUTER_BASE_URL. Use the full chat
completions endpoint (for OpenRouter: `https://openrouter.ai/api/v1/chat/completions`).

The script also loads .env files automatically (if present):

- Current working directory .env
- Skill directory .env

Important: If a .env file exists, do not ask the user for the key up front.
Just run the script and only ask if it errors with "No API key provided."

### OpenClaw Chat Execution Rules

- OpenClaw does NOT auto-source the skill .env file
- If `~/.openclaw/workspace/skills/nano-banana-pro-openrouter/.env` exists:
  1. Use the `read` tool to read `.env`
  2. Extract `OPENROUTER_API_KEY` and `OPENROUTER_BASE_URL`
  3. Always pass the key via `--api-key` when running the script
- Only ask the user if .env is missing or the key cannot be read
- If the user asks for a timestamped filename, prefer `--filename auto` (do not handwrite dates)

If neither is available, the script exits with an error message.

## Preflight and Common Failures (fast fixes)

Preflight:

- `command -v sh` (must exist)
- `command -v curl` (must exist)
- `command -v base64` (must exist)

Common failures:

- `Error: No API key provided.` -> read .env and retry with --api-key; if still failing, ask the user to set OPENROUTER_API_KEY
- `Error: No API base URL provided.` -> ensure OPENROUTER_BASE_URL is set to a full chat completions endpoint
- `Error loading input image:` -> wrong path or unreadable file; verify --input-image points to a real image
- "quota/permission/403" style API errors -> wrong key, no access, or quota exceeded; try a different key/account

## Filename Generation

Generate filenames with the pattern: `yyyy-mm-dd-hh-mm-ss-name.png`

Format: `{timestamp}-{descriptive-name}.png`

- Timestamp: Current date/time in format `yyyy-mm-dd-hh-mm-ss` (24-hour format)
- Name: Descriptive lowercase text with hyphens
- Keep the descriptive part concise (1-5 words typically)
- Use context from the user's prompt or conversation
- If unclear, use `image`

Examples:

- Prompt "A serene Japanese garden" -> `2025-11-23-14-23-05-japanese-garden.png`
- Prompt "sunset over mountains" -> `2025-11-23-15-30-12-sunset-mountains.png`
- Prompt "create an image of a robot" -> `2025-11-23-16-45-33-robot.png`
- Unclear context -> `2025-11-23-17-12-48-image.png`

Tip: To avoid incorrect timestamps, pass `--filename auto` and let the script
generate the filename using the system clock.

## Image Editing (Not Supported in Shell Version)

The shell script only supports generating new images. Editing an input image is not available in this version.

## Prompt Handling

For generation: pass the user's image description as-is to --prompt. Only rework if clearly insufficient.

## Prompt Templates (high hit-rate)

Use templates when the user is vague or when edits must be precise.

Generation template:

- "Create an image of: <subject>. Style: <style>. Composition: <camera/shot>. Lighting: <lighting>. Background: <background>. Color palette: <palette>. Avoid: <list>."

## Output

- Saves PNG to `~/.openclaw/workspace/outputs/nano-banana-pro-openrouter`
- If `--filename` includes a path, only the basename is used
- Script outputs the full path to the generated image
- Script also outputs `MEDIA_URL=file:///absolute/path` for each image

### Show the image in the reply

- Use the MEDIA_URL value to attach the image in the model response
- In OpenClaw, prefer sending a message with mediaUrl set to that file:// URL
- Also include the file path in text for reference

## Examples

Generate new image:

```bash
sh ~/.openclaw/workspace/skills/nano-banana-pro-openrouter/scripts/generate_image.sh --prompt "A serene Japanese garden with cherry blossoms" --filename auto --resolution 4K
```
