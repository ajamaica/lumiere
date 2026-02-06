---
name: monkeytype-tracker
description: Track and analyze Monkeytype typing statistics with improvement tips. Use when user mentions "monkeytype", "typing stats", "typing speed", "WPM", "typing practice", "typing progress", or wants to check their typing performance. Features on-demand stats, test history analysis, personal bests, progress comparison, leaderboard lookup, and optional automated reports. Requires user's Monkeytype ApeKey for API access.
---

# Monkeytype Tracker

Track your Monkeytype typing statistics and get personalized improvement tips.

## Pre-Flight Check (ALWAYS DO THIS FIRST)

Before running ANY command, check if setup is complete:

**Security Priority:**

1. **Environment variable** (most secure): `MONKEYTYPE_APE_KEY`
2. **Config file fallback**: `~/.openclaw/workspace/config/monkeytype.json`

```python
# Check environment variable first
ape_key = os.getenv('MONKEYTYPE_APE_KEY')
if not ape_key:
    # Check config exists and has valid key
    config_path = Path.home() / ".openclaw" / "workspace" / "config" / "monkeytype.json"
```

**If no env var AND no config:** → Run Setup Flow (Step 1)
**If apeKey exists but API returns 471 "inactive":** → Tell user to activate the key (checkbox)
**If apeKey works:** → Proceed with command

## Setup Flow (3 Steps)

### Step 1: Get ApeKey

Send this message:

```
Hey! 👋 I see you want to track your Monkeytype stats. I'll need your API key to get started.

**🔑 How to get it:**
1. Go to monkeytype.com → **Account Settings** (click your profile icon)
2. Select **"Ape Keys"** from the left sidebar
3. Click **"Generate new key"**
4. ⚠️ **Activate it:** Check the checkbox next to your new key (keys are inactive by default!)
5. Copy the key and send it to me

Once you share the key, I'll ask about automation preferences 🤖

---

🔒 **Prefer to add it manually?** No problem!

**Option 1: Environment Variable (Recommended - Most Secure)**
Set in your system:
- Windows (PowerShell): `$env:MONKEYTYPE_APE_KEY="YOUR_KEY_HERE"`
- Linux/Mac: `export MONKEYTYPE_APE_KEY="YOUR_KEY_HERE"`

**Option 2: Config File**
Create this file: `~/.openclaw/workspace/config/monkeytype.json`
With this content:
{
  "apeKey": "YOUR_KEY_HERE"
}

Then just say "monkeytype stats" and I'll take it from there!
```

After receiving key:

1. Save to `~/.openclaw/workspace/config/monkeytype.json`:

```json
{
  "apeKey": "USER_KEY_HERE",
  "automations": {
    "dailyReport": false,
    "weeklyReport": false,
    "reportTime": "20:00"
  }
}
```

2. **Test the key immediately** by running `python scripts/monkeytype_stats.py stats`
3. If 471 error → Key is inactive, ask user to check the checkbox
4. If success → Proceed to Step 2

### Step 2: Verify & Ask Automation Preferences

After key verification succeeds, send:

```
Got it! Key saved and verified ✅

**📊 Quick Overview:**
• {tests} tests completed ({hours} hrs)
• 🏆 PB: {pb_15}WPM (15s) | {pb_30}WPM (30s) | {pb_60}WPM (60s)
• 🔥 Current streak: {streak} days

Now, would you like automated reports?

**Options:**
1️⃣ **Daily report** — Summary of the day's practice
2️⃣ **Weekly report** — Week-over-week comparison + tips
3️⃣ **Both**
4️⃣ **None** — On-demand only

⏰ What time should I send reports? (default: 8pm)
```

### Step 3: Finalize Setup

After user chooses options:

1. Update config with preferences
2. Create cron jobs if automations enabled:
   - Daily: `0 {hour} * * *` with name `monkeytype-daily-report`
   - Weekly: `0 {hour} * * 0` with name `monkeytype-weekly-report`
3. Send completion message:

```
🎉 **You're all set!**

**✅ Config saved:**
• Weekly report: {status}
• Daily report: {status}

**💡 Try these anytime:**
• "show my typing stats"
• "how's my typing progress"
• "compare my typing this week"
• "monkeytype leaderboard"

Happy typing! May your WPM be ever higher 🚀⌨️
```

## Error Handling

| Error                  | User Message                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| No config file         | "Looks like Monkeytype isn't set up yet. Let me help you get started! 🔑" → Start Setup Flow                                         |
| No apeKey in config    | Same as above                                                                                                                        |
| API 471 "inactive"     | "Your API key is inactive. Go to Monkeytype → Account Settings → Ape Keys and check the checkbox next to your key to activate it ✅" |
| API 401 "unauthorized" | "Your API key seems invalid. Let's set up a new one." → Start Setup Flow                                                             |
| API rate limit         | "Hit the API rate limit. Try again in a minute ⏳"                                                                                   |
| Network error          | "Couldn't reach Monkeytype servers. Check your connection and try again."                                                            |

## Commands

### Fetch Stats

**Triggers**: "show my monkeytype stats", "how's my typing", "typing stats"

1. Pre-flight check (see above)
2. Run: `python scripts/monkeytype_stats.py stats`
3. Format output nicely with emojis

### Recent History & Analysis

**Triggers**: "analyze my recent typing", "how have I been typing lately"

1. Pre-flight check
2. Run: `python scripts/monkeytype_stats.py history --limit 50`
3. Analyze output and provide 2-3 improvement tips

### Progress Comparison

**Triggers**: "compare my typing progress", "am I improving"

1. Pre-flight check
2. Run: `python scripts/monkeytype_stats.py compare`

### Leaderboard Lookup

**Triggers**: "monkeytype leaderboard", "where do I rank"

1. Pre-flight check
2. Run: `python scripts/monkeytype_stats.py leaderboard [--mode time] [--mode2 60]`

## Improvement Tips Logic

After fetching stats, analyze and provide tips based on:

| Issue          | Tip                                                                     |
| -------------- | ----------------------------------------------------------------------- |
| StdDev > 15    | "Focus on consistency — slow down and aim for 95%+ accuracy every test" |
| Accuracy < 95% | "Accuracy builds speed. Slow down until you hit 95%+ consistently"      |
| 60s << 30s PB  | "Stamina gap detected. Practice longer tests to build endurance"        |
| Low test count | "More practice = faster progress. Aim for 5-10 tests daily"             |
| Streak broken  | "Consistency matters! Try to type a bit every day"                      |

## API Notes

- Base URL: `https://api.monkeytype.com`
- Auth header: `Authorization: ApeKey {key}`
- Rate limits: 30 req/min global, 30/day for results endpoint
- Cache results locally when possible

## Files

- `~/.openclaw/workspace/config/monkeytype.json`: User config
- `scripts/monkeytype_stats.py`: Main stats fetcher script
