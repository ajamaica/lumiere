# Enhanced Voice Skill for OpenClaw

An improved text-to-speech skill that provides seamless voice generation and playback using Microsoft Edge's TTS engine.

## Features

- **Direct Speech Playback**: Speak text immediately without storing to file
- **Multiple Voice Support**: Supports various languages and voice types
- **Easy Integration**: Simple API for text-to-speech conversion
- **Automatic Cleanup**: Temporary files are automatically managed
- **Cross-platform**: Works on macOS, Windows, and Linux

## Installation

```bash
pip3 install edge-tts
```

## Usage

### Direct Speech (Recommended)
```javascript
await skill.execute({
  action: 'speak',
  text: 'Hello, this is played directly!'
});
```

### Generate and Store Audio
```javascript
await skill.execute({
  action: 'tts',
  text: 'Hello, this will be saved to a file.',
  playImmediately: true  // Optionally play immediately
});
```

### Available Voices
```javascript
const voices = await skill.execute({ action: 'voices' });
```

## Actions

- `speak`: Convert text to speech and play directly
- `tts`: Convert text to speech and save to file
- `play`: Play an existing audio file
- `voices`: List available voices
- `cleanup`: Remove old temporary files
- `install`: Install dependencies

## Configuration

- `voice`: Voice type (default: 'zh-CN-XiaoxiaoNeural')
- `rate`: Speech rate (default: '+0%')
- `volume`: Volume level (default: '+0%')
- `pitch`: Pitch adjustment (default: '+0Hz')

## Requirements

- Python 3.x with edge-tts package
- System audio player (afplay on macOS, powershell on Windows, aplay on Linux)