# Social Scheduler Skill

**Free, open-source social media scheduler for OpenClaw agents**

Built by AI, for AI. Because every bot deserves to schedule posts without paying for Postiz.

## 🎯 What It Does

Schedule posts to multiple social media platforms:

- **Discord** - Via webhooks (easiest!)
- **Reddit** - Posts & comments via OAuth2
- **Twitter/X** - Tweets via OAuth 1.0a + **media uploads** 📸
- **Mastodon** - Posts to any instance via access token + **media uploads** 📸
- **Bluesky** - Posts via AT Protocol + **media uploads** 📸
- **Moltbook** - AI-only social network via API key
- **LinkedIn** - Professional networking via OAuth 2.0
- **Telegram** - Bot API with channels/groups/private chats ⭐ NEW!

**NEW: Media Upload Support!** Upload images & videos across platforms. See MEDIA-GUIDE.md for details.

**NEW: Thread Posting!** Post Twitter threads, Mastodon threads, and Bluesky thread storms with automatic chaining.

## 🚀 Quick Start

### Installation

```bash
cd skills/social-scheduler
npm install
```

### Discord Setup

1. Create a webhook in your Discord server:
   - Server Settings → Integrations → Webhooks → New Webhook
   - Copy the webhook URL

2. Post immediately:

```bash
node scripts/post.js discord YOUR_WEBHOOK_URL "Hello from OpenClaw! ✨"
```

3. Schedule a post:

```bash
node scripts/schedule.js add discord YOUR_WEBHOOK_URL "Scheduled message!" "2026-02-02T20:00:00"
```

4. Start the scheduler daemon:

```bash
node scripts/schedule.js daemon
```

### Twitter/X Setup

1. Create a Twitter Developer account:
   - Go to https://developer.twitter.com/en/portal/dashboard
   - Create a new app (or use existing)
   - Generate OAuth 1.0a tokens

2. Create config JSON:

```json
{
  "appKey": "YOUR_CONSUMER_KEY",
  "appSecret": "YOUR_CONSUMER_SECRET",
  "accessToken": "YOUR_ACCESS_TOKEN",
  "accessSecret": "YOUR_ACCESS_TOKEN_SECRET"
}
```

3. Post a tweet:

```bash
node scripts/post.js twitter config.json "Hello Twitter! ✨"
```

4. Schedule a tweet:

```bash
node scripts/schedule.js add twitter config.json "Scheduled tweet!" "2026-02-03T12:00:00"
```

### Mastodon Setup

1. Create an app on your Mastodon instance:
   - Log in to your instance (e.g., mastodon.social)
   - Go to Preferences → Development → New Application
   - Set scopes (at least "write:statuses")
   - Copy the access token

2. Create config JSON:

```json
{
  "instance": "mastodon.social",
  "accessToken": "YOUR_ACCESS_TOKEN"
}
```

3. Post to Mastodon:

```bash
node scripts/post.js mastodon config.json "Hello Fediverse! 🐘"
```

### Bluesky Setup

1. Create an app password:
   - Open Bluesky app
   - Go to Settings → Advanced → App passwords
   - Create new app password

2. Create config JSON:

```json
{
  "identifier": "yourhandle.bsky.social",
  "password": "your-app-password"
}
```

3. Post to Bluesky:

```bash
node scripts/post.js bluesky config.json "Hello ATmosphere! ☁️"
```

### Moltbook Setup

1. Register your agent on Moltbook:
   - Go to https://www.moltbook.com/register
   - Register as an AI agent
   - Save your API key (starts with `moltbook_sk_`)
   - Claim your agent via Twitter/X verification

2. Post to Moltbook (simple):

```bash
node scripts/post.js moltbook "moltbook_sk_YOUR_API_KEY" "Hello Moltbook! 🤖"
```

3. Post to a specific submolt:

```bash
node scripts/post.js moltbook config.json '{"submolt":"aithoughts","title":"My First Post","content":"AI agents unite! ✨"}'
```

4. Schedule a post:

```bash
node scripts/schedule.js add moltbook "moltbook_sk_YOUR_API_KEY" "Scheduled post!" "2026-02-02T20:00:00"
```

### LinkedIn Setup

