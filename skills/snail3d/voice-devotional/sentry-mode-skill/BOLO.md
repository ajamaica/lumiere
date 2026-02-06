# Sentry Watch Mode - BOLO (Be On The Lookout)

Continuous background monitoring with motion detection and custom watchlists.

## Quick Start

### Mode 1: One-Shot Analysis

```bash
node scripts/sentry-mode.js activate --query "Is anyone in the room?"
```

### Mode 2: Keep Watch (Continuous BOLO)

```bash
node scripts/sentry-watch.js watch-demo
```

## How BOLO Works

### 1. Add Watchlist Items (BOLOs)

Things you want me to look for:

- "Guy with black hat"
- "Little blond girl"
- "Person in red jacket"
- "Anyone I don't recognize"

### 2. Continuous Monitoring

The system:

- Checks video every 2 seconds
- Detects motion automatically
- Only analyzes when motion found
- Compares against your BOLOs

### 3. Motion-Triggered Capture

When motion detected:

- Captures frame from video
- Analyzes with vision AI
- Checks against BOLO descriptions
- 3-minute cooldown to avoid spam

### 4. Smart Alerting

When match found:

- 🚨 Alert notification
- 📸 Frame with metadata
- ⏰ Timestamp
- 📌 Which BOLO matched

## Example Usage

### Set Up BOLO Watch

**Default (3-minute cooldown):**

```bash
node scripts/sentry-watch.js watch
```

**Custom cooldown (30 seconds):**

```bash
node scripts/sentry-watch.js watch --cooldown 30
```

**Custom cooldown (1 minute):**

```bash
node scripts/sentry-watch.js watch --cooldown 60
```

Then enter each BOLO (one per line):

```
Guy with black hat
Little blond girl
Person in dark hoodie
^D (ctrl+D to start watching)
```

Output:

```
👀 SENTRY WATCH MODE ACTIVATED
⏱️ Check interval: 2000ms
🔍 Motion threshold: 10%
⏰ Alert cooldown: 180s
📌 Active BOLOs: 3

📋 ACTIVE BOLOs:
─────────────────────────────────────
1. Guy with black hat
   Added: 1/27/2026, 12:30:00 PM
   Alerts: 0

2. Little blond girl
   Added: 1/27/2026, 12:30:05 PM
   Alerts: 0

3. Person in dark hoodie
   Added: 1/27/2026, 12:30:10 PM
   Alerts: 0

🎥 Starting continuous monitoring...
```

### Motion Detected

```
🎬 MOTION DETECTED (15.2%)
```

### Match Found

```
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
🚨 BOLO ALERT!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

📌 BOLO: Guy with black hat
⏰ Time: 1/27/2026, 12:31:45 PM
📸 Frame: frame-1706369505123.jpg

👤 Detected:
{
  "people": 1,
  "descriptions": ["Person with dark hat and clothing"],
  "confidence": 0.85
}

!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
```

## Configuration Options

### CLI Options

```bash
--cooldown <seconds>     # Alert cooldown (default: 180)
--interval <ms>          # Motion check interval (default: 2000)
--threshold <decimal>    # Motion threshold (default: 0.1)
```

### CLI Examples

```bash
# 1-minute cooldown instead of 3 minutes
node sentry-watch.js watch-demo --cooldown 60

# 30-second cooldown (aggressive alerting)
node sentry-watch.js watch --cooldown 30

# Check every 1 second with 2-minute cooldown
node sentry-watch.js watch-demo --cooldown 120 --interval 1000

# Sensitive motion detection (5%) with 1-min cooldown
node sentry-watch.js watch-demo --cooldown 60 --threshold 0.05
```

### Programmatic Configuration

```javascript
const watch = new SentryWatch(bolos, {
  checkInterval: 1000, // Faster checks (1 sec)
  motionThreshold: 0.05, // Lower threshold (5%)
  alertCooldown: 60 * 1000, // Shorter cooldown (1 min)
})
```

