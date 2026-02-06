---
name: aimlapi-media-gen
description: Generate images or videos via AIMLAPI (OpenAI-compatible) from prompts. Use when Codex needs to call AI/ML API media endpoints, batch image/video jobs, or produce media files from text prompts using AIMLAPI credentials.
---

# AIMLAPI Media Generation

## Overview

Generate images and videos via the AIMLAPI OpenAI-compatible API using reusable scripts that handle auth, payloads, and media downloads.

## Quick start

```bash
export AIMLAPI_API_KEY="sk-aimlapi-..."
python3 {baseDir}/scripts/gen_image.py --prompt "ultra-detailed studio photo of a lobster astronaut"
python3 {baseDir}/scripts/gen_video.py --prompt "slow drone shot of a foggy forest" --model aimlapi/<provider>/<video-model>
```

## Tasks

### Generate images

Use `scripts/gen_image.py` to call `/images/generations` and save results locally.

```bash
python3 {baseDir}/scripts/gen_image.py \
  --prompt "cozy cabin in a snowy forest" \
  --model aimlapi/openai/gpt-image-1 \
  --size 1024x1024 \
  --count 2 \
  --out-dir ./out/images
```

**Notes:**

- Change `--base-url` if your AIMLAPI endpoint differs.
- Use `--extra-json` to pass provider-specific parameters without editing the script.

### Generate videos

Use `scripts/gen_video.py` to call the video generation endpoint and save the returned media.

```bash
python3 {baseDir}/scripts/gen_video.py \
  --prompt "time-lapse of clouds over a mountain range" \
  --model aimlapi/<provider>/<video-model> \
  --endpoint videos/generations \
  --out-dir ./out/videos \
  --extra-json '{"duration": 6, "size": "1024x576"}'
```

**Notes:**

- The video endpoint and payload fields vary by provider. Confirm the correct endpoint and fields in your AIMLAPI model docs and pass them via `--endpoint` and `--extra-json`.

## References

- `references/aimlapi-media.md`: endpoint and payload notes, plus troubleshooting tips.
