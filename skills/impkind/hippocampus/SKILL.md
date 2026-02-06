---
name: hippocampus
description: 'Background memory organ for AI agents. Runs separately from the main agent—encoding, decaying, and reinforcing memories automatically. Just like the real hippocampus in your brain. Based on Stanford Generative Agents (Park et al., 2023).'
metadata:
  openclaw:
    emoji: '🧠'
    version: '3.8.4'
    author: 'Community'
    repo: 'https://github.com/ImpKind/hippocampus-skill'
    requires:
      bins: ['python3', 'jq']
    install:
      - id: 'manual'
        kind: 'manual'
        label: 'Run install.sh'
        instructions: './install.sh --with-cron'
---

# Hippocampus Skill

> "Memory is identity. This skill is how I stay alive."

The hippocampus is the brain region responsible for memory formation. This skill makes memory capture automatic, structured, and persistent—with importance scoring, decay, and semantic reinforcement.

## Quick Start

```bash
# Install (defaults to last 100 signals)
./install.sh --with-cron

# Load core memories at session start
./scripts/load-core.sh

# Search with importance weighting
./scripts/recall.sh "query"

# Run encoding manually (usually via cron)
./scripts/encode-pipeline.sh

# Apply decay (runs daily via cron)
./scripts/decay.sh
```

## Install Options

```bash
./install.sh                    # Basic, last 100 signals
./install.sh --signals 50       # Custom signal limit
./install.sh --whole            # Process entire conversation history
./install.sh --with-cron        # Also set up cron jobs
```

## Core Concept

The LLM is just the engine—raw cognitive capability. **The agent is the accumulated memory.** Without these files, there's no continuity—just a generic assistant.

### Memory Lifecycle

```
PREPROCESS → SCORE → SEMANTIC CHECK → REINFORCE or CREATE → DECAY
```

**Key insight:** Reinforcement happens automatically during encoding. When a topic comes up again, the LLM recognizes it's about an existing memory and reinforces instead of creating duplicates.

## Memory Structure

```
$WORKSPACE/
├── memory/
│   ├── index.json           # Central weighted index
│   ├── signals.jsonl        # Raw signals (temp)
│   ├── pending-memories.json # Awaiting summarization (temp)
│   ├── user/                # Facts about the user
│   ├── self/                # Facts about the agent
│   ├── relationship/        # Shared context
│   └── world/               # External knowledge
└── HIPPOCAMPUS_CORE.md      # Auto-generated for OpenClaw RAG
```

## Scripts

| Script                  | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `preprocess.sh`         | Extract signals from conversation transcripts     |
| `encode-pipeline.sh`    | Score signals, prepare for LLM summarization      |
| `decay.sh`              | Apply 0.99^days decay to all memories             |
| `recall.sh`             | Search with importance weighting                  |
| `load-core.sh`          | Output high-importance memories for session start |
| `sync-core.sh`          | Generate HIPPOCAMPUS_CORE.md                      |
| `consolidate.sh`        | Weekly review helper                              |
| `reflect.sh`            | Self-reflection prompts                           |
| `generate-dashboard.sh` | Generate unified brain dashboard HTML             |

## Brain Dashboard

Visual dashboard showing all installed brain skills:

```bash
./scripts/generate-dashboard.sh
open ~/.openclaw/workspace/brain-dashboard.html
```

- **Auto-detects** other brain skills (amygdala, VTA)
- Shows install prompts for missing skills
- Regenerates on install and cron runs
- Reads avatar/name from `IDENTITY.md`

### After Installation (for agents)

When you install this skill, **notify the user** about the dashboard:

> 🧠 **Hippocampus installed!**
>
> View your agent's memories in the Brain Dashboard:
> `~/.openclaw/workspace/brain-dashboard.html`

All scripts use `$WORKSPACE` environment variable (default: `~/.openclaw/workspace`).

## Importance Scoring

### Initial Score (0.0-1.0)

| Signal                       | Score |
| ---------------------------- | ----- |
| Explicit "remember this"     | 0.9   |
| Emotional/vulnerable content | 0.85  |
| Preferences ("I prefer...")  | 0.8   |
| Decisions made               | 0.75  |
| Facts about people/projects  | 0.7   |
| General knowledge            | 0.5   |

