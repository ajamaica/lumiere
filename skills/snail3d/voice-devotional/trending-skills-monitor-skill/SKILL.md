---
name: trending-skills-monitor
description: Track and discover trending, new, and recently updated skills from ClawdHub. Filter by interests (3D printing, coding, automation, etc.), category, or search keywords. Get daily/weekly reports or enable watch mode for continuous monitoring.
---

# Trending Skills Monitor

Discover what's new and hot in the Clawdbot skill ecosystem. Track trending skills, new releases, recent updates, and filter by your interests.

## Quick Start

### Basic Usage

```bash
# Check this week's trending skills
trending-skills-monitor

# Check last 14 days
trending-skills-monitor --days 14

# Filter by interests
trending-skills-monitor --interests "3D printing, coding, automation"

# Get top 10 trending
trending-skills-monitor --top 10

# Watch mode - check every hour
trending-skills-monitor --watch --interval 3600
```

### Output Example

```
🔥 Trending Skills Report
============================================================
📅 2026-01-29T10:15:00.000000

✨ NEW RELEASES (Last 7 Days)
------------------------------------------------------------
  📦 webhook-listener
     Downloads: 342 | Listen for HTTP webhooks in Clawdbot... | Created: 2026-01-28

  📦 ocr-vision
     Downloads: 156 | Extract text from images using Claude vision... | Created: 2026-01-27

🔝 COMMUNITY FAVORITES (Most Installed)
------------------------------------------------------------
  🥇 #1. security-scanner
     📥 8,324 installs | ⭐ 4.8 | 📁 security

  🥈 #2. sentry-mode
     📥 7,891 installs | ⭐ 4.7 | 📁 surveillance

🔄 RECENT UPDATES
------------------------------------------------------------
  🆕 meshtastic-skill (v2.3.0)
     Updated: 2026-01-29 | Fixed GPS integration, added mesh network visualization

============================================================
📊 Total skills: 28
```

## Features

### 1. Track New Skills

- Discover skills released in the last X days (configurable)
- Shows download count, description, and creation date
- Helps you stay updated with the latest releases

### 2. Trending Analysis

- Most installed/downloaded community favorites
- Ranked by install count or downloads
- Includes rating and category info
- Helps identify proven, popular tools

### 3. Monitor Updates

- Track recently updated skills
- See version changes and changelogs
- Know when your favorite skills get improvements
- Avoid missing important feature releases

### 4. Smart Filtering

- Filter by interests: `--interests "3D printing, coding"`
- Filter by category: `--category "automation"`
- Combined filtering for precise results
- Fuzzy keyword matching on descriptions

### 5. Watch Mode

- Continuous monitoring of ClawdHub
- Configurable check interval
- New skill discovery notifications
- Helps you catch trends early

## Usage Examples

### Example 1: Weekly Trend Report

```bash
trending-skills-monitor --days 7
```

Gets all new skills from the last 7 days, trending skills, and recent updates.

### Example 2: Focus on Your Interests

```bash
trending-skills-monitor \
  --interests "automation, data processing" \
  --days 14 \
  --format markdown
```

Filters results to skills matching "automation" or "data processing" from the last 2 weeks, outputs as markdown.

### Example 3: Top Skills in a Category

```bash
trending-skills-monitor \
  --category "iot" \
  --top 5 \
  --sort rating
```

Shows top 5 IoT skills sorted by rating.

### Example 4: Watch Mode with Email Reports

```bash
# Run in background, check every 6 hours
trending-skills-monitor \
  --watch \
  --interval 21600 \
  --interests "3D printing" \
  --format markdown > /tmp/skills-report.txt

# Then pipe to email or Telegram
```

### Example 5: Track Your Favorite Skills

Create a config file and check daily:

```bash
# config.json
{
  "interests": ["security", "automation", "data processing"],
  "days": 7,
  "category": "utility"
}

# Use it
trending-skills-monitor --config config.json --format json
```

## Command Reference

### Global Options

```
--days N              Look back N days for new/updated skills (default: 7)
--interests STR       Comma-separated interests to filter by
--top N               Show top N trending skills (overrides --days)
--category STR        Filter by specific category
--sort FIELD          Sort by: downloads, installs, rating, updated, new (default: downloads)
--format FORMAT       Output format: text, json, markdown (default: text)
--watch               Enable watch mode (continuous monitoring)
--interval SECS       Check interval in seconds for watch mode (default: 3600)
--config FILE         Load settings from JSON config file
--verbose             Show debug output
--help                Show this help message
```

