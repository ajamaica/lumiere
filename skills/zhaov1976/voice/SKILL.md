# Voice Skill

The Voice skill provides enhanced text-to-speech functionality using edge-tts, allowing you to convert text to spoken audio with multiple playback options.

## Features

- Text-to-speech conversion using Microsoft Edge's TTS engine
- Support for various voice options and audio settings
- Direct playback of generated audio
- Automatic cleanup of temporary audio files
- Integration with the MEDIA system for audio playback

## Installation

Before using this skill, you need to install the required dependency:

```bash
pip3 install edge-tts
```

Or use the skill's install action:

```javascript
await skill.execute({ action: 'install' });
```

## Usage

### Direct Speaking (Recommended)

Speak text directly without storing to file:

```javascript
const result = await skill.execute({
  action: 'speak',  // New improved action
  text: 'Hello, how are you today?'
});
// Audio is played directly and temporary file is cleaned up automatically
```

### Text-to-Speech with File Generation

Convert text to speech with default settings:

```javascript
const result = await skill.execute({
  action: 'tts',
  text: 'Hello, how are you today?'
});
// Returns a MEDIA link to the audio file
```

With direct playback:

```javascript
const result = await skill.execute({
  action: 'tts',
  text: 'Hello, how are you today?',
  playImmediately: true  // Plays the audio immediately after generation
});
```

With custom options:

```javascript
const result = await skill.execute({
  action: 'tts',
  text: 'This is a sample of voice customization.',
  options: {
    voice: 'zh-CN-XiaoxiaoNeural',
    rate: '+10%',
    volume: '-5%',
    pitch: '+10Hz'
  }
});
```

### Play Existing Audio File

Play an existing audio file:

```javascript
const result = await skill.execute({
  action: 'play',
  filePath: '/path/to/audio/file.mp3'
});
```

### List Available Voices

Get a list of available voices:

```javascript
const result = await skill.execute({
  action: 'voices'
});
```

### Cleanup Temporary Files

Clean up temporary audio files older than 1 hour (default):

```javascript
const result = await skill.execute({
  action: 'cleanup'
});
```

Or specify a custom age threshold:

```javascript
const result = await skill.execute({
  action: 'cleanup',
  options: {
    hoursOld: 2  // Clean files older than 2 hours
  }
});
```

## Options

The following options are available for text-to-speech:

- `voice`: The voice to use (default: 'zh-CN-XiaoxiaoNeural')
- `rate`: Speech rate adjustment (default: '+0%')
- `volume`: Volume adjustment (default: '+0%')
- `pitch`: Pitch adjustment (default: '+0Hz')

## Supported Voices

Edge-TTS supports many voices in different languages:
- Chinese: zh-CN-XiaoxiaoNeural, zh-CN-YunxiNeural, zh-CN-YunyangNeural
- English (US): en-US-Standard-C, en-US-Standard-D, en-US-Wavenet-F
- English (UK): en-GB-Standard-A, en-GB-Wavenet-A
- Japanese: ja-JP-NanamiNeural
- Korean: ko-KR-SunHiNeural
- And many more...

## File Management

- Audio files are temporarily stored in the `temp` directory
- Files are automatically cleaned up after 1 hour (default)
- Direct speaking option cleans up files after 5 seconds

## Requirements

- Python 3.x
- pip package manager
- edge-tts library (install via `pip3 install edge-tts`)