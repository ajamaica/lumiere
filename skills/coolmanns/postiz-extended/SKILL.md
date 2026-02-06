---
name: postiz
description: |
  Schedule and manage social media posts via Postiz API (self-hosted or cloud).
  Direct API integration — no n8n dependency.
  Supports X/Twitter, LinkedIn, Bluesky with platform-specific character limits.
  Includes deduplication, scheduling, media upload, and thread creation.

  WHAT IT CAN DO:
  - Schedule posts to 28+ channels (X, LinkedIn, Bluesky, Reddit, Instagram, Facebook, Threads, YouTube, TikTok, Pinterest, Mastodon, and more)
  - Multi-platform posting in a single API call with platform-adapted content
  - X/Twitter thread creation for longer content
  - Media upload (file and URL)
  - Find next available posting slot per channel
  - List, query, update, and delete scheduled posts
  - Deduplication workflow (check existing before posting)
  - Platform-specific character limits and content tone guidance
  - Post state management (QUEUE, PUBLISHED, ERROR, DRAFT)
  - Helper script for quick posting with auto-validation

  USE WHEN: scheduling social media posts, creating multi-platform content, managing a posting calendar, uploading media for social posts, checking post status, creating X/Twitter threads, or automating social media workflows.
---

# Postiz Social Media Scheduler

Direct API integration for social media posting. No n8n workflows needed.

## Setup

### Required Environment Variables

```bash
# Core configuration
export POSTIZ_URL="https://your-postiz-instance.com"
export POSTIZ_EMAIL="your@email.com"
export POSTIZ_PASSWORD="your-password"

# Integration IDs (get from Postiz dashboard → Integrations)
export POSTIZ_X_ID="your-x-integration-id"
export POSTIZ_LINKEDIN_ID="your-linkedin-integration-id"
export POSTIZ_BLUESKY_ID="your-bluesky-integration-id"
```

To find your integration IDs:

1. Go to your Postiz dashboard
2. Navigate to **Integrations** or **Channels**
3. Each connected account shows an ID (or use the API: `GET /api/integrations/list`)

## Platform Limits

| Platform  | Character Limit | Notes                                     |
| --------- | --------------- | ----------------------------------------- |
| X/Twitter | **280**         | Links count as 23 chars (t.co shortening) |
| LinkedIn  | **3,000**       | First 140 chars show in preview           |
| Bluesky   | **300**         | Growing tech/developer audience           |

## Platform Content Guidelines

### X/Twitter (280 chars)

- Short, punchy content
- 1-2 hashtags max
- Threads for longer content (multiple tweets)

### LinkedIn (3,000 chars)

- Professional tone
- Can be longer-form
- Hashtags at end (3-5 recommended)
- First 140 chars show in preview — make them count!

### Bluesky (300 chars)

- Similar to X but slightly more room
- No official hashtag support (use sparingly)
- Growing tech/developer audience

## Authentication

```bash
# Login and save cookie (required before any API call)
curl -s -c /tmp/postiz-cookies.txt \
  "$POSTIZ_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$POSTIZ_EMAIL\",\"password\":\"$POSTIZ_PASSWORD\",\"provider\":\"LOCAL\"}"
```

Cookie expires periodically. Re-run login if you get 401 errors.

## Find Next Available Slot

```bash
curl -s -b /tmp/postiz-cookies.txt \
  "$POSTIZ_URL/api/posts/find-slot/$POSTIZ_X_ID"
```

Returns the next open time slot for a given channel. Useful for auto-scheduling without conflicts.

## Upload Media from URL

```bash
curl -s -b /tmp/postiz-cookies.txt \
  "$POSTIZ_URL/api/media/upload-from-url" \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://example.com/image.png"}'
```

## Creating Posts

### Schedule a Post (Single Platform)

```bash
curl -s -b /tmp/postiz-cookies.txt \
  "$POSTIZ_URL/api/posts" \
  -H 'Content-Type: application/json' \
  -d "{
    \"type\": \"schedule\",
    \"date\": \"2026-02-05T15:00:00Z\",
    \"posts\": [{
      \"integration\": {\"id\": \"$POSTIZ_X_ID\"},
      \"value\": [{\"content\": \"Your tweet here (max 280 chars)\", \"image\": []}],
      \"settings\": {\"__type\": \"x\"}
    }]
  }"
```

### Multi-Platform Post (Adapted Content)

```bash
curl -s -b /tmp/postiz-cookies.txt \
  "$POSTIZ_URL/api/posts" \
  -H 'Content-Type: application/json' \
  -d "{
    \"type\": \"schedule\",
    \"date\": \"2026-02-05T15:00:00Z\",
    \"posts\": [
      {
        \"integration\": {\"id\": \"$POSTIZ_X_ID\"},
        \"value\": [{\"content\": \"Short X version (280 chars max)\", \"image\": []}],
        \"settings\": {\"__type\": \"x\"}
      },
      {
        \"integration\": {\"id\": \"$POSTIZ_LINKEDIN_ID\"},
        \"value\": [{\"content\": \"Longer LinkedIn version with more context and professional tone. Can be up to 3000 characters.\", \"image\": []}],
        \"settings\": {\"__type\": \"linkedin\"}
      },
      {
        \"integration\": {\"id\": \"$POSTIZ_BLUESKY_ID\"},
        \"value\": [{\"content\": \"Bluesky version (300 chars max)\", \"image\": []}],
        \"settings\": {\"__type\": \"bluesky\"}
      }
    ]
  }"
```

