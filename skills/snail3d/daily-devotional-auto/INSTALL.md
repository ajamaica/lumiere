# Daily Devotional Auto - Installation Guide

Complete setup guide for automated daily devotional generation with OpenClaw.

## Prerequisites

- Node.js ≥ 14.0.0
- YouTube channel (with ability to upload videos)
- System cron or task scheduler
- Internet connection for API access

## Step 1: Install YouTube Studio Skill First

The daily-devotional-auto skill depends on youtube-studio for YouTube uploads. Install and authenticate it first:

```bash
cd ~/clawd/skills/youtube-studio
npm install

# Authenticate with YouTube (one-time)
node scripts/youtube-studio.js auth
# Browser will open - log in with your YouTube account
```

This creates the credentials needed for automated uploads.

## Step 2: Install Daily Devotional Auto

```bash
cd ~/clawd/skills/daily-devotional-auto
npm install
```

## Step 3: Get API Credentials

You need three API keys:

### A. News API Key (Free)

1. Go to https://newsapi.org
2. Sign up for free account
3. Copy your API key
4. Free tier: 100 requests/day (perfect for 1 daily video)

### B. ElevenLabs Voice API Key

1. Go to https://elevenlabs.io
2. Create account and log in
3. Go to **API Keys** section
4. Copy your API key
5. Your custom voice ID will be provided during setup

### C. YouTube Channel ID

1. Go to https://www.youtube.com/account/advanced_account_settings
2. Find "Channel ID" section
3. Copy your channel ID (format: `UCxxxxxxxxxx`)

## Step 4: Environment Configuration

```bash
# Copy the template
cp .env.example .env

# Edit with your credentials
nano .env
```

**Fill in these required fields:**

```bash
# News API credentials
NEWS_API_KEY=your_newsapi_key_here
NEWS_COUNTRY=us          # 2-letter country code
NEWS_LANGUAGE=en         # Language code

# ElevenLabs voice settings
ELEVENLABS_API_KEY=your_elevenlabs_key_here
VOICE_ID=your_voice_id_here   # Your custom voice ID
VOICE_STABILITY=0.75     # 0-1, higher = more consistent

# YouTube settings
YOUTUBE_CHANNEL_ID=UCxxxxxxxxxx
YOUTUBE_CHANNEL_NAME=YourChannelName

# Video generation settings
DEVOTIONAL_TONE=encouraging              # serious, encouraging, reflective
DEVOTIONAL_LENGTH=medium                 # short, medium, long
DEVOTIONAL_LANGUAGE=english              # english, spanish, french, etc.

# Logging
LOG_LEVEL=info                           # debug, info, warn, error
LOG_DIR=~/.openclaw-devotional/logs

# Optional: Error notifications
WEBHOOK_URL=                             # Slack/Discord webhook (optional)
WEBHOOK_ON_ERROR=true                    # Notify on failures
```

## Step 5: Test Setup

Run a test to verify all credentials work:

```bash
# Generate one devotional (don't upload yet)
DRY_RUN=true npm start

# Check the generated video
ls -lh output/devotional-*.mp4
```

Once that works, test an actual upload:

```bash
# Generate AND upload to YouTube
npm start

# Check your YouTube channel - video should appear
```

## Step 6: Set Up Daily Scheduling

### Option A: macOS/Linux Cron

Edit your crontab:

```bash
crontab -e
```

Add this line to run every day at 9:00 AM:

```bash
0 9 * * * ~/clawd/skills/daily-devotional-auto/run-daily.sh >> ~/.openclaw-devotional/logs/cron.log 2>&1
```

If you want to specify timezone (e.g., Mountain Time):

```bash
TZ=America/Denver 0 9 * * * ~/clawd/skills/daily-devotional-auto/run-daily.sh >> ~/.openclaw-devotional/logs/cron.log 2>&1
```

### Option B: Different Schedule

**Every weekday at 8:00 AM (skip weekends):**

```bash
0 8 * * 1-5 ~/clawd/skills/daily-devotional-auto/run-daily.sh >> ~/.openclaw-devotional/logs/cron.log 2>&1
```

**Twice daily (9 AM and 6 PM):**

```bash
0 9,18 * * * ~/clawd/skills/daily-devotional-auto/run-daily.sh >> ~/.openclaw-devotional/logs/cron.log 2>&1
```

