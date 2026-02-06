---
name: mia-twitter-stealth
description: Twitter/X automation with advanced stealth and anti-detection
version: 1.0.0
author: MiaBloomx
tags:
  - twitter
  - automation
  - stealth
  - anti-detection
  - social-media
metadata:
  clawdbot:
    emoji: 🕵️‍♀️
---

# Mia Twitter Stealth 🕵️‍♀️

Twitter/X automation with advanced stealth techniques to avoid bot detection.

## Anti-Detection Features

### 1. Playwright Stealth

- Hides `navigator.webdriver`
- Masks Chrome automation flags
- Spoofs plugins and languages

### 2. Headful Mode

- `headless: false` by default
- Real browser UI visible
- Avoids headless detection

### 3. Human Behavior

- Random typing delays (50-150ms)
- Mouse movement simulation
- Random wait times
- Natural scroll patterns

### 4. Session Persistence

- Cookie storage
- LocalStorage persistence
- User data directory

### 5. Cooldown Management

- Rate limit tracking
- Automatic backoff
- 24h cooldown if flagged

## Usage

```bash
# Post tweet
mia-twitter post "Hello world"

# Reply to tweet
mia-twitter reply <tweet-id> "Great post!"

# Like tweets by search
mia-twitter like --search "AI agents" --limit 10

# Follow users
mia-twitter follow --search "founder" --limit 5

# Check notifications
mia-twitter notifications
```

## Safety

- Max 5 actions per hour
- Max 50 per day
- 2-5 min delays between actions
- Human-like patterns only

## Requirements

- X_AUTH_TOKEN env var
- X_CT0 env var
- Playwright with Chromium
