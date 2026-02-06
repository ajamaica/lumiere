# 🚀 Morning Briefing - Quick Start

## TL;DR - Install in 30 Seconds

Run the installer:

```bash
bash /Users/ericwoodard/clawd/scripts/install-morning-briefing.sh
```

That's it! Your morning briefing will run **every day at 10:15 AM MST**.

---

## What You Get

Every morning at **10:15 AM**, you'll receive two Telegram messages:

### Message 1: Consolidated Daily Briefing

- 📺 **YouTube Analytics**: Last 24h stats, top videos, subscriber changes
- 📧 **Email Summary**: Unread count, important senders, key messages
- 🌤️ **Weather**: Current Denver conditions + today's forecast
- 📅 **Calendar**: Today's events + upcoming 48 hours
- 🔗 **News Briefs**: Tech, maker, AI news with trending topics
- 📚 **Research Briefs**: 3D printing, agentic coding, Clawdbot ecosystem, trending skills

### Message 2: Skill Discovery Report

- Automatically searches ClawdHub for relevant skills
- Runs security scans on candidates
- Auto-installs safe skills
- Reports findings: "X reviewed, Y installed, Z rejected"

---

## Quick Commands

```bash
# Install/setup
bash /Users/ericwoodard/clawd/scripts/install-morning-briefing.sh

# View cron jobs
crontab -l

# Edit schedule/cron
crontab -e

# Test manually
node /Users/ericwoodard/clawd/scripts/generate-morning-briefing.js

# Watch logs
tail -f /Users/ericwoodard/clawd/logs/morning-briefing.log

# Remove/stop the cron job
crontab -e  # Then delete the morning-briefing line
```

---

## Change the Time

Edit your crontab:

```bash
crontab -e
```

Change `15 10` to your preferred time:

- `30 9` = 9:30 AM
- `0 8` = 8:00 AM
- `45 14` = 2:45 PM
- etc.

Format: `minute hour * * *`

---

## Files

| File                                   | Purpose             |
| -------------------------------------- | ------------------- |
| `morning-briefing.sh`                  | Main entry point    |
| `scripts/generate-morning-briefing.js` | Briefing generator  |
| `scripts/skill-discovery-agent.js`     | Skill discovery     |
| `scripts/install-morning-briefing.sh`  | Automated installer |
| `logs/morning-briefing.log`            | Execution logs      |

---

## Troubleshooting

**Cron job not running?**

```bash
# Check timezone
date

# Check cron is installed
crontab -l

# Check logs
tail -f /Users/ericwoodard/clawd/logs/morning-briefing.log
```

**Telegram message not received?**

- Verify Telegram is connected to Clawdbot
- Check logs for send errors
- Confirm user ID in script

**Skills not working?**

- Install required skills: `clawdbot skills install youtube-analytics`
- The briefing continues if skills are unavailable

---

## Full Documentation

See: `/Users/ericwoodard/clawd/MORNING-BRIEFING-SETUP.md`

---

## Support

Run the installer to get interactive setup help, or check the logs:

```bash
tail -f /Users/ericwoodard/clawd/logs/morning-briefing.log
```

Enjoy your daily briefings! 🌅
