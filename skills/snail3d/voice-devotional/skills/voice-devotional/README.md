# voice-devotional — Audio Scripture & Devotionals

Generate daily scripture readings, devotionals, and spiritual lessons in professional audio using ElevenLabs TTS.

## Quick Start

```bash
# Install
npm install

# Configure
cp .env.example .env
# Add your ELEVEN_LABS_API_KEY to .env

# Generate a daily devotional on peace
voice-devotional daily --theme peace

# Read a scripture passage aloud
voice-devotional scripture --passage "Romans 8:1-17"

# Create a 7-day hope study plan
voice-devotional plan --topic hope --days 7
```

That's it. Audio files appear in `./output/`.

## Commands

### `voice-devotional daily [OPTIONS]`

Generate a daily devotional (3-5 min) with scripture, reflection, and prayer.

**Options:**

```
--theme THEME           Theme for devotional (peace, hope, faith, love, strength, etc.)
--voice VOICE           Voice preset: josh (default), chris, bella
--format FORMAT         Output: audio (default), transcript, both
--date DATE             Date for devotional (default: today)
--output DIR            Output directory (default: ./output)
```

**Examples:**

```bash
voice-devotional daily --theme peace
voice-devotional daily --theme hope --voice bella --format both
voice-devotional daily --theme faith --date 2024-01-20
```

---

### `voice-devotional scripture [OPTIONS]`

Read a scripture passage with context and pacing.

**Options:**

```
--passage PASSAGE       Scripture reference (e.g., "Romans 8:1-17")
--version VERSION       Bible version (ESV, NIV, KJV, NASB; default: ESV)
--voice VOICE           Voice preset: josh (default), chris, bella
--format FORMAT         Output: audio (default), transcript, both
--include-notes         Include theological notes (default: true)
```

**Examples:**

```bash
voice-devotional scripture --passage "Psalm 23"
voice-devotional scripture --passage "John 3:16" --voice bella --version KJV
voice-devotional scripture --passage "1 Corinthians 13" --include-notes --format both
```

---

### `voice-devotional plan [OPTIONS]`

Create a multi-day reading plan in audio format.

**Options:**

```
--topic TOPIC           Plan topic (hope, faith, peace, love, strength, etc.)
--days DAYS             Number of days (default: 7)
--voice VOICE           Voice preset (josh, chris, bella)
--format FORMAT         Output: audio (default), transcript, both
--daily-length MIN      Minutes per day (default: 5)
```

**Examples:**

```bash
voice-devotional plan --topic hope --days 7
voice-devotional plan --topic faith --days 14 --voice chris
voice-devotional plan --topic peace --days 3 --daily-length 3 --format both
```

**Output:** Creates a folder with individual daily MP3s + `manifest.json`

---

### `voice-devotional roman-road [OPTIONS]`

Generate the Roman Road gospel presentation in audio.

**Options:**

```
--voice VOICE           Voice preset (josh, chris, bella)
--format FORMAT         Output: audio (default), transcript, both
--length LENGTH         Presentation length: short (8m), standard (12m), extended (15m)
```

**Examples:**

```bash
voice-devotional roman-road
voice-devotional roman-road --voice bella --length short
voice-devotional roman-road --format both --length extended
```

**Flow:**

1. All have sinned (Romans 3:23)
2. Wages of sin (Romans 6:23)
3. God's gift (Romans 6:23 cont.)
4. Believe and confess (Romans 10:9)
5. Invitation to commitment

---

### `voice-devotional generate [OPTIONS]`

Generate devotional with custom template.

**Options:**

```
--template TEMPLATE     Template type: daily-devotional, scripture-reading, meditation,
                        teaching, roman-road (required)
--topic TOPIC           Topic/theme for content
--passage PASSAGE       Scripture passage (if applicable)
--voice VOICE           Voice preset
--format FORMAT         Output format
--custom-text FILE      Load custom text from file
```

**Examples:**

```bash
voice-devotional generate --template teaching --topic "Fruit of the Spirit"
voice-devotional generate --template meditation --passage "Psalm 42" --voice bella
voice-devotional generate --template daily-devotional --custom-text my-reflection.txt
```

---

### `voice-devotional batch [OPTIONS]`

Generate multiple devotionals in batch.

**Options:**

```
--count NUM             Number of devotionals to generate
--themes FILE           JSON file with list of themes
--template TEMPLATE     Template to use for all
--delay MS              Delay between requests (default: 1000)
--parallel NUM          Parallel generation (default: 1)
```

**Examples:**

```bash
voice-devotional batch --count 7 --template daily-devotional
voice-devotional batch --themes themes.json --voice josh --delay 2000
```

---

## Output Structure

All outputs go to `./output/` with metadata:

```
devotional-2024-01-15-peace.mp3
devotional-2024-01-15-peace.json
```

**Metadata JSON:**

```json
{
  "id": "devotional-2024-01-15-peace",
  "type": "daily-devotional",
  "theme": "peace",
  "audioPath": "./output/devotional-2024-01-15-peace.mp3",
  "duration": 245,
  "durationFormatted": "4:05",
  "fileSize": 2457600,
  "transcript": "Good morning. Today's devotional focuses on peace...",
  "references": ["Psalm 4:8", "John 14:27", "Philippians 4:6-7"],
  "voiceId": "pNInz6obpgDQGcFmaJgB",
  "voicePreset": "josh",
  "generatedAt": "2024-01-15T08:30:00.000Z",
  "settings": {
    "model": "eleven_monolingual_v1",
    "stability": 0.3,
    "similarity_boost": 0.75,
    "style": 0.5
  }
}
```

## Voice Presets

### Josh (Default)

