# X (Twitter) Automation via Headless Browser

Bypass the $200/month API by automating X.com directly via browser.

## How It Works

1. User logs in to X.com in their browser
2. OpenClaw attaches to the browser session
3. Scripts automate actions (post, scrape trends, monitor mentions)
4. No API keys, no rate limits (except human-like delays)

## Setup

### Prerequisites

- Chrome or Brave browser installed
- Logged in to X.com
- OpenClaw browser control enabled

### Installation

```bash
cd ~/.openclaw/workspace/x-automation
npm install
```

## Usage

### 1. Scrape Trending Topics

```bash
node scripts/trends.js
```

Output: JSON file with current trending topics

### 2. Post a Tweet

```bash
node scripts/post.js "Your tweet text here"
```

### 3. Monitor Mentions

```bash
node scripts/mentions.js
```

### 4. Auto-Tweet on Trends (with approval)

```bash
node scripts/auto-tweet.js
```

Generates tweet ideas → sends to Telegram → posts approved ones

## Scripts

- `scripts/trends.js` - Scrape trending topics
- `scripts/post.js` - Post tweets
- `scripts/mentions.js` - Check mentions/replies
- `scripts/like.js` - Like tweets strategically
- `scripts/auto-tweet.js` - Full automation with approval flow

## Safety Features

- Human-like delays (random 2-5 sec between actions)
- Daily tweet limit (don't spam)
- Manual approval for auto-generated content
- Session persistence (stay logged in)

## Cron Integration

Add to OpenClaw cron:

```json
{
  "schedule": { "kind": "every", "everyMs": 14400000 },
  "payload": {
    "kind": "agentTurn",
    "message": "Check X trending topics and generate 2-3 tweet ideas. Send to Telegram for approval."
  }
}
```

## Anti-Detection

- Random delays between actions
- Human-like mouse movements
- Don't run 24/7 (schedule like a human)
- Use real browser session (not headless)

## Limitations

- Requires browser to stay open
- Can be detected if too aggressive
- Manual login required (can't automate login itself)

## Legal Note

This automates YOUR account via YOUR browser. You're not violating X ToS any more than using the website normally. Just don't spam or abuse it.
