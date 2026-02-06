---
name: elevenlabs-transcribe
description: Transcribe audio to text using ElevenLabs Scribe. Supports batch transcription, realtime streaming from URLs, microphone input, and local files.
homepage: https://elevenlabs.io/speech-to-text
metadata:
  {
    'clawdbot':
      {
        'emoji': '🎙️',
        'requires': { 'bins': ['ffmpeg', 'python3'], 'env': ['ELEVENLABS_API_KEY'] },
        'primaryEnv': 'ELEVENLABS_API_KEY',
      },
  }
---

# ElevenLabs Speech-to-Text

> **Official ElevenLabs skill for speech-to-text transcription.**

Convert audio to text with state-of-the-art accuracy. Supports 90+ languages, speaker diarization, and realtime streaming.

## Prerequisites

- **ffmpeg** installed (`brew install ffmpeg` on macOS)
- **ELEVENLABS_API_KEY** environment variable set
- Python 3.8+ (dependencies auto-install on first run)

## Usage

```bash
{baseDir}/scripts/transcribe.sh <audio_file> [options]
{baseDir}/scripts/transcribe.sh --url <stream_url> [options]
{baseDir}/scripts/transcribe.sh --mic [options]
```

## Examples

### Batch Transcription

Transcribe a local audio file:

```bash
{baseDir}/scripts/transcribe.sh recording.mp3
```

With speaker identification:

```bash
{baseDir}/scripts/transcribe.sh meeting.mp3 --diarize
```

Get full JSON response with timestamps:

```bash
{baseDir}/scripts/transcribe.sh interview.wav --diarize --json
```

### Realtime Streaming

Stream from a URL (e.g., live radio, podcast):

```bash
{baseDir}/scripts/transcribe.sh --url https://npr-ice.streamguys1.com/live.mp3
```

Transcribe from microphone:

```bash
{baseDir}/scripts/transcribe.sh --mic
```

Stream a local file in realtime (useful for testing):

```bash
{baseDir}/scripts/transcribe.sh audio.mp3 --realtime
```

### Quiet Mode for Agents

Suppress status messages on stderr:

```bash
{baseDir}/scripts/transcribe.sh --mic --quiet
```

## Options

| Option        | Description                                       |
| ------------- | ------------------------------------------------- |
| `--diarize`   | Identify different speakers in the audio          |
| `--lang CODE` | ISO language hint (e.g., `en`, `pt`, `es`, `fr`)  |
| `--json`      | Output full JSON with timestamps and metadata     |
| `--events`    | Tag audio events (laughter, music, applause)      |
| `--realtime`  | Stream local file instead of batch processing     |
| `--partials`  | Show interim transcripts during realtime mode     |
| `-q, --quiet` | Suppress status messages (recommended for agents) |

## Output Format

### Text Mode (default)

Plain text transcription:

```
The quick brown fox jumps over the lazy dog.
```

### JSON Mode (`--json`)

```json
{
  "text": "The quick brown fox jumps over the lazy dog.",
  "language_code": "eng",
  "language_probability": 0.98,
  "words": [{ "text": "The", "start": 0.0, "end": 0.15, "type": "word", "speaker_id": "speaker_0" }]
}
```

### Realtime Mode

Final transcripts print as they're committed. With `--partials`:

```
[partial] The quick
[partial] The quick brown fox
The quick brown fox jumps over the lazy dog.
```

## Supported Formats

**Audio:** MP3, WAV, M4A, FLAC, OGG, WebM, AAC, AIFF, Opus
**Video:** MP4, AVI, MKV, MOV, WMV, FLV, WebM, MPEG, 3GPP

**Limits:** Up to 3GB file size, 10 hours duration

## Error Handling

The script exits with non-zero status on errors:

- **Missing API key:** Set `ELEVENLABS_API_KEY` environment variable
- **File not found:** Check the file path exists
- **Missing ffmpeg:** Install with your package manager
- **API errors:** Check API key validity and rate limits

## When to Use Each Mode

| Scenario                       | Command                                 |
| ------------------------------ | --------------------------------------- |
| Transcribe a recording         | `./transcribe.sh file.mp3`              |
| Meeting with multiple speakers | `./transcribe.sh meeting.mp3 --diarize` |
| Live radio/podcast stream      | `./transcribe.sh --url <url>`           |
| Voice input from user          | `./transcribe.sh --mic --quiet`         |
| Need word timestamps           | `./transcribe.sh file.mp3 --json`       |
