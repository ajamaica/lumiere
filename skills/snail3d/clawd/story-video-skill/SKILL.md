---
name: story-video
description: Convert narrated stories (audio + text) into YouTube Shorts videos (9:16 portrait) with synced subtitles, dynamic background images matched to story content, and professional subtitle effects.
---

# Story-to-Video Skill

Convert bedtime stories, narrations, or any spoken content into engaging YouTube Shorts videos with:

- **Synced subtitles** - Words highlighted in real-time as spoken
- **Dynamic backgrounds** - Images searched and selected based on story content/section
- **YouTube Shorts format** - 9:16 portrait video optimized for mobile
- **Professional styling** - Centered, animated subtitle effects

## Quick Start

### Input Requirements

1. **Audio file** - MP3/WAV with narration (e.g., from ElevenLabs TTS)
2. **Full text transcript** - Complete story/narration text
3. **Story sections (optional)** - If available, define sections for targeted background images

### Basic Workflow

```bash
# 1. Transcribe audio to get word timing (automatic)
story-video transcribe --audio story.mp3 --output story.json

# 2. Generate video with auto-searched backgrounds
story-video generate \
  --audio story.mp3 \
  --text "Once upon a time..." \
  --title "Bedtime Story" \
  --output story.mp4
```

Output: `story.mp4` (9:16 portrait, YouTube Shorts ready)

### Advanced: Custom Sections & Backgrounds

```bash
# Create a config with sections and suggested image searches
story-video generate \
  --audio story.mp3 \
  --text full_text.txt \
  --config story-config.json \
  --output story.mp4
```

**story-config.json:**

```json
{
  "title": "The Snail Designer",
  "sections": [
    {
      "start_time": 0,
      "end_time": 15,
      "text": "Once upon a time, in the beautiful city of El Paso...",
      "search_query": "El Paso desert sunset"
    },
    {
      "start_time": 15,
      "end_time": 35,
      "text": "...a gentle snail named Snail was a designer.",
      "search_query": "3D design workshop creative tools"
    }
  ]
}
```

## How It Works

### 1. **Audio Transcription + Timing**

- Uses Groq Whisper (or local speech-to-text) to get word-level timing
- Outputs JSON with `{word, start_ms, end_ms}` for each word
- Enables precise subtitle sync

### 2. **Section Detection**

- Divides audio into chunks (10-30s sections)
- Generates targeted image search queries from text content
- Searches Unsplash/Pexels for relevant high-quality images

### 3. **Video Composition**

- Creates 9:16 canvas (1080x1920 pixels)
- Layers background image (center-cropped, subtle zoom)
- Renders subtitles centered, synchronized to audio
- Applies subtitle effects:
  - **Fade in/out** as words appear/disappear
  - **Color highlight** - Current word in bright color, context in white
  - **Scale animation** - Current word slightly larger
  - **Drop shadow** - Professional readability on any background

### 4. **Video Export**

- Combines audio + video layers
- H.264 codec, optimized bitrate for YouTube
- Metadata tags for YouTube Shorts (aspect ratio, duration)

## Configuration Options

### Subtitle Styling

```json
{
  "subtitles": {
    "font": "Inter",
    "size": 48,
    "color_current": "#FFD700",
    "color_context": "#FFFFFF",
    "shadow": true,
    "shadow_blur": 8,
    "shadow_color": "#000000",
    "shadow_offset_y": 3,
    "animation_type": "fade_scale",
    "animation_duration_ms": 200
  }
}
```

### Background Options

```json
{
  "background": {
    "source": "unsplash",
    "fallback_color": "#1a1a1a",
    "zoom_effect": "subtle",
    "zoom_speed": 0.3,
    "fade_between_sections": true,
    "fade_duration_ms": 500
  }
}
```

## Commands

### `story-video transcribe`

Generate word-level timing from audio.

```bash
story-video transcribe --audio input.mp3 --output timing.json
```

**Options:**

- `--audio` (required) - Audio file path
- `--output` (required) - JSON output with timings
- `--engine` (optional) - groq, google, or local (default: groq)

**Output format:**

```json
{
  "duration_ms": 45000,
  "words": [
    {"word": "Once", "start_ms": 0, "end_ms": 250},
    {"word": "upon", "start_ms": 250, "end_ms": 450},
    ...
  ]
}
```

### `story-video generate`

Create video from audio + text.

```bash
story-video generate \
  --audio input.mp3 \
  --text "Story text..." \
  --output output.mp4
```

