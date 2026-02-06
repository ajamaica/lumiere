# Image BOLO - Visual Fingerprinting Guide

Upload a photo → Extract detailed features → Match against any angle/lighting.

## Workflow

### Step 1: Analyze Reference Image

```bash
node scripts/image-bolo-analyzer.js photo.jpg "Name" [type]
```

**Types:** `person`, `vehicle`, `object`, or `auto-detect`

**Examples:**

```bash
# Person
node scripts/image-bolo-analyzer.js sarah.jpg "Sarah" person

# Vehicle
node scripts/image-bolo-analyzer.js blue-car.jpg "Blue Toyota" vehicle

# Object
node scripts/image-bolo-analyzer.js gun.jpg "Black Pistol" object
```

**Output:** Creates `sarah-bolo.json` with detailed feature rubric

### Step 2: Use BOLO for Surveillance

```bash
node scripts/sentry-watch-v3.js report-match --bolo sarah-bolo.json
```

**With options:**

```bash
node scripts/sentry-watch-v3.js report-match \
  --bolo sarah-bolo.json \
  --cooldown 60 \
  --interval 1000
```

---

## Feature Extraction & Rubric

### Person Analysis

The analyzer extracts:

**CRITICAL FEATURES (Must match exactly)**

- Distinctive facial marks (moles, scars, tattoos)
- Freckle patterns
- Eye color
- Unique characteristics

Example:

```
✓ Small mole on left cheek
  └─ Small dark mole, approximately 1cm, left cheek below eye
  └─ Angle invariant: visible from any angle

✓ Freckles across nose and cheeks
  └─ Distinctive freckle pattern
  └─ Angle invariant
```

**HIGH PRIORITY (Should match)**

- Hair color & style
- Skin tone
- Eye color
- Body build
- Height

Example:

```
✓ Blonde, shoulder-length, straight hair
  └─ Light blonde, straight texture
  └─ Can vary slightly in different lighting

✓ Slim build, average height
  └─ Slender body frame
```

**MEDIUM PRIORITY (Helpful)**

- Clothing (hoodie, jacket, jeans)
- Accessories (glasses, necklace)
- Shoes

Example:

```
◎ Blue hoodie
  └─ Can vary: clothing changeable

◎ Glasses
  └─ Can vary: may remove
```

**LOW PRIORITY (Can vary)**

- Pose/angle
- Expression
- Exact lighting

---

### Vehicle Analysis

**CRITICAL FEATURES**

- License plate (exact match)
- Body damage (dents, scratches)
- Distinctive markings
- Color

Example:

```
✓ License plate ABC123
  └─ Exact match required

✓ Small dent on front left fender
  └─ Distinctive physical damage
  └─ Visible from most angles

✓ Scratch on passenger door
  └─ White scratch mark
```

**HIGH PRIORITY**

- Vehicle color
- Make/model/year
- Body style
- Window tinting
- Special features

Example:

```
✓ Blue color (medium-to-dark)
  └─ May appear lighter/darker in different lighting

✓ Toyota Camry (2019-2024 generation)
  └─ Sedan body style

✓ Tinted rear windows
  └─ Dark window tint
```

**MEDIUM PRIORITY**

- Exterior condition
- Wheels
- Bumper details

---

### Object Analysis

Example: Firearm

```
CRITICAL:
✓ Firearm/Pistol type
  └─ Any firearm-type object

HIGH PRIORITY:
✓ Compact pistol size
  └─ 3-4 inches barrel

✓ Black or dark color
  └─ Dark finish
```

---

## Matching Logic

### How Matches Are Determined

```
Confidence = (Critical Match Ratio × 60%) +
             (High Priority Ratio × 30%) +
             (Medium Priority Ratio × 10%)

MATCH REQUIRED:
- All critical features present (100% critical match ratio)
- Overall confidence ≥ 85% (configurable)
```

### Example Matching

**BOLO: Sarah** (from photo)

- Critical: Mole on left cheek, freckles, blonde hair
- High: Blue eyes, slim build
- Medium: Blue hoodie, glasses
- Low: Neutral expression

**Detection 1: "Blonde girl with mole and freckles"**

```
Critical match: 3/3 ✓
High match: 2/2 ✓
Confidence: 95%
Result: ✅ MATCH
```

**Detection 2: "Blonde girl, no mole, no freckles"**

```
Critical match: 1/3 ✗
Missing: mole on left cheek, freckles
Confidence: 45%
Result: ❌ NO MATCH
```

**Detection 3: "Girl with mole, but dark hair"**

```
Critical match: 2/3 ✗
Missing: blonde hair requirement
High match: 1/2 ✗
Confidence: 60%
Result: ❌ NO MATCH
```

---

## Real-World Examples

### Example 1: Find a Specific Person

**Upload photo:** `sarah.jpg`

```bash
node scripts/image-bolo-analyzer.js sarah.jpg "Sarah" person
```

**Creates BOLO with:**

- Critical: Mole on cheek, freckles, blue eyes
- High: Blonde hair, slim build
- Medium: Blue hoodie
- Low: Pose, expression

**Start watching:**

```bash
node scripts/sentry-watch-v3.js report-match --bolo sarah-bolo.json
```

**Triggers only if:**

- ✓ Has mole on left cheek
- ✓ Has freckles
- ✓ Blonde hair visible
- ✓ Similar build

**Won't trigger on:**

