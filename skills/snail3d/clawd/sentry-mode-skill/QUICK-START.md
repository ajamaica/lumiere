# Sentry Mode - Quick Start

## Three Ways to Monitor

### 1. Alert on ANY Motion

```bash
node scripts/sentry-watch-v2.js report-all
```

Triggers on everything. Good for general surveillance.

### 2. Alert on Suspicious Activity

```bash
node scripts/sentry-watch-v2.js report-suspicious
```

Only triggers on: weapons, running, fighting, breaking in, forced entry, etc.

### 3. Alert on Exact BOLO Match

```bash
node scripts/sentry-watch-v2.js report-match
```

**Only triggers when ALL features match exactly.**

---

## BOLO Examples

### ✅ These trigger:

```
"blonde girl with glasses"
↓ Detects: blonde girl wearing glasses ✓
"man with black hat"
↓ Detects: man in black hat ✓
"blue sedan with license plate ABC123"
↓ Detects: blue sedan, plate ABC123 ✓
```

### ❌ These DON'T trigger:

```
"blonde girl with glasses"
↓ Detects: blonde girl (no glasses) ✗

"man with black hat"
↓ Detects: man in blue hat ✗

"blue sedan with license plate ABC123"
↓ Detects: blue sedan with plate XYZ123 ✗
```

---

## Configure Cooldown

Default: 3 minutes (180 seconds) between alerts

```bash
# 30 seconds
node scripts/sentry-watch-v2.js report-match --cooldown 30

# 1 minute
node scripts/sentry-watch-v2.js report-match --cooldown 60

# 5 minutes
node scripts/sentry-watch-v2.js report-match --cooldown 300
```

---

## Usage Scenarios

### Finding a Specific Person

```bash
node scripts/sentry-watch-v2.js report-match --cooldown 60

# Looking for: blonde girl with glasses and a mole on her left cheek
# Won't trigger on:
# - blonde girl without glasses
# - blonde girl with glasses but no mole
# - girl with mole but not blonde
```

### Security Monitoring

```bash
node scripts/sentry-watch-v2.js report-suspicious --cooldown 120

# Alerts on: weapons, breaking in, running, fighting
```

### General Monitoring

```bash
node scripts/sentry-watch-v2.js report-all --cooldown 30

# Every motion triggers an alert
```

### Car Tracking

```bash
node scripts/sentry-watch-v2.js report-match

# BOLO: "blue sedan with license plate ABC123"
# Must match ALL: color, type, plate
```

---

## Feature Matching

**Colors:** blonde, brown, red, black, dark, light
**People:** girl, boy, man, woman, child, young, old
**Clothing:** hat, jacket, shirt, pants, hoodie, jeans
**Accessories:** glasses, scarf, backpack (STRICTLY required if mentioned)
**Facial:** mole, scar, tattoo, beard (STRICTLY required if mentioned)
**Vehicles:** car, sedan, truck, van, motorcycle, suv
**Plates:** ABC123 (exact match required)

---

## Key Rules

1. **If you mention it, it's required**
   - "blonde girl with glasses" → she MUST have glasses
   - "blue car" → car MUST be blue

2. **Accessories are strict**
   - "girl with glasses" → MUST wear glasses
   - "man with hat" → MUST wear hat

3. **Facial features are strictest**
   - "girl with mole on left cheek" → MUST have mole on LEFT
   - "man with beard" → MUST have beard

4. **License plates must match exactly**
   - "ABC123" → must be ABC123
   - Won't trigger on ABC124 or ABC12

---

## Check It Out

```bash
cd ~/clawd/sentry-mode-skill

# See all options
node scripts/sentry-watch-v2.js

# Read detailed guide
cat MODES.md

# Read full docs
cat SKILL.md
```

---

**Status:** ✅ Ready for production use