**Options:**

- `--audio` (required) - MP3/WAV file
- `--text` (required) - Full transcript text
- `--output` (required) - MP4 output path
- `--config` (optional) - JSON config file (sections, styling, etc.)
- `--title` (optional) - Video title (for metadata)
- `--subtitle-style` (optional) - Preset: minimal, bold, elegant (default: bold)
- `--background-source` (optional) - unsplash, pexels, local_dir (default: unsplash)

### `story-video style-preset`

List available subtitle style presets.

```bash
story-video style-preset list
story-video style-preset preview bold
```

Presets:

- **minimal** - Small, centered, subtle animation
- **bold** - Large, bright highlight, dynamic animation
- **elegant** - Serif font, refined colors, smooth fade
- **neon** - Bright colors, glow effect, fast animation

## Image Search Strategy

The skill auto-generates search queries based on story content:

1. **Noun extraction** - Identifies key nouns (snail, designer, El Paso, daughters)
2. **Context keywords** - Adds context (sunset, desert, workshop, family)
3. **Search execution** - Finds relevant images from Unsplash
4. **Quality filter** - Prefers high-res, professional photos
5. **Caching** - Saves images locally to avoid repeated searches

Example:

```
Text: "snail named Snail who was a three-dimensional designer"
→ Search: "3D design workshop creative snail"
→ Results: [image1, image2, image3]
→ Select: Best match for this section
```

## Requirements

### System Dependencies

- `ffmpeg` - Video composition (brew install ffmpeg)
- `python3` - Image processing (PIL/Pillow)

### API Keys

- **Groq API** - Audio transcription (set GROQ_API_KEY)
- **Unsplash API** (optional) - Image search (set UNSPLASH_API_KEY for more requests)
- **ElevenLabs API** (optional) - If generating TTS from text first

### Python Libraries

```
ffmpeg-python
pydub
pillow
requests
```

## Workflow Examples

### Example 1: Bedtime Story from TTS

```bash
# 1. Generate audio (your voice) via ElevenLabs
tts "Once upon a time..." --voice hjX6Urz6dBwVkFdr87DB --output story.mp3

# 2. Convert to video
story-video generate \
  --audio story.mp3 \
  --text "Once upon a time..." \
  --subtitle-style bold \
  --background-source unsplash \
  --output story-video.mp4

# 3. Upload to YouTube Shorts
# (9:16 format is ready!)
```

### Example 2: Existing Audio with Custom Sections

```bash
# Create config with specific sections and background queries
cat > config.json << EOF
{
  "title": "The Snail",
  "sections": [
    {
      "start_time": 0,
      "end_time": 20,
      "search_query": "El Paso desert landscape"
    },
    {
      "start_time": 20,
      "end_time": 45,
      "search_query": "3D design studio workspace"
    }
  ]
}
EOF

# Generate video with custom sections
story-video generate \
  --audio narration.mp3 \
  --text transcript.txt \
  --config config.json \
  --output output.mp4
```

### Example 3: Multiple Stories as Shorts Series

```bash
# Generate videos for each story
for story in stories/*.txt; do
  audio="${story%.txt}.mp3"
  output="videos/$(basename $story .txt).mp4"

  story-video generate \
    --audio "$audio" \
    --text "$story" \
    --subtitle-style elegant \
    --output "$output"
done

# All ready for YouTube Shorts series
ls -lh videos/*.mp4
```

## Troubleshooting

### Video is too fast/slow

Adjust audio speed before generating (use `ffmpeg -filter:a "atempo=0.9"` to slow down).

### Background images not matching content

Customize search queries in config.json `sections[].search_query` field.

### Subtitle readability on bright backgrounds

Switch to `--subtitle-style elegant` (adds stronger shadow) or use the `shadow` config option.

### ffmpeg not found

Install: `brew install ffmpeg`

### API rate limits

- Groq: Free tier has rate limits; use local Whisper if needed
- Unsplash: Free tier is 50 requests/hour; cache images locally

## Bundled Resources

- **scripts/generate_video.py** - Main video composition logic
- **scripts/transcribe_audio.py** - Word-level timing extraction
- **scripts/search_images.py** - Unsplash/Pexels image search
- **scripts/subtitle_renderer.py** - Animated subtitle rendering
- **references/ffmpeg_settings.md** - FFmpeg optimization for YouTube Shorts
- **references/subtitle_effects.md** - Available animation effects and customization
- **assets/fonts/** - Default fonts (Inter, Serif fallback)
