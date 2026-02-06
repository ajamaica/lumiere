# Loom Workflow Analyzer - Agent-Native Design

## Vision

An agent receives a Loom link and **autonomously**:

1. Downloads the video
2. Extracts key frames + transcribes audio
3. Analyzes each frame using vision capabilities
4. Understands the complete workflow
5. Generates executable Lobster automation

**No human intervention required.**

## Architecture

```
Agent receives: "Analyze this workflow: https://loom.com/share/xxx"
         │
         ▼
┌─────────────────┐
│  1. Download    │  yt-dlp (CLI)
│     Video       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Smart       │  ffmpeg + whisper
│     Extract     │  Scene detection + transcript timing
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Frame-by-   │  Agent's image tool
│     Frame       │  Analyze what's on screen
│     Analysis    │  + correlate with transcript
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. Synthesize  │  Agent reasoning
│     Workflow    │  - Identify tools/apps
│                 │  - Extract steps
│                 │  - Flag ambiguities
│                 │  - Map decision points
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  5. Generate    │  Lobster YAML
│     Automation  │  With approval gates
└─────────────────┘
```

## Smart Frame Selection

Not every frame matters. We capture frames when:

- **Scene changes** significantly (ffmpeg scene detection)
- **New speech segment** starts (Whisper timestamps)
- **Combined events** (speech + visual = important moment)
- **Gap filling** (max 10s between frames)

This reduces a 30-min video from 54,000 frames to ~50-200 key frames.

## Agent Analysis Loop

For each extracted frame:

```
1. Load frame image
2. Use vision to describe:
   - What application is visible?
   - What UI elements are in focus?
   - What action is being performed?
   - Any text/data visible?
3. Correlate with transcript at this timestamp
4. Identify if this is a:
   - Setup step
   - Data entry
   - Navigation
   - Decision point
   - Output/result
5. Flag ambiguities:
   - Unclear actions
   - Missing context
   - Credentials needed
   - Implicit knowledge assumed
```

## Workflow Synthesis

After all frames analyzed:

1. **Order steps** by timestamp
2. **Merge similar steps** (same tool, same action type)
3. **Identify loops** (repeated patterns)
4. **Map decision trees** (branching logic)
5. **Extract prerequisites** (logins, tools, data needed)

## Lobster Output

Generate `.lobster` workflow file with:

- Named steps matching the video
- `approve` gates at:
  - External actions (send, post, delete)
  - Ambiguous steps
  - Decision points
- `llm-task` for steps needing judgment
- Clear TODO markers for unautomatable parts

## Ambiguity Handling

When the agent can't determine something:

- Add `_ambiguity` annotation in workflow
- Generate clarifying questions
- Insert `approve` gate with context
- Mark step as `requires_guidance: true`

## Example Flow

**Input:**
"Analyze https://loom.com/share/abc123 and create automation"

**Agent Actions:**

1. `yt-dlp` download → video.mp4
2. `whisper` transcribe → transcript.json
3. `ffmpeg` scene detect + frame extract → 87 frames
4. For each frame: `image` tool analysis
5. Synthesize into workflow-analysis.json
6. Generate workflow.lobster + summary.md

**Output to user:**
"I've analyzed the 15-minute workflow recording. Here's what I found:

**Workflow:** Invoice Processing in QuickBooks
**Steps:** 12 main steps identified
**Tools:** QuickBooks Online, Gmail, Excel
**Automation potential:** 75%

**Key decision points:**

- Step 4: Determining invoice category (needs rules or AI)
- Step 8: Approval threshold check

**Needs clarification:**

- What login credentials are used?
- Is the Excel template always the same?

**Generated files:**

- `invoice-processing.lobster` - Executable workflow
- `invoice-processing-summary.md` - Human-readable doc

Want me to explain any step or modify the automation?"

## CLI for Agent Use

```bash
# Full pipeline
loom-workflow analyze <url> --output <dir>

# Step-by-step (for agent control)
loom-workflow download <url> -o <dir>
loom-workflow extract <video> -o <dir>  # Includes transcription
loom-workflow analyze <manifest> -o <dir>  # Vision analysis
loom-workflow generate <analysis> -o <dir>  # Lobster output
```
