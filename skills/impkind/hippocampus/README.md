# 🧠 Hippocampus

[![GitHub](https://img.shields.io/badge/GitHub-ImpKind%2Fhippocampus--skill-blue?logo=github)](https://github.com/ImpKind/hippocampus-skill)
[![ClawdHub](https://img.shields.io/badge/ClawdHub-hippocampus-purple)](https://www.clawhub.ai/skills/hippocampus)

A living memory system for OpenClaw agents with importance scoring, time-based decay, and automatic reinforcement—just like a real brain.

## The Concept

**The hippocampus runs in the background, just like the real organ in your brain.**

Your main agent is busy having conversations—it can't constantly stop to decide what to remember. That's what the hippocampus does. It operates as a separate process:

1. **Background encoding**: A cron job extracts signals, scores them, and uses LLM to create concise summaries
2. **Automatic decay**: Unused memories fade over time (daily cron)
3. **Semantic reinforcement**: When similar topics come up again, existing memories strengthen automatically

The main agent doesn't "think about" memory—it just recalls what it needs, and the hippocampus handles the rest.

## Features

- **Importance Scoring**: Memories rated 0.0-1.0 based on signal type
- **Time-Based Decay**: Unused memories fade (0.99^days)
- **Semantic Reinforcement**: LLM detects similar topics → reinforces existing memories
- **LLM Summarization**: Raw messages → concise facts (via sub-agent)
- **Fresh Install Friendly**: Defaults to last 100 signals (not entire history)
- **OpenClaw Integration**: Bridges with memory_search via HIPPOCAMPUS_CORE.md

## Installation

```bash
cd ~/.openclaw/workspace/skills/hippocampus
./install.sh                    # Basic (last 100 signals)
./install.sh --with-cron        # With encoding + decay cron jobs
./install.sh --signals 50       # Custom signal limit
./install.sh --whole            # Process entire history
```

Or via ClawdHub:

```bash
clawdhub install hippocampus
```

## Quick Usage

```bash
# Load core memories at session start
./scripts/load-core.sh

# Search with importance weighting
./scripts/recall.sh "project deadline"

# Run encoding (usually via cron)
./scripts/encode-pipeline.sh

# Apply decay (usually via cron)
./scripts/decay.sh
```

## Brain Dashboard

Visual dashboard showing all installed brain skills.

### Access the Dashboard

**Option 1: Auto-generated on install**

```bash
./install.sh  # Creates brain-dashboard.html automatically
```

**Option 2: Generate manually**

```bash
./scripts/generate-dashboard.sh
```

**Option 3: Open in browser**

```bash
# macOS
open ~/.openclaw/workspace/brain-dashboard.html

# Linux
xdg-open ~/.openclaw/workspace/brain-dashboard.html

# Or open directly in browser:
# file:///home/USER/.openclaw/workspace/brain-dashboard.html
```

### Features

- 🧠 Memory tab with stats and top memories
- 🎭 Emotions tab (if amygdala installed, or install prompt)
- ⭐ Drive tab (if VTA installed, or install prompt)
- Reads avatar/name from `IDENTITY.md`
- **Auto-regenerates** on every cron run (stays fresh)

## How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Preprocess  │────▶│   Score &   │────▶│   LLM       │
│  signals    │     │   Filter    │     │  Summarize  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
         ┌─────────────────────────────────────┘
         │
         ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Semantic   │     │   Store in  │     │    Decay    │
│  Reinforce  │────▶│  index.json │◀────│ (0.99^days) │
│  OR Create  │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Memory Domains

| Domain          | Contents                |
| --------------- | ----------------------- |
| `user/`         | Facts about the human   |
| `self/`         | Agent identity & growth |
| `relationship/` | Shared context & trust  |
| `world/`        | External knowledge      |

## Decay Timeline

| Days Unused | Retention |
| ----------- | --------- |
| 7           | 93%       |
| 30          | 74%       |
| 90          | 40%       |

## Cron Jobs

The encoding cron does:

1. Extract signals from conversation
2. Score by importance
3. LLM compares to existing memories (semantic matching)
4. **Similar topic** → Reinforce existing memory
5. **New topic** → Create concise summary

```bash
# Encoding every 3 hours
openclaw cron add --name hippocampus-encoding \
  --cron "0 0,3,6,9,12,15,18,21 * * *" \
  --session isolated \
  --agent-turn "Run hippocampus encoding..."

# Daily decay at 3 AM
openclaw cron add --name hippocampus-decay \
  --cron "0 3 * * *" \
  --session isolated \
  --agent-turn "Run decay.sh..."
```

## Requirements

- Python 3
- jq
- OpenClaw

## AI Brain Series

Building cognitive architecture for AI agents:

| Part                                                          | Function                               | Status    |
| ------------------------------------------------------------- | -------------------------------------- | --------- |
| **hippocampus**                                               | Memory formation, decay, reinforcement | ✅ Live   |
| [amygdala-memory](https://github.com/ImpKind/amygdala-memory) | Emotional processing                   | ✅ Live   |
| [vta-memory](https://github.com/ImpKind/vta-memory)           | Reward and motivation                  | ✅ Live   |
| basal-ganglia-memory                                          | Habit formation                        | 🚧 Coming |
| anterior-cingulate-memory                                     | Conflict detection                     | 🚧 Coming |
| insula-memory                                                 | Internal state awareness               | 🚧 Coming |

## Based On

Stanford Generative Agents: "Interactive Simulacra of Human Behavior" (Park et al., 2023)

## License

MIT

---

_Memory is identity. Text > Brain. Part of the [AI Brain series](https://github.com/ImpKind)._
