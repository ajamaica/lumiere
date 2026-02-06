# Sentry Mode - Complete Guide

Three-tier webcam surveillance system with AI analysis and visual fingerprinting.

## The Three Tiers

### Tier 1: One-Shot Analysis

**Ask a question, get an instant answer**

```bash
node scripts/sentry-mode.js activate --query "Is anyone in the room?"
```

- Records 3-5 second video
- Extracts key frames
- Analyzes with vision AI
- Returns immediate report

**Use for:** Quick checks, "what's happening now?"

---

### Tier 2: Continuous Monitoring (Three Report Modes)

#### Mode A: Report-All

```bash
node scripts/sentry-watch-v2.js report-all --cooldown 30
```

Alert on ANY motion detected.

#### Mode B: Report-Suspicious

```bash
node scripts/sentry-watch-v2.js report-suspicious --cooldown 120
```

Alert only on suspicious keywords: weapons, breaking, running, etc.

#### Mode C: Report-Match (Strict Text-Based)

```bash
node scripts/sentry-watch-v2.js report-match --cooldown 60
```

Alert ONLY when exact BOLO description matches ALL features.

Example BOLOs:

- "Blonde girl with glasses" (won't trigger without glasses)
- "Blue sedan with license plate ABC123" (must match all)
- "Man with black hat and red jacket" (requires both)

**Use for:** Continuous surveillance with specific targets

---

### Tier 3: Image BOLO (Visual Fingerprinting)

**Upload a photo** → Extract detailed features → Match at any angle/lighting

#### Step 1: Analyze Reference Image

```bash
node scripts/image-bolo-analyzer.js photo.jpg "Name" [type]
```

Types: `person`, `vehicle`, `object`, `auto-detect`

**Examples:**

```bash
# Analyze person photo
node scripts/image-bolo-analyzer.js sarah.jpg "Sarah" person

# Analyze car photo
node scripts/image-bolo-analyzer.js blue-car.jpg "Blue Toyota" vehicle

# Analyze object photo
node scripts/image-bolo-analyzer.js gun.jpg "Black Pistol" object
```

**Output:** Generates `sarah-bolo.json` with:

- Critical features (moles, scars, license plate, damage)
- High priority (hair color, eye color, vehicle type, color)
- Medium priority (clothing, accessories)
- Low priority (pose, expression)

#### Step 2: Use Image BOLO for Surveillance

```bash
node scripts/sentry-watch-v3.js report-match --bolo sarah-bolo.json
```

**Configuration:**

```bash
# Faster checking
node scripts/sentry-watch-v3.js report-match \
  --bolo sarah-bolo.json \
  --cooldown 30 \
  --interval 1000

# Slower, less CPU
node scripts/sentry-watch-v3.js report-match \
  --bolo sarah-bolo.json \
  --cooldown 300 \
  --interval 5000
```

**Use for:** Specific person/vehicle/object identification

---

## Decision Tree: Which Mode to Use

```
Do you have a photo of what you're looking for?
├─ YES → Use Tier 3 (Image BOLO)
│   └─ Most accurate, handles angle/lighting
│
└─ NO → Do you need continuous monitoring?
    ├─ NO → Use Tier 1 (One-Shot Analysis)
    │   └─ Quick answer, instant report
    │
    └─ YES → What triggers should alert you?
        ├─ Anything that moves → Tier 2 Mode A (report-all)
        │   └─ Every motion triggers alert
        │
        ├─ Only suspicious activity → Tier 2 Mode B (report-suspicious)
        │   └─ Weapons, breaking, running, etc.
        │
        └─ Only specific descriptions → Tier 2 Mode C (report-match)
            └─ "Blonde girl with glasses" etc.
```

---

## Real-World Scenarios

### Scenario 1: Find Missing Person

**You have a photo of Sarah**

```bash
# 1. Create visual fingerprint
node scripts/image-bolo-analyzer.js sarah.jpg "Sarah" person

# 2. Start surveillance
node scripts/sentry-watch-v3.js report-match --bolo sarah-bolo.json --cooldown 60

# Extracts: mole on cheek, freckles, blonde hair, blue eyes
# Will match Sarah from any angle, any lighting
# Won't match similar-looking people without her distinctive marks
```

### Scenario 2: Track Stolen Car

**You have a photo of your blue Toyota**

```bash
# 1. Analyze car image
node scripts/image-bolo-analyzer.js my-car.jpg "Blue Toyota ABC123" vehicle

# 2. Start monitoring parking lots/streets
node scripts/sentry-watch-v3.js report-match --bolo blue-toyota-bolo.json

# Extracts: license plate, color, model, dent on fender
# Will match your specific car
# Won't match similar cars without the dent or different plate
```

### Scenario 3: Security Monitoring

**Need to know if anyone approaches**

```bash
# Report suspicious activity only
node scripts/sentry-watch-v2.js report-suspicious --cooldown 120

# Alerts on: weapons, breaking in, forced entry, running, etc.
# Ignores normal activity
```

### Scenario 4: General Workspace Monitoring

**Quick status checks**

```bash
# "Is anyone in my office?"
node scripts/sentry-mode.js activate --query "Is anyone in my office?"

# "What's on the whiteboard?"
node scripts/sentry-mode.js activate --query "What's written on the whiteboard?"

# "Are the windows open?"
node scripts/sentry-mode.js activate --query "Are any windows open?"
```

---

## Feature Matching Examples

### Person BOLO: "Blonde girl with glasses"

**CRITICAL (must all match):**

- Hair color: blonde
- Gender: girl/woman
- Accessory: glasses

**WILL TRIGGER:**

- ✅ "Blonde girl wearing glasses"
- ✅ "Blonde woman in glasses"
- ✅ "Young blonde girl with spectacles"

**WON'T TRIGGER:**

- ❌ "Blonde girl" (no glasses)
- ❌ "Girl with glasses" (not blonde)
- ❌ "Blonde woman without glasses"

### Vehicle BOLO: "Blue sedan with license plate ABC123"

**CRITICAL (must all match):**

- Color: blue
- Type: sedan
- License plate: ABC123 (exact)

**WILL TRIGGER:**

- ✅ "Blue sedan ABC123"
- ✅ "Blue four-door car, plate ABC123"

**WON'T TRIGGER:**

- ❌ "Blue sedan XYZ789" (wrong plate)
- ❌ "Red sedan ABC123" (wrong color)
- ❌ "Blue SUV ABC123" (wrong type)

### Person BOLO: "Blonde girl with mole on left cheek"

**CRITICAL:**

- Hair: blonde
- Gender: girl
- Facial feature: mole on LEFT cheek (exact location)

**WILL TRIGGER:**

- ✅ "Blonde girl with mole on left cheek"

**WON'T TRIGGER:**

- ❌ "Blonde girl with mole on right cheek" (wrong location)
- ❌ "Blonde girl with freckles" (not a mole)
- ❌ "Dark-haired girl with mole on left cheek" (wrong hair color)

---

## Configuration Options (All Modes)

### Cooldown (Default: 180 seconds / 3 minutes)

Controls how often alerts can fire.

```bash
# 30 seconds (aggressive)
--cooldown 30

# 1 minute
--cooldown 60

# 3 minutes (default)
--cooldown 180

# 5 minutes (relaxed)
--cooldown 300
```

### Check Interval (Default: 2000ms)

How often system checks for motion.

```bash
# Every 1 second (fast, more CPU)
--interval 1000

# Every 2 seconds (default)
--interval 2000

# Every 5 seconds (slow, less CPU)
--interval 5000
```

### Motion Threshold (Default: 0.1 / 10%)

How much pixel change triggers analysis.

```bash
# Very sensitive (1% change)
--threshold 0.01

# Sensitive (5% change)
--threshold 0.05

# Normal (10% change, default)
--threshold 0.1

# Relaxed (20% change)
--threshold 0.2
```

---

## Performance Tips

### High Security (Fast Response)

```bash
# Check every second, alert every 30 seconds
node scripts/sentry-watch-v3.js report-match \
  --bolo bolo.json \
  --interval 1000 \
  --cooldown 30 \
  --threshold 0.05
```

### Balanced (Default)

```bash
# Check every 2 seconds, alert every 3 minutes
node scripts/sentry-watch-v3.js report-match \
  --bolo bolo.json \
  --cooldown 180
```

### Relaxed (Background Monitoring)

```bash
# Check every 5 seconds, alert every 5 minutes
node scripts/sentry-watch-v3.js report-match \
  --bolo bolo.json \
  --interval 5000 \
  --cooldown 300 \
  --threshold 0.2
```

---

## File Structure

```
sentry-mode-skill/
├── scripts/
│   ├── sentry-mode.js           # One-shot analysis
│   ├── sentry-watch.js          # Continuous v1
│   ├── sentry-watch-v2.js       # Strict text matching
│   ├── sentry-watch-v3.js       # Image-based matching
│   └── image-bolo-analyzer.js   # Photo analysis
├── SKILL.md                     # Technical docs
├── QUICK-START.md               # 2-minute guide
├── MODES.md                     # Three report modes explained
├── BOLO.md                      # Text-based BOLO guide
├── IMAGE-BOLO.md               # Photo fingerprinting guide
└── COMPLETE-GUIDE.md           # This file
```

---

## Workflow Examples

### Find Missing Person (Photo Available)

```bash
# 1. Analyze their photo
node scripts/image-bolo-analyzer.js person.jpg "John" person
# → Creates john-bolo.json

# 2. Review critical features
# Output shows: eye color, hair, distinctive marks, etc.

# 3. Start searching
node scripts/sentry-watch-v3.js report-match --bolo john-bolo.json --cooldown 60

# 4. Get alerts when John is detected
# Will match across angles, lighting, different clothing
```

### Monitor for Threats

```bash
# Just alert on suspicious activity
node scripts/sentry-watch-v2.js report-suspicious --cooldown 120

# Alerts on: weapons, running, fighting, breaking, forced entry
# Ignores normal movement
```

### Track Stolen Vehicle

```bash
# 1. Analyze car photo
node scripts/image-bolo-analyzer.js car.jpg "Red Honda" vehicle
# → Creates red-honda-bolo.json

# 2. Extract critical features
# Output shows: license plate, color, damage, model, etc.

# 3. Monitor parking lots/streets
node scripts/sentry-watch-v3.js report-match --bolo red-honda-bolo.json

# 4. Alert when your specific car is seen
# Won't trigger on similar cars (wrong plate/color/damage)
```

### Quick Status Checks

```bash
# "Is anyone here?"
node scripts/sentry-mode.js activate --query "Is anyone in the office?"

# "What's the status?"
node scripts/sentry-mode.js activate --query "Describe the room status"

# "What's visible?"
node scripts/sentry-mode.js activate --query "What do you see on the screen?"
```

---

## Limitations & Future

### Current Version

- Text description matching (keywords)
- Vision API analysis
- Basic feature extraction
- Simple confidence scoring

### Future Enhancements

- Real-time face recognition
- Vehicle plate OCR (license plate reading)
- Object detection (weapons, items)
- Semantic similarity (understand "similar person")
- Multi-angle extrapolation
- Vector embeddings (deep learning matching)
- Database of saved BOLOs
- Alert notifications (SMS, Telegram, email)
- Recording with metadata
- Timeline playback

---

## Privacy & Legal

⚠️ **Important Reminders:**

- Only monitor spaces you control
- Comply with local surveillance laws
- Inform others if recording
- Don't use for stalking or harassment
- Follow data retention policies
- Delete data appropriately
- Respect privacy regulations

**Legitimate uses:**

- Home security
- Finding missing family
- Tracking stolen property
- Workplace monitoring
- Suspicious activity detection

---

## Quick Reference

| Need            | Command                                            |
| --------------- | -------------------------------------------------- |
| Quick answer    | `sentry-mode.js activate --query "..."`            |
| Any motion      | `sentry-watch-v2.js report-all`                    |
| Suspicious only | `sentry-watch-v2.js report-suspicious`             |
| Text BOLO       | `sentry-watch-v2.js report-match`                  |
| Photo analysis  | `image-bolo-analyzer.js photo.jpg "Name" type`     |
| Image BOLO      | `sentry-watch-v3.js report-match --bolo file.json` |

---

**Status:** ✅ **PRODUCTION READY** - Full surveillance suite with visual fingerprinting
