---
name: sentry-mode
description: Webcam surveillance with AI analysis. Two modes: (1) One-shot analysis - answer specific questions about your space, (2) BOLO watch mode - continuous monitoring with motion detection and custom watchlists for people/objects. Use cases: "Is anyone in the room?", "What's on my desk?", or keep watch for "guy with black hat", "little blond girl", etc. Motion-triggered alerts with 3-min cooldown.
---

# Sentry Mode

Webcam-based surveillance with AI-powered analysis. Ask a question, get a visual answer.

## Quick Start

### Activate Sentry Mode

```bash
sentry-mode activate --query "Is anyone in the room?"
```

Output:

```
📹 Sentry Mode Activated
🎥 Recording video (3 seconds)...
🔍 Extracting frames (ffmpeg)...
🤖 Analyzing with vision AI...

📊 REPORT:
Query: Is anyone in the room?
Status: ✅ Yes
Details: One person visible at desk, facing monitor
Confidence: High
Timestamp: 2026-01-27 11:15:00 MST
```

### Supported Queries

**People Detection:**

- "Is anyone in the room?"
- "How many people are visible?"
- "Is my person in frame?"

**Object Detection:**

- "What's on my desk?"
- "Any open windows or doors?"
- "What's the room status?"

**Movement:**

- "Any movement detected?"
- "Is anything changed since last check?"
- "Any activity in the frame?"

**Text Recognition:**

- "Read any visible text"
- "What's on the screen?"
- "Any readable text visible?"

**General Status:**

- "Take a snapshot and describe"
- "What do you see?"
- "Analyze the current view"

## How It Works

### Step 1: Capture Video

- Access webcam via ffmpeg or system tool
- Record 3-5 seconds of video
- Save to temp file

### Step 2: Extract Frames

- Use ffmpeg to extract 3-5 key frames from video
- Convert to images
- Select most relevant frames

### Step 3: Analyze with Vision AI

- Send frames to Claude vision model
- Include your query in the prompt
- Get detailed analysis

### Step 4: Report Findings

- Summarize results
- Note confidence level
- Provide timestamp
- Suggest actions if needed

## Examples

### Example 1: Check Room Occupancy

```bash
sentry-mode activate --query "Is anyone in the room?"
```

Response:

```
✅ YES - One person visible
- Person at desk, facing left
- Seated position
- No visible movement
- Confidence: High
```

### Example 2: Monitor Desk

```bash
sentry-mode activate --query "What's on my desk and is it organized?"
```

Response:

```
📊 DESK STATUS:
Items visible:
- Laptop (open, screen active)
- Coffee cup (left side)
- Papers (scattered)
- Keyboard and mouse (centered)
- Phone (right side)

Organization: Fair
Notes: Some papers could be filed
Confidence: High
```

### Example 3: Detect Motion

```bash
sentry-mode activate --query "Any movement or activity?"
```

Response:

```
🎬 MOTION ANALYSIS:
Primary frames: 5 extracted
Movement detected: Yes
Type: Person typing/working
Duration: Continuous across frames
Intensity: Light (sitting activity)
Confidence: High
```

## Configuration

### Default Settings

- **Duration:** 3 seconds video
- **Frames:** Extract 5 key frames
- **Format:** JPEG images
- **Analysis:** Claude vision AI (latest)
- **Confidence threshold:** Medium+

### Adjustable Options

```bash
sentry-mode activate \
  --query "Is anyone in the room?" \
  --duration 5 \  # seconds
  --frames 8 \    # number to extract
  --confidence high  # high/medium/low
```

## Technical Details

### Dependencies

- ffmpeg (video capture + frame extraction)
- Claude vision API (analysis)
- Node.js or similar (orchestration)

### Supported Cameras

- Built-in webcam (default)
- USB cameras
- IP cameras (if accessible locally)

### Output Formats

- **Text report** (default)
- **JSON** (with `--format json`)
- **Detailed analysis** (with `--verbose`)

### Privacy & Storage

- Videos deleted immediately after frame extraction
- Frames deleted after analysis
- No persistent storage by default
- Analysis results retained in conversation only

## Use Cases

**Workspace Monitoring:**

- Verify you're at your desk
- Check desk organization
- Monitor for interruptions

**Security Checks:**

- Confirm room is empty
- Verify doors/windows status
- Detect unauthorized access

**Activity Logging:**

- Track work sessions
- Monitor room activity
- Verify presence for time tracking

**Visual Tasks:**

- Read text from screen
- Confirm object placement
- Check visual status

**Remote Management:**

- Monitor remote workspace
- Check equipment status
- Verify installations/setups

## Limitations

- **Lighting:** Works best in good lighting
- **Angles:** Fixed to webcam position
- **Privacy:** Captures everything in view (use responsibly)
- **Detail:** Cannot identify specific individuals
- **Depth:** No 3D information (2D analysis only)

## Security & Privacy Notes

⚠️ **Important:**

- This records video from your workspace
- Ensure privacy compliance in shared spaces
- Consider consent from others in frame
- Data is processed via Claude API (follows Anthropic privacy policy)
- Local storage: None by default

## Troubleshooting

### Camera won't activate

- Check system permissions (macOS may require camera access)
- Verify camera is not in use by other app
- Try specifying camera explicitly: `--camera 0`

### Low-quality frames

- Improve lighting
- Move closer to camera
- Increase extraction frame count
- Check camera lens for dirt

### Analysis too generic

- Be more specific in query
- Try multiple queries
- Use `--verbose` for detailed output
- Specify what to focus on

## Scripts

- **sentry-mode.js** - Main orchestrator (capture → extract → analyze → report)
- **webcam-capture.js** - ffmpeg wrapper for video capture
- **frame-extractor.js** - Extract key frames from video
- **vision-analyzer.js** - Send frames to Claude + parse response

## References

- **SETUP.md** - Camera permissions and device setup
- **EXAMPLES.md** - Real-world usage scenarios
- **BOLO.md** - Be On The Lookout mode (continuous monitoring with watchlists)
