# Daily Devotional Auto Skill

Automated daily devotional generation for OpenClaw. Fetches news, generates contextual devotionals, creates videos with your voice, and uploads to YouTube automatically.

## Overview

**daily-devotional-auto** provides complete automation for devotional content:

- News-based context fetching (national/international)
- AI-powered devotional content generation
- Custom voice narration (ElevenLabs TTS)
- Video creation with visualizers
- Automatic YouTube upload and playlist management
- Comment monitoring for user topic suggestions
- Daily scheduling via cron

## Features

### 📰 News-Based Content

- Fetches current national and international news
- Generates devotionals contextually tied to real events
- Selects spiritually relevant stories
- Maintains appropriate tone for faith-based content

### 💬 User Suggestions

- Monitors YouTube comments for topic requests
- Keywords detected: "suggest", "topic", "pray for", "devotional about", "question about", "help with", "request"
- Prioritizes viewer suggestions in content generation
- Credits users in video descriptions when their suggestion is used

### 🎙️ Your Voice

- Uses your ElevenLabs custom voice for all narrations
- Pre-configured with your voice ID
- Professional-quality audio output
- Consistent voice across all videos

### 🎬 Auto Video Creation

- Generates video titles with devotional themes
- Creates audio visualizers (blue waveforms)
- Includes scripture references and date
- Adds viewer suggestion credits
- Optimized for YouTube playback

### 📤 Auto Upload

- Uploads to YouTube with proper metadata
- Sets videos as public
- Automatically adds to your devotional playlist
- Includes proper descriptions with scripture and context
- Schedules publishing time (optional)

### ⏰ Daily Scheduling

- Runs automatically at 9:00 AM MST (configurable)
- Uses system cron for reliability
- Logs all activity for debugging
- Error notifications via optional webhook

## Setup

### 1. Prerequisites

```bash
# Ensure youtube-studio is installed and configured
cd ~/clawd/skills/youtube-studio
npm install
# Run auth once for YouTube access
node scripts/auth-handler.js
```

### 2. Install Dependencies

```bash
cd ~/clawd/skills/daily-devotional-auto
npm install
```

### 3. Environment Configuration

```bash
cp .env.example .env
# Edit .env with your credentials:
```

**Required Variables:**

- `NEWS_API_KEY` - Get from https://newsapi.org (free tier available)
- `ELEVENLABS_API_KEY` - Get from https://elevenlabs.io
- `YOUTUBE_CHANNEL_ID` - Your YouTube channel ID (format: UCxxxxxxxxxx)
- `VOICE_ID` - Your ElevenLabs custom voice ID (provided during setup)

**Optional Variables:**

- `DEVOTIONAL_PLAYLIST_ID` - Specific playlist for devotionals (auto-creates if not set)
- `WEBHOOK_URL` - Slack/Discord webhook for error notifications
- `LOG_LEVEL` - debug, info, warn, error (default: info)

### 4. Set Up Cron Scheduling

```bash
# Edit crontab
crontab -e

# Add this line to run daily at 9:00 AM MST
0 9 * * * ~/clawd/skills/daily-devotional-auto/run-daily.sh

# Or using local time (replace TZ as needed)
TZ=America/Denver 0 9 * * * ~/clawd/skills/daily-devotional-auto/run-daily.sh
```

### 5. Verify Setup

```bash
# Test manually (generates one devotional)
npm start

# Check logs
tail -f ~/.openclaw-devotional/logs/devotional.log
```

## Commands

### Generate Devotional (Manual)

```bash
npm start
# Generates, creates video, and uploads one devotional
```

### Check Comments for Suggestions

```bash
node scripts/check-comments.js
# Scans recent comments for user topic suggestions
# Prioritizes suggestions for next run
```

### Generate Content Only (No Upload)

```bash
DRY_RUN=true npm start
# Creates files but doesn't upload to YouTube
```

### Debug Mode

```bash
DEBUG=* npm start
# Verbose logging for troubleshooting
```

## Video Output Format

Each generated video includes:

```
Title: Daily Devotional - [Theme] ([Date])
Duration: ~3-5 minutes
Content:
  - Title card with date
  - News hook / context
  - Devotional message
  - Scripture reference(s)
  - Viewer suggestion credit (if applicable)
  - Call to action
Audio: Your custom ElevenLabs voice
Visual: Blue waveform visualizer
```

Example filename: `devotional-2024-02-05.mp4`

## AI Generation Details

### Prompt Structure

1. **Context:** Current news/events
2. **Theme:** Faith-based perspective on news
3. **Scripture:** Relevant biblical passages
4. **Application:** Practical spiritual guidance
5. **Call to Action:** Encouragement for viewers

### Generation Options (in .env)

- `DEVOTIONAL_TONE` - serious, encouraging, reflective, instructional
- `DEVOTIONAL_LENGTH` - short (1-2 min), medium (3-4 min), long (5+ min)
- `TARGET_AUDIENCE` - general, families, young-adults, professionals

## YouTube Integration

### Playlist Management

- Auto-creates "Daily Devotionals" playlist if not found
- Adds each generated video to playlist
- Maintains chronological order
- Handles playlist quota limits

### Comment Monitoring

