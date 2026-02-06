---
name: cellcog
description: CellCog SDK setup and authentication. Any-to-Any AI for agents - your sub-agent for quality work. Fire-and-forget pattern with WebSocket notifications. Required for research-cog, video-cog, image-cog, audio-cog, dash-cog, slides-cog, sheet-cog.
metadata:
  openclaw:
    emoji: '🧠'
---

# CellCog - Any-to-Any for Agents

## The Power of Any-to-Any

CellCog is the only AI that truly handles **any input → any output** in a single request. No tool chaining. No orchestration complexity. One call, multiple deliverables.

### Send Multiple Files, Any Format

Provide as many documents as you need—all at once:

```python
prompt = """
Analyze all of these together:
<SHOW_FILE>/data/q4_earnings.pdf</SHOW_FILE>
<SHOW_FILE>/data/competitor_analysis.pdf</SHOW_FILE>
<SHOW_FILE>/data/market_research.xlsx</SHOW_FILE>
<SHOW_FILE>/recordings/customer_interview.mp3</SHOW_FILE>
<SHOW_FILE>/designs/product_mockup.png</SHOW_FILE>

Give me a comprehensive market positioning analysis based on all these inputs.
"""
```

CellCog understands PDFs, spreadsheets, images, audio, video, code files, and more—simultaneously.

### Request Multiple Outputs, Different Modalities

Ask for completely different output types in ONE request:

```python
prompt = """
Based on this quarterly sales data:
<SHOW_FILE>/data/sales_q4_2025.csv</SHOW_FILE>

Create ALL of the following:
1. A PDF executive summary report with charts
2. An interactive HTML dashboard for the leadership team
3. A 60-second video presentation for the all-hands meeting
4. A PPTX slide deck for the board presentation
5. An Excel file with the underlying analysis and projections
"""
```

CellCog handles the entire workflow—analyzing, generating, and delivering all outputs with consistent insights across every format.

### Why This Matters

| Traditional Approach                    | CellCog Any-to-Any |
| --------------------------------------- | ------------------ |
| 5 separate API calls to different tools | 1 request          |
| Manual orchestration and data passing   | Automatic          |
| Inconsistent context between outputs    | Unified analysis   |
| Hours of integration work               | Minutes            |

**This is your sub-agent for quality work.** When you need depth, accuracy, or deliverables that require real work—research, videos, images, PDFs, dashboards, presentations, spreadsheets—use CellCog.

---

## Quick Start

### Installation

```bash
pip install cellcog==1.0.0
```

**Important:** This skill is tested with SDK v1.0.0. If you encounter issues:

1. Verify your SDK version matches: `python3 -c "import cellcog; print(cellcog.__version__)"`
2. Check for skill updates: `clawhub update cellcog` (may reference a different SDK version)

### Authentication

Get your API key from: https://cellcog.ai/profile?tab=api-keys

```python
from cellcog import CellCogClient

client = CellCogClient()
client.set_api_key("sk_...")  # SDK handles file storage automatically
```

Check configuration:

```python
status = client.get_account_status()
print(status)  # {"configured": True, "email": "user@example.com", ...}
```

---

## Fire-and-Forget Pattern (v1.0+)

**No more blocking. No more spawning sub-sessions to babysit.**

CellCog uses a fire-and-forget pattern:

1. Call `create_chat()` or `send_message()` - returns **immediately**
2. A background daemon monitors via WebSocket
3. Your session receives notification when complete

### Why Fire-and-Forget?

| Old Pattern (v0.1.x)           | New Pattern (v1.0+) |
| ------------------------------ | ------------------- |
| `sessions_spawn` to babysit    | No spawning needed  |
| Blocked waiting for completion | Continue other work |
| Polling every 10 seconds       | WebSocket real-time |
| Complex sub-session management | Simple notification |

### Basic Usage

```python
from cellcog import CellCogClient

client = CellCogClient()

# Fire-and-forget: returns immediately
result = client.create_chat(
    prompt="Research quantum computing advances in 2026",
    notify_session_key="agent:main:main",  # Your session key
    task_label="quantum-research"          # Label for notification
)

print(result["chat_id"])           # "abc123"
print(result["explanation"])       # Clear guidance on what happens next

# Continue with other work...
# You'll receive notification at your session when complete!
```

**What the response looks like:**

```python
{
    "chat_id": "abc123",
    "status": "tracking",
    "daemon_listening": True,
    "listeners": 1,
    "explanation": "✓ Chat 'quantum-research' created (ID: abc123)\n✓ Daemon is monitoring via WebSocket\n✓ You'll receive notification at 'agent:main:main' when complete\n\nYou can continue with other work. Do NOT poll - the daemon will notify you automatically with the full response and any generated files."
}
```

