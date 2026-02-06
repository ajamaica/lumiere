# Trending Skills Monitor

🔥 **Track and discover what's hot in Clawdbot skills!**

Automatically monitor ClawdHub for:

- **New skill releases** - Stay updated with the latest drops
- **Trending skills** - Find community favorites
- **Recent updates** - Know when your favorite skills improve
- **Smart filtering** - Filter by interests (3D printing, coding, automation, etc.)

## Quick Start

```bash
# Check this week's trends
trending-skills-monitor

# Filter by interests
trending-skills-monitor --interests "3D printing, coding"

# Top 10 trending
trending-skills-monitor --top 10

# Watch mode - continuous monitoring
trending-skills-monitor --watch --interval 3600
```

## Features

✨ **New Releases** - Discover fresh skills with metadata  
🔝 **Trending Analysis** - Most installed and highest-rated  
🔄 **Update Tracking** - Know when skills get improvements  
🎯 **Smart Filtering** - Filter by interests and categories  
👀 **Watch Mode** - Continuous monitoring with alerts  
📊 **Multiple Formats** - Text, JSON, Markdown output

## Installation

Already included in Clawdbot! Just use:

```bash
trending-skills-monitor --help
```

## Usage Examples

### Basic Report

```bash
trending-skills-monitor --days 7
```

### Filter by Interests

```bash
trending-skills-monitor --interests "automation, data processing"
```

### Top Trending

```bash
trending-skills-monitor --top 20 --sort rating
```

### Watch Mode

```bash
trending-skills-monitor --watch --interval 1800  # Check every 30 mins
```

### Markdown Output

```bash
trending-skills-monitor --format markdown
```

## Output Example

```
🔥 Trending Skills Report
============================================================
📅 2026-01-29T10:15:00.000000

✨ NEW RELEASES (Last 7 Days)
------------------------------------------------------------
  📦 webhook-listener
     Downloads: 342 | Listen for HTTP webhooks... | Created: 2026-01-28

🔝 COMMUNITY FAVORITES (Most Installed)
------------------------------------------------------------
  🥇 #1. security-scanner
     📥 8,324 installs | ⭐ 4.8 | 📁 security

  🥈 #2. sentry-mode
     📥 7,891 installs | ⭐ 4.7 | 📁 surveillance

🔄 RECENT UPDATES
------------------------------------------------------------
  🆕 meshtastic-skill (v2.3.0)
     Updated: 2026-01-29 | Fixed GPS integration...
```

## Command Line Options

```
--days N              Number of days to look back (default: 7)
--interests STR       Comma-separated interests to filter
--top N               Show top N trending skills
--category STR        Filter by category
--sort FIELD          Sort by: downloads, installs, rating, updated, new
--format FORMAT       Output format: text, json, markdown (default: text)
--watch               Enable continuous monitoring
--interval SECS       Watch mode check interval in seconds (default: 3600)
--config FILE         Load settings from JSON config file
--verbose             Show debug output
```

## Interests & Categories

Supported interests include:

- **Automation** - Workflow, task automation
- **Coding** - Programming, development, scripting
- **3D Printing** - CAD, 3D modeling
- **Data** - Analytics, machine learning, AI
- **Web** - HTTP APIs, web scraping
- **IoT** - Sensors, Arduino, ESP32
- **Communication** - Telegram, Slack, Discord
- **Media** - Images, video, audio
- **Security** - Encryption, monitoring
- **Utilities** - Tools, helpers, converters

## Configuration

Create a `config.json` to save preferences:

```json
{
  "interests": ["automation", "security"],
  "days": 7,
  "category": "surveillance",
  "sort": "rating"
}
```

Use it:

```bash
trending-skills-monitor --config config.json
```

## Integration

### Daily Cron Job

```bash
0 9 * * * trending-skills-monitor --days 1 > ~/skills-daily.txt
```

### Watch Background

```bash
nohup trending-skills-monitor --watch --interval 3600 > ~/.skills-monitor.log 2>&1 &
```

### Telegram Alert

```bash
trending-skills-monitor --format markdown | message send --channel "alerts"
```

### JSON for Scripting

```bash
trending-skills-monitor --format json | jq '.new_skills | length'
```

## Troubleshooting

**Q: No results?**

```bash
# Try with verbose output
trending-skills-monitor --verbose

# Check broader search
trending-skills-monitor --days 30
```

**Q: API not working?**
Will fallback to mock data for testing. For real ClawdHub data, set:

```bash
export CLAWDHUB_API_URL="https://hub.clawdbot.com/api/v1"
export CLAWDHUB_API_KEY="your-api-key"
```

**Q: Clear cache?**

```bash
rm ~/.cache/trending-skills-monitor/*
```

## Documentation

For full documentation, see **SKILL.md** - includes:

- Detailed usage examples
- All command options
- Configuration guide
- Integration patterns
- Architecture overview
- Troubleshooting

## Version

**1.0.0** - Initial release

- Track new skills
- Monitor trending
- Watch recent updates
- Smart filtering
- Multiple output formats

---

Made for the Clawdbot community. Happy skill hunting! 🚀
