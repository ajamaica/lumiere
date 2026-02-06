# YouTube Studio Skill

Comprehensive YouTube channel management skill for Clawdbot. Monitor analytics, upload videos, manage comments, and generate content ideas.

## Overview

**youtube-studio** provides full-featured YouTube channel management:

- Real-time channel statistics and analytics
- Video upload with metadata and scheduling
- Comment monitoring and AI-powered reply suggestions
- Content idea generation based on trends and niche
- Rate limiting and error recovery
- OAuth 2.0 authentication

## Setup

### 1. YouTube Data API v3 Credentials

#### Get API Key & OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., "Clawdbot YouTube Studio")
3. Enable **YouTube Data API v3**:
   - Search for "YouTube Data API v3"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Desktop application"
   - Download JSON (save as `credentials.json`)
5. Create an API Key (for public requests):
   - Click "Create Credentials" → "API Key"
   - Copy the key

#### File Structure

```
~/.clawd-youtube/
├── credentials.json       # OAuth credentials (from step 4)
├── tokens.json           # Generated after first OAuth flow
└── config.env            # API keys and settings
```

### 2. Environment Setup

Copy `.env.example` to `~/.clawd-youtube/config.env`:

```bash
# YouTube API
YOUTUBE_API_KEY=your_api_key_here
YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:8888/oauth2callback

# Channel Settings
YOUTUBE_CHANNEL_ID=UCxxxxxxxxxxxxxx
YOUTUBE_CHANNEL_NAME=YourChannelName

# AI Model (for suggestions & replies)
AI_MODEL=openrouter/anthropic/claude-haiku-4.5
AI_API_KEY=your_api_key

# Rate Limiting
API_QUOTA_PER_DAY=1000000
BATCH_SIZE=50

# Logging
LOG_LEVEL=info
LOG_DIR=./logs
```

### 3. OAuth 2.0 Flow

The skill handles OAuth automatically on first run:

```bash
youtube-studio auth
# Opens browser to Google login
# Exchanges auth code for refresh token
# Saves tokens to tokens.json
```

**Subsequent runs** use the saved refresh token (no re-auth needed).

## Commands

### Check Channel Statistics

```bash
youtube-studio stats
youtube-studio stats --days 7        # Last 7 days
youtube-studio stats --json          # JSON output
```

**Output:**

- Total views, subscribers, watch time
- Recent video performance (top 5)
- Growth trends
- Engagement metrics (avg views, likes, comments per video)

### Upload Video

```bash
youtube-studio upload \
  --file video.mp4 \
  --title "My Devotional Series #5" \
  --description "Join me for another..." \
  --tags "devotional,faith,inspiration" \
  --privacy public \
  --schedule "2024-01-15T10:00:00Z"
```

**Options:**

- `--file` (required): Video file path (mp4, mov, avi, mkv)
- `--title` (required): Video title
- `--description`: Full description (supports markdown)
- `--tags`: Comma-separated tags (max 500 chars)
- `--privacy`: public, unlisted, private (default: unlisted)
- `--thumbnail`: Custom thumbnail image path
- `--playlist`: Add to existing playlist by name
- `--schedule`: ISO 8601 datetime for scheduled upload
- `--category`: Video category (Music, People, etc.)

### List Recent Comments

```bash
youtube-studio comments
youtube-studio comments --video-id xxxxx    # Specific video
youtube-studio comments --unread            # Unread only
youtube-studio comments --limit 50          # Limit results
youtube-studio comments --json              # JSON output
```

### Reply to Comment

```bash
youtube-studio reply \
  --comment-id Qmxxxxxxxxxxxxxxxx \
  --text "Thanks for watching!" \
  --suggest                    # Show AI suggestions first
```

**Flags:**

- `--suggest`: Generate 3 reply suggestions before responding
- `--template`: Use preset template (grateful, educational, promotional)
- `--dry-run`: Preview without sending

### Generate Video Ideas

```bash
youtube-studio ideas
youtube-studio ideas --niche devotional
youtube-studio ideas --trending          # Based on YouTube trends
youtube-studio ideas --json              # JSON output
youtube-studio ideas --count 10          # Number of ideas
```

**Output:**

- Title suggestions
- Description hooks
- Target audience analysis
- SEO keywords
- Estimated search volume
- Thumbnail ideas

## Rate Limiting

YouTube API quotas:

- **Daily quota:** 1,000,000 units (default)
- **Per-method costs:**
  - `channels.list`: 1 unit
  - `videos.list`: 1 unit
  - `videos.insert`: 1,600 units (upload)
  - `commentThreads.list`: 1 unit
  - `comments.insert`: 1 unit

**Skill handles:**

- Automatic quota tracking
- Request batching
- Exponential backoff on 403 errors
- Daily reset monitoring
- Quota alerts when >80% used

```bash
youtube-studio quota-status    # Check remaining quota
```

## Error Recovery