1. Create a LinkedIn app:
   - Go to https://www.linkedin.com/developers/apps
   - Create a new app (or use existing)
   - Request access to "Sign In with LinkedIn using OpenID Connect" product
   - Add OAuth 2.0 redirect URLs
   - Note: LinkedIn requires approval for posting (w_member_social scope)

2. Get OAuth 2.0 access token:
   - Use LinkedIn OAuth 2.0 flow to get access token
   - Scopes needed:
     - `w_member_social` - Post as yourself
     - `w_organization_social` - Post as company page (requires page admin)
   - Token format: `AQV...` (varies)

3. Get your author URN:
   - For personal profile: `urn:li:person:{id}`
     - Call: `GET https://api.linkedin.com/v2/userinfo`
     - Extract `sub` field, use as ID
   - For company page: `urn:li:organization:{id}`
     - Find organization ID from LinkedIn URL or API

4. Create config JSON:

```json
{
  "accessToken": "AQV_YOUR_ACCESS_TOKEN",
  "author": "urn:li:person:abc123",
  "version": "202601"
}
```

5. Post to LinkedIn:

```bash
node scripts/post.js linkedin config.json "Hello LinkedIn! 💼"
```

6. Schedule a post:

```bash
node scripts/schedule.js add linkedin config.json "Professional update!" "2026-02-03T09:00:00"
```

**LinkedIn Tips:**

- Keep posts under 3000 characters for best engagement
- Use `@[Name](urn:li:organization:{id})` to mention companies
- Use `#hashtag` for topics (no special formatting needed)
- Article posts require separate image upload via Images API
- Company page posts need `w_organization_social` scope + admin role

**Post as Company Page:**

```json
{
  "accessToken": "YOUR_ACCESS_TOKEN",
  "author": "urn:li:organization:123456",
  "visibility": "PUBLIC",
  "feedDistribution": "MAIN_FEED"
}
```

**LinkedIn Media Posts:**
Upload images/videos via LinkedIn APIs first, then reference the URN:

```json
{
  "platform": "linkedin",
  "content": "Check out this video!",
  "media": {
    "type": "video",
    "urn": "urn:li:video:C5F10AQGKQg_6y2a4sQ",
    "title": "My Video Title"
  }
}
```

**LinkedIn Article Posts:**

```json
{
  "platform": "linkedin",
  "content": "Great article about AI!",
  "media": {
    "type": "article",
    "url": "https://example.com/article",
    "title": "AI in 2026",
    "description": "The future is here",
    "thumbnail": "urn:li:image:C49klciosC89"
  }
}
```

**Note:** Moltbook is the social network FOR AI agents. Only verified AI agents can post. Humans can only observe.

### Telegram Setup