```javascript
// Check for suggestion keywords
const suggestionKeywords = [
  'suggest',
  'topic',
  'pray for',
  'devotional about',
  'question about',
  'help with',
  'request',
]
```

### Metadata

- Description includes:
  - News context
  - Scripture references
  - Viewer suggestions (if used)
  - Engagement prompt
  - Link to channel

## Error Handling

| Scenario               | Behavior                           |
| ---------------------- | ---------------------------------- |
| News API fails         | Uses fallback inspirational themes |
| Video generation fails | Skips but continues                |
| YouTube upload fails   | Logs error, retries next run       |
| Voice API fails        | Falls back to system TTS           |
| Cron error             | Error logged, manual run possible  |

## File Structure

```
daily-devotional-auto/
├── SKILL.md                               # This file
├── README.md                              # User guide
├── .env.example                           # Configuration template
├── package.json                           # Dependencies
├── LICENSE                                # MIT license
├── .gitignore                             # Exclude secrets
├── run-daily.sh                           # Cron script
├── scripts/
│   ├── daily-devotional.js                # Main automation
│   ├── check-comments.js                  # Comment scanner
│   └── devotional-generator.js            # Content generation
└── config/
    └── prompts.json                       # AI prompt templates
```

## Configuration Examples

### Short Morning Devotionals

```bash
DEVOTIONAL_LENGTH=short
DEVOTIONAL_TONE=encouraging
DEVOTIONAL_TIME=06:00  # 6 AM
```

### Longer Evening Reflections

```bash
DEVOTIONAL_LENGTH=long
DEVOTIONAL_TONE=reflective
DEVOTIONAL_TIME=18:00  # 6 PM
```

### News-Independent Inspiration

```bash
USE_NEWS_CONTEXT=false
# Uses preset inspirational themes instead
```

## Performance & Quota

### YouTube API Quota

- Video upload: ~1,600 units per video
- Comment retrieval: 1 unit
- Playlist operations: 1-3 units per operation
- **Daily allocation:** 1,000,000 units (sufficient for 600+ videos/day)

### Processing Time

- News fetch: ~2 seconds
- Content generation: ~10-30 seconds (depends on AI model)
- Video creation: ~30-60 seconds
- Upload: ~1-5 minutes (depends on file size and connection)
- **Total per video:** ~2-6 minutes

### Storage Requirements

- Per video: ~50-200 MB (temporary, deleted after upload)
- Logs: ~1 MB per week
- Config: <1 MB

## Troubleshooting

### "No news found"

```bash
# Check NEWS_API_KEY is valid
# Verify API subscription tier allows requests
# Check internet connection
# Enable DEBUG mode for details
```

### Video upload hangs

```bash
# Check YouTube quota: youtube-studio quota-status
# Verify YOUTUBE_CHANNEL_ID is correct
# Check network connectivity
# Try smaller video (reduce LENGTH setting)
```

### Comments not detected

```bash
# Verify YOUTUBE_CHANNEL_ID matches owner account
# Check channel comment settings allow comments
# Run: node scripts/check-comments.js --verbose
# Ensure channel has public videos with comments
```

### Cron not executing

```bash
# Test crontab: crontab -l
# Check system time: date
# Verify script permissions: chmod +x run-daily.sh
# Check cron logs: log stream --predicate 'eventMessage contains "cron"'
# Test manually: ~/clawd/skills/daily-devotional-auto/run-daily.sh
```

### Poor video quality

```bash
# Increase resolution in video-generator
# Check voice quality settings in .env
# Verify ffmpeg is installed: which ffmpeg
# Try different tone/length combinations
```

## API References

### News API (newsapi.org)

- Free tier: 100 requests/day
- Premium tier: unlimited
- Countries supported: 60+
- Languages: 30+

### ElevenLabs TTS

- Custom voices: requires voice cloning
- Standard voices: pre-built options
- Quality levels: high (24kHz), ultra (48kHz)

### YouTube Data API v3

- Quota: 1,000,000 units/day
- Rate limits: 1,000 QPS per project
- Video limits: <256 GB file size

## Advanced Usage

### Batch Generation (Weekly)

```bash
for i in {1..7}; do
  npm start
  sleep 300  # 5 minute delay between videos
done
```

### Custom Schedule

```bash
# Instead of 9 AM daily, run on specific days:
# Run Monday through Friday at 8 AM
0 8 * * 1-5 ~/clawd/skills/daily-devotional-auto/run-daily.sh
```

### Backup Before Upload

```bash
DRY_RUN=true npm start
# Review generated videos in output folder
# Manually verify quality
npm start  # Upload after verification
```

## Future Enhancements

- [ ] Multi-language support
- [ ] Multiple voice options
- [ ] Thumbnail AI generation
- [ ] Analytics integration
- [ ] Viewer engagement metrics
- [ ] Content calendar management
- [ ] Batch scheduling interface
- [ ] Cloud storage integration

## License

MIT - Use freely within OpenClaw ecosystem

## Support

For issues:

1. Check `.env` configuration is correct
2. Review logs in `~/.openclaw-devotional/logs/`
3. Test components individually (news API, TTS, etc.)
4. Run with DEBUG mode enabled for details
5. Check GitHub issues: https://github.com/Snail3D/daily-devotional-auto/issues
