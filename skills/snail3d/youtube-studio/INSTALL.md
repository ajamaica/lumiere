# YouTube Studio - Installation Guide

Complete step-by-step setup for the YouTube Studio Clawdbot skill.

## Prerequisites

- Node.js 14+ (`node --version`)
- npm 6+ (`npm --version`)
- A Google account with a YouTube channel
- Basic command-line comfort

## Installation Steps

### 1. Install the Skill

```bash
# Clone or copy skill to Clawdbot skills directory
cp -r youtube-studio ~/clawd/skills/

# Navigate to skill directory
cd ~/clawd/skills/youtube-studio

# Install dependencies
npm install
```

### 2. Set Up Google Cloud Credentials

#### Step 2a: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Click "NEW PROJECT"
4. Enter project name: "YouTube Studio" → Click CREATE
5. Wait for project to be created (top right notification)

#### Step 2b: Enable YouTube Data API v3

1. In left sidebar, go to **APIs & Services** → **Library**
2. Search for "YouTube Data API v3"
3. Click the result → Click **ENABLE**
4. Wait for confirmation (may take a minute)

#### Step 2c: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials** (left sidebar)
2. Click **+ CREATE CREDENTIALS** (top blue button)
3. Choose **OAuth client ID**
4. If prompted to create consent screen:
   - Click **CONFIGURE CONSENT SCREEN**
   - Choose **External**
   - Fill in:
     - App name: "YouTube Studio"
     - User support email: your email
     - Developer contact: your email
   - Click **SAVE AND CONTINUE**
   - On scopes page: Click **ADD OR REMOVE SCOPES**
   - Search for "YouTube Data API v3"
   - Select it → **UPDATE**
   - Click **SAVE AND CONTINUE** (twice)
5. Back at Credentials, click **+ CREATE CREDENTIALS** again
6. Choose **OAuth client ID**
7. Application type: **Desktop application**
8. Name: "youtube-studio-cli"
9. Click **CREATE**
10. Click **DOWNLOAD** (JSON file) → Save to desktop

#### Step 2d: Set Up Credentials File

```bash
# Create config directory
mkdir -p ~/.clawd-youtube

# Copy credentials file
cp ~/Desktop/client_secret_*.json ~/.clawd-youtube/credentials.json

# Verify it exists
ls -la ~/.clawd-youtube/credentials.json
```

