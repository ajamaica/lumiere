# 🌅 Morning Briefing Cron Job - Setup Guide

## Overview

This cron job runs **daily at 10:15 AM Mountain Standard Time (MST)** and generates a comprehensive morning briefing with the following components:

### Main Briefing (Single Consolidated Message)

1. **YouTube Analytics**: Last 24h performance, top videos, subscriber changes
2. **Email Summary**: Unread count, important senders, key messages
3. **Weather**: Current Denver conditions + today's forecast
4. **Calendar**: Today's events + upcoming 48h
5. **News Summary**: Tech/maker/AI news with trending topics and links
6. **Research Briefs**:
   - 3D printing (new products, techniques, announcements)
   - Agentic coding (Claude, AutoGPT, reasoning patterns)
   - Clawdbot ecosystem (new features, community updates)
   - Trending Clawdbot skills (top installed, new releases)

### Skill Discovery Sub-Agent (Async Processing)

Runs in parallel and sends a second message with:

- Analyzes workspace context (MEMORY.md, daily logs, questions asked)
- Searches ClawdHub for skills matching identified interests
- For each skill:
  - Validates age (≥2 days old)
  - Runs security-scanner to check for vulnerabilities
  - If SAFE: auto-installs
  - If CAUTION/DANGEROUS: reports findings (no install)
- **Summary**: "X skills reviewed, Y installed, Z rejected (with reasons)"

---

## Installation Steps

### 1. Verify System Timezone

The cron job uses the system's local timezone. Ensure it's set to **America/Denver**:

```bash
# Check current timezone
date

# Set timezone (if needed)
sudo systemsetup -settimezone America/Denver
```

### 2. Install the Cron Job

**Option A: Using crontab directly (Recommended)**

```bash
# Open crontab editor
crontab -e

# Add this line (runs at 10:15 AM daily):
15 10 * * * /bin/bash /Users/ericwoodard/clawd/morning-briefing.sh >> /Users/ericwoodard/clawd/logs/morning-briefing.log 2>&1
```

**Option B: Import from file**

```bash
# If you have the cron file prepared:
crontab /Users/ericwoodard/clawd/crontabs/morning-briefing.cron
```

### 3. Verify Installation

```bash
# List your cron jobs
crontab -l

# You should see the morning briefing job listed
```

### 4. Monitor Logs

Logs are written to:

```
/Users/ericwoodard/clawd/logs/morning-briefing.log
```

Check the logs:

```bash
tail -f /Users/ericwoodard/clawd/logs/morning-briefing.log
```

---

## How It Works

### Workflow

```
10:15 AM → morning-briefing.sh
    ↓
    ├─→ generate-morning-briefing.js
    │   ├─ Gather YouTube Analytics
    │   ├─ Gather Email Summary
    │   ├─ Gather Weather Data
    │   ├─ Gather Calendar Events
    │   ├─ Generate News Briefs
    │   └─ Send consolidated briefing to Telegram
    │
    └─→ Spawn skill-discovery-agent.js (async)
        ├─ Analyze workspace interests
        ├─ Search ClawdHub
        ├─ Security scan each candidate
        ├─ Auto-install safe skills
        └─ Send summary to Telegram
```

### Data Sources

| Component | Source              | Tool/Skill                         |
| --------- | ------------------- | ---------------------------------- |
| YouTube   | YouTube Data API    | `youtube-analytics` skill          |
| Email     | Gmail API           | `gmail-summary` skill              |
| Weather   | Weather API         | `weather` skill                    |
| Calendar  | Google Calendar API | `calendar` skill                   |
| News      | Web Search          | Brave Search API                   |
| Skills    | ClawdHub            | ClawdHub search + security-scanner |

---

## Configuration

### Telegram Delivery

The briefing is sent to Telegram. Update the target in the script:

1. **Edit**: `/Users/ericwoodard/clawd/scripts/generate-morning-briefing.js`
2. **Find**: `clawdbot message send` call
3. **Update**: `--target <your_telegram_user_id>`

To find your Telegram user ID:

```bash
# Send a message to @userinfobot on Telegram
# It will reply with your numeric ID
```

### Customize Time

To change the run time from 10:15 AM:

1. **Edit crontab**: `crontab -e`
2. **Change**: `15 10` to your desired time
   - Format: `minute hour * * *`
   - Example: `30 9` for 9:30 AM, `45 14` for 2:45 PM

### Customize Search Topics

Edit `/Users/ericwoodard/clawd/scripts/generate-morning-briefing.js`:

```javascript
const topics = [
  'AI coding agents Claude AutoGPT',
  'Clawdbot new features updates',
  '3D printing new technology announcements',
  // Add more topics here
]
```

### Adjust Skill Discovery

Edit `/Users/ericwoodard/clawd/scripts/skill-discovery-agent.js`:

```javascript
const INTEREST_KEYWORDS = {
  '3D_PRINTING': ['3d print', '3d model', 'molten', 'fdm', 'resin', 'filament'],
  AGENTIC_CODING: ['agent', 'claude', 'autogpt', 'reasoning', 'loop', 'tool use', 'agentic'],
  // Add more categories/keywords
}
```

---

## Required Skills

For the briefing to work fully, ensure these skills are installed:

```bash
clawdbot skills install youtube-analytics
clawdbot skills install gmail-summary
clawdbot skills install weather
clawdbot skills install calendar
clawdbot skills install security-scanner
```

**Note**: If a skill is unavailable, the briefing continues with a note that the data couldn't be fetched.

---

## Testing

### Test the briefing manually:

```bash
# Run the briefing generator
node /Users/ericwoodard/clawd/scripts/generate-morning-briefing.js

# Run the skill discovery agent
node /Users/ericwoodard/clawd/scripts/skill-discovery-agent.js
```

### Test the cron job will run:

```bash
# View all scheduled cron jobs
crontab -l

# Check if the job is scheduled correctly
sudo log stream --predicate 'eventMessage contains "morning-briefing"' --level debug
```

---

## Troubleshooting

### Cron Job Not Running

1. **Check crontab is installed**:

   ```bash
   crontab -l
   ```

2. **Verify timezone**:

   ```bash
   date
   ```

3. **Check launchd on macOS**:

   ```bash
   # macOS uses launchd for crons
   # Ensure cron daemon is running
   sudo launchctl load /System/Library/LaunchDaemons/com.vix.cron.plist
   ```

4. **Check permissions**:
   ```bash
   ls -la /Users/ericwoodard/clawd/morning-briefing.sh
   # Should show: -rwxr-xr-x (executable)
   ```

### Skill Not Found

If a skill isn't available:

- The script logs a note and continues
- Install missing skills manually
- Check skill names with: `clawdbot skills list`

### Telegram Message Not Received

1. Verify Telegram target ID in the script
2. Check Clawdbot is connected to Telegram
3. Review logs for send errors: `tail -f logs/morning-briefing.log`

---

## Files Reference

| File                                   | Purpose                              |
| -------------------------------------- | ------------------------------------ |
| `morning-briefing.sh`                  | Main cron job entry point            |
| `scripts/generate-morning-briefing.js` | Briefing generator + Telegram sender |
| `scripts/skill-discovery-agent.js`     | Skill discovery sub-agent            |
| `crontabs/morning-briefing.cron`       | Cron configuration (reference)       |
| `logs/morning-briefing.log`            | Execution logs                       |
| `MORNING-BRIEFING-SETUP.md`            | This file                            |

---

## Next Steps

1. ✅ Install cron job: `crontab -e` + add the line
2. ✅ Verify timezone: `date`
3. ✅ Check logs: `tail -f logs/morning-briefing.log`
4. ✅ Test manually: Run the scripts to verify they work
5. ✅ Wait until 10:15 AM to see the first automated briefing!

---

## Support

For issues, check:

- Cron logs: `/Users/ericwoodard/clawd/logs/morning-briefing.log`
- Script logs: Run scripts manually with `node` for debug output
- Clawdbot status: `clawdbot gateway status`

Happy briefings! 🌅