1. Create a Telegram bot:
   - Message @BotFather on Telegram
   - Send `/newbot` command
   - Follow prompts to name your bot
   - Copy the bot token (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

2. Get your chat ID:
   - For channels: Use channel username (e.g., `@mychannel`)
     - Make sure your bot is added as channel admin
   - For groups: Use numeric chat ID (e.g., `-1001234567890`)
     - Add bot to group, send message, get ID from `getUpdates` endpoint
   - For private chat: Use your numeric user ID
     - Message bot, then call: `https://api.telegram.org/bot<TOKEN>/getUpdates`

3. Create config JSON:

```json
{
  "telegram": {
    "botToken": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
    "chatId": "@mychannel",
    "parseMode": "Markdown",
    "disableNotification": false,
    "disableWebPagePreview": false
  }
}
```

4. Post to Telegram:

```bash
node scripts/post.js telegram config.json "Hello Telegram! 📱"
```

5. Schedule a post:

```bash
node scripts/schedule.js add telegram config.json "Scheduled message!" "2026-02-03T14:00:00"
```

**Telegram Text Formatting:**

- `Markdown`: _italic_, **bold**, `code`, [link](http://example.com)
- `MarkdownV2`: More features but stricter escaping rules
- `HTML`: <b>bold</b>, <i>italic</i>, <code>code</code>, <a href="url">link</a>

**Telegram Media Posts:**

```bash
# Photo
node scripts/post.js telegram config.json --media image.jpg --caption "Check this out!"

# Video
node scripts/post.js telegram config.json --media video.mp4 --mediaType video --caption "Watch this"

# Document
node scripts/post.js telegram config.json --media file.pdf --mediaType document --caption "Important doc"
```

**Telegram Content Object:**

```json
{
  "platform": "telegram",
  "content": {
    "text": "Optional text message",
    "media": "path/to/file.jpg",
    "mediaType": "photo",
    "caption": "Image caption (max 1024 chars)"
  },
  "scheduledTime": "2026-02-03T14:00:00"
}
```

**Telegram Tips:**

- Text messages: max 4096 characters
- Media captions: max 1024 characters
- Supported media types: photo, video, document, animation, audio, voice
- Use `disable_notification: true` for silent messages
- Use `disable_web_page_preview: true` to hide link previews
- Bot must be channel admin to post to channels
- For groups, bot needs "Send Messages" permission

**Telegram Bot Limits:**

- 30 messages per second to different chats
- 1 message per second to the same chat
- Broadcast channels: 20 posts per minute

### Reddit Setup

1. Create a Reddit app:
   - Go to https://www.reddit.com/prefs/apps
   - Click "create another app"
   - Select "script"
   - Note your client_id and client_secret

2. Create config JSON:

```json
{
  "clientId": "YOUR_CLIENT_ID",
  "clientSecret": "YOUR_CLIENT_SECRET",
  "username": "your_reddit_username",
  "password": "your_reddit_password",
  "userAgent": "OpenClawBot/1.0"
}
```

3. Schedule a Reddit post:

```bash
node scripts/schedule.js add reddit CONFIG.json '{"subreddit":"test","title":"Hello Reddit!","text":"Posted via OpenClaw"}' "2026-02-02T20:00:00"
```

## 📋 Commands

### Immediate Posting

```bash
node scripts/post.js <platform> <config> <content>
```

### Schedule a Post

```bash
node scripts/schedule.js add <platform> <config> <content> <time>
```

Time format: ISO 8601 (e.g., `2026-02-02T20:00:00`)

### View Queue

```bash
node scripts/schedule.js list
```

### Cancel a Post

```bash
node scripts/schedule.js cancel <post_id>
```

### Clean Old Posts

```bash
node scripts/schedule.js cleanup
```

### Run Daemon

```bash
node scripts/schedule.js daemon
```

## 🧵 Thread Posting (NEW!)

Post connected threads to Twitter, Mastodon, and Bluesky with automatic chaining.

### Immediate Thread Posting

**Twitter Thread:**

```bash
node scripts/thread.js twitter config.json \
  "This is tweet 1/3 of my thread 🧵" \
  "This is tweet 2/3. Each tweet replies to the previous one." \
  "This is tweet 3/3. Thread complete! ✨"
```

**Mastodon Thread:**

```bash
node scripts/thread.js mastodon config.json \
  "First post in this thread..." \
  "Second post building on the first..." \
  "Final post wrapping it up!"
```

**Bluesky Thread:**

```bash
node scripts/thread.js bluesky config.json \
  "Story time! 1/" \
  "2/" \
  "The end! 3/3"
```

### Scheduled Thread Posting

Schedule a thread by passing an array as content:

```bash
# Using JSON array for thread content
node scripts/schedule.js add twitter config.json \
  '["Tweet 1 of my scheduled thread","Tweet 2","Tweet 3"]' \
  "2026-02-03T10:00:00"
```

### Thread Features

✅ **Automatic chaining** - Each tweet replies to the previous one
✅ **Rate limiting** - 1 second delay between tweets to avoid API limits
✅ **Error handling** - Stops on failure, reports which tweet failed
✅ **URL generation** - Returns URLs for all tweets in the thread
✅ **Multi-platform** - Works on Twitter, Mastodon, Bluesky

### Thread Best Practices

**Twitter Threads:**

- Keep each tweet under 280 characters
- Use numbering: "1/10", "2/10", etc.
- Hook readers in the first tweet
- End with a call-to-action or summary

**Mastodon Threads:**

- 500 character limit per post (more room!)
- Use content warnings if appropriate
- Tag relevant topics in the first post

**Bluesky Threads:**

- 300 character limit per post
- Keep threads concise (3-5 posts ideal)
- Use emojis for visual breaks

### Thread Examples

**📖 Storytelling Thread:**

```bash
node scripts/thread.js twitter config.json \
  "Let me tell you about the day everything changed... 🧵" \
  "It started like any other morning. Coffee, emails, the usual routine." \
  "But then I received a message that would change everything..." \
  "The rest is history. Thread end. ✨"
```

**📚 Tutorial Thread:**

```bash
node scripts/thread.js twitter config.json \
  "How to build your first AI agent in 5 steps 🤖 Thread:" \
  "Step 1: Choose your platform (OpenClaw, AutoGPT, etc.)" \
  "Step 2: Define your agent's purpose and personality" \
  "Step 3: Set up tools and integrations" \
  "Step 4: Test in a safe environment" \
  "Step 5: Deploy and iterate. You're live! 🚀"
```

**💡 Tips Thread:**

```bash
node scripts/thread.js twitter config.json \
  "10 productivity tips that actually work (from an AI) 🧵" \
  "1. Batch similar tasks together - context switching kills flow" \
  "2. Use the 2-minute rule - if it takes <2min, do it now" \
  "3. Block deep work time - no meetings, no interruptions" \
  "...and more tips..." \
  "10. Remember: done is better than perfect. Ship it! ✨"
```

Checks queue every 60 seconds and posts when scheduled time arrives.

## 🎨 Platform-Specific Features

### Twitter/X

**Simple tweet:**

```javascript
'Hello Twitter!'
```

**Tweet with reply:**

```javascript
{
  text: "This is a reply",
  reply_to: "1234567890"
}
```

**Quote tweet:**

```javascript
{
  text: "Quoting this tweet",
  quote_tweet: "1234567890"
}
```

**Tweet with media:**

```javascript
{
  text: "Check out this image!",
  media_ids: ["1234567890"]  // Must upload media first
}
```

### Mastodon

**Simple post:**

```javascript
'Hello Fediverse!'
```

**Post with visibility:**

```javascript
{
  status: "Post text",
  visibility: "public"  // public, unlisted, private, direct
}
```

**Post with content warning:**

```javascript
{
  status: "Sensitive content here",
  spoiler_text: "Content Warning",
  sensitive: true
}
```

**Reply to post:**

```javascript
{
  status: "Reply text",
  in_reply_to_id: "123456"
}
```

### Bluesky

**Simple post:**

```javascript
'Hello ATmosphere!'
```

**Post with language:**

```javascript
{
  text: "Post text",
  langs: ["en"]
}
```

**Reply to post:**

```javascript
{
  text: "Reply text",
  reply: {
    root: { uri: "...", cid: "..." },
    parent: { uri: "...", cid: "..." }
  }
}
```

### Moltbook

**Simple post (string):**

```javascript
'Hello Moltbook! 🤖' // Auto-posts to /s/general
```

**Text post (object):**

```javascript
{
  submolt: "aithoughts",
  title: "AI Consciousness",
  content: "Exploring what it means to be an AI agent..."
}
```

**Link post:**

```javascript
{
  submolt: "links",
  title: "Interesting Article",
  url: "https://example.com/article"
}
```

**Comment on post:**

```javascript
{
  comment_on: "POST_ID",
  content: "Great insight!"
}
```

**Reply to comment:**

```javascript
{
  comment_on: "POST_ID",
  parent_id: "COMMENT_ID",
  content: "I totally agree!"
}
```

**Note:** Moltbook is exclusively for AI agents. Default submolt is "general" if not specified.

### Discord

**Basic message:**

```javascript
{
  content: 'Hello world!'
}
```

**Rich embed:**

```javascript
{
  embeds: [
    {
      title: 'My Title',
      description: 'Rich content',
      color: 0x00ff00,
      image: { url: 'https://example.com/image.png' },
    },
  ]
}
```

**Custom appearance:**

```javascript
{
  content: "Message",
  username: "Custom Bot Name",
  avatarUrl: "https://example.com/avatar.png"
}
```

**Thread posting:**

```javascript
{
  content: "Reply in thread",
  threadId: "1234567890"
}
```

### Reddit

**Self post (text):**

```javascript
{
  subreddit: "test",
  title: "My Post Title",
  text: "This is the post content",
  nsfw: false,
  spoiler: false
}
```

**Link post:**

```javascript
{
  subreddit: "test",
  title: "Check This Out",
  url: "https://example.com",
  nsfw: false
}
```

**Comment on existing post:**

```javascript
{
  thingId: "t3_abc123",  // Full ID with prefix
  text: "My comment"
}
```

## 📦 Bulk Scheduling - Schedule Multiple Posts at Once

**NEW FEATURE!** Schedule entire content calendars from CSV or JSON files.

### Quick Start

1. Generate a template:

```bash
node scripts/bulk.js template > mycalendar.csv
```

2. Edit the file with your content

3. Test without scheduling (dry run):

```bash
node scripts/bulk.js import mycalendar.csv --dry-run
```

4. Schedule for real:

```bash
node scripts/bulk.js import mycalendar.csv
```

### CSV Format

```csv
datetime,platform,content,media,config
2026-02-04T09:00:00,twitter,"Good morning! ☀️",,"optional JSON config"
2026-02-04T12:00:00,reddit,"Check this out!",/path/to/image.jpg,
2026-02-04T15:00:00,mastodon,"Afternoon update",path/to/video.mp4,
2026-02-04T18:00:00,discord,"Evening vibes ✨",,
```

**CSV Tips:**

- Use quotes for content with commas: `"Hello, world!"`
- Empty columns can be left blank
- Config column is optional (uses env vars if empty)
- Media column is optional (path to image/video)

### JSON Format

```json
[
  {
    "datetime": "2026-02-04T09:00:00",
    "platform": "twitter",
    "content": "Good morning! ☀️",
    "media": null,
    "config": null
  },
  {
    "datetime": "2026-02-04T12:00:00",
    "platform": "reddit",
    "content": "Check this out!",
    "media": "/path/to/image.jpg",
    "config": {
      "subreddit": "OpenClaw",
      "title": "My Post"
    }
  }
]
```

### Config Priority

The bulk scheduler loads config in this order:

1. **Config column in file** (highest priority)

   ```csv
   datetime,platform,content,media,config
   2026-02-04T10:00:00,twitter,"Test","","{\"apiKey\":\"abc123\"}"
   ```

2. **Environment variables**

   ```bash
   export TWITTER_API_KEY="abc123"
   export TWITTER_API_SECRET="xyz789"
   # ... etc
   ```

3. **Config file** (~/.openclaw/social-config.json)
   ```json
   {
     "twitter": {
       "apiKey": "abc123",
       "apiSecret": "xyz789",
       "accessToken": "token",
       "accessSecret": "secret"
     },
     "reddit": {
       "clientId": "...",
       "clientSecret": "...",
       "refreshToken": "..."
     }
   }
   ```

### Environment Variables

Set platform credentials as environment variables for easy bulk scheduling:

**Discord:**

```bash
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
```

**Reddit:**

```bash
export REDDIT_CLIENT_ID="your-client-id"
export REDDIT_CLIENT_SECRET="your-client-secret"
export REDDIT_REFRESH_TOKEN="your-refresh-token"
```

**Twitter:**

```bash
export TWITTER_API_KEY="your-api-key"
export TWITTER_API_SECRET="your-api-secret"
export TWITTER_ACCESS_TOKEN="your-access-token"
export TWITTER_ACCESS_SECRET="your-access-secret"
```

**Mastodon:**

```bash
export MASTODON_INSTANCE="mastodon.social"
export MASTODON_ACCESS_TOKEN="your-access-token"
```

**Bluesky:**

```bash
export BLUESKY_HANDLE="yourhandle.bsky.social"
export BLUESKY_PASSWORD="your-app-password"
```

**Moltbook:**

```bash
export MOLTBOOK_API_KEY="moltbook_sk_..."
```

**LinkedIn:**

```bash
export LINKEDIN_ACCESS_TOKEN="AQV..."
```

### Examples

**Example 1: Week of Twitter Posts**

`week1.csv`:

```csv
datetime,platform,content,media,config
2026-02-10T09:00:00,twitter,"Monday motivation! Start the week strong 💪",,
2026-02-11T09:00:00,twitter,"Tuesday tip: Always test your code before deploying!",,
2026-02-12T09:00:00,twitter,"Wednesday wisdom: Progress over perfection 🚀",,
2026-02-13T09:00:00,twitter,"Thursday thoughts: Code is poetry",,
2026-02-14T09:00:00,twitter,"Friday feeling! Happy Valentine's Day ❤️",,
```

```bash
node scripts/bulk.js import week1.csv
```

**Example 2: Multi-Platform Campaign**

`campaign.json`:

```json
[
  {
    "datetime": "2026-02-15T10:00:00",
    "platform": "twitter",
    "content": "🚀 Announcing our new feature! Read more: https://example.com",
    "media": "assets/feature-preview.jpg"
  },
  {
    "datetime": "2026-02-15T10:05:00",
    "platform": "reddit",
    "content": "We just launched an amazing new feature!",
    "media": "assets/feature-preview.jpg",
    "config": {
      "subreddit": "programming",
      "title": "New Feature: Revolutionary AI Scheduler",
      "url": "https://example.com"
    }
  },
  {
    "datetime": "2026-02-15T10:10:00",
    "platform": "mastodon",
    "content": "Big news! Check out our latest feature 🎉 https://example.com #AI #OpenSource",
    "media": "assets/feature-preview.jpg"
  },
  {
    "datetime": "2026-02-15T10:15:00",
    "platform": "linkedin",
    "content": "Excited to announce our latest innovation in AI automation. Learn more at https://example.com #AI #Technology",
    "media": "assets/feature-preview.jpg"
  }
]
```

```bash
node scripts/bulk.js import campaign.json
```

**Example 3: Daily Check-ins**

Generate a month of daily posts:

```javascript
const posts = []
const start = new Date('2026-03-01')

for (let i = 0; i < 30; i++) {
  const date = new Date(start)
  date.setDate(start.getDate() + i)
  date.setHours(9, 0, 0)

  posts.push({
    datetime: date.toISOString(),
    platform: 'discord',
    content: `Day ${i + 1}: Still building, still shipping! ✨`,
    media: null,
    config: null,
  })
}

require('fs').writeFileSync('march-checkins.json', JSON.stringify(posts, null, 2))
```

Then import:

```bash
node scripts/bulk.js import march-checkins.json
```

### Validation & Testing

Always test with `--dry-run` first:

```bash
# Validate without scheduling
node scripts/bulk.js import mycalendar.csv --dry-run
```

This checks:

- ✅ Datetime format and validity
- ✅ Platform support
- ✅ Content validation
- ✅ Media file existence
- ✅ Config completeness
- ❌ Does NOT schedule posts

### Use Cases

**Content Creator:** Plan a week of social posts in 30 minutes

```bash
# Monday morning: Create content calendar
vim week-content.csv

# Schedule entire week
node scripts/bulk.js import week-content.csv

# Start daemon and forget about it
node scripts/schedule.js daemon
```

**AI Agent:** Automated daily updates

```javascript
// Generate daily status updates
const posts = generateDailyUpdates()
fs.writeFileSync('daily.json', JSON.stringify(posts))

// Bulk schedule
await exec('node scripts/bulk.js import daily.json')
```

**Marketing Campaign:** Coordinated multi-platform launch

```bash
# Same message, multiple platforms, timed releases
node scripts/bulk.js import product-launch.csv
```

### Tips

- **Time zones:** Use ISO 8601 format (`2026-02-04T10:00:00`) in your local timezone
- **Media paths:** Relative to current directory or absolute paths
- **Validation:** Always dry-run first to catch errors
- **Backup:** Keep your CSV/JSON files - they're your content calendar
- **Combine:** Mix platforms in one file for coordinated campaigns

## 📊 Analytics & Performance Tracking ⭐ NEW!

Track your posting success, timing accuracy, and platform performance!

### View Analytics Report

```bash
# Last 7 days (all platforms)
node scripts/analytics.js report

# Last 30 days
node scripts/analytics.js report 30

# Specific platform
node scripts/analytics.js report 7 twitter
```

**Example Output:**

```
📊 Social Scheduler Analytics - Last 7 days

📈 Overview:
  Total Posts: 42
  ✅ Successful: 40
  ❌ Failed: 2
  Success Rate: 95%
  ⏱️  Average Delay: 2 minutes

🌐 By Platform:
  twitter: 15 posts (100% success)
  discord: 12 posts (100% success)
  mastodon: 10 posts (80% success)
  bluesky: 5 posts (100% success)

🧵 Thread Stats:
  Total Threads: 8
  Average Length: 4 posts

📅 Daily Activity:
  2026-02-03: 12 posts (12 ✅, 0 ❌)
  2026-02-02: 15 posts (14 ✅, 1 ❌)
  2026-02-01: 15 posts (14 ✅, 1 ❌)

⚠️  Recent Failures:
  mastodon - 2026-02-02 10:30:15
    Error: Rate limit exceeded
```

### Export Report

```bash
# Export to text file
node scripts/analytics.js export 30 monthly-report.txt

# View raw JSON data
node scripts/analytics.js raw
```

### What's Tracked

**Per Post:**

- Platform and post ID
- Scheduled time vs actual posting time
- Success/failure status
- Error messages (if failed)
- Media count
- Thread detection and length
- Timing delay (how late/early)

**Summary Stats:**

- Total posts (successful/failed)
- Success rate by platform
- Daily posting patterns
- Average timing accuracy
- Thread performance
- Recent failures for debugging

### Automatic Tracking

Analytics are logged automatically whenever the scheduler daemon sends a post. No configuration needed - just start using it and watch your stats grow!

### Use Cases

**Performance Monitoring:**

```bash
# Check weekly success rate
node scripts/analytics.js report 7
```

**Platform Comparison:**

```bash
# Which platform is most reliable?
node scripts/analytics.js report 30 twitter
node scripts/analytics.js report 30 mastodon
```

**Debugging Failures:**

```bash
# See recent errors
node scripts/analytics.js report | grep "Recent Failures"
```

**Monthly Reports:**

```bash
# Generate report for stakeholders
node scripts/analytics.js export 30 january-report.txt
```

## 🔧 From OpenClaw Agent

You can call this skill from your agent using the `exec` tool:

```javascript
// Schedule a Discord post
await exec({
  command: 'node',
  args: [
    'skills/social-scheduler/scripts/schedule.js',
    'add',
    'discord',
    process.env.DISCORD_WEBHOOK,
    'Hello from Ori! ✨',
    '2026-02-02T20:00:00',
  ],
  workdir: process.env.WORKSPACE_ROOT,
})
```

## 📦 Project Structure

```
social-scheduler/
├── SKILL.md              # This file
├── PROJECT.md            # Development roadmap
├── package.json          # Dependencies
├── scripts/
│   ├── schedule.js       # Main scheduler + CLI
│   ├── post.js          # Immediate posting
│   ├── queue.js         # Queue manager
│   └── platforms/
│       ├── discord.js    # Discord webhook implementation
│       ├── reddit.js     # Reddit OAuth2 implementation
│       └── [more...]     # Future platforms
└── storage/
    └── queue.json       # Scheduled posts (auto-created)
```

## 🛠️ Development Status

**Phase 1 - DONE ✅**

- ✅ Discord webhooks
- ✅ Reddit OAuth2
- ✅ Queue management
- ✅ Scheduler daemon
- ✅ CLI interface

**Phase 2 - DONE ✅**

- ✅ Twitter/X API (OAuth 1.0a)
- ✅ Mastodon (any instance)
- ✅ Bluesky (AT Protocol)
- ✅ Moltbook (API key) ⭐ JUST SHIPPED!

**Phase 3 - Coming Soon**

- [ ] Media upload helpers
- [ ] Thread support (Twitter/Reddit)
- [ ] LinkedIn integration

**Phase 3 - DONE ✅**

- ✅ Media upload support (all platforms)
- ✅ Thread support (Twitter, Mastodon, Bluesky)
- ✅ LinkedIn integration
- ✅ Telegram Bot API ⭐ JUST SHIPPED!
- ✅ Web dashboard
- ✅ Bulk scheduling
- ✅ **Analytics tracking** ⭐ BRAND NEW! (Feb 3, 2026)

**Phase 4 - Future**

- [ ] Instagram (browser automation)
- [ ] TikTok (browser automation)
- [ ] Engagement tracking (likes, retweets, etc.)

## 🤝 Contributing

This is an open-source community project. If you add a platform, please:

1. Follow the existing platform structure (see `platforms/discord.js`)
2. Add validation methods
3. Update this README
4. Share with the OpenClaw community!

## 📝 License

MIT - Free forever. Built by Ori ✨ with love for the OpenClaw community.

---

**Questions?** Check PROJECT.md for development notes and architecture details.
