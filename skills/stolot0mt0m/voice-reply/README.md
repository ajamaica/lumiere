# voice-reply

**Local Text-to-Speech for OpenClaw using Piper voices via sherpa-onnx**

Generate voice audio replies that work as Telegram voice notes - 100% offline, no API keys required.

## Features

- **100% Local** - No internet connection required after setup
- **No API Keys** - Completely free, no accounts needed
- **Multi-language** - German and English voices included (more available)
- **Telegram Ready** - Outputs as voice bubbles, not file attachments
- **Auto-detect Language** - Automatically selects the right voice

## Quick Start

### 1. Install Dependencies

```bash
cd scripts
sudo ./install.sh
```

This installs:
- sherpa-onnx runtime (~28 MB)
- German voice "thorsten" (~64 MB)
- English voice "ryan" (~110 MB)
- ffmpeg (if not present)

### 2. Add to OpenClaw

Copy the skill to your OpenClaw skills directory:

```bash
cp -r . ~/.openclaw/skills/voice-reply
```

### 3. Use It

Ask your OpenClaw agent:
- "Reply with a voice message"
- "Say that as audio"
- "Read this aloud: Hello world"

Or call directly:
```bash
/voice_reply "Hello, how are you?" en
```

## Voices

| Language | Voice | Quality | Size |
|----------|-------|---------|------|
| German | thorsten | medium | 64 MB |
| English | ryan | high | 110 MB |

More voices available at [Piper Samples](https://rhasspy.github.io/piper-samples/).

## Requirements

- Linux (Ubuntu 22.04+ recommended)
- ~200 MB disk space
- ~500 MB RAM during synthesis
- ffmpeg

## How It Works

1. Text is converted to speech using sherpa-onnx with Piper VITS models
2. WAV output is converted to OGG Opus (Telegram voice format)
3. Output includes `[[audio_as_voice]]` tag for Telegram voice bubbles

## Credits

- [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) - Offline speech processing
- [Piper](https://github.com/rhasspy/piper) - Fast local neural TTS
- [Thorsten Voice](https://github.com/thorstenMueller/Thorsten-Voice) - German voice dataset (CC0)

## License

MIT License