---

## What You Receive

When CellCog completes, your session receives a notification like:

```
✅ quantum-research completed!

Chat ID: abc123
Messages delivered: 5
Files downloaded:
  - /outputs/research_report.pdf
  - /outputs/data_analysis.xlsx

<MESSAGE FROM openclaw on Chat abc123 at 2026-02-04 14:00 UTC>
Research quantum computing advances in 2026
<MESSAGE END>

<MESSAGE FROM cellcog on Chat abc123 at 2026-02-04 14:30 UTC>
Research complete! I've analyzed 47 sources and compiled the findings...

Key Findings:
- Quantum supremacy achieved in error correction
- Major breakthrough in topological qubits
- Commercial quantum computers now available for $2M+

Generated deliverables:
<SHOW_FILE>/outputs/research_report.pdf</SHOW_FILE>
<SHOW_FILE>/outputs/data_analysis.xlsx</SHOW_FILE>
<MESSAGE END>

[CellCog stopped operating on Chat abc123 - waiting for response via send_message()]

Use `client.get_history("abc123")` to view full conversation.
```

**Message Format Notes:**

- Timestamps in UTC
- Files show as local paths (already downloaded by daemon)
- Full conversation history included
- Completion indicator after last CellCog message

---

## Interim Updates (Long-Running Tasks)

For tasks taking more than 4 minutes, you'll automatically receive progress updates:

```
⏳ quantum-research - CellCog is still working

Your request is still being processed. The final response is not ready yet.

Here are interim updates from CellCog showing recent activity:
  • Searching for quantum computing research papers
  • Analyzing breakthrough in error correction
  • Generating comparison charts

Chat ID: abc123

We'll deliver the complete response when CellCog finishes processing.
```

**These are NOT the final response** - just progress indicators so you know CellCog is actively working. Continue with other tasks; the complete response arrives when processing finishes.

---

## Primary Methods

### create_chat()

Create a new CellCog task and return immediately:

```python
result = client.create_chat(
    prompt="Your task description",
    notify_session_key="agent:main:main",  # Who to notify
    task_label="my-task",                   # Human-readable label
    chat_mode="agent team",                 # See Chat Modes below
    project_id=None,                        # Optional CellCog project
    gateway_url=None                        # Auto-detected from OPENCLAW_GATEWAY_URL env
)
```

**Returns:**

```python
{
    "chat_id": "abc123",
    "status": "tracking",
    "daemon_listening": True,
    "listeners": 1,
    "explanation": "✓ Chat created...\n✓ Daemon monitoring...\n✓ Do NOT poll..."
    # "uploaded_files": [...] - only if SHOW_FILE tags were in prompt
}
```

### send_message()

Continue an existing conversation:

```python
result = client.send_message(
    chat_id="abc123",
    message="Focus on hardware advances specifically",
    notify_session_key="agent:main:main",
    task_label="continue-research"  # Optional, defaults to "continue-{chat_id[:8]}"
)
```

**Listener Behavior:**

- One listener per `session_key` per chat
- Calling `send_message()` with same `notify_session_key` updates the existing listener (new `task_label`)
- Does NOT create duplicate listeners

### get_history()

Get full chat history (for manual inspection):

```python
result = client.get_history(chat_id="abc123")

print(result["is_operating"])      # True/False
print(result["formatted_output"])  # Full formatted messages
print(result["downloaded_files"])  # List of downloaded file paths
print(result["status_message"])    # Operating status
```

### get_status()

Quick status check:

```python
status = client.get_status(chat_id="abc123")
print(status["is_operating"])  # True/False
print(status["error_type"])    # None, "security_threat", or "out_of_memory"
```

---

## Chat Modes

CellCog offers two powerful modes optimized for different scenarios:

| Mode           | Best For                                                                                                         | Speed                     | Cost |
| -------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------- | ---- |
| `"agent"`      | Most tasks - images, audio, dashboards, spreadsheets, standard presentations                                     | Fast (seconds to minutes) | 1x   |
| `"agent team"` | Cutting-edge work requiring multi-angle analysis - investor pitch decks, deep research, complex marketing videos | Slower (5-60 min)         | 4x   |

**Selection Guide:**

- **Default to `"agent"`** - It's powerful, fast, and handles most tasks excellently
- **Use `"agent team"` when you need:**
  - Deep research with multi-source synthesis
  - Boardroom-quality investor decks
  - Marketing videos requiring creative direction
  - Work that benefits from multiple reasoning passes