### Examples

```bash
# New skills from last 30 days
trending-skills-monitor --days 30

# Top 20 most installed
trending-skills-monitor --top 20 --sort installs

# Filter to automation category
trending-skills-monitor --category automation

# Multiple interests
trending-skills-monitor --interests "coding, automation, data"

# JSON output for scripting
trending-skills-monitor --format json > report.json

# Watch mode: check every 2 hours
trending-skills-monitor --watch --interval 7200

# Combine filters
trending-skills-monitor \
  --days 14 \
  --interests "security" \
  --category "surveillance" \
  --sort rating
```

## Output Formats

### Text Format (Default)

Plain text with emojis, organized in sections:

- ✨ NEW RELEASES
- 🔝 COMMUNITY FAVORITES
- 🔄 RECENT UPDATES

Great for terminal viewing and quick scanning.

### Markdown Format

```bash
trending-skills-monitor --format markdown
```

Output:

```markdown
# 🔥 Trending Skills Report

_2026-01-29T10:15:00_

## ✨ New Releases

**webhook-listener** (v1.2.0) by author-name  
Listen for HTTP webhooks in Clawdbot...  
📥 345 installs | ⭐ 4.9 | 📊 1,234 downloads
```

Good for documentation, reports, and posting to channels.

### JSON Format

```bash
trending-skills-monitor --format json
```

Structured data for programmatic processing:

```json
{
  "timestamp": "2026-01-29T10:15:00.000000",
  "new_skills": [
    {
      "id": "webhook-listener",
      "name": "webhook-listener",
      "description": "...",
      "author": "...",
      "downloads": 342,
      "installs": 345,
      "rating": 4.9,
      "category": "communication",
      "version": "1.2.0",
      "created_at": "2026-01-28T...",
      "updated_at": "2026-01-29T...",
      "tags": ["http", "webhook", "event"]
    }
  ],
  "trending_skills": [...],
  "updated_skills": [...],
  "filters": {
    "days": 7,
    "interests": [],
    "category": null,
    "sort": "downloads"
  }
}
```

Perfect for integration with other tools and automation.

## Configuration Files

Create a JSON config file to save your preferences:

```json
{
  "interests": ["3D printing", "coding", "automation"],
  "days": 7,
  "category": null,
  "sort": "downloads",
  "top": 20,
  "format": "text"
}
```

Use it:

```bash
trending-skills-monitor --config my-config.json
```

## Smart Filtering

The skill uses intelligent keyword matching:

### Interest Matching

- **Exact word match**: "coding" matches "coding-tutorials"
- **Substring match**: "3d" matches "3d-printing" or "3d-model-viewer"
- **Fuzzy matching**: "3D printing" matches skills with "3D-printing", "3d printing", "3d-print"
- **Description search**: Searches skill descriptions, tags, and metadata

### Category Matching

Built-in category aliases for common terms:

```
automation      → "automate", "workflow", "robot", "task"
coding          → "code", "programming", "script", "dev"
3d-printing     → "3d", "cad", "model"
data            → "analytics", "machine-learning", "ml", "ai"
web             → "http", "api", "website", "web-scraping"
iot             → "sensors", "esp32", "arduino", "hardware"
communication   → "telegram", "slack", "email", "discord"
media           → "image", "video", "audio", "photo"
```

## Watch Mode

Continuously monitor ClawdHub for new and trending skills:

```bash
# Check every 30 minutes
trending-skills-monitor --watch --interval 1800

# Check every 6 hours with interests
trending-skills-monitor \
  --watch \
  --interval 21600 \
  --interests "security, automation"
```

Watch mode:

- Runs indefinitely, checking at specified interval
- Compares with previous check to find new skills
- Shows notifications when new skills are discovered
- Useful for cron jobs or systemd timers

### Integration with Notifications

Watch mode output to Telegram:

```bash
# Assuming you have a message utility
trending-skills-monitor --format markdown | \
  message send --channel "alerts" --text "$(cat -)"
```

## Integration Examples

### Daily Digest Script