### Post Types

- `schedule` — Auto-publish at specified date/time
- `draft` — Save for review (won't auto-publish)
- `now` — Publish immediately

## Listing & Querying Posts

### Get Posts by Date Range (Required!)

```bash
curl -s -b /tmp/postiz-cookies.txt \
  "$POSTIZ_URL/api/posts?startDate=2026-02-01T00:00:00Z&endDate=2026-02-08T00:00:00Z" \
  | jq '.posts[] | {id, state, publishDate, platform: .integration.providerIdentifier, content: .content[0:60]}'
```

### Check for Duplicates Before Posting

```bash
# Get recent posts and check content similarity
curl -s -b /tmp/postiz-cookies.txt \
  "$POSTIZ_URL/api/posts?startDate=2026-02-01T00:00:00Z&endDate=2026-02-08T00:00:00Z" \
  | jq -r '.posts[] | "\(.integration.providerIdentifier): \(.content[0:80])"'
```

## Post States

| State       | Description                   |
| ----------- | ----------------------------- |
| `QUEUE`     | Scheduled, waiting to publish |
| `PUBLISHED` | Successfully posted           |
| `ERROR`     | Failed to publish             |
| `DRAFT`     | Saved but not scheduled       |

## Media Upload

### Upload Image

```bash
# Upload returns {id, path}
curl -s -b /tmp/postiz-cookies.txt \
  "$POSTIZ_URL/api/media/upload-simple" \
  -F 'file=@/path/to/image.png'
```

### Use in Post

```json
"value": [{
  "content": "Post with image",
  "image": [{"id": "MEDIA_ID", "path": "/uploads/..."}]
}]
```

## Twitter/X Threads

For longer content on X, create a thread:

```json
"value": [
  {"content": "Tweet 1/3: Introduction to the topic...", "image": []},
  {"content": "Tweet 2/3: The main point explained...", "image": []},
  {"content": "Tweet 3/3: Conclusion and call to action.", "image": []}
]
```

## Managing Posts

### Delete Post

```bash
curl -s -b /tmp/postiz-cookies.txt -X DELETE \
  "$POSTIZ_URL/api/posts/POST_ID"
```

### Update Schedule

```bash
curl -s -b /tmp/postiz-cookies.txt -X PUT \
  "$POSTIZ_URL/api/posts/POST_ID/date" \
  -H 'Content-Type: application/json' \
  -d '{"date": "2026-02-06T10:00:00Z"}'
```

## Best Practices

### Avoid Duplicates

1. Always query existing posts before creating new ones
2. Use unique identifiers in content (dates, specific references)
3. Check both QUEUE and PUBLISHED states

### Scheduling

- Space posts at least 2-4 hours apart per platform
- Best times: 9 AM, 12 PM, 5 PM (audience timezone)
- Avoid posting same content to all platforms simultaneously

### Content Adaptation

Don't just truncate! Rewrite for each platform:

- **X**: Hook + key insight + CTA
- **LinkedIn**: Context + value + engagement question
- **Bluesky**: Casual tech-friendly tone

## Helper Scripts

### Post to Multiple Platforms

```bash
# Single platform
uv run scripts/post.py \
  --platform x \
  --content "Your tweet here" \
  --schedule "2026-02-05T15:00:00Z"

# Multi-platform with different content
uv run scripts/post.py \
  --x "Short X version" \
  --linkedin "Longer LinkedIn version with more detail" \
  --bluesky "Bluesky version" \
  --schedule "2026-02-05T15:00:00Z"

# Post immediately
uv run scripts/post.py \
  --platform x \
  --content "Posting now!" \
  --now

# Validate without posting
uv run scripts/post.py \
  --x "Test content" \
  --validate
```

### Check for Duplicates

```bash
# Check last 30 days
uv run scripts/check_duplicates.py

# Check last 7 days
uv run scripts/check_duplicates.py --days 7

# Check if specific content would be duplicate
uv run scripts/check_duplicates.py --content "Your proposed post content"
```

## Troubleshooting

### 401 Unauthorized

Re-run the login curl command to refresh cookie.

### Post Not Publishing

1. Check state is `QUEUE` not `DRAFT`
2. Verify date is in the future
3. Check integration is still connected in UI

### Duplicate Posts

Always check existing posts before creating. The API doesn't deduplicate automatically.

### Missing Environment Variables

Scripts will tell you which env vars are missing. Set them in your shell or `.env` file:

```bash
export POSTIZ_URL="https://your-postiz.example.com"
export POSTIZ_EMAIL="your@email.com"
export POSTIZ_PASSWORD="your-password"
export POSTIZ_X_ID="your-integration-id"
```