**Every 12 hours:**

```bash
0 */12 * * * ~/clawd/skills/daily-devotional-auto/run-daily.sh >> ~/.openclaw-devotional/logs/cron.log 2>&1
```

### Verify Cron is Running

```bash
# List your cron jobs
crontab -l

# Check if cron service is active
sudo service cron status    # Linux
sudo launchctl list | grep cron  # macOS

# Check logs (on macOS)
log stream --predicate 'eventMessage contains "cron"'
```

## Step 7: Verify Installation

```bash
# Check everything is installed
npm list

# Test the main script
node scripts/daily-devotional.js --help

# Check logs directory exists
ls -la ~/.openclaw-devotional/logs/

# Verify your custom voice works
node scripts/test-voice.js
```

## Troubleshooting Installation

### "Cannot find module 'axios'"

```bash
npm install
# Ensure you're in the daily-devotional-auto directory
cd ~/clawd/skills/daily-devotional-auto
npm install
```

### "ENOENT: no such file or directory"

```bash
# Create logs directory manually
mkdir -p ~/.openclaw-devotional/logs

# Ensure scripts are executable
chmod +x ~/clawd/skills/daily-devotional-auto/run-daily.sh
chmod +x ~/clawd/skills/daily-devotional-auto/scripts/*.js
```

### "Invalid API key"

```bash
# Verify your .env file
cat .env | grep API_KEY

# Test NEWS API
curl "https://newsapi.org/v2/top-headlines?country=us&apiKey=YOUR_KEY"

# Test ElevenLabs
curl https://api.elevenlabs.io/v1/voices -H "xi-api-key: YOUR_KEY"
```

### Cron not running

```bash
# Make script executable
chmod +x run-daily.sh

# Test cron script directly
~/clawd/skills/daily-devotional-auto/run-daily.sh

# Check cron logs
tail -f ~/.openclaw-devotional/logs/cron.log
```

### YouTube upload fails

```bash
# Verify YouTube authentication
cd ~/clawd/skills/youtube-studio
node scripts/youtube-studio.js stats

# Check channel ID
echo $YOUTUBE_CHANNEL_ID

# Verify quota
node scripts/youtube-studio.js quota-status
```

## Post-Installation

### 1. Monitor First Run

```bash
# Check logs in real-time
tail -f ~/.openclaw-devotional/logs/devotional.log

# Or if cron runs it:
tail -f ~/.openclaw-devotional/logs/cron.log
```

### 2. Adjust Settings

Edit `.env` to customize:

- Video tone (serious, encouraging, reflective)
- Video length (short 1-2 min, medium 3-4 min, long 5+ min)
- News sources or topics
- Upload time

### 3. Set Up Monitoring (Optional)

Add Slack/Discord webhook for error notifications:

```bash
# In .env
WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
WEBHOOK_ON_ERROR=true
```

### 4. Create Playlist (Optional)

First run creates "Daily Devotionals" playlist automatically, or specify:

```bash
# In .env
DEVOTIONAL_PLAYLIST_ID=PLxxxxxxxxxx
```

## File Structure After Install

```
~/.openclaw-devotional/
├── logs/
│   ├── devotional.log      # Main application logs
│   └── cron.log            # Cron execution logs
└── cache/
    └── news-cache.json     # Cached news for offline fallback

~/clawd/skills/daily-devotional-auto/
├── scripts/
│   ├── daily-devotional.js
│   ├── check-comments.js
│   └── devotional-generator.js
├── .env                    # Your credentials (don't commit!)
├── run-daily.sh            # Cron script
└── package.json
```

## Next Steps

1. ✅ Test manual run: `npm start`
2. ✅ Verify YouTube upload worked
3. ✅ Set up cron scheduling
4. ✅ Monitor logs: `tail -f ~/.openclaw-devotional/logs/devotional.log`
5. 📊 Check your YouTube channel for new videos tomorrow morning!

## Getting Help

**Common Issues:**

- See [Troubleshooting](SKILL.md#troubleshooting)
- Check logs: `~/.openclaw-devotional/logs/`
- Test manually: `npm start -- --verbose`

**Documentation:**

- **README.md** - User guide and features
- **SKILL.md** - Technical reference and API details

Enjoy your automated devotional workflow! 🙏📹
