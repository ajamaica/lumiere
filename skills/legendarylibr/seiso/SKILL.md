---
name: seisoai
description: AI image, music, video, and sound effects generation with x402 pay-per-request.
metadata: { 'openclaw': { 'homepage': 'https://seisoai.com', 'emoji': '🎨' } }
---

# Seisoai

Generate AI images, music, videos, and sound effects. Pay per request with USDC on Base — no account needed.

## When to use

- **Image generation**: User wants pictures from a text prompt or image editing
- **Music generation**: User wants music or audio from a description
- **Video generation**: User wants short video from a prompt or image
- **Sound effects**: User wants audio effects from a description
- **Image upscaling**: User wants to upscale/enhance an image
- **Prompt help**: User wants help brainstorming or refining prompts

## Base URL

Default: `https://seisoai.com`

Override via config: `SEISOAI_API_URL` or `skills.entries.seisoai.config.apiUrl`

## x402 Payment Flow

All endpoints require x402 payment. No account or API key needed.

1. Make request to endpoint
2. Server returns `HTTP 402` with `PAYMENT-REQUIRED` header
3. Decode base64 header to get payment requirements
4. Sign USDC payment on Base (eip155:8453) using wallet
5. Retry same request with `PAYMENT-SIGNATURE` header
6. Server verifies, executes, settles payment onchain
7. Response includes `x402.transactionHash` as proof

### Payment requirements (decoded from PAYMENT-REQUIRED header)

```json
{
  "x402Version": 2,
  "resource": {
    "url": "https://seisoai.com/api/generate/image",
    "description": "Generate an AI image"
  },
  "accepts": [
    {
      "scheme": "exact",
      "network": "eip155:8453",
      "maxAmountRequired": "65000",
      "asset": "USDC",
      "payTo": "0x..."
    }
  ]
}
```

Note: `maxAmountRequired` is in USDC smallest units (6 decimals). 65000 = $0.065

## Endpoints

| Endpoint                     | Description    | USDC Units   | USD         |
| ---------------------------- | -------------- | ------------ | ----------- |
| `POST /api/generate/image`   | Generate image | 32500-325000 | $0.03-$0.33 |
| `POST /api/generate/video`   | Generate video | ~650000      | ~$0.65      |
| `POST /api/generate/music`   | Generate music | ~26000       | ~$0.026     |
| `POST /api/generate/upscale` | Upscale image  | 39000        | $0.039      |
| `POST /api/audio/sfx`        | Sound effects  | 39000        | $0.039      |
| `POST /api/prompt-lab/chat`  | Prompt help    | 1300         | $0.0013     |

---

## Image Generation

**Endpoint:** `POST /api/generate/image`

### Request

```json
{
  "prompt": "a sunset over mountains, oil painting style",
  "model": "flux-pro",
  "aspect_ratio": "16:9",
  "num_images": 1
}
```

### Parameters

| Parameter      | Type    | Required | Description                                         |
| -------------- | ------- | -------- | --------------------------------------------------- |
| `prompt`       | string  | Yes      | Text description of the image                       |
| `model`        | string  | No       | See model table below                               |
| `aspect_ratio` | string  | No       | `1:1`, `16:9`, `9:16`, `4:3`, `3:4`                 |
| `num_images`   | number  | No       | Number of images (1-4, default 1)                   |
| `image_url`    | string  | No       | Reference image URL for img2img editing             |
| `image_urls`   | array   | No       | Multiple reference images (for multi-image editing) |
| `seed`         | number  | No       | Seed for reproducibility                            |
| `is_360`       | boolean | No       | Generate 360° panorama (uses nano-banana-pro)       |

### Image Models

| Model             | USDC Units | USD     | Best for                           |
| ----------------- | ---------- | ------- | ---------------------------------- |
| `flux-pro`        | 65000      | $0.065  | General purpose, fast, default     |
| `flux-2`          | 32500      | $0.0325 | Photorealism, text/logos in images |
| `nano-banana-pro` | 325000     | $0.325  | Premium quality, 360° panoramas    |

### Model Selection Guide

- **`flux-pro`** (default): Fast, general-purpose. Good for portraits, landscapes, concepts.
- **`flux-2`**: Best for photorealistic images and when you need text rendered in the image.
- **`nano-banana-pro`**: Highest quality. Use for final production images or 360° panoramas.

### Response

```json
{
  "success": true,
  "images": ["https://fal.media/files/..."],
  "remainingCredits": 0,
  "creditsDeducted": 0,
  "freeAccess": true,
  "x402": {
    "settled": true,
    "transactionHash": "0x..."
  }
}
```