| Error                | Handling                            |
| -------------------- | ----------------------------------- |
| `401 Unauthorized`   | Refresh OAuth token automatically   |
| `403 Quota Exceeded` | Wait until next day, show alert     |
| `429 Rate Limited`   | Exponential backoff (1s, 2s, 4s...) |
| `500 Server Error`   | Retry up to 3 times                 |
| Network timeout      | Graceful retry with circuit breaker |
| Upload interrupted   | Resume from last chunk              |

## File Structure

```
youtube-studio/
├── SKILL.md                           # This file
├── README.md                          # User guide
├── scripts/
│   ├── youtube-studio.js              # Main entry point & CLI
│   ├── channel-analytics.js           # Stats & analytics
│   ├── video-uploader.js              # Video upload logic
│   ├── comment-manager.js             # Comment operations
│   ├── content-ideas.js               # Idea generation
│   ├── auth-handler.js                # OAuth flow
│   ├── api-client.js                  # Quota-aware API wrapper
│   └── utils.js                       # Helpers
├── config/
│   ├── templates.json                 # Description templates, tags
│   └── niche-prompts.json             # Prompt templates for ideas
├── .env.example                       # Environment template
├── package.json                       # Dependencies
└── logs/                              # Runtime logs
```

## Templates

### Video Description Template

```json
{
  "devoted_journey": {
    "title": "Daily Devotional - {topic}",
    "description": "🙏 {hook}\n\n{body}\n\n⏱️ Timestamps:\n{timestamps}\n\n📖 Scripture: {reference}\n\n💬 Reflect: {reflection_question}",
    "tags": ["devotional", "faith", "scripture", "spiritual"]
  }
}
```

### Comment Reply Templates

- `grateful`: Thank subscribers for support
- `educational`: Explain concepts deeper
- `promotional`: Link to related videos
- `engagement`: Ask follow-up questions

## Dependencies

```json
{
  "googleapis": "^120.0.0",
  "google-auth-library": "^9.0.0",
  "axios": "^1.6.0",
  "express": "^4.18.0"
}
```

## Troubleshooting

### "Invalid grant" error

- Delete `tokens.json`
- Run `youtube-studio auth` again
- Check credentials.json is valid

### Quota exceeded

- Check `youtube-studio quota-status`
- Wait until midnight UTC (quota resets)
- Consider raising API quota in Cloud Console

### Upload fails

- Check file exists and is readable
- Verify file format is supported
- Check video doesn't violate YouTube policies
- Use `--dry-run` to test metadata first

### Comments not appearing

- Ensure channel is authenticated with owner account
- Check comment moderation settings
- Verify YOUTUBE_CHANNEL_ID matches your channel

## API Reference

### Core Methods

#### `authenticateOAuth()`

Initiates OAuth 2.0 flow. Returns refresh token.

#### `getChannelStats(options = {})`

- `days`: Number of days to look back (default: 30)
- Returns: `{ views, subscribers, watchHours, videos, topVideos[] }`

#### `uploadVideo(metadata, filePath, options = {})`

- `metadata`: title, description, tags, privacy
- `filePath`: Path to video file
- Returns: `{ videoId, status, scheduledTime }`

#### `listComments(videoId = null, options = {})`

- `videoId`: Specific video or null for all
- `unread`: Boolean, get unread only
- Returns: `{ comments[], total, pageToken }`

#### `replyToComment(commentId, text, options = {})`

- `template`: Use preset template
- `suggestFirst`: Get AI suggestions
- Returns: `{ replyId, text }`

#### `generateVideoIdeas(options = {})`

- `niche`: Channel niche/category
- `trending`: Include trending topics
- Returns: `{ ideas[], keywords[], thumbnail_prompts[] }`

## Examples

### Full Daily Workflow

```bash
# Check stats
youtube-studio stats --days 1

# Review comments with suggestions
youtube-studio comments --limit 20 --suggest

# Generate new video ideas
youtube-studio ideas --trending --count 5

# Check quota before scheduling uploads
youtube-studio quota-status
```

### Automated Upload (Scripting)

```bash
#!/bin/bash
youtube-studio upload \
  --file ~/Videos/devotional.mp4 \
  --title "Daily Devotional - $(date +%Y-%m-%d)" \
  --description "$(cat description.txt)" \
  --schedule "$(date -d 'tomorrow 10:00' -Iseconds)" \
  --tags "devotional,daily,faith"
```

## Limitations

- YouTube API quota: 1M units/day (sufficient for ~600 uploads/day)
- Videos must be <256GB
- Title limited to 100 characters
- Description limited to 5,000 characters
- Comment replies limited to 10,000 characters
- No live stream management (yet)

## Future Enhancements

- [ ] Live stream monitoring and chat moderation
- [ ] Playlist automation
- [ ] Subtitle generation (using Whisper)
- [ ] Thumbnail optimization with CV
- [ ] Analytics dashboards
- [ ] Multi-channel support
- [ ] Scheduled content calendar

## License

MIT - Use freely within Clawdbot ecosystem

## Support

Issues? Check:

1. `~/.clawd-youtube/logs/` for debug output
2. Credentials validity: `youtube-studio auth`
3. API quotas: `youtube-studio quota-status`
4. Network: Ping Google API servers