#### Step 2e: Create API Key (Alternative for Public Requests)

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **API Key**
3. Copy the API key
4. Store safely (you'll add to config later)

### 3. Create Configuration File

```bash
# Copy environment template
cp .env.example ~/.clawd-youtube/config.env

# Edit with your information
nano ~/.clawd-youtube/config.env
```

**Fill in these fields:**

```bash
# From credentials.json file:
YOUTUBE_CLIENT_ID=your_client_id_from_credentials.json
YOUTUBE_CLIENT_SECRET=your_client_secret_from_credentials.json
YOUTUBE_API_KEY=your_api_key

# Find your channel ID:
# 1. Go to https://youtube.com/@YOUR_CHANNEL/about
# 2. Look for "Channel ID" in the details
# 3. Copy the UCxxxxxxxx... value
YOUTUBE_CHANNEL_ID=UCxxxxxxxxxxxxxxxx

# Your display info:
YOUTUBE_CHANNEL_NAME=Your Channel Name
YOUTUBE_CHANNEL_EMAIL=your.email@gmail.com

# AI settings (optional, for suggestions)
AI_API_KEY=your_openrouter_key
AI_MODEL=openrouter/anthropic/claude-haiku-4.5

# Set your channel's primary niche
CHANNEL_NICHE=devotional
```

**Save file:** Press Ctrl+O → Enter → Ctrl+X

### 4. Authenticate with YouTube

```bash
# Run authentication
youtube-studio auth

# This will:
# 1. Open your browser
# 2. Ask you to sign in with Google
# 3. Grant permissions to YouTube Studio
# 4. Save tokens automatically
```

**Browser doesn't open?** Manually visit the URL shown in terminal.

### 5. Test Installation

```bash
# Check channel stats
youtube-studio stats

# Expected output:
# 📊 Channel Statistics
# 📈 Overall Metrics:
#   Total Views: X,XXX
#   Subscribers: XXX
#   Watch Time (hours): XXX
#   Video Count: XX
```

If this works, you're ready to go! 🎉

## Troubleshooting

### "credentials.json not found"

```bash
# Verify file location
ls -la ~/.clawd-youtube/

# Should show:
# credentials.json  (from Google)
# config.env        (created by you)
# tokens.json       (created after auth)
```

**Solution:** Re-download credentials from Google Cloud Console → Credentials → OAuth client IDs → Download JSON

### "Invalid grant" during auth

```bash
# Delete tokens and retry
rm ~/.clawd-youtube/tokens.json

# Run auth again
youtube-studio auth
```

**Verify:**

- You're logged in with the correct Google account
- Account owns the YouTube channel
- Credentials file hasn't expired

### "Channel not found"

```bash
# Verify channel ID
# Visit: https://youtube.com/@YOUR_CHANNEL/about
# Copy the "Channel ID" (format: UCxxxxxxxxx)

# Update config
nano ~/.clawd-youtube/config.env
# Change YOUTUBE_CHANNEL_ID=UCxxxxxxxxx
```

### "Permission denied"

```bash
# Re-authorize with broader scopes
rm ~/.clawd-youtube/tokens.json

# Delete consent and re-auth
youtube-studio auth
# Click "advanced" and grant all permissions
```

### "Quota exceeded"

```bash
# Check quota usage
youtube-studio quota-status

# Quota resets at midnight UTC
# Wait or increase quota in Google Cloud Console
```

### npm dependencies fail

```bash
# Try clearing npm cache
npm cache clean --force

# Reinstall
rm -rf node_modules package-lock.json
npm install
```

## Post-Installation Setup

### 1. Create Video Descriptions Template

Create `~/.clawd-youtube/my-templates.json`:

```json
{
  "my_devotional": {
    "title": "Daily Devotional - {topic}",
    "description": "Join me for today's devotional...",
    "tags": ["devotional", "faith"]
  }
}
```

### 2. Configure Channel Niche (Optional)

Edit `~/.clawd-youtube/config.env`:

```bash
# Options: devotional, fitness, educational, cooking, vlog, gaming
CHANNEL_NICHE=devotional
```

### 3. Set Up Automation (Optional)

Create a scheduled task (cron):

```bash
# Edit crontab
crontab -e

# Add (example: daily stats at 9 AM):
0 9 * * * cd ~/clawd/skills/youtube-studio && youtube-studio stats >> ~/.clawd-youtube/logs/daily-check.log 2>&1
```

## Next Steps

After successful installation:

1. ✅ **Upload your first video:**

   ```bash
   youtube-studio upload --file my-video.mp4 --title "My First Video"
   ```

2. ✅ **Check comments:**

   ```bash
   youtube-studio comments
   ```

3. ✅ **Generate ideas:**

   ```bash
   youtube-studio ideas --trending
   ```

4. ✅ **Monitor quota:**
   ```bash
   youtube-studio quota-status
   ```

## Verification Checklist

- [ ] Node.js installed (`node -v` shows 14+)
- [ ] npm installed (`npm -v` shows 6+)
- [ ] Skill copied to `~/clawd/skills/youtube-studio/`
- [ ] Dependencies installed (`npm install` completed)
- [ ] Google Cloud Project created
- [ ] YouTube Data API v3 enabled
- [ ] OAuth credentials downloaded and saved
- [ ] Config file created at `~/.clawd-youtube/config.env`
- [ ] Authentication successful (`youtube-studio auth`)
- [ ] Stats working (`youtube-studio stats` shows data)

## Getting Help

If something isn't working:

1. Check logs: `tail -f ~/.clawd-youtube/logs/youtube-studio-*.log`
2. Enable debug mode: `LOG_LEVEL=debug youtube-studio stats`
3. Verify credentials: `cat ~/.clawd-youtube/credentials.json`
4. Test auth: `youtube-studio auth`

## Security Notes

**Keep these safe:**

- `~/.clawd-youtube/credentials.json` (OAuth credentials)
- `~/.clawd-youtube/tokens.json` (Auth tokens)
- `~/.clawd-youtube/config.env` (API keys)

**Never commit these to Git!** Add to `.gitignore`:

```bash
echo "~/.clawd-youtube/" >> ~/.gitignore
```

## Uninstallation

If you need to remove the skill:

```bash
# Delete skill directory
rm -rf ~/clawd/skills/youtube-studio/

# Delete config and credentials (CAREFUL!)
rm -rf ~/.clawd-youtube/

# Delete npm global link (if installed globally)
npm unlink -g youtube-studio
```

## Support & Updates

- 📖 Full documentation: See `SKILL.md`
- 👤 User guide: See `README.md`
- 🐛 Issues: Check logs in `~/.clawd-youtube/logs/`

---

Enjoy managing your YouTube channel! 🎬