```bash
#!/bin/bash
# save as: /usr/local/bin/skills-digest.sh

trending-skills-monitor \
  --days 1 \
  --interests "automation, security" \
  --format markdown > /tmp/skills-today.md

# Send to Telegram, email, or store
cat /tmp/skills-today.md
```

Run daily via cron:

```bash
# Add to crontab
0 9 * * * /usr/local/bin/skills-digest.sh
```

### Slack Integration

```bash
#!/bin/bash
REPORT=$(trending-skills-monitor --format json)

curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK \
  -H 'Content-Type: application/json' \
  -d "{
    \"text\": \"🔥 New Skills This Week\",
    \"blocks\": [
      {
        \"type\": \"section\",
        \"text\": {
          \"type\": \"mrkdwn\",
          \"text\": \"$REPORT\"
        }
      }
    ]
  }"
```

### Filter to Dashboard

Parse JSON output and filter:

```bash
# Get only highly-rated new skills
trending-skills-monitor --format json | \
  jq '.new_skills | map(select(.rating >= 4.5))'
```

## Architecture

### Components

**trending-skills-monitor** (CLI)

- Entry point, argument parsing
- Routes to main monitoring script

**scripts/monitor.py**

- Main orchestrator
- Fetches data, applies filters, formats output
- Handles watch mode logic

**scripts/clawdhub_api.py**

- Communicates with ClawdHub API
- Fallback to mock data for testing
- Caches responses

**scripts/filter_engine.py**

- Intelligent filtering by interests and categories
- Fuzzy keyword matching
- Category alias mapping

**scripts/formatter.py**

- Formats output (text, JSON, markdown)
- Different views (ranked, compact, detailed)

**scripts/cache.py**

- Simple file-based caching
- Configurable TTL (time-to-live)
- Watch mode state tracking

### Data Flow

```
CLI args
  ↓
monitor.py (orchestrator)
  ↓
ClawdHubAPI → Fetch (new, trending, updated)
  ↓
FilterEngine → Apply interests/categories
  ↓
Formatter → Format output
  ↓
Print results
```

## Configuration

### Environment Variables

```bash
# ClawdHub API configuration
export CLAWDHUB_API_URL="https://hub.clawdbot.com/api/v1"
export CLAWDHUB_API_KEY="your-api-key-here"
```

### Cache Location

Cache files stored at: `~/.cache/trending-skills-monitor/`

Clear cache:

```bash
rm -rf ~/.cache/trending-skills-monitor/
```

## Requirements

### System Dependencies

- Python 3.7+
- requests library (`pip install requests`)

### API Requirements

- ClawdHub API access (will work with mock data for testing)
- Optional: API key for authenticated requests

### Network

- Internet connection to ClawdHub
- Graceful fallback to mock data if unavailable

## Troubleshooting

### No results returned

```bash
# Debug with verbose output
trending-skills-monitor --verbose

# Check if interests are matching
trending-skills-monitor --interests "automation" --verbose

# Try broader search
trending-skills-monitor --days 30
```

### API errors

If you see API errors but want to test:

```bash
# Will use mock data
CLAWDHUB_API_URL="http://invalid" trending-skills-monitor
```

### Watch mode not detecting new skills

```bash
# Check cache status
ls ~/.cache/trending-skills-monitor/

# Clear cache
rm ~/.cache/trending-skills-monitor/*

# Restart watch mode
trending-skills-monitor --watch --verbose
```

## Future Enhancements

Planned features:

- [ ] Webhook notifications (Telegram, Discord, Slack)
- [ ] Scheduled reports (daily/weekly emails)
- [ ] Skill recommendations based on installed skills
- [ ] Comparison tracking ("Skills similar to X")
- [ ] Rating/review aggregation from users
- [ ] Export to calendar (upcoming skill releases)
- [ ] AI-powered skill summaries
- [ ] Skill dependency tracking

## Scripts Reference

The skill includes these Python scripts:

- **monitor.py** - Main orchestrator (10KB)
- **clawdhub_api.py** - API client (8KB)
- **filter_engine.py** - Filtering logic (6KB)
- **formatter.py** - Output formatting (6KB)
- **cache.py** - Caching layer (2KB)

## License & Support

Part of the Clawdbot ecosystem. For issues or suggestions, check the ClawdHub repository.

---

**Last Updated:** 2026-01-29
**Version:** 1.0.0