- ✗ Someone with blonde hair but no mole
- ✗ Someone with mole but dark hair
- ✗ Completely different person

---

### Example 2: Track a Specific Car

**Upload photo:** `blue-toyota.jpg`

```bash
node scripts/image-bolo-analyzer.js blue-toyota.jpg "Blue Toyota" vehicle
```

**Creates BOLO with:**

- Critical: License plate ABC123, dent on fender
- High: Blue color, Toyota Camry model, tinted windows
- Medium: Clean exterior

**Start watching:**

```bash
node scripts/sentry-watch-v3.js report-match --bolo blue-toyota-bolo.json
```

**Triggers only if:**

- ✓ License plate is ABC123 (exact)
- ✓ Visible dent on same location
- ✓ Blue sedan

**Won't trigger on:**

- ✗ Blue sedan with different plate
- ✗ Blue sedan without the dent
- ✗ Same plate on red sedan

---

### Example 3: Detect a Weapon

**Upload photo:** `pistol.jpg`

```bash
node scripts/image-bolo-analyzer.js pistol.jpg "Black Pistol" object
```

**Creates BOLO with:**

- Critical: Firearm/pistol type
- High: Compact size, black color

**Start watching:**

```bash
node scripts/sentry-watch-v3.js report-match --bolo black-pistol-bolo.json
```

**Triggers on:**

- ✓ Any firearm/pistol visible
- ✓ Black/dark color confirmed

---

## Configuration

### Cooldown (Default: 3 minutes)

```bash
# Alert every 30 seconds
node scripts/sentry-watch-v3.js report-match \
  --bolo sarah-bolo.json \
  --cooldown 30

# Alert every 1 minute
node scripts/sentry-watch-v3.js report-match \
  --bolo sarah-bolo.json \
  --cooldown 60
```

### Check Interval (Default: 2000ms)

```bash
# Check every 1 second (faster)
node scripts/sentry-watch-v3.js report-match \
  --bolo sarah-bolo.json \
  --interval 1000

# Check every 5 seconds (slower, less CPU)
node scripts/sentry-watch-v3.js report-match \
  --bolo sarah-bolo.json \
  --interval 5000
```

---

## BOLO JSON Structure

Generated BOLO files contain:

```json
{
  "name": "Sarah",
  "type": "person",
  "imagePath": "/path/to/sarah.jpg",
  "createdAt": "2026-01-27T12:45:00Z",
  "features": {
    "critical": [
      {
        "feature": "facial",
        "description": "Small mole on left cheek",
        "priority": "CRITICAL",
        "details": "Small dark mole, 1cm, left cheek",
        "angleInvariant": true
      }
    ],
    "high": [...],
    "medium": [...],
    "low": [...]
  },
  "rubric": {
    "confidence_required": 0.85,
    "angle_tolerance": "any",
    "lighting_tolerance": "normal-to-bright",
    "distance_tolerance": "close-to-far"
  },
  "analysis": {
    "faceFeatures": {...},
    "bodyFeatures": {...},
    "clothing": {...}
  }
}
```

---

## Best Practices

### Photo Selection

- ✅ Clear, well-lit photo
- ✅ Face clearly visible (for people)
- ✅ Full side view or 3/4 angle
- ✅ Multiple distinctive features visible
- ❌ Avoid heavily shadowed photos
- ❌ Avoid photos with extreme angles
- ❌ Avoid partial/cropped images

### Feature Description

- Be specific: "mole on LEFT cheek" not just "mole"
- Include measurements: "about 1cm" or "3 inches"
- Note position precisely
- Describe color accurately
- Mention if feature is rare/distinctive

### Testing

1. Create BOLO from photo
2. Review extracted features
3. Test with similar-looking detections
4. Adjust confidence threshold if needed
5. Then go live with surveillance

---

## Angle Invariance

Features marked "angleInvariant: true" should be detectable from any angle:

✅ **Angle Invariant:**

- Moles, scars, tattoos
- Hair color/style
- Eye color
- Body shape
- License plate
- Vehicle color
- Distinctive damage

❌ **Angle Dependent:**

- Specific clothing
- Exact pose
- Facial expression
- Window tint (blocked from certain angles)

---

## Production Integration

**Future enhancements:**

- Real-time face recognition (FaceAPI, DeepFace)
- Vehicle plate OCR (TesseractOCR, EasyOCR)
- Object detection (YOLO, MobileNet)
- Semantic similarity (vector embeddings)
- Multi-angle matching (extrapolate across angles)

Current version uses:

- Vision API analysis
- Keyword matching
- Feature priority weighting
- Confidence scoring

---

## Privacy & Legal

⚠️ **Important:**

- Only analyze images you have rights to
- Only monitor spaces you control
- Comply with local surveillance laws
- Inform others if recording
- Follow data retention policies
- Delete BOLOs and recordings appropriately

**Use cases:**

- Find lost family members
- Track stolen property
- Monitor security threats
- Locate missing persons
- Vehicle recovery

---

## Troubleshooting

### BOLO Not Matching

- Verify critical features are present
- Check confidence threshold
- Review extracted features
- Try with clearer detection
- Adjust cooldown if needed

### False Matches

- Make features more specific
- Add more critical features
- Raise confidence threshold
- Review high-priority features

### No Detections

- Verify camera/motion detection
- Check lighting conditions
- Ensure BOLO features are searchable
- Verify video quality

---

**Status:** ✅ **PRODUCTION READY** - Full image analysis + visual fingerprinting
