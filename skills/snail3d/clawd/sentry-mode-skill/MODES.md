# Sentry Watch V2 - Three Reporting Modes

Choose exactly what you want to be alerted about.

## Mode 1: Report-All

**Alert on ANY motion detected**

```bash
node scripts/sentry-watch-v2.js report-all
```

- Triggers on every motion detection
- No BOLO descriptions needed
- Use for: General monitoring, presence detection
- Output: Motion alert + frame capture + analysis

**Example:**

```
🎬 MOTION DETECTED (15.2%)
🚨 MOTION ALERT (report-all mode)
⏰ Time: 1/27/2026, 12:35:00 PM
📸 Frame: frame-1706369700000.jpg
```

---

## Mode 2: Report-Suspicious

**Alert ONLY on suspicious activity**

```bash
node scripts/sentry-watch-v2.js report-suspicious
```

- Monitors for suspicious keywords: weapon, gun, knife, running, struggling, breaking, forced entry
- No BOLO descriptions needed
- Use for: Security monitoring, threat detection
- Output: Only alerts on suspicious behavior

**Example:**

```
⚠️ SUSPICIOUS ACTIVITY DETECTED
⏰ Time: 1/27/2026, 12:36:15 PM
📸 Frame: frame-1706369775000.jpg
🔍 Analysis: {"detected": "person with weapon"}
```

**Suspicious keywords:**

- weapon, gun, knife
- running, falling
- struggling, fighting
- breaking, forced entry
- climbing

---

## Mode 3: Report-Match (STRICT MATCHING)

**Alert ONLY when exact BOLO matches ALL required features**

```bash
node scripts/sentry-watch-v2.js report-match --cooldown 60
```

### How It Works

Each BOLO description is parsed for **required features**:

#### Example 1: "blonde girl with glasses"

```
Required Features:
✓ Color: blonde
✓ Category: girl
✓ Accessory: glasses (MUST HAVE)
```

**TRIGGERS:**

- ✅ "blonde girl wearing glasses"
- ✅ "a blonde girl with glasses on"
- ✅ "young blonde girl in glasses"

**DOES NOT TRIGGER:**

- ❌ "blonde girl" (no glasses)
- ❌ "blonde woman with glasses" (not a girl)
- ❌ "girl with glasses" (not blonde)

#### Example 2: "guy with black hat and red jacket"

```
Required Features:
✓ Color: black
✓ Category: guy
✓ Clothing: hat
✓ Color: red
✓ Clothing: jacket
```

**TRIGGERS:**

- ✅ "black-hatted guy in red jacket"
- ✅ "man wearing black hat and red jacket"

**DOES NOT TRIGGER:**

- ❌ "guy with black hat" (no red jacket)
- ❌ "guy in red jacket" (no black hat)
- ❌ "guy with blue hat and red jacket" (hat not black)

#### Example 3: "blonde girl with a mole on her left cheek"

```
Required Features:
✓ Color: blonde
✓ Category: girl
✓ Facial: mole (STRICT - must verify)
```

**TRIGGERS:**

- ✅ "blonde girl with mole on left cheek"

**DOES NOT TRIGGER:**

- ❌ "blonde girl without mole"
- ❌ "blonde girl with mole on right cheek"
- ❌ "blonde girl with freckles" (not a mole)

#### Example 4: "license plate ABC123"

```
Required Features:
✓ Vehicle Type: (implied)
✓ License Plate: ABC123 (EXACT MATCH)
```

**TRIGGERS:**

- ✅ "car with license plate ABC123"
- ✅ "vehicle: ABC123"

**DOES NOT TRIGGER:**

- ❌ "car with license plate ABC124"
- ❌ "car with license plate ABC12" (incomplete)

---

## Feature Matching Rules

### Colors (Required if mentioned)

```
blonde, blond, brown, red, black, dark, light
```

### Categories (Required if mentioned)

```
girl, boy, child, woman, man, young, old, tall, short
```

### Clothing (Required if mentioned)

```
shirt, pants, jacket, hat, dress, hoodie, jeans, coat
```

### Accessories (STRICTLY required if mentioned)

```
glasses, hat, scarf, gloves, backpack, bag
```

**If you mention an accessory, it MUST be present in the detection**

### Facial Features (MOST STRICT)

```
mole, scar, tattoo, beard, mustache, freckles
```

**These must be precisely verified - no partial matches**

### Vehicles

