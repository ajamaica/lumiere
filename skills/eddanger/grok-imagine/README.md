# grok-imagine

OpenClaw skill for generating images via xAI's Grok Imagine API.

## Installation

```bash
openclaw skills install eddanger/grok-imagine
```

Or from ClawHub:

```bash
openclaw skills install clawhub:eddanger/grok-imagine
```

## Usage

Set your xAI API key:

```bash
export XAI_API_KEY="your-api-key"
```

Or configure in `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "grok-imagine": {
        "apiKey": "your-api-key"
      }
    }
  }
}
```

Then generate images:

```bash
python3 scripts/gen.py --prompt "a cyberpunk city at sunset"
```

## Features

- Text-to-image generation with Grok Imagine
- Image editing (provide input image)
- Batch generation (multiple images)
- HTML gallery output
- MEDIA line output for OpenClaw auto-attach

## License

MIT
