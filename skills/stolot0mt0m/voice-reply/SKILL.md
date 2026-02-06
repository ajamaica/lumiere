---
name: voice-reply
version: 1.0.0
description: |
  Local text-to-speech using Piper voices via sherpa-onnx. 100% offline, no API keys required.
  Use when user asks for a voice reply, audio response, spoken answer, or wants to hear something read aloud.
  Supports multiple languages including German (thorsten) and English (ryan) voices.
  Outputs Telegram-compatible voice notes with [[audio_as_voice]] tag.
metadata:
  openclaw:
    emoji: "🎤"
    os: ["linux"]
    requires:
      bins: ["ffmpeg"]
      env: ["SHERPA_ONNX_DIR", "PIPER_VOICES_DIR"]
---

# Voice Reply

Generate voice audio replies using local Piper TTS via sherpa-onnx. Completely offline, no cloud APIs needed.

## Features

- **100% Local** - No internet connection required after setup
- **No API Keys** - Free to use, no accounts needed
- **Multi-language** - German and English voices included
- **Telegram Ready** - Outputs voice notes that display as bubbles
- **Auto-detect Language** - Automatically selects voice based on text

## Prerequisites

1. **sherpa-onnx** runtime installed
2. **Piper voice models** downloaded
3. **ffmpeg** for audio conversion

## Installation

### Quick Install

```bash
cd scripts
sudo ./install.sh
```

### Manual Installation

#### 1. Install sherpa-onnx

```bash
sudo mkdir -p /opt/sherpa-onnx
cd /opt/sherpa-onnx
curl -L -o sherpa.tar.bz2 "https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.23/sherpa-onnx-v1.12.23-linux-x64-shared.tar.bz2"
sudo tar -xjf sherpa.tar.bz2 --strip-components=1
rm sherpa.tar.bz2
```

#### 2. Download Voice Models

```bash
sudo mkdir -p /opt/piper-voices
cd /opt/piper-voices

# German - thorsten (medium quality, natural male voice)
curl -L -o thorsten.tar.bz2 "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-de_DE-thorsten-medium.tar.bz2"
sudo tar -xjf thorsten.tar.bz2 && rm thorsten.tar.bz2

# English - ryan (high quality, clear US male voice)
curl -L -o ryan.tar.bz2 "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-ryan-high.tar.bz2"
sudo tar -xjf ryan.tar.bz2 && rm ryan.tar.bz2
```

#### 3. Install ffmpeg

```bash
sudo apt install -y ffmpeg
```

#### 4. Set Environment Variables

Add to your OpenClaw service or shell:

```bash
export SHERPA_ONNX_DIR="/opt/sherpa-onnx"
export PIPER_VOICES_DIR="/opt/piper-voices"
```

## Usage

```bash
{baseDir}/bin/voice-reply "Text to speak" [language]
```

### Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| text | The text to convert to speech | (required) |
| language | `de` for German, `en` for English | auto-detect |

### Examples

```bash
# German (explicit)
{baseDir}/bin/voice-reply "Hallo, ich bin dein Assistent!" de

# English (explicit)
{baseDir}/bin/voice-reply "Hello, I am your assistant!" en

# Auto-detect (detects German from umlauts and common words)
{baseDir}/bin/voice-reply "Guten Tag, wie geht es dir?"

# Auto-detect (defaults to English)
{baseDir}/bin/voice-reply "The weather is nice today."
```

## Output Format

The script outputs two lines that OpenClaw processes for Telegram:

```
[[audio_as_voice]]
MEDIA:/tmp/voice-reply-output.ogg
```

- `[[audio_as_voice]]` - Tag that tells Telegram to display as voice bubble
- `MEDIA:path` - Path to the generated OGG Opus audio file

## Available Voices

| Language | Voice | Quality | Description |
|----------|-------|---------|-------------|
| German (de) | thorsten | medium | Natural male voice, clear pronunciation |
| English (en) | ryan | high | Clear US male voice, professional tone |

## Adding More Voices

Browse available Piper voices at:
- https://rhasspy.github.io/piper-samples/
- https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models

Download and extract to `$PIPER_VOICES_DIR`, then modify the script to include the new voice.

## Troubleshooting

### "TTS binary not found"
Ensure `SHERPA_ONNX_DIR` is set and contains `bin/sherpa-onnx-offline-tts`.

### "Failed to generate audio"
Check that voice model files exist: `*.onnx`, `tokens.txt`, `espeak-ng-data/`

### Audio plays as file instead of voice bubble
Ensure the output includes `[[audio_as_voice]]` tag on its own line before the `MEDIA:` line.

## Credits

- [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) - Offline speech processing
- [Piper](https://github.com/rhasspy/piper) - Fast local TTS voices
- [Thorsten Voice](https://github.com/thorstenMueller/Thorsten-Voice) - German voice dataset
