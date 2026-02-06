---
name: antigravity-image
description: Generate images using the internal Antigravity Sandbox API (Gemini 3 Pro Image). Supports text-to-image generation via internal Google endpoints.
metadata: { 'openclaw': { 'emoji': '🎨', 'requires': { 'bins': ['python3'] } } }
---

# Antigravity Image Generation

Use the internal Google Antigravity sandbox to generate images with the `gemini-3-pro-image` model. This skill bypasses standard API restrictions by impersonating the VS Code plugin environment.

## Usage

Generate an image from a prompt:

```bash
python3 {baseDir}/scripts/generate_image_antigravity.py --prompt "A futuristic cityscape with flying cars" --filename "city.png"
```

## How it works

1.  **Authentication**: Automatically retrieves OAuth tokens and Project ID from the local `auth-profiles.json`.
2.  **Impersonation**: Uses the specific `antigravity` User-Agent and internal sandbox headers.
3.  **Reliability**: Includes automatic retry logic for `503 Service Unavailable` errors.

## Parameters

- `--prompt` / `-p`: Text description of the image to generate.
- `--filename` / `-f`: Path where the resulting PNG will be saved.

## Notes

- The script prints a `MEDIA:` path which OpenClaw uses to automatically upload the image to the chat channel.
- Requires an active Antigravity session/login in the environment.
- See [internal-api.md]({baseDir}/references/internal-api.md) for technical details on the impersonated endpoint.