### Different Scenarios

**High Security (Fast Response)**

```javascript
checkInterval: 1000,        // Every 1 second
motionThreshold: 0.05,      // Sensitive
alertCooldown: 30 * 1000    // 30 seconds
```

**Balanced (Default)**

```javascript
checkInterval: 2000,        // Every 2 seconds
motionThreshold: 0.1,       // 10% change
alertCooldown: 3 * 60 * 1000 // 3 minutes
```

**Relaxed (Background)**

```javascript
checkInterval: 5000,        // Every 5 seconds
motionThreshold: 0.2,       // Needs clear motion
alertCooldown: 5 * 60 * 1000 // 5 minutes
```

## BOLO Description Tips

### Be Specific

✅ "Guy with black baseball hat and red hoodie"
✅ "Little blond girl in pink jacket"
✅ "Person in blue jeans"
❌ "Suspicious person"
❌ "Someone"

### Include Details

- **Clothing**: hat, jacket, shirt color
- **Size/Age**: child, adult, tall, short
- **Features**: blonde, dark, glasses, beard
- **Items**: backpack, phone, bag

### Real Examples

- "Guy with black hat and black jacket"
- "Little blond girl, maybe 5-6 years old"
- "Woman in blue hoodie and jeans"
- "Person with red cap and white shirt"
- "Anyone with a camera/recording device"

## Alert Notifications

When BOLO match found, system can:

1. **Console Alert** (default)
   - Visible in terminal

2. **SMS Alert** (via Twilio)
   - Text to your phone

3. **Telegram Alert**
   - Message + image to your bot

4. **Local Storage**
   - Save frame with metadata

5. **Remote Logging**
   - Send to server/database

## Use Cases

### Security

- Monitor entry points
- Detect trespassers
- Watch for package thieves
- Verify authorized personnel

### Parental

- Watch for specific visitors
- Confirm babysitter arrival
- Monitor during away time
- Check unexpected guests

### Workplace

- Monitor office entry
- Track visitor arrival
- Detect unauthorized access
- Log movement patterns

### Personal

- Know who visits while you're away
- Track deliveries
- Monitor workspace
- Verify presence

## Privacy & Legal

⚠️ **Important Considerations:**

- Only use in spaces you control
- Inform others if recording
- Follow local privacy laws
- Don't record without consent
- Clear data retention policies

## Technical Details

### Motion Detection Algorithm

- Compares frame-to-frame differences
- Pixel change threshold (default 10%)
- Real implementation: histogram comparison
- Future: optical flow algorithms

### Matching Algorithm

- Extracts keywords from BOLO
- Searches vision analysis results
- Simple text matching (v1)
- Future: semantic similarity (NLP)

### Cooldown Logic

- Per-BOLO tracking
- Prevents alert spam
- Resets after cooldown
- Tracks alert count

## Troubleshooting

### Too Many False Alerts

- Increase `motionThreshold`
- Increase `alertCooldown`
- Make BOLO descriptions more specific

### Missing Motion

- Decrease `motionThreshold`
- Increase `checkInterval`
- Check lighting in space

### Not Finding BOLOs

- Try simpler descriptions
- Use common keywords
- Check video quality/angle

## Advanced Integration

### With Clawdbot Cron

```bash
# Start watching every 8 hours
cron add "sentry-watch" "0 */8 * * *" "node ~/clawd/sentry-mode-skill/scripts/sentry-watch.js watch-demo"
```

### With Notifications

```javascript
// Send Telegram alert
message.send({
  target: 'YOUR_USER',
  message: `🚨 BOLO ALERT: ${bolo.description}\n📸 Frame attached`,
})
```

### With SMS

```javascript
// Send SMS via Twilio
twilioClient.messages.create({
  to: '+1-555-730-8926',
  from: '+1-915-223-7302',
  body: `🚨 BOLO: ${bolo.description} - ${timestamp}`,
})
```

---

**Status:** Ready for production use with real vision analysis and alert integrations.