- **Tone:** Deep, calm, reverent
- **Best for:** Devotionals, meditations, personal reflection
- **Speed:** 1.0x (natural pace)

### Chris

- **Tone:** Clear, engaging, authoritative
- **Best for:** Teaching, explanations, group study
- **Speed:** 1.1x (slightly faster, more energetic)

### Bella

- **Tone:** Soft, contemplative, soothing
- **Best for:** Meditation, sleep, deep reflection
- **Speed:** 0.9x (slightly slower, calming)

## Configuration

Create `.env` in project root:

```bash
# ElevenLabs API (required)
ELEVEN_LABS_API_KEY=sk_your_key_here

# Optional
ELEVEN_LABS_MODEL_ID=eleven_monolingual_v1
OUTPUT_DIR=./output

# Bible version (for scripture lookups)
BIBLE_VERSION=ESV

# Logging
DEBUG=voice-devotional:*
```

## Installation & Setup

### 1. Clone/Copy Skill

```bash
cp -r voice-devotional ~/clawd/skills/
cd ~/clawd/skills/voice-devotional
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Get ElevenLabs API Key

1. Go to https://elevenlabs.io
2. Sign up (free tier available)
3. Navigate to API Keys
4. Copy your API key

### 4. Configure

```bash
cp .env.example .env
# Edit .env with your API key
```

### 5. Test It

```bash
npm test
# or
voice-devotional daily --theme peace
```

## Examples

### Example 1: Start Your Day with a Devotional

```bash
# Every morning at 7 AM, generate a peace devotional
voice-devotional daily --theme peace --voice josh

# Then send to Telegram via another integration
telegram send --file output/devotional-*.mp3 --chat spiritual-practice
```

### Example 2: Scripture Study Plan

```bash
# Create a 7-day hope study plan
voice-devotional plan --topic hope --days 7 --voice chris --format both

# Output:
# hope-day-1.mp3 (+ hope-day-1.json)
# hope-day-2.mp3
# ...
# hope-day-7.mp3
# manifest.json  # List of all files
```

### Example 3: Custom Devotional

Create `my-reflection.txt`:

```
Today I want to reflect on John 15:5 and what it means to abide in Christ.
The passage speaks of remaining in Him as the branch remains in the vine.
Without connection to Jesus, we can do nothing. But in Him, we can do all things.
As I face today's challenges, I choose to remain connected to the source of life.
Let me close with a prayer: Lord Jesus, help me to remain in You today...
```

Then:

```bash
voice-devotional generate \
  --template daily-devotional \
  --custom-text my-reflection.txt \
  --voice bella \
  --format both
```

### Example 4: Roman Road Gospel Presentation

```bash
# Generate gospel presentation for sharing
voice-devotional roman-road --voice chris --length standard --format both

# Output: roman-road.mp3 + roman-road.json
# Share via: email, text, WhatsApp, etc.
```

## Troubleshooting

### "API key not found"

```bash
# Check .env exists and has ELEVEN_LABS_API_KEY
cat .env | grep ELEVEN_LABS_API_KEY
```

### "Rate limit exceeded"

```bash
# Add delay between requests
voice-devotional batch --count 10 --delay 5000
```

### "Audio sounds robotic or unnatural"

Try different voice:

```bash
voice-devotional daily --theme peace --voice bella
```

Or adjust voice settings by editing `config/voice-settings.json`:

```json
{
  "stability": 0.2, // Lower = more variance
  "similarity_boost": 0.9 // Higher = closer to original voice
}
```

### "Output directory doesn't exist"

Create it:

```bash
mkdir -p output
```

Or specify custom:

```bash
voice-devotional daily --theme peace --output ~/my-devotionals
```

## Scripture Data

The skill includes a built-in scripture library and can integrate with the **scripture-curated** skill for extended verse data.

**Supported references:**

- Books: Genesis through Revelation
- Ranges: "John 3:16-18", "Romans 8:1-39"
- Multiple: ["Romans 3:23", "Romans 6:23", "Romans 10:9"]
- Versions: ESV, NIV, KJV, NASB, NRSV, CSB

## Development

### File Structure

```
voice-devotional/
├── scripts/
│   ├── voice-devotional.js          # Main class/API
│   ├── lesson-generator.js          # Content generation logic
│   ├── tts-generator.js             # ElevenLabs API wrapper
│   ├── cli.js                       # Command-line interface
│   └── utils.js                     # Helpers
├── config/
│   ├── devotional-templates.json    # Content templates
│   ├── voice-settings.json          # Voice configurations
│   ├── scripture-library.json       # Built-in verses
│   └── prayers-library.json         # Prayer content
├── tests/
│   └── voice-devotional.test.js
├── output/                          # Generated files (gitignored)
├── package.json
├── README.md
├── SKILL.md
└── .env.example
```

### Running Tests

```bash
npm test
```

### Adding New Voices

Edit `config/voice-settings.json`:

```json
{
  "your-voice-name": {
    "voice_id": "elevenlabs_voice_id",
    "tone": "description",
    "stability": 0.3,
    "similarity_boost": 0.75,
    "style": 0.5,
    "description": "Why to use this voice"
  }
}
```

Then use:

```bash
voice-devotional daily --theme peace --voice your-voice-name
```

## Performance

- **Generation time:** 30-120 seconds (depending on length)
- **File size:** ~500KB per minute of audio
- **API cost:** ~$0.30 per devotional
- **Storage:** Minimal (auto-cleanup of old files possible)

## Related Skills

- **scripture-curated** — Extended scripture data
- **telegram-integration** — Send audio to chats
- **meditation-guide** — Schedule and track devotionals

## Support

For issues or feature requests, check the main Clawdbot repository.

---

**Version:** 1.0.0  
**Status:** Stable  
**Last Updated:** 2024-01-15