```
car, sedan, truck, van, motorcycle, suv
+ colors (blue, red, black, white, silver, green)
+ license plates (exact match required)
```

---

## Configuration

### Cooldown (Default: 180 seconds / 3 minutes)

```bash
# Alert every 30 seconds
node scripts/sentry-watch-v2.js report-match --cooldown 30

# Alert every 1 minute
node scripts/sentry-watch-v2.js report-match --cooldown 60

# Alert every 5 minutes
node scripts/sentry-watch-v2.js report-match --cooldown 300
```

### Check Interval (Default: 2000ms)

```bash
# Check every 1 second (faster response)
node scripts/sentry-watch-v2.js report-match --interval 1000

# Check every 5 seconds (less CPU)
node scripts/sentry-watch-v2.js report-match --interval 5000
```

### Motion Threshold (Default: 0.1 / 10%)

```bash
# Sensitive (5% change triggers)
node scripts/sentry-watch-v2.js report-match --threshold 0.05

# Very sensitive (1% change)
node scripts/sentry-watch-v2.js report-match --threshold 0.01

# Relaxed (20% change required)
node scripts/sentry-watch-v2.js report-match --threshold 0.2
```

---

## Real-World Examples

### Home Security Scenario

```bash
# Report only suspicious activity (weapons, breaking in)
node scripts/sentry-watch-v2.js report-suspicious --cooldown 120
```

### Looking for Specific Person

```bash
# Only alert if you see a blonde girl with glasses AND a mole on her cheek
node scripts/sentry-watch-v2.js report-match --cooldown 60

# BOLOs would include:
# "blonde girl with glasses and mole on her left cheek"
# "blonde girl with glasses" (less strict version)
```

### Parking Lot Monitoring

```bash
# Only alert for specific car
node scripts/sentry-watch-v2.js report-match --cooldown 300

# BOLO: "blue sedan with license plate ABC123"
# Won't trigger on:
# - blue sedan with different plate
# - car with license plate ABC123 that's not blue
# - blue car of any other type
```

### Package Theft Prevention

```bash
# Report any suspicious activity
node scripts/sentry-watch-v2.js report-suspicious --cooldown 180

# Reports: running, taking items, forced entry, etc.
```

### General Monitoring

```bash
# Report everything
node scripts/sentry-watch-v2.js report-all --cooldown 30

# Get all motion and activity
```

---

## Alert Output

### Report-All

```
🎬 MOTION DETECTED (15.2%)
🚨 MOTION ALERT
⏰ Time: timestamp
📸 Frame: filename
```

### Report-Suspicious

```
⚠️ SUSPICIOUS ACTIVITY DETECTED
⏰ Time: timestamp
📸 Frame: filename
🔍 Analysis: what was detected
```

### Report-Match (Successful)

```
!!!!!!!!!!!!!!!!!!!!!!!!!
🚨 BOLO MATCH!
!!!!!!!!!!!!!!!!!!!!!!!!!

📌 BOLO: blonde girl with glasses
🔍 Type: person
⏰ Time: timestamp
📸 Frame: filename

✓ Match Result: 3/3 features matched
✓ Confidence: 85%
✓ Required all: blonde, girl, glasses

👤 Detected: {analysis details}
```

### Report-Match (Partial - No Alert)

```
⚠️ Partial match for "blonde girl with glasses": Missing: accessory:glasses
```

---

## Best Practices

### Be Specific

- ✅ "blonde girl with glasses" (triggers only with glasses)
- ❌ "girl" (too general)

### Include Color

- ✅ "blue sedan with license plate ABC123"
- ❌ "car with license plate ABC123" (could be any color)

### List All Required Features

- ✅ "tall man with black hat, red jacket, and backpack"
- ❌ "man in jacket" (ambiguous)

### Use Exact Descriptions

- ✅ "blonde girl with mole on left cheek"
- ❌ "girl with facial mark" (too vague)

### Test Your BOLOs

- Create BOLOs and run in report-all first
- Verify you get motion detection
- Then switch to report-match to test BOLO matching

---

## Summary

| Mode              | Triggers On         | Best For             |
| ----------------- | ------------------- | -------------------- |
| report-all        | ANY motion          | General surveillance |
| report-suspicious | Suspicious keywords | Security threats     |
| report-match      | Exact BOLO match    | Specific targets     |

**Default cooldown: 180 seconds (3 minutes)**
**Fully customizable: cooldown, interval, threshold**
