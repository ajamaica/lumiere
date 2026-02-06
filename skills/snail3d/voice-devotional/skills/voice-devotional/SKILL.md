# voice-devotional Skill

Generate scripture readings and lessons in the user's voice using ElevenLabs TTS.

## Overview

The **voice-devotional** skill creates audio devotionals, scripture readings, and spiritual lessons using professional text-to-speech. Perfect for daily spiritual practice, meditation, or sharing teachings.

## Features

1. **Daily Devotionals** — Scripture + reflection + prayer (3-5 min audio)
2. **Scripture Reading** — Extended passages read aloud with context
3. **Multi-Day Plans** — Reading plans in audio format (weekly/monthly)
4. **Voice Modes** — Devotional, teaching, meditation tones
5. **MP3 Output** — Ready to share or play locally
6. **Metadata** — Transcripts, references, duration tracking

## Installation

```bash
# Copy to skills directory
cp -r voice-devotional ~/clawd/skills/

# Install dependencies
cd ~/clawd/skills/voice-devotional
npm install

# Configure
cp .env.example .env
# Edit .env with your ELEVEN_LABS_API_KEY
```

## Configuration

### Environment Variables

```bash
ELEVEN_LABS_API_KEY=sk_your_api_key_here
ELEVEN_LABS_MODEL_ID=eleven_monolingual_v1  # or eleven_turbo_v2
OUTPUT_DIR=~/clawd/voice-devotional/output
```

### Voice Settings

See `config/voice-settings.json` for voice configurations:

- **Josh** (ID: pNInz6obpgDQGcFmaJgB) — Deep, calm devotional voice
- **Chris** (ID: iP95p4xoKVk53GoZ742B) — Teaching/explanatory tone
- **Bella** (ID: EXAVITQu4EsNXjlNFYcV) — Meditation/contemplative tone

## Usage

### Command Line

```bash
# Daily devotional on a theme
voice-devotional daily --theme peace --voice josh --format audio

# Read a specific scripture passage
voice-devotional scripture --passage "Romans 8:1-17" --voice josh

# Generate a multi-day reading plan
voice-devotional plan --topic hope --days 7 --voice josh

# Roman Road gospel presentation
voice-devotional roman-road --voice josh --format audio

# Generate with specific template
voice-devotional generate --template daily-devotional --topic faith --voice josh
```

### Programmatic Usage

```javascript
const VoiceDevotion = require('./scripts/voice-devotional')

const vd = new VoiceDevotion({
  apiKey: process.env.ELEVEN_LABS_API_KEY,
  outputDir: process.env.OUTPUT_DIR,
})

// Generate daily devotional
const result = await vd.generateDaily({
  theme: 'peace',
  voiceId: 'pNInz6obpgDQGcFmaJgB',
})

console.log(result.audioPath) // ~/clawd/voice-devotional/output/devotional-2024-01-15-peace.mp3
console.log(result.metadata) // { duration, transcript, references, ... }
```

## Lesson Types

### 1. Daily Devotional

- **Duration:** 3-5 minutes
- **Structure:** Scripture excerpt + reflection + prayer
- **Best for:** Morning/evening spiritual practice
- **Example:** Daily peace meditation with Psalm 4:8

### 2. Scripture Reading

- **Duration:** 5-10 minutes
- **Structure:** Full passage with introductory context
- **Best for:** In-depth study, meditation
- **Example:** Romans 8:1-17 with theological notes

### 3. Meditation

- **Duration:** 5-15 minutes
- **Structure:** Contemplative reading with strategic pauses
- **Pacing:** Slower, more deliberate
- **Best for:** Deep reflection, bedtime spiritual practice

### 4. Teaching

- **Duration:** 10-20 minutes
- **Structure:** Topic explanation + scripture support + application
- **Best for:** Learning, group study
- **Example:** "Hope in Crisis" with supporting scriptures

### 5. Roman Road

- **Duration:** 8-12 minutes
- **Structure:** Romans 3:23 → 6:23 → 10:9 presentation
- **Best for:** Gospel presentation, evangelism
- **Includes:** Invitation and call to commitment

## Output

All outputs saved to `~/clawd/voice-devotional/output/`:

```
devotional-2024-01-15-peace.mp3          # Audio file
devotional-2024-01-15-peace.json         # Metadata
│
├── audioPath: "..."
├── duration: 245                         # Seconds
├── transcript: "..."
├── references: ["Psalm 4:8", "John 14:27"]
├── theme: "peace"
├── voiceId: "pNInz6obpgDQGcFmaJgB"
├── generatedAt: "2024-01-15T08:30:00Z"
└── _links: { download, share, ... }
```

## ElevenLabs Integration

### API Configuration