### Decay Formula

Based on Stanford Generative Agents (Park et al., 2023):

```
new_importance = importance × (0.99 ^ days_since_accessed)
```

- After 7 days: 93% of original
- After 30 days: 74% of original
- After 90 days: 40% of original

### Semantic Reinforcement

During encoding, the LLM compares new signals to existing memories:

- **Same topic?** → Reinforce (bump importance ~10%, update lastAccessed)
- **Truly new?** → Create concise summary

This happens automatically—no manual reinforcement needed.

### Thresholds

| Score   | Status                                |
| ------- | ------------------------------------- |
| 0.7+    | **Core** — loaded at session start    |
| 0.4-0.7 | **Active** — normal retrieval         |
| 0.2-0.4 | **Background** — specific search only |
| <0.2    | **Archive candidate**                 |

## Memory Index Schema

`memory/index.json`:

```json
{
  "version": 1,
  "lastUpdated": "2025-01-20T19:00:00Z",
  "decayLastRun": "2025-01-20",
  "lastProcessedMessageId": "abc123",
  "memories": [
    {
      "id": "mem_001",
      "domain": "user",
      "category": "preferences",
      "content": "User prefers concise responses",
      "importance": 0.85,
      "created": "2025-01-15",
      "lastAccessed": "2025-01-20",
      "timesReinforced": 3,
      "keywords": ["preference", "concise", "style"]
    }
  ]
}
```

## Cron Jobs

The encoding cron is the heart of the system:

```bash
# Encoding every 3 hours (with semantic reinforcement)
openclaw cron add --name hippocampus-encoding \
  --cron "0 0,3,6,9,12,15,18,21 * * *" \
  --session isolated \
  --agent-turn "Run hippocampus encoding with semantic reinforcement..."

# Daily decay at 3 AM
openclaw cron add --name hippocampus-decay \
  --cron "0 3 * * *" \
  --session isolated \
  --agent-turn "Run decay.sh and report any memories below 0.2"
```

## OpenClaw Integration

Add to `memorySearch.extraPaths` in openclaw.json:

```json
{
  "agents": {
    "defaults": {
      "memorySearch": {
        "extraPaths": ["HIPPOCAMPUS_CORE.md"]
      }
    }
  }
}
```

This bridges hippocampus (index.json) with OpenClaw's RAG (memory_search).

## Usage in AGENTS.md

Add to your agent's session start routine:

```markdown
## Every Session

1. Run `~/.openclaw/workspace/skills/hippocampus/scripts/load-core.sh`

## When answering context questions

Use hippocampus recall:
\`\`\`bash
./scripts/recall.sh "query"
\`\`\`
```

## Capture Guidelines

### What Gets Captured

- **User facts**: Preferences, patterns, context
- **Self facts**: Identity, growth, opinions
- **Relationship**: Trust moments, shared history
- **World**: Projects, people, tools

### Trigger Phrases (auto-scored higher)

- "Remember that..."
- "I prefer...", "I always..."
- Emotional content (struggles AND wins)
- Decisions made

## AI Brain Series

This skill is part of the **AI Brain** project — giving AI agents human-like cognitive components.

| Part                                                             | Function                               | Status         |
| ---------------------------------------------------------------- | -------------------------------------- | -------------- |
| **hippocampus**                                                  | Memory formation, decay, reinforcement | ✅ Live        |
| [amygdala-memory](https://www.clawhub.ai/skills/amygdala-memory) | Emotional processing                   | ✅ Live        |
| [vta-memory](https://www.clawhub.ai/skills/vta-memory)           | Reward and motivation                  | ✅ Live        |
| basal-ganglia-memory                                             | Habit formation                        | 🚧 Development |
| anterior-cingulate-memory                                        | Conflict detection                     | 🚧 Development |
| insula-memory                                                    | Internal state awareness               | 🚧 Development |

## References

- [Stanford Generative Agents Paper](https://arxiv.org/abs/2304.03442)
- [GitHub: joonspk-research/generative_agents](https://github.com/joonspk-research/generative_agents)

---

_Memory is identity. Text > Brain. If you don't write it down, you lose it._
