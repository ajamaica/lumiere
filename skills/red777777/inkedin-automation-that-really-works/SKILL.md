---
name: linkedin-automation
description: LinkedIn automation — post (with image upload), comment (with @mentions), edit/delete comments, repost, read feed, analytics, like monitoring, engagement tracking, and content calendar with approval workflow. Uses Playwright with persistent browser profile. Use for any LinkedIn task including content strategy, scheduled publishing, engagement analysis, and audience growth.
---

# LinkedIn Automation

> **Author:** Community Contributors
>
> ⚠️ **DISCLAIMER — PERSONAL USE ONLY**
> This skill is provided for **personal, non-commercial use only**. It automates your own LinkedIn account for personal productivity and engagement. Do NOT use this skill for spam, mass outreach, scraping other users' data, or any commercial automation service. Use responsibly and in accordance with [LinkedIn's User Agreement](https://www.linkedin.com/legal/user-agreement). The author assumes no liability for misuse or account restrictions.

Automate LinkedIn interactions via headless Playwright browser with a persistent session.

## Prerequisites

- Python 3.10+ with Playwright installed (`pip install playwright && playwright install chromium`)
- A logged-in LinkedIn browser session (persistent Chromium profile)
- Adjust paths in `scripts/lib/browser.py` to match your setup

## Commands

```bash
CLI={baseDir}/scripts/linkedin.py

# Check if session is valid
python3 $CLI check-session

# Read feed
python3 $CLI feed --count 5

# Create a post (text only)
python3 $CLI post --text "Hello world"

# Create a post with image (handles LinkedIn's image editor modal automatically)
python3 $CLI post --text "Hello world" --image /path/to/image.png

# Comment on a post (supports @Mentions — see below)
python3 $CLI comment --url "https://linkedin.com/feed/update/..." --text "Great insight @Betina Weiler!"

# Edit a comment (match by text fragment)
python3 $CLI edit-comment --url "https://..." --match "old text" --text "new text"

# Delete a comment
python3 $CLI delete-comment --url "https://..." --match "text to identify"

# Repost with thoughts
python3 $CLI repost --url "https://..." --thoughts "My take..."

# Engagement analytics for recent posts
python3 $CLI analytics --count 10

# Profile-level stats (followers, views)
python3 $CLI profile-stats

# Monitor your likes for new ones (for comment suggestions)
python3 $CLI scan-likes --count 15

# Scrape someone's activity
python3 $CLI activity --profile-url "https://linkedin.com/in/someone/" --count 5
```

All commands output JSON. Enable debug logging: `LINKEDIN_DEBUG=1`.

## @Mentions

Comments support `@FirstName LastName` syntax. The skill:

1. Types `@FirstName` → waits for typeahead dropdown
2. Progressively types last name letter by letter if needed
3. Clicks the match only if first+last name both match
4. Falls back to plain text if person not found (returns `mention_failed` warning)

Check `mentions` in the JSON result to see if mentions succeeded.

## Like Monitor

The `scan-likes` command checks your recent likes/reactions activity and returns any **new likes since the last check**. State is persisted to avoid duplicate alerts. Ideal for cron/heartbeat integration:

```
# In HEARTBEAT.md or cron job:
python3 $CLI scan-likes → if new likes found → suggest comment for each
```

## ⚠️ Golden Rule

**NEVER post, comment, repost, edit, or delete anything without EXPLICIT user approval.**

Always show the user exactly what will be posted and get a clear "yes" before executing. Read-only actions (feed, analytics, check-session, scan-likes) are safe to run freely.

## Content Calendar (Scheduled Publishing)

Full approval-based publishing workflow with auto-posting. See **[references/content-calendar.md](references/content-calendar.md)** for setup.

- **Webhook** (`scripts/cc-webhook.py`): Receives approve/edit/skip from a frontend UI
- **Auto-apply**: Simple edits (`"old text -> new text"`) applied instantly by webhook
- **Agent processing**: Complex edits flagged for AI-powered text rewriting
- **Auto-post**: Approved posts past their scheduled time are posted automatically via cron
- **Image strategy**: Real photos + AI-generated story overlays (not stock photos)

```bash
# Start the webhook (or install as systemd service)
python3 scripts/cc-webhook.py

# Env vars for config:
# CC_DATA_FILE=/path/to/cc-data.json
# CC_ACTIONS_FILE=/path/to/actions.json
# CC_WEBHOOK_PORT=8401
```

## Content Strategy & Engagement

- **[references/content-strategy.md](references/content-strategy.md)** — Hook formulas, post structure, posting times, hashtag strategy, 4-1-1 rule
- **[references/engagement.md](references/engagement.md)** — Algorithm signals, comment quality formula, rate limits, weekly routine
- **[references/dom-patterns.md](references/dom-patterns.md)** — Known LinkedIn DOM patterns for troubleshooting
- **[references/content-calendar.md](references/content-calendar.md)** — Content calendar setup, data format, webhook API

## Rate Limits

| Action              | Daily Max | Weekly Max |
| ------------------- | --------- | ---------- |
| Posts               | 2–3       | 10–15      |
| Comments            | 20–30     | —          |
| Likes               | 100       | —          |
| Connection requests | 30        | 100        |

## Setup

1. Install dependencies: `pip install playwright && playwright install chromium`
2. Configure browser profile path in `scripts/lib/browser.py` (or set `LINKEDIN_BROWSER_PROFILE` env var)
3. Log in to LinkedIn manually once (the session persists)
4. Run `python3 scripts/linkedin.py check-session` to verify
5. **Learn your voice:** Run `python3 scripts/linkedin.py learn-profile` — this scans your recent posts and comments to learn your tone, topics, language, and style. The agent uses this profile when suggesting comments/posts so they sound like **you**, not like a generic bot.

## Voice & Style

On first setup, `learn-profile` analyzes your content and saves a style profile (`~/.linkedin-style.json`) containing:

- **Language** (de/en/mixed)
- **Tone** (casual / professional / professional-friendly)
- **Emoji usage** (heavy / moderate / minimal)
- **Top hashtags** you use
- **Sample posts and comments** for voice reference

The agent should ALWAYS read this profile (`get-style`) before drafting any comment or post suggestion. Never impose a foreign voice — match the user's natural style.

## Post Age Warning

**CRITICAL:** Before suggesting a comment on any post, check how old the post is:

- **< 2 weeks:** Safe to comment
- **> 2 weeks:** Warn the user explicitly ("⚠️ This post is X weeks old — commenting on old posts can look like bot behavior. Still want to?")
- **> 1 month:** Strongly discourage unless there's a specific reason

Commenting on old posts makes it look like you're mining someone's history with a bot. Always flag post age.

## Troubleshooting

- **Session expired**: Log in again via browser profile
- **Selectors broken**: LinkedIn updates UI frequently — check `references/dom-patterns.md` and update `scripts/lib/selectors.py`
- **Debug screenshots**: Saved to `/tmp/linkedin_debug_*.png` on failure
