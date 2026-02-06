# Installation & Setup Guide

## Prerequisites

- Python 3.7+
- `requests` library for HTTP calls

## Install

The skill is already part of Clawdbot, but you can verify the installation:

### 1. Check CLI is Available

```bash
trending-skills-monitor --help
```

If you see the help output, you're good to go!

### 2. Install Dependencies

```bash
# Install requests library if not present
pip install requests

# Verify installation
python3 -c "import requests; print('✅ requests installed')"
```

### 3. Verify Scripts

Check that all scripts are executable:

```bash
ls -la ~/clawd/trending-skills-monitor-skill/scripts/
```

You should see:

- `monitor.py` (main orchestrator)
- `clawdhub_api.py` (API client)
- `filter_engine.py` (filtering logic)
- `formatter.py` (output formatting)
- `cache.py` (caching)

## Configuration

### 1. Set API Credentials (Optional)

If you have ClawdHub API credentials:

```bash
export CLAWDHUB_API_URL="https://hub.clawdbot.com/api/v1"
export CLAWDHUB_API_KEY="your-api-key-here"
```

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) for persistence:

```bash
echo 'export CLAWDHUB_API_URL="https://hub.clawdbot.com/api/v1"' >> ~/.zshrc
echo 'export CLAWDHUB_API_KEY="your-api-key"' >> ~/.zshrc
```

### 2. Create Config File (Optional)

Save your preferred settings to `~/.config/trending-skills-monitor/config.json`:

```bash
mkdir -p ~/.config/trending-skills-monitor
cp config.example.json ~/.config/trending-skills-monitor/config.json
```

Edit `config.json`:

```json
{
  "interests": ["automation", "security", "coding"],
  "days": 7,
  "sort": "downloads",
  "format": "text"
}
```

Use it:

```bash
trending-skills-monitor --config ~/.config/trending-skills-monitor/config.json
```

## First Run

### Test Basic Functionality

```bash
# Run a simple report (uses demo/mock data if API unavailable)
trending-skills-monitor
```

You should see output like:

```
🔥 Trending Skills Report
============================================================
...
```

### Test with Options

```bash
# Show last 14 days
trending-skills-monitor --days 14

# JSON output
trending-skills-monitor --format json

# Specific interests
trending-skills-monitor --interests "automation, security"
```

## Integration Setup

### Cron Job (Daily Report)

Create a script `~/bin/skills-report.sh`:

```bash
#!/bin/bash
trending-skills-monitor --days 1 --format markdown
```

Make executable:

```bash
chmod +x ~/bin/skills-report.sh
```

Add to crontab:

```bash
crontab -e
# Add this line (runs at 9 AM every day)
0 9 * * * ~/bin/skills-report.sh >> ~/skills-daily.log 2>&1
```

### Watch Mode (Background Monitor)

Run continuously in background:

```bash
# Start watch mode (checks every hour)
nohup trending-skills-monitor \
  --watch \
  --interval 3600 \
  --interests "automation" \
  > ~/.logs/skills-monitor.log 2>&1 &

# View logs
tail -f ~/.logs/skills-monitor.log
```

### Telegram Integration

Send reports to Telegram:

```bash
# One-time report
trending-skills-monitor --format markdown | \
  message send --channel "tech-updates" --text "$(cat -)"

# In a script
#!/bin/bash
REPORT=$(trending-skills-monitor --days 7 --format markdown)
message send --channel "tech-updates" --text "$REPORT"
```

### Email Integration

Send daily digest:

```bash
#!/bin/bash
# Create script ~/bin/mail-skills.sh
REPORT=$(trending-skills-monitor --days 1 --format markdown)

echo "$REPORT" | mail -s "🔥 Skills Report $(date +%Y-%m-%d)" you@example.com
```

Add to crontab:

```bash
0 9 * * * ~/bin/mail-skills.sh
```

### Slack Integration

Post to Slack channel:

```bash
#!/bin/bash
REPORT=$(trending-skills-monitor --format json)

curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/HERE \
  -H 'Content-Type: application/json' \
  -d @- << EOF
{
  "text": "🔥 Trending Skills This Week",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "$(trending-skills-monitor --days 7 --format markdown)"
      }
    }
  ]
}
EOF
```

## Troubleshooting

### Command Not Found

If `trending-skills-monitor` command is not found:

```bash
# Add to PATH
export PATH="$PATH:$HOME/clawd/trending-skills-monitor-skill"

# Or create symlink
ln -s ~/clawd/trending-skills-monitor-skill/trending-skills-monitor /usr/local/bin/
```

### Python Import Errors

```bash
# Check Python version
python3 --version  # Should be 3.7+

# Verify requests module
python3 -c "import requests" || pip install requests

# Test script directly
python3 ~/clawd/trending-skills-monitor-skill/scripts/monitor.py --help
```

### API Connection Issues

The skill gracefully falls back to demo data:

```bash
# Run with verbose output to see what's happening
trending-skills-monitor --verbose

# Try with mock data (no API)
CLAWDHUB_API_URL="http://invalid" trending-skills-monitor --verbose
```

### Cache Issues

Clear the cache if you have stale data:

```bash
# Clear all cache
rm -rf ~/.cache/trending-skills-monitor/

# Or specific cache file
rm ~/.cache/trending-skills-monitor/skills_new.json
```

## Uninstall

The skill is part of Clawdbot core, but you can disable it:

```bash
# Remove from PATH (if you added symlink)
rm /usr/local/bin/trending-skills-monitor

# Clear cache
rm -rf ~/.cache/trending-skills-monitor/

# Remove config (optional)
rm -rf ~/.config/trending-skills-monitor/
```

## Verification

Verify everything is working:

```bash
# 1. Check CLI works
trending-skills-monitor --help

# 2. Test basic functionality
trending-skills-monitor --days 7

# 3. Test JSON output
trending-skills-monitor --format json

# 4. Test filtering
trending-skills-monitor --interests "security"

# 5. Verify cache
ls ~/.cache/trending-skills-monitor/
```

All good? You're ready to start monitoring! 🚀

## Getting Help

For issues or questions:

1. Check **README.md** - Quick start and examples
2. Check **SKILL.md** - Detailed documentation
3. Run with `--verbose` for debug output
4. Check ClawdHub docs for API information

---

**Happy skill hunting!** 🔥
