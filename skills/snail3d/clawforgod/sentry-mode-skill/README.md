# Sentry Mode

Webcam surveillance with AI analysis. Ask what you want to know about your physical space, get a detailed visual report.

## Quick Start

```bash
# Basic query
node scripts/sentry-mode.js activate --query "Is anyone in the room?"

# With details
node scripts/sentry-mode.js activate --query "What's on my desk?" --verbose

# Longer recording, more frames
node scripts/sentry-mode.js activate --query "Any movement?" --duration 5 --frames 8
```

## Features

✅ **Video Capture** - Records 3-5 seconds from webcam
✅ **Frame Extraction** - Uses ffmpeg to pull key frames
✅ **Vision Analysis** - Claude AI analyzes what it sees
✅ **Flexible Queries** - Ask anything about your workspace
✅ **Confidence Reporting** - High/Medium/Low confidence levels
✅ **Privacy** - All temp files deleted after analysis

## Example Queries

```bash
# People Detection
"Is anyone in the room?"
"How many people visible?"

# Desk/Office Status
"What's on my desk?"
"Is my workspace organized?"

# Motion Detection
"Any movement or activity?"
"Is anything different than before?"

# Text Recognition
"Read any visible text"
"What's on the screen?"

# General Status
"Take a snapshot and describe"
"What do you see?"
```

## Output

```
════════════════════════════════════════════════════════════
📊 SENTRY MODE REPORT
════════════════════════════════════════════════════════════

🔍 Query: "Is anyone in the room?"
⏰ Timestamp: 1/27/2026, 12:21:01 PM
📹 Frames Analyzed: 5

FINDINGS:
- Summary: ✅ Detection: Person present
- Details: One person visible in frame at desk
- Activity: Seated, appears to be working
- Confidence: High

✓ Status: COMPLETE
════════════════════════════════════════════════════════════
```

## Options

```
--query <text>       Your question (required)
--duration <seconds> Recording length (default: 3)
--frames <number>    Key frames to extract (default: 5)
--verbose            Show detailed frame info
--confidence <level> High/Medium/Low (default: medium)
```

## System Requirements

- ffmpeg (for video capture + frame extraction)
- Webcam access (system permissions required)
- Node.js 14+

## Installation

```bash
# Install ffmpeg if needed
brew install ffmpeg  # macOS
apt-get install ffmpeg  # Linux
choco install ffmpeg  # Windows

# Run sentry-mode
node scripts/sentry-mode.js activate --query "Your question"
```

## How It Works

1. **Capture** → Records video from webcam (ffmpeg)
2. **Extract** → Pulls 3-5 key frames from video
3. **Analyze** → Sends frames to Claude vision API
4. **Report** → Provides findings with confidence level

## Privacy Notes

⚠️ Remember:

- This records your physical environment
- System permissions needed for camera access
- Be mindful in shared spaces
- All temp files are deleted after analysis
- Analysis goes through Claude API (follows Anthropic privacy policy)

## Integration with Clawdbot

Use in your daily workflow:

- Check workspace before video calls
- Monitor desk during work sessions
- Verify room status for security
- Read information from displays
- Quick visual checks without manual inspection

## Use Cases

- **Workspace Verification**: Confirm you're at your desk
- **Security Checks**: Verify room is empty/locked
- **Activity Monitoring**: Detect motion/activity
- **Visual Tasks**: Read screen text, check object placement
- **Remote Work**: Monitor your home office setup

---

See `SKILL.md` for detailed documentation.