- **Endpoint:** `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
- **Model:** `eleven_monolingual_v1` (or `eleven_turbo_v2` for faster processing)
- **Settings:**
  - `stability: 0.3` — Balanced variability for natural speech
  - `similarity_boost: 0.75` — Close voice resemblance
  - `style: 0.5` — Professional, clear delivery

### Voice Presets

```json
{
  "josh": {
    "voice_id": "pNInz6obpgDQGcFmaJgB",
    "tone": "devotional",
    "stability": 0.3,
    "similarity_boost": 0.75,
    "style": 0.5,
    "description": "Deep, calm, reverent — perfect for devotionals"
  },
  "chris": {
    "voice_id": "iP95p4xoKVk53GoZ742B",
    "tone": "teaching",
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0.5,
    "description": "Clear, engaging, authoritative — teaching/explanations"
  },
  "bella": {
    "voice_id": "EXAVITQu4EsNXjlNFYcV",
    "tone": "meditation",
    "stability": 0.2,
    "similarity_boost": 0.75,
    "style": 0.6,
    "description": "Soft, contemplative, soothing — meditation/sleep"
  }
}
```

## Scripture Data Integration

Integrates with **scripture-curated** skill data when available:

```javascript
// Auto-pull scripture references
const scripture = await scriptureData.lookup('Romans 8:1-17')
// Returns: { text, context, commentary, themes }
```

Falls back to built-in scripture library if external data unavailable.

## Examples

### Example 1: Morning Peace Devotional

```bash
voice-devotional daily --theme peace --voice josh
```

**Output Structure:**

1. **Opening** (10s) — "Good morning. Today's devotional: Peace"
2. **Scripture** (30s) — Psalm 4:8, John 14:27
3. **Reflection** (90s) — Meditation on peace amid chaos
4. **Prayer** (60s) — Guided closing prayer

### Example 2: Weekly Hope Study Plan

```bash
voice-devotional plan --topic hope --days 7 --voice josh
```

**Generates:** 7 individual MP3s + manifest.json

- Day 1: Hope Defined (Romans 15:13)
- Day 2: Hope Through Trials (1 Peter 1:3-7)
- Day 3: Hope and Faith (Hebrews 11:1)
- Day 4: Living Hope (1 Peter 1:3)
- Day 5: Hope's Anchor (Hebrews 6:19)
- Day 6: Sharing Hope (1 Peter 3:15)
- Day 7: Hope's Fulfillment (Revelation 21:4)

### Example 3: Extended Scripture Reading

```bash
voice-devotional scripture --passage "Romans 8:1-17" --voice josh
```

**Includes:**

- Context setting (Paul's letter to Romans, historical background)
- Full passage reading with natural pacing
- Key verse callouts
- Closing reflection

## Advanced Features

### Custom Templates

Create devotionals with custom structure:

```javascript
const template = {
  opening: 'Your opening message',
  scripture: ['John 3:16', 'Romans 5:8'],
  reflection: 'Your reflection text',
  prayer: 'Closing prayer',
  music: 'optional-fade-out',
}

const result = await vd.generateCustom(template, { voiceId })
```

### Batch Generation

Generate multiple devotionals:

```javascript
const themes = ['peace', 'hope', 'faith', 'love', 'strength']
const results = await vd.generateBatch(themes, {
  voiceId: 'josh',
  includeManifest: true,
})
```

### Background Music

Add optional ambient music under voice (low volume):

```javascript
const result = await vd.generateDaily({
  theme: 'peace',
  voiceId: 'josh',
  music: 'peaceful-piano', // ambient, peaceful-piano, nature-sounds
})
```

## Troubleshooting

### Issue: API rate limit exceeded

**Solution:**

- Add delay between requests: `--delay 2000`
- Batch process during off-peak hours
- Check ElevenLabs account limits

### Issue: Audio quality sounds robotic

**Solution:**

- Lower `stability` value (0.1-0.3 for more variance)
- Adjust `similarity_boost` (0.5-0.95 range)
- Try different voice: `--voice chris` or `--voice bella`

### Issue: Output file is too long

**Solution:**

- Use shorter scripture passages
- Reduce reflection length
- Remove optional sections like music/outro

## API Reference

See `README.md` for command-line reference.

For programmatic API, see JSDoc in:

- `scripts/voice-devotional.js` — Main class
- `scripts/lesson-generator.js` — Content generation
- `scripts/tts-generator.js` — ElevenLabs TTS

## File Structure

```
voice-devotional/
├── SKILL.md                          # This file
├── README.md                         # User guide
├── package.json
├── .env.example
├── scripts/
│   ├── voice-devotional.js          # Main orchestrator
│   ├── lesson-generator.js          # Content creation
│   ├── tts-generator.js             # ElevenLabs integration
│   └── cli.js                       # Command-line interface
├── config/
│   ├── devotional-templates.json    # Lesson templates
│   ├── voice-settings.json          # Voice configurations
│   ├── scripture-library.json       # Built-in scripture data
│   └── prayers-library.json         # Prayer templates
├── output/                          # Generated MP3s (gitignored)
└── tests/
    └── voice-devotional.test.js     # Unit tests
```

## Performance Notes

- **Generation time:** 30-120 seconds depending on audio length
- **File size:** ~500KB per minute of audio (MP3 128kbps)
- **API cost:** ~$0.30 per devotional (1000 chars)
- **Caching:** Automatically caches voice IDs and settings

## License

Part of Clawdbot ecosystem. See root LICENSE.

## Related Skills

- **scripture-curated** — Scripture data source
- **telegram-integration** — Send audio to Telegram
- **meditation-guide** — Meditation scheduling

---

**Version:** 1.0.0  
**Last Updated:** 2024-01-15  
**Status:** Active