**The key question:** Does this task require thinking from multiple angles and deep deliberation? If yes → `"agent team"`. If it's execution-focused → `"agent"`.

### Clarifying Questions Behavior

**Agent mode asks one round of clarifying questions** in most cases (~99%) to ensure it delivers exactly what you need.

To skip clarifying questions, explicitly state in your prompt:

- "No clarifying questions needed"
- "Proceed directly without questions"
- "Skip clarifications and deliver"

This gives you control over the interaction style while still getting high-quality results.

---

## Session Keys

The `notify_session_key` tells CellCog where to deliver the notification.

### Common Patterns

| Context       | Session Key                       |
| ------------- | --------------------------------- |
| Main agent    | `"agent:main:main"`               |
| Sub-agent     | `"agent:main:subagent:{uuid}"`    |
| Telegram DM   | `"agent:main:telegram:dm:{id}"`   |
| Discord group | `"agent:main:discord:group:{id}"` |

### Parent Fallback

If your session dies before completion, the SDK automatically notifies the parent session:

- `agent:main:subagent:uuid123` → falls back to `agent:main:main`
- Nested subagents walk up the chain until delivery succeeds

---

## File Handling

### Sending Files to CellCog (SHOW_FILE)

Include local files in your prompts:

```python
prompt = """
Analyze this sales data and create a report:
<SHOW_FILE>/path/to/sales.csv</SHOW_FILE>
"""
```

The SDK automatically:

1. Uploads the file to CellCog
2. Tracks the original path
3. Downloads output files back to your filesystem

### Requesting File Output (GENERATE_FILE)

Tell CellCog where to save generated files:

```python
prompt = """
Create a PDF report and save it here:
<GENERATE_FILE>/outputs/quarterly_report.pdf</GENERATE_FILE>
"""
```

CellCog will generate the file and the SDK will download it to your specified path.

### Auto-Download

Files without `GENERATE_FILE` are automatically downloaded to:

```
~/.cellcog/chats/{chat_id}/downloads/
```

---

## Background Daemon

The SDK runs a background daemon that:

- Monitors tracked chats via WebSocket
- Downloads files when complete
- Notifies your session with results
- Survives system restarts

### Automatic Management

The daemon is automatically started when you call `create_chat()` or `send_message()`. You don't need to manage it manually.

### State Persistence

Tracking state is stored in files:

```
~/.cellcog/
├── tracked_chats/     # One file per tracked chat
│   └── abc123.json
└── chats/             # Per-chat data
    └── abc123/
        └── .seen_indices/  # Per-session message tracking
```

This means:

- Survives daemon restarts
- Survives system reboots
- No messages lost

---

## Error Handling

### Payment Required

```python
from cellcog.exceptions import PaymentRequiredError

try:
    result = client.create_chat(...)
except PaymentRequiredError as e:
    print(f"Add credits at: {e.subscription_url}")
```

### Authentication Error

```python
from cellcog.exceptions import AuthenticationError

try:
    result = client.create_chat(...)
except AuthenticationError:
    print("Invalid API key. Get a new one at: https://cellcog.ai/profile?tab=api-keys")
```

---

## Quick Reference

| Method                 | Purpose                              | Returns Immediately |
| ---------------------- | ------------------------------------ | ------------------- |
| `set_api_key(key)`     | Store API key                        | Yes                 |
| `get_account_status()` | Check if configured                  | Yes                 |
| `create_chat()`        | **Fire-and-forget chat creation**    | ✓ Yes               |
| `send_message()`       | **Fire-and-forget message**          | ✓ Yes               |
| `get_history()`        | Get full history (manual inspection) | Yes (sync)          |
| `get_status()`         | Quick status check                   | Yes (sync)          |

---

## Satellite Skills

Install capability-specific skills to explore what CellCog can do:

- `clawhub install research-cog` - Deep research, market analysis, competitive intelligence
- `clawhub install video-cog` - AI video generation, lipsync, marketing videos
- `clawhub install image-cog` - Image generation, consistent characters
- `clawhub install audio-cog` - Text-to-speech, music generation
- `clawhub install dash-cog` - Interactive dashboards, data visualization
- `clawhub install slides-cog` - Presentations, pitch decks
- `clawhub install sheet-cog` - Spreadsheets, financial models

**This mothership skill shows you HOW to call CellCog. Satellite skills show you WHAT's possible.**

**All satellite skills work with SDK v1.0.0.** Each satellite references this mothership for technical details.
