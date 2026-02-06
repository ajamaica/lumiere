# 📹 ClawCamera — Multi-Camera Surveillance with AI

**Professional-grade office/home monitoring system** with motion detection, continuous monitoring (Overwatch), and AI-powered analysis. Built for OpenClaw.

[![GitHub](https://img.shields.io/badge/GitHub-Snail3D%2FClawCamera-blue)](https://github.com/Snail3D/ClawCamera)
[![License](https://img.shields.io/badge/License-MIT-green)](#license)

## 🎯 What It Does

✅ **Instant snapshots** — Ask "Is anyone here?" and get AI-powered visual answers  
✅ **Motion detection** — Alerts when movement is detected (configurable modes)  
✅ **Overwatch mode** — 24/7 background monitoring with random check-in GIFs  
✅ **BOLO matching** — "Be on the lookout" for specific people/items with feature matching  
✅ **Multi-camera** — USB webcams, Wyze RTSP, ESP32-CAM all supported  
✅ **GIF reactions** — Fun, conversational alerts with Tenor GIFs  
✅ **Telegram integration** — Instant notifications with images  
✅ **No secrets in git** — Comprehensive .gitignore + env-based config

## 🚀 Quick Start

### 1. Install

```bash
git clone https://github.com/Snail3D/ClawCamera.git
cd ClawCamera
npm install
```

### 2. Configure

```bash
# Copy example config
cp .env.example .env

# Add your API keys
export GROQ_API_KEY=gsk_xxxxx
export CAMERA_SOURCE=/dev/video0
export TELEGRAM_TOKEN=your_token
export TELEGRAM_CHAT_ID=your_chat_id
```

### 3. Use

**One-shot capture:**

```bash
./scripts/capture.sh
# → Captures photo + runs AI analysis
# → Output: "Someone sitting at desk, blue shirt, relaxed"
```

**Start Overwatch:**

```bash
./scripts/overwatch start
# → Continuous background monitoring
# → Random check-ins: "Got you on camera!" + GIF
# → Alerts saved to ~/.clawdbot/overwatch/
```

**Motion detection:**

```bash
./scripts/motion-detect.sh
# → Detects motion, alerts when threshold exceeded
# → Configurable: cooldown, threshold, interval
```

## 📚 Documentation

- **[SKILL.md](./SKILL.md)** — Full feature list, configuration, and integration guide (for OpenClaw Hub)
- **[guides/esp32-setup.md](./guides/esp32-setup.md)** — ESP32-CAM firmware & deployment
- **[guides/wyze-setup.md](./guides/wyze-setup.md)** — Wyze camera RTSP configuration
- **[guides/troubleshooting.md](./guides/troubleshooting.md)** — Common issues & solutions

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  User Request (Chat / Voice Command)    │
└────────────────┬────────────────────────┘
                 │
        ┌────────▼────────┐
        │   Capture       │
        │   OR            │
        │   Motion Check  │
        │   OR            │
        │   Overwatch     │
        └────────┬────────┘
                 │
        ┌────────▼────────────────────┐
        │  Image Storage              │
        │  ~/.clawdbot/overwatch/     │
        └────────┬────────────────────┘
                 │
        ┌────────▼──────────────────┐
        │  Groq Vision API           │
        │  (AI Analysis)             │
        └────────┬──────────────────┘
                 │
        ┌────────▼──────────────────┐
        │  GIF Selection             │
        │  (Tenor/gifgrep)           │
        └────────┬──────────────────┘
                 │
        ┌────────▼──────────────────┐
        │  Telegram Notification     │
        │  Image + GIF Alert         │
        └────────────────────────────┘
```

## 🎯 Three Monitoring Modes

### 🔴 Report-All

Alert on **any motion** — great for detecting presence.

```bash
./scripts/motion-detect.sh --mode report-all
```

### 🟡 Report-Suspicious

Alert only on **threats** — weapons, breaking/entering, suspicious behavior.

```bash
./scripts/motion-detect.sh --mode report-suspicious
```

### 🟢 Report-Match

Alert on **exact BOLO match** — specific people/items with strict feature matching.

```bash
# Upload a photo
./scripts/bolo-watch.sh image.jpg

# Exact matching: blonde girl with glasses won't trigger on "blonde girl without glasses"
```

## 📸 Multi-Camera Support

### USB Webcam (Instant)

Plug in any USB webcam and capture immediately.

```bash
./scripts/capture.sh --device /dev/video0
```

### Wyze Camera (RTSP)

Stream from Wyze PTZ or v3 cameras over your local network.

```bash
export WYZE_IP=192.168.1.100
./scripts/capture.sh --device wyze
```

### ESP32-CAM (Wireless)

Deploy an ESP32-CAM to remote locations with OV2640 sensor + WiFi.

```bash
# See guides/esp32-setup.md for full firmware & config
./scripts/esp32-watch.sh --ip 192.168.1.50
```

## 🎬 GIF Check-Ins

Overwatch sends random GIF updates when monitoring:

- "spy camera" → `https://media.tenor.com/U0aBgKUsXs4AAAAC/cop-watch-camera-man.gif`
- "watching" → Relevant GIF of eyes/surveillance
- "caught" → Playful reaction when motion detected
- "checking in" → Status update GIF

Makes monitoring fun and conversational!

## 🔐 Security & Privacy

### ✅ No Secrets in Git

- Comprehensive `.gitignore` blocks all sensitive files
- API keys stored in `.env` (never committed)
- Credentials in `credentials.h` or `config.json` are ignored
- `auth.json`, `secrets/` folder all blocked

### ✅ Local Storage

- All images stored in `~/.clawdbot/overwatch/`
- No cloud uploads (except Groq Vision API for analysis)
- Automatic cleanup/retention policies

### ✅ Encrypted Transit

- Groq API calls use HTTPS
- Telegram API calls use HTTPS
- All credentials passed via environment variables only

### ✅ Privacy Modes

- Can disable Overwatch at any time
- Configurable retention (auto-delete old images)
- No persistent logging of sensitive data

## 📊 Performance

| Feature              | Speed  | Notes                           |
| -------------------- | ------ | ------------------------------- |
| USB Capture          | <500ms | Real-time, direct connection    |
| Wyze Capture         | 1-2s   | Over network, depends on WiFi   |
| ESP32 Capture        | 2-3s   | Wireless + processing           |
| Motion Detection     | <1s    | File-size comparison, very fast |
| Overwatch Check-In   | 2-5s   | Includes AI analysis            |
| Groq Vision Analysis | 1-2s   | Cloud API, varies by image      |

## 🛠️ Requirements

### System

- macOS / Linux / Raspberry Pi
- ffmpeg
- ImageMagick (identify command)
- Node.js 18+

### APIs

- **Groq API Key** (free tier available) — Vision analysis
- **Telegram Bot Token** (free) — Notifications
- **Tenor API** (free) — GIF reactions

### Optional

- **Wyze Account** — For RTSP camera access
- **ESP32-CAM** — For wireless remote monitoring

## 📥 Installation

```bash
# Clone the repo
git clone https://github.com/Snail3D/ClawCamera.git
cd ClawCamera

# Install dependencies
npm install

# Install system tools
brew install ffmpeg imagemagick

# Configure
cp .env.example .env
# Edit .env with your API keys

# Test
./scripts/capture.sh
```

## 🔗 OpenClaw Integration

Add to your OpenClaw session:

```bash
# List available cameras
openclaw office-cam list

# Take instant photo
openclaw office-cam snap

# Start monitoring
openclaw office-cam watch --mode all

# Get status
openclaw office-cam status
```

## 📖 Examples

### "Is anyone in the office?"

```bash
./scripts/capture.sh
# Groq analyzes: "One person at desk, blue shirt, working on laptop"
# Telegram alert: Photo + "🕵️ Spy Mode Active" GIF
```

### "Start watching for movement"

```bash
./scripts/overwatch start
# Runs in background, checks every 2 seconds
# On motion: captures + analyzes + sends GIF update
# Random check-ins every 15 minutes
```

### "Look out for someone with a red backpack"

```bash
./scripts/bolo-watch.sh person-with-red-backpack.jpg
# Extracts features: clothing, accessories, gait
# Monitors continuously
# Only alerts on exact matches (red backpack MUST be visible)
```

## 🐛 Troubleshooting

### Camera not detected

```bash
# List available video devices
ls /dev/video*

# Check permissions
ls -l /dev/video0

# Test ffmpeg directly
ffmpeg -f avfoundation -i "0" -frames 1 test.jpg
```

### Overwatch not running

```bash
# Check status
./scripts/overwatch status

# View logs
tail -f ~/.clawdbot/overwatch/overwatch.log

# Verify API key
echo $GROQ_API_KEY
```

### Motion too sensitive

```bash
# Increase threshold (reduce alerts)
./scripts/motion-detect.sh --threshold 15

# Increase cooldown (fewer alerts per minute)
./scripts/motion-detect.sh --cooldown 300
```

See **[guides/troubleshooting.md](./guides/troubleshooting.md)** for more.

## 🤝 Contributing

Found a bug? Have a feature request? PRs welcome!

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit changes (`git commit -am 'Add feature'`)
4. Push to branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## 📄 License

MIT License — See [LICENSE](./LICENSE) for details.

---

**Built with ❤️ by Clawd for Snail**  
🦾 AI Assistant • 📹 Camera Surveillance • 🎬 Conversational Alerts

**Questions?** Check the docs or open an issue on GitHub.
