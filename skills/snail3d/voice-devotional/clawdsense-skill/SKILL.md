---
name: clawdsense
description: Real-time image analysis from ClawdSense ESP32 dongle. Monitors media receiver, captures photos from device, analyzes instantly with Groq Vision. Use when ClawdSense sends photos via /photo command or button controls. Provides instant room analysis, occupancy detection, and environmental awareness.
---

# ClawdSense Skill

Real-time image capture and analysis from ClawdSense ESP32 dongle.

## Quick Start

### Start Services

```bash
# Terminal 1: Media receiver (accepts photo uploads from ESP32)
node ~/clawd/clawdsense-skill/scripts/media-receiver.js

# Terminal 2: Analyzer (monitors inbound folder, analyzes with Groq)
node ~/clawd/clawdsense-skill/scripts/analyzer.js

# Terminal 3: Health monitor (keeps both services alive)
node ~/clawd/clawdsense-skill/scripts/health-monitor.js
```

### Usage

1. **Send `/photo` command to ClawdSense** via Telegram
2. **Device captures and POSTs to media receiver** (port 5555)
3. **Analyzer detects new photo** and analyzes with Groq Vision
4. **Results printed to console**

## Architecture

### Three Components

**Media Receiver** (port 5555)

- Accepts multipart/form-data uploads from ESP32
- Stores photos in `~/.clawdbot/media/inbound/`
- Endpoints:
  - POST `/inbound/photo` - JPEG photos
  - POST `/inbound/audio` - WAV audio
  - POST `/inbound/video` - AVI video

**Analyzer** (real-time polling)

- Polls inbound folder every 500ms
- Detects new photos automatically
- Sends to Groq Vision API for analysis
- Uses pixtral-12b model for instant results

**Health Monitor**

- Checks both services every 30s
- Restarts if either dies
- Logs status to console

## Performance

- **Detection latency:** ~500ms (polling interval)
- **Analysis time:** 1-3s (Groq API)
- **Total end-to-end:** ~2-5s from capture to results

## Configuration

### ESP32 Firmware Settings

Device must be configured with:

```
MEDIA_RECEIVER_URL = "http://localhost:5555"
or for public: "https://your-ngrok-url"
```

### Groq API Key

Stored in environment:

```bash
export GROQ_API_KEY="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"
```

## Troubleshooting

**"Media receiver is DOWN"**

- Check if port 5555 is in use
- Restart: `node ~/clawd/clawdsense-skill/scripts/media-receiver.js`

**"No new photos detected"**

- Is device sending to media receiver? Check device logs
- Is media receiver running? Curl http://localhost:5555/health
- Check inbound folder permissions

**"Groq API errors"**

- Verify API key is set
- Check account quota/billing

## References

- See `references/groq-vision-api.md` for Groq setup
- See `references/esp32-setup.md` for device configuration
