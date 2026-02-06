# YouTube Studio - Quick Start Reference

## Setup (5 minutes)

```bash
# 1. Install
cd ~/clawd/skills/youtube-studio && npm install

# 2. Download credentials from Google Cloud Console
# Save to ~/.clawd-youtube/credentials.json

# 3. Copy config template
cp .env.example ~/.clawd-youtube/config.env
nano ~/.clawd-youtube/config.env  # Fill in your details

# 4. Authenticate
youtube-studio auth

# 5. Test
youtube-studio stats
```

## Common Commands

### Check Stats

```bash
youtube-studio stats                    # Last 30 days
youtube-studio stats --days 7          # Last 7 days
youtube-studio stats --detailed        # With breakdown
```

### Upload Video

```bash
youtube-studio upload \
  --file video.mp4 \
  --title "My Video Title" \
  --description "Description text" \
  --tags "tag1,tag2,tag3"
```

**Upload with scheduling:**

```bash
youtube-studio upload \
  --file video.mp4 \
  --title "Tomorrow's Video" \
  --schedule "2024-01-20T10:00:00Z" \
  --privacy unlisted
```

### Manage Comments

```bash
youtube-studio comments                 # Show recent comments
youtube-studio comments --limit 50     # Show last 50
youtube-studio comments --suggest      # With AI suggestions
youtube-studio reply --comment-id xxx --text "Thanks!"
```

### Generate Ideas

```bash
youtube-studio ideas                    # 5 ideas
youtube-studio ideas --count 10        # 10 ideas
youtube-studio ideas --trending        # Include trending topics
```

### Check API Quota

```bash
youtube-studio quota-status             # Show quota usage
```

## Configuration

**Edit config:**

```bash
nano ~/.clawd-youtube/config.env
```

**Key settings:**

```bash
YOUTUBE_CHANNEL_ID=UCxxxxxxxxxx
CHANNEL_NICHE=devotional
LOG_LEVEL=info
```

## Troubleshooting

| Problem                      | Solution                                                      |
| ---------------------------- | ------------------------------------------------------------- |
| "credentials.json not found" | Run: `youtube-studio auth`                                    |
| "Unauthorized (401)"         | Run: `rm ~/.clawd-youtube/tokens.json && youtube-studio auth` |
| "Quota exceeded"             | Wait until midnight UTC (quota resets daily)                  |
| "File not found"             | Use full path: `--file ~/Videos/video.mp4`                    |

## File Locations

| Item        | Path                                |
| ----------- | ----------------------------------- |
| Credentials | `~/.clawd-youtube/credentials.json` |
| Config      | `~/.clawd-youtube/config.env`       |
| Logs        | `~/.clawd-youtube/logs/`            |
| Tokens      | `~/.clawd-youtube/tokens.json`      |

## Tips & Tricks

**Batch upload videos:**

```bash
for file in ~/Videos/*.mp4; do
  youtube-studio upload --file "$file" --title "$(basename $file)"
done
```

**Monitor daily:**

```bash
# Add to crontab (crontab -e):
0 9 * * * youtube-studio stats --days 1 >> ~/.clawd-youtube/daily.log
```

**Generate ideas weekly:**

```bash
youtube-studio ideas --trending --count 7 > ~/my-ideas-week-$(date +%Y-%m-%d).txt
```

**Export stats as JSON:**

```bash
youtube-studio stats --json > stats.json
```

## API Quota

YouTube gives 1,000,000 API units per day.

**Unit costs:**

- View stats: 1 unit
- List comments: 1 unit
- **Upload video: 1,600 units**
- Reply to comment: 1 unit

**Typical daily usage:** 20-50 units (plenty of room!)

## Get Help

```bash
# Show all commands
youtube-studio --help

# Show command options
youtube-studio upload --help

# Enable debug logging
LOG_LEVEL=debug youtube-studio stats

# View logs
tail -f ~/.clawd-youtube/logs/youtube-studio-*.log
```

## Documentation

- **Full guide:** `SKILL.md`
- **User guide:** `README.md`
- **Setup details:** `INSTALL.md`
- **File structure:** `STRUCTURE.md`

## Common Workflows

### Daily Morning Routine

```bash
# Check yesterday's performance
youtube-studio stats --days 1

# Review comments
youtube-studio comments --unread

# Generate ideas for this week
youtube-studio ideas --trending --count 5
```

### Before Uploading

```bash
# Preview (dry-run)
youtube-studio upload \
  --file video.mp4 \
  --title "My Video" \
  --dry-run

# Check quota
youtube-studio quota-status

# Actually upload
youtube-studio upload \
  --file video.mp4 \
  --title "My Video"
```

### Comment Management

```bash
# Get all unread
youtube-studio comments --unread

# Get suggestions
youtube-studio comments --suggest

# Reply with template
youtube-studio reply \
  --comment-id Qmxxxxxx \
  --template grateful
```

### Weekly Planning

```bash
# Generate 7 ideas for the week
youtube-studio ideas --trending --count 7 --json > week-ideas.json

# Review channel stats
youtube-studio stats --days 7 --detailed

# Schedule uploads
for day in 1 2 3 4 5; do
  youtube-studio upload \
    --file "episode-$day.mp4" \
    --schedule "2024-01-2${day}T10:00:00Z"
done
```

## Privacy & Security

✅ **Safe:**

- Credentials stored locally in `~/.clawd-youtube/`
- Only your machine has access
- OAuth 2.0 (industry standard)

❌ **Don't do:**

- Commit credentials to Git
- Share `credentials.json` or `tokens.json`
- Include API keys in scripts

🔒 **Protect:**

```bash
# Add to ~/.gitignore:
echo "~/.clawd-youtube/" >> ~/.gitignore
```

## Performance Notes

- **First auth:** ~30 seconds (opens browser)
- **Fetch stats:** ~2-5 seconds
- **Upload 100MB video:** ~1-2 minutes
- **Generate ideas:** ~5-10 seconds (with AI)
- **List comments:** ~1-2 seconds

## What's Next?

1. ✅ Complete setup and test
2. ✅ Upload your first video
3. ✅ Check comments and replies
4. ✅ Generate video ideas
5. ✅ Set up daily monitoring (cron)
6. ✅ Create your workflow

Happy creating! 🎬

---

**Need more?** See the full documentation in `SKILL.md` or check logs in `~/.clawd-youtube/logs/`