---

## Video Generation

**Endpoint:** `POST /api/generate/video`

### Request

```json
{
  "prompt": "a cat walking through a garden",
  "duration": 5
}
```

### Parameters

| Parameter        | Type    | Required | Description                        |
| ---------------- | ------- | -------- | ---------------------------------- |
| `prompt`         | string  | Yes      | Text description of the video      |
| `duration`       | string  | No       | `4s`, `6s`, or `8s` (default `5s`) |
| `image_url`      | string  | No       | Starting frame image URL           |
| `generate_audio` | boolean | No       | Generate synchronized audio        |

### Response

```json
{
  "success": true,
  "video": {
    "url": "https://fal.media/files/...",
    "content_type": "video/mp4"
  },
  "x402": {
    "settled": true,
    "transactionHash": "0x..."
  }
}
```

---

## Music Generation

**Endpoint:** `POST /api/generate/music`

### Request

```json
{
  "prompt": "upbeat jazz with piano and drums",
  "duration": 60
}
```

### Parameters

| Parameter  | Type   | Required | Description                              |
| ---------- | ------ | -------- | ---------------------------------------- |
| `prompt`   | string | Yes      | Description of the music                 |
| `duration` | number | No       | Duration in seconds (10-180, default 60) |

### Response

```json
{
  "success": true,
  "audio_file": {
    "url": "https://fal.media/files/...",
    "content_type": "audio/wav"
  },
  "x402": {
    "settled": true,
    "transactionHash": "0x..."
  }
}
```

---

## Sound Effects

**Endpoint:** `POST /api/audio/sfx`

### Request

```json
{
  "prompt": "thunder rumbling in the distance",
  "duration": 5
}
```

### Parameters

| Parameter  | Type   | Required | Description                           |
| ---------- | ------ | -------- | ------------------------------------- |
| `prompt`   | string | Yes      | Description of sound effect           |
| `duration` | number | No       | Duration in seconds (1-30, default 5) |

### Response

```json
{
  "success": true,
  "audio_url": "https://fal.media/files/...",
  "duration": 5,
  "x402": {
    "settled": true,
    "transactionHash": "0x..."
  }
}
```

---

## Image Upscaling

**Endpoint:** `POST /api/generate/upscale`

### Request

```json
{
  "image_url": "https://example.com/image.jpg",
  "scale": 2
}
```

### Parameters

| Parameter   | Type   | Required | Description             |
| ----------- | ------ | -------- | ----------------------- |
| `image_url` | string | Yes      | URL of image to upscale |
| `scale`     | number | No       | 2 (default) or 4        |

### Response

```json
{
  "success": true,
  "image_url": "https://fal.media/files/...",
  "scale": 2,
  "x402": {
    "settled": true,
    "transactionHash": "0x..."
  }
}
```

---

## Prompt Lab (Chat)

**Endpoint:** `POST /api/prompt-lab/chat`

Get AI assistance for crafting better prompts.

### Request

```json
{
  "message": "Help me create a prompt for a fantasy landscape",
  "context": {
    "mode": "image",
    "selectedModel": "flux-pro"
  }
}
```

### Parameters

| Parameter               | Type   | Required | Description                   |
| ----------------------- | ------ | -------- | ----------------------------- |
| `message`               | string | Yes      | Your question or request      |
| `history`               | array  | No       | Previous messages for context |
| `context.mode`          | string | No       | `image`, `video`, `music`     |
| `context.selectedModel` | string | No       | Model being used              |

### Response

```json
{
  "success": true,
  "response": "Here's a prompt for a fantasy landscape: [PROMPT]Mystical floating islands...[/PROMPT]",
  "timestamp": "2025-02-03T12:00:00.000Z",
  "x402": {
    "settled": true,
    "transactionHash": "0x..."
  }
}
```

---

## Error Handling

### HTTP 402 - Payment Required

Normal response when payment is needed. Decode `PAYMENT-REQUIRED` header and retry with payment.

### HTTP 400 - Bad Request

```json
{
  "success": false,
  "error": "prompt is required"
}
```

### HTTP 500 - Server Error

```json
{
  "success": false,
  "error": "Image generation failed",
  "creditsRefunded": 0
}
```

---

## Config

```json
{
  "skills": {
    "entries": {
      "seisoai": {
        "enabled": true,
        "config": {
          "apiUrl": "https://seisoai.com"
        }
      }
    }
  }
}
```
