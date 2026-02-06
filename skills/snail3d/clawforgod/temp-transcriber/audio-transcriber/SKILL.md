---
name: audio-transcriber
description: Transcribe audio files using Groq's Whisper API (fast, cloud-based). Use when the user sends voice messages, audio files (ogg, mp3, wav, m4a, etc.), or asks for speech-to-text transcription. Requires GROQ_API_KEY environment variable.
---

# Audio Transcriber

## Overview

This skill enables fast audio transcription using Groq's Whisper API. Transcription happens in the cloud via Groq's infrastructure, providing significantly faster results than local Whisper models.

## Quick Start

When a user sends an audio file or voice message:

1. Ensure GROQ_API_KEY is set in environment
2. Use the transcribe script: `scripts/transcribe.py /path/to/audio.ogg`
3. Return the transcribed text to the user

## Usage

### Basic Transcription

```bash
export GROQ_API_KEY="your-key-here"
python3 /path/to/audio-transcriber/scripts/transcribe.py /path/to/audio.ogg
```

The script:

- Accepts any audio format (ogg, mp3, wav, m4a, etc.)
- Automatically converts to WAV (16kHz, mono) using ffmpeg (if available)
- Sends to Groq's Whisper API for transcription
- Outputs plain text to stdout

### Supported Audio Formats

- **Voice messages**: OGG (Telegram, Signal, etc.)
- **Common formats**: MP3, WAV, M4A, FLAC, AAC
- **Container formats**: The script handles conversion automatically if ffmpeg is installed
- **Without ffmpeg**: Only WAV files are supported

## Setup Requirements

The skill requires these to be configured:

### 1. Groq API Key

Get an API key from https://console.groq.com/

Set as environment variable:

```bash
export GROQ_API_KEY="your-key-here"
```

For persistent setting, add to your shell profile (~/.zshrc or ~/.bashrc):

```bash
echo 'export GROQ_API_KEY="your-key-here"' >> ~/.zshrc
```

### 2. ffmpeg (recommended)

```bash
brew install ffmpeg
```

Without ffmpeg, only WAV files will work. ffmpeg is used to convert other formats to WAV before sending to Groq.

## Resources

### scripts/transcribe.py

Main transcription script that:

- Validates GROQ_API_KEY environment variable
- Checks for ffmpeg (optional but recommended)
- Converts audio to WAV format if needed
- Sends to Groq's Whisper API (whisper-large-v3 model)
- Extracts and outputs plain text

Run directly from command line or via exec tool.

## Performance Notes

- **Speed**: Much faster than local Whisper (typically <1 second for short messages)
- **Model**: Uses whisper-large-v3 via Groq API (high accuracy)
- **Latency**: Cloud-based, depends on internet connection
- **Cost**: Groq offers free tier; check current pricing for usage limits
- **Accuracy**: Excellent for general speech; handles:
  - Multiple accents and dialects
  - Multiple speakers (moderately)
  - Noisy environments
  - Technical jargon

## Troubleshooting

### "GROQ_API_KEY environment variable not set"

```bash
export GROQ_API_KEY="your-key-here"
```

### "ffmpeg not found"

```bash
brew install ffmpeg
```

### API errors

- Check your Groq API key is valid
- Verify you have remaining quota on your Groq account
- Check internet connectivity

## Security Note

Never commit the GROQ_API_KEY to version control. Use environment variables or a secure secrets manager.
