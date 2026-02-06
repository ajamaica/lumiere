# YouTube Studio - User Guide

Quick start for YouTube channel management with Clawdbot.

## 5-Minute Setup

### Step 1: Get Your YouTube Credentials

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Search "YouTube Data API v3" → Enable
3. Credentials → OAuth 2.0 → Desktop → Download JSON as `credentials.json`
4. Also create an API Key (Credentials → API Key)

### Step 2: Initialize

```bash
cd ~/clawd
youtube-studio auth
# Browser opens → Log in with your YouTube account → Done!
```

### Step 3: Test

```bash
youtube-studio stats
# Shows your channel's current stats
```

## Daily Use

### Check Your Channel's Performance

```bash
youtube-studio stats
```

Shows:

- Total views & subscribers
- Watch hours
- Recent video performance
- Growth trends

### Upload a Video

```bash
youtube-studio upload \
  --file my-video.mp4 \
  --title "My Video Title" \
  --description "Description here"
```

**Want to schedule it?**

```bash
youtube-studio upload \
  --file my-video.mp4 \
  --title "Tomorrow's Video" \
  --schedule "2024-01-15T10:00:00Z" \
  --privacy unlisted
```

### Manage Comments

**See recent comments:**

```bash
youtube-studio comments
```

**Reply with AI suggestions:**

```bash
youtube-studio comments --suggest
# Shows 3 AI-powered reply ideas for each comment
```

**Reply to specific comment:**

```bash
youtube-studio reply \
  --comment-id Qmxxxxxxx \
  --text "Thanks for watching!"
```

**Use a template:**

```bash
youtube-studio reply \
  --comment-id Qmxxxxxxx \
  --template grateful
# Uses preset thank-you template
```

### Generate Video Ideas

```bash
youtube-studio ideas
# 5 video ideas based on your channel niche
```

**Get trending ideas:**

```bash
youtube-studio ideas --trending --count 10
```

**Get ideas for specific niche:**

```bash
youtube-studio ideas --niche "devotional" --count 5
```

## Common Tasks

### Export Your Channel Stats

```bash
youtube-studio stats --json > stats.json
# JSON output for analytics tools
```

### Get Ideas for This Week

```bash
youtube-studio ideas --trending --count 7
# Use these as your upload queue
```

### Bulk Reply to Comments

```bash
youtube-studio comments --unread | \
  xargs -I {} youtube-studio reply --comment-id {} --template grateful
```

### Check API Quota

```bash
youtube-studio quota-status
# How many API calls left today?
```

## Troubleshooting

**"Can't find credentials"**

```bash
youtube-studio auth
# Run auth again to set up credentials
```

**"Unauthorized"**

- Make sure you logged in with the account that owns the channel
- Delete `~/.clawd-youtube/tokens.json` and try `youtube-studio auth` again

**"Quota exceeded"**

```bash
youtube-studio quota-status
# Check remaining quota
# Quota resets at midnight UTC
```

**"File not found"**

- Use full path: `--file ~/Videos/my-video.mp4`
- Check file exists: `ls -lh ~/Videos/my-video.mp4`

**No comments showing**

- Make sure `YOUTUBE_CHANNEL_ID` is correct in config
- Check your channel allows comments

## Tips & Tricks

### Auto-Reply to All Comments

```bash
youtube-studio comments --unread --limit 10 | \
  grep "comment_id" | \
  awk '{print $2}' | \
  xargs -I {} youtube-studio reply --comment-id {} --template grateful
```

### Weekly Stats Report

```bash
#!/bin/bash
echo "Weekly Stats for $(date +%Y-%m-%d)"
youtube-studio stats --days 7 --json | jq '.topVideos'
```

### Schedule Videos in Bulk

```bash
# Create `uploads.txt`:
# video1.mp4|My First Video|Description here|2024-01-15T10:00:00Z
# video2.mp4|My Second Video|More description|2024-01-16T10:00:00Z

while IFS='|' read file title desc schedule; do
  youtube-studio upload \
    --file "$file" \
    --title "$title" \
    --description "$desc" \
    --schedule "$schedule"
done < uploads.txt
```

### Smart Comment Filtering

```bash
# Get comments from this week
youtube-studio comments --limit 100 | grep "2024-01-"

# Get unread comments only
youtube-studio comments --unread

# Save comments to file
youtube-studio comments --json > comments.json
```

## Advanced Options

### Custom Thumbnail

```bash
youtube-studio upload \
  --file video.mp4 \
  --title "My Video" \
  --thumbnail thumbnail.jpg
```

### Add to Playlist

```bash
youtube-studio upload \
  --file video.mp4 \
  --title "Episode 5" \
  --playlist "My Series"
```

### Set Privacy Level

```bash
youtube-studio upload \
  --file video.mp4 \
  --title "Private Test" \
  --privacy private
  # Options: public, unlisted, private
```

### Video Category

```bash
youtube-studio upload \
  --file video.mp4 \
  --title "Music" \
  --category Music
```

## Configuration

Edit `~/.clawd-youtube/config.env`:

```bash
# Your YouTube channel ID
YOUTUBE_CHANNEL_ID=UCxxxxxx

# How many ideas to generate
IDEAS_COUNT=5

# How many days to look back for stats
STATS_DAYS=30

# Logging level: debug, info, warn, error
LOG_LEVEL=info
```

## Video File Formats

Supported: mp4, mov, avi, mkv, flv, wmv, webm

**Best settings for YouTube:**

- Codec: H.264 video, AAC audio
- Resolution: 1080p (1920x1080) or 4K (3840x2160)
- Frame rate: 24, 25, 30, 48, 50, or 60 fps
- Bitrate: 5-25 Mbps depending on resolution

## Rate Limits

YouTube allows 1M API units per day (plenty for normal use).

**Unit costs:**

- View stats: 1 unit
- List comments: 1 unit
- Upload video: 1,600 units
- Reply to comment: 1 unit

**Normal daily use:** ~20-50 units (plenty of headroom)

## Getting Help

### Debug Mode

```bash
LOG_LEVEL=debug youtube-studio stats
# Shows detailed API requests/responses
```

### Check Logs

```bash
tail -f ~/.clawd-youtube/logs/youtube-studio.log
# Watch logs in real-time
```

### Verify Setup

```bash
youtube-studio auth
# Tests credentials and shows account info
```

## Privacy & Security

- **Credentials:** Stored in `~/.clawd-youtube/credentials.json` (local only)
- **Tokens:** Never stored in plaintext, encrypted in `tokens.json`
- **API Keys:** Use environment variables, never commit to git
- **File:** Add to `.gitignore`: `~/.clawd-youtube/`

## Next Steps

1. ✅ Run `youtube-studio stats` to verify setup
2. 📹 Upload your first video with `youtube-studio upload`
3. 💬 Check comments and reply with `youtube-studio comments`
4. 💡 Generate ideas for next week with `youtube-studio ideas`
5. 📊 Set up a daily reminder to check stats

Enjoy managing your channel! 🎬
