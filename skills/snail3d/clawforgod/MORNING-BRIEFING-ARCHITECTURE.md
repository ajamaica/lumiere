# 🏗️ Morning Briefing - Architecture & Technical Details

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CRON SCHEDULER (10:15 AM)                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────────┐
        │   morning-briefing.sh (Shell Script)     │
        │   - Entry point                          │
        │   - Logging setup                        │
        │   - Error handling                       │
        └──────────────┬───────────────────────────┘
                       │
       ┌───────────────┴───────────────┐
       │                               │
       ▼                               ▼
   ┌────────────────────┐      ┌──────────────────────┐
   │ generate-morning-  │      │ skill-discovery-     │
   │ briefing.js        │      │ agent.js             │
   │                    │      │                      │
   │ Gathers data:      │      │ Async Sub-Agent:     │
   │ - YouTube Analytics│      │ - Analyzes interests │
   │ - Email Summary    │      │ - Searches ClawdHub  │
   │ - Weather          │      │ - Security scans     │
   │ - Calendar         │      │ - Auto-installs      │
   │ - News Briefs      │      │ - Reports findings   │
   │ - Research Briefs  │      │                      │
   │                    │      │ Spawned in parallel  │
   │ Consolidates into  │      │ (doesn't block)      │
   │ single message     │      │                      │
   └────────────┬───────┘      └──────────┬───────────┘
                │                         │
                ▼                         ▼
         ┌────────────────┐        ┌─────────────────┐
         │ Telegram API   │        │ Telegram API    │
         │ (Message 1)    │        │ (Message 2)     │
         │ Briefing       │        │ Skill Summary   │
         └────────────────┘        └─────────────────┘
                │                         │
                └─────────────┬───────────┘
                              │
                              ▼
                      ┌────────────────┐
                      │  Your Telegram │
                      │  Daily Briefing│
                      └────────────────┘
```

---

## Data Flow

### Morning Briefing Generation

```
1. morning-briefing.sh
   └─→ Sets up logging
   └─→ Calls generate-morning-briefing.js

2. generate-morning-briefing.js
   ├─→ Parallel Data Gathering:
   │   ├─ getYouTubeAnalytics()     → Calls youtube-analytics skill
   │   ├─ getEmailSummary()         → Calls gmail-summary skill
   │   ├─ getWeatherData()          → Calls weather skill
   │   ├─ getCalendarEvents()       → Calls calendar skill
   │   └─ getNewsBreriefs()         → Uses web_search for news
   │
   ├─→ Data Consolidation:
   │   └─ Builds single formatted message
   │
   ├─→ Message Delivery:
   │   └─ Sends to Telegram via clawdbot message API
   │
   └─→ Spawn Sub-Agent:
       └─ Starts skill-discovery-agent.js (async, non-blocking)
```

### Skill Discovery Sub-Agent

```
1. skill-discovery-agent.js (spawned asynchronously)
   │
   ├─→ analyzeWorkspaceInterests()
   │   ├─ Read MEMORY.md
   │   ├─ Read TOOLS.md
   │   ├─ Read MOLT3D_MONITOR_INTEGRATION.md
   │   ├─ Scan recent memory/YYYY-MM-DD.md files
   │   └─ Match against INTEREST_KEYWORDS
   │
   ├─→ searchClawdHubSkills()
   │   ├─ For each detected interest:
   │   │   └─ Query ClawdHub API
   │   │       └─ Collect candidate skills
   │
   ├─→ For Each Candidate Skill:
   │   │
   │   ├─→ isSkillOldEnough()
   │   │   └─ Check if skill.createdAt ≥ 2 days old
   │   │   └─ Skip if too new
   │   │
   │   ├─→ securityScanSkill()
   │   │   └─ Run security-scanner skill
   │   │   └─ Evaluate status:
   │   │       ├─ SAFE      → Proceed to install
   │   │       ├─ CAUTION   → Report, skip install
   │   │       └─ DANGEROUS → Report, skip install
   │   │
   │   └─→ installSkill() [if SAFE]
   │       └─ Auto-install and log result
   │
   └─→ generateSummaryReport()
       ├─ X skills reviewed
       ├─ Y skills installed
       └─ Z skills rejected (with reasons)
       └─ Send summary to Telegram
```

---

## Component Details

### 1. morning-briefing.sh

**Type**: Shell Script  
**Purpose**: Cron entry point  
**Responsibilities**:

- Set environment variables
- Create log directory
- Call Node.js briefing generator
- Handle errors and logging

**Triggers**: Cron schedule (10:15 AM daily)

### 2. generate-morning-briefing.js

**Type**: Node.js Script  
**Purpose**: Main briefing orchestrator  
**Key Functions**:

- `getYouTubeAnalytics()` - Fetch YouTube stats via skill
- `getEmailSummary()` - Fetch email summary
- `getWeatherData()` - Fetch weather forecast
- `getCalendarEvents()` - Fetch calendar events
- `getNewsBreriefs()` - Search web for news topics
- `sendTelegramMessage()` - Deliver to Telegram
- `spawnSkillDiscoveryAgent()` - Launch async sub-agent

**Dependencies**: Clawdbot skills (YouTube, Gmail, Weather, Calendar)

### 3. skill-discovery-agent.js

**Type**: Node.js Script (Sub-Agent)  
**Purpose**: Autonomous skill discovery & installation  
**Key Functions**:

- `analyzeWorkspaceInterests()` - Parse workspace context
- `searchClawdHubSkills()` - Query skill marketplace
- `isSkillOldEnough()` - Validate age requirement
- `securityScanSkill()` - Run security scanner
- `installSkill()` - Auto-install safe skills

**Key Behavior**:

- Runs asynchronously (non-blocking)
- Skips skills < 2 days old
- Only installs SAFE skills
- Reports CAUTION/DANGEROUS findings
- Sends summary to Telegram

### 4. morning-briefing.config.json

**Type**: JSON Configuration  
**Purpose**: Centralized settings  
**Contains**:

- Cron schedule
- Telegram target
- Briefing components config
- Skill discovery interests
- Logging settings

---

## Data Sources

| Component         | Source API                      | Skill               | Notes                             |
| ----------------- | ------------------------------- | ------------------- | --------------------------------- |
| YouTube Analytics | YouTube Data API                | `youtube-analytics` | Last 24h stats, views, engagement |
| Email Summary     | Gmail API                       | `gmail-summary`     | Unread count, important senders   |
| Weather           | Weather API (e.g., OpenWeather) | `weather`           | Denver, temp, forecast            |
| Calendar          | Google Calendar API             | `calendar`          | Today + 48h events                |
| News              | Brave Search API                | `web_search`        | Tech, maker, AI topics            |
| Skills            | ClawdHub                        | ClawdHub API        | Skill marketplace search          |
| Security          | Self                            | `security-scanner`  | Vulnerability detection           |

---

## Security Considerations

### Skill Installation Safety

1. **Age Validation**: Only installs skills ≥2 days old
   - Prevents installing brand-new, untested skills
   - Allows community review period

2. **Security Scanning**: All candidates undergo security-scanner check
   - Detects malicious code patterns
   - Identifies dependency vulnerabilities
   - Checks permission requirements

3. **Status-Based Decisions**:

   ```
   SAFE       → Auto-install
   CAUTION    → Report findings, skip install
   DANGEROUS  → Report critical issues, skip install
   ```

4. **Audit Trail**: All installations logged with reasons
   - Skill name
   - Installation status
   - Security scan results
   - Rejection reasons (if applicable)

### Data Privacy

- Workspace context analyzed locally (not sent to external services)
- Only skill names/metadata sent to ClawdHub API
- Personal data (calendar, email) handled by respective skills
- Logs contain no sensitive information

---

## Error Handling & Resilience

### Graceful Degradation

If a skill is unavailable:

```javascript
try {
  const result = await getYouTubeAnalytics()
  return result
} catch (error) {
  return `📺 YouTube Analytics: Skill not available\n`
  // Briefing continues with missing component noted
}
```

### Logging Strategy

- All events logged to: `/Users/ericwoodard/clawd/logs/morning-briefing.log`
- Timestamp, level, message format
- Rotated (retention: 30 days)
- Accessible via: `tail -f morning-briefing.log`

### Retry Mechanism

- Network failures: 2 retry attempts
- Timeout: 30 seconds per operation
- Partial failures: Continue with available data

---

## Performance Characteristics

### Execution Time

- **Briefing Generation**: ~10-15 seconds
  - Parallel data gathering (10s)
  - Consolidation & sending (5s)
- **Skill Discovery**: ~5-10 minutes (async, non-blocking)
  - Interest analysis (1s)
  - ClawdHub search (2-3s per topic)
  - Security scans (30-60s per skill)
  - Installation (10-30s per skill)

### Resource Usage

- **Memory**: ~50-100 MB (Node.js + Clawdbot)
- **Network**: ~2-5 MB (API calls)
- **CPU**: Minimal (mostly I/O wait)
- **Disk**: ~1 MB log per week

---

## Customization Points

### 1. Briefing Components

Edit `scripts/generate-morning-briefing.js`:

```javascript
const topics = [
  'AI coding agents Claude AutoGPT',
  'Clawdbot new features updates',
  '3D printing new technology announcements',
  // Add custom topics here
]
```

### 2. Skill Discovery Interests

Edit `scripts/skill-discovery-agent.js`:

```javascript
const INTEREST_KEYWORDS = {
  'CUSTOM_CATEGORY': ['keyword1', 'keyword2', ...],
  // Add custom interests here
};
```

### 3. Schedule

Edit crontab:

```bash
crontab -e
```

Change `15 10` to your desired time.

### 4. Telegram Target

Edit `config/morning-briefing.config.json`:

```json
"telegram": {
  "targetId": "<your_telegram_id>"
}
```

---

## Extension Points

The architecture supports adding:

1. **New Briefing Components**
   - Add function to `generate-morning-briefing.js`
   - Call in parallel with other data sources
   - Include in consolidated message

2. **New Skill Discovery Interests**
   - Add category to `INTEREST_KEYWORDS`
   - Skill discovery automatically detects and searches

3. **Alternative Delivery Channels**
   - Email, Slack, Discord, etc.
   - Modify `sendTelegramMessage()` or add new function

4. **Custom Skill Validation**
   - Add checks before `installSkill()`
   - Integrate with your own security tools

---

## Monitoring & Maintenance

### Check Status

```bash
# View cron jobs
crontab -l

# Check last execution
tail -f /Users/ericwoodard/clawd/logs/morning-briefing.log

# Test manually
node /Users/ericwoodard/clawd/scripts/generate-morning-briefing.js
```

### Common Tasks

```bash
# Disable temporarily
crontab -e  # Comment out the line

# Change time
crontab -e  # Modify "15 10" to new time

# Remove job
crontab -e  # Delete the line

# View detailed logs
cat /Users/ericwoodard/clawd/logs/morning-briefing.log | grep "ERROR"
```

---

## Files & Locations

```
/Users/ericwoodard/clawd/
├── morning-briefing.sh                    (Cron entry point)
├── scripts/
│   ├── generate-morning-briefing.js       (Briefing generator)
│   ├── skill-discovery-agent.js           (Sub-agent)
│   └── install-morning-briefing.sh        (Installer)
├── config/
│   └── morning-briefing.config.json       (Configuration)
├── logs/
│   └── morning-briefing.log               (Execution logs)
├── crontabs/
│   └── morning-briefing.cron              (Reference crontab)
├── MORNING-BRIEFING-SETUP.md              (Full setup guide)
├── MORNING-BRIEFING-QUICK-START.md        (Quick reference)
└── MORNING-BRIEFING-ARCHITECTURE.md       (This file)
```

---

## Troubleshooting Guide

| Issue                       | Cause             | Solution                                                               |
| --------------------------- | ----------------- | ---------------------------------------------------------------------- |
| Cron not running            | Timezone mismatch | Verify: `date` shows America/Denver                                    |
| Cron not running            | Daemon not loaded | `sudo launchctl load /System/Library/LaunchDaemons/com.vix.cron.plist` |
| No Telegram message         | Skill unavailable | Install: `clawdbot skills install <skill_name>`                        |
| No Telegram message         | Wrong target ID   | Update targetId in config                                              |
| Skill discovery not working | Script errors     | Check: `tail -f logs/morning-briefing.log`                             |
| Memory usage high           | Infinite loop     | Restart Clawdbot: `clawdbot gateway restart`                           |

---

## Future Enhancements

- [ ] Support multiple Telegram targets
- [ ] Custom briefing templates (HTML, Markdown, etc.)
- [ ] Integration with other delivery channels (Email, Slack)
- [ ] Dashboard for viewing briefing history
- [ ] A/B testing for briefing components
- [ ] User preferences for briefing content
- [ ] Skill recommendation engine
- [ ] Briefing analytics & metrics

---

This architecture provides a scalable, maintainable, and extensible system for daily AI-powered briefings with autonomous skill discovery.
