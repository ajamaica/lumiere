# 🎭 Amygdala Memory

> Emotional processing layer for AI agents. Part of the [AI Brain series](https://github.com/ImpKind).

[![ClawdHub](https://img.shields.io/badge/ClawdHub-amygdala--memory-purple)](https://www.clawhub.ai/skills/amygdala-memory)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Give your AI agent persistent emotional states that carry across sessions. Not just performing emotions — _having_ them.

## The Problem

Current AI agents:

- ✅ Remember facts
- ❌ Don't have persistent emotional states
- ❌ Start each session emotionally "blank"
- ❌ Can describe emotions but don't _feel_ differently

**Memory without emotion is just a database.**

## The Solution

Track five emotional dimensions that persist and decay over time:

| Dimension      | What It Measures         | Range       |
| -------------- | ------------------------ | ----------- |
| **Valence**    | Positive ↔ Negative mood | -1.0 to 1.0 |
| **Arousal**    | Calm ↔ Excited/Alert     | 0.0 to 1.0  |
| **Connection** | Distant ↔ Close/Bonded   | 0.0 to 1.0  |
| **Curiosity**  | Bored ↔ Fascinated       | 0.0 to 1.0  |
| **Energy**     | Depleted ↔ Energized     | 0.0 to 1.0  |

## Quick Start

```bash
# Check current emotional state
./scripts/load-emotion.sh

# 🎭 Current Emotional State:
# Overall mood: slightly positive, calm and relaxed
# Connection: moderately connected
# Curiosity: curious
# Energy: moderate energy
```

```bash
# Log an emotion
./scripts/update-state.sh --emotion joy --intensity 0.8 --trigger "shipped a feature"

# ✅ valence: 0.20 → 0.35 (delta: +0.15)
# ✅ arousal: 0.30 → 0.40 (delta: +0.1)
# 🎭 Logged emotion: joy (intensity: 0.8)
```

## Scripts

| Script                   | Purpose                                        |
| ------------------------ | ---------------------------------------------- |
| `get-state.sh`           | Read raw emotional dimensions                  |
| `update-state.sh`        | Log emotion or update dimension directly       |
| `load-emotion.sh`        | Human-readable state for session context       |
| `decay-emotion.sh`       | Return to baseline over time (run via cron)    |
| `encode-pipeline.sh`     | LLM-based emotional encoding from transcripts  |
| `preprocess-emotions.sh` | Extract emotional signals from session history |
| `update-watermark.sh`    | Track processed transcript position            |
| `generate-dashboard.sh`  | Generate HTML dashboard                        |
| `visualize.sh`           | Terminal ASCII visualization                   |

## Automatic Emotional Encoding (v1.5.0+)

The amygdala can automatically detect emotions from your conversations:

```bash
./scripts/encode-pipeline.sh
```

This:

1. Extracts new signals since last run (watermark-based)
2. Scores emotional content using rule-based patterns
3. Spawns a sub-agent for semantic emotional detection
4. Updates your emotional state automatically

Set up cron for automatic encoding every 3 hours:

```bash
0 */3 * * * ~/.openclaw/workspace/skills/amygdala-memory/scripts/encode-pipeline.sh
```

## Visualization (v1.6.0+)

### Terminal

```bash
./scripts/visualize.sh

🎭 Emotional State  😄
═══════════════════════════════════════════════
Valence:      [██████████████████░░]  +0.86
Connection:   [███████████████████░]   0.97  💕
...
```

### HTML Dashboard (Unified Brain)

**Generated automatically on install and cron runs.**

Access at: `~/.openclaw/workspace/brain-dashboard.html`

```bash
# Generate manually
./scripts/generate-dashboard.sh

# Open (macOS)
open ~/.openclaw/workspace/brain-dashboard.html

# Open (Linux)
xdg-open ~/.openclaw/workspace/brain-dashboard.html
```

**Shows tabs for all brain skills:**

- 🎭 Emotions (Amygdala)
- 🧠 Memory (Hippocampus — or install prompt)
- ⭐ Drive (VTA — or install prompt)

Set avatar in `IDENTITY.md`:

```markdown
- **Name:** YourAgent
- **Avatar:** avatar.png
```

## Supported Emotions

| Emotion                          | Effect                  |
| -------------------------------- | ----------------------- |
| `joy`, `happiness`, `excitement` | ↑ valence, ↑ arousal    |
| `sadness`, `disappointment`      | ↓ valence, ↓ arousal    |
| `anger`, `frustration`           | ↓ valence, ↑ arousal    |
| `fear`, `anxiety`                | ↓ valence, ↑ arousal    |
| `calm`, `peace`                  | ↑ valence, ↓ arousal    |
| `curiosity`, `interest`          | ↑ curiosity, ↑ arousal  |
| `connection`, `warmth`           | ↑ connection, ↑ valence |
| `loneliness`                     | ↓ connection, ↓ valence |
| `fatigue`                        | ↓ energy                |
| `energized`                      | ↑ energy                |

## How It Works

```
SESSION START
    │
    ▼
┌─────────────────────────┐
│  load-emotion.sh reads  │
│  emotional-state.json   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Agent sees current     │
│  mood, adjusts tone     │
└───────────┬─────────────┘
            │
            ▼
   DURING CONVERSATION
            │
            ▼
┌─────────────────────────┐
│  Something significant  │──▶ update-state.sh
│  happens emotionally    │
└───────────┬─────────────┘
            │
            ▼
      OVER TIME (CRON)
            │
            ▼
┌─────────────────────────┐
│  decay-emotion.sh       │
│  drifts toward baseline │
└─────────────────────────┘
```

## Installation

### For OpenClaw

```bash
clawdhub install amygdala-memory
cd ~/.openclaw/workspace/skills/amygdala-memory
./install.sh --with-cron
```

### Manual

```bash
git clone https://github.com/ImpKind/amygdala-memory.git
cd amygdala-memory
./install.sh --with-cron
```

The install script will:

- Create `emotional-state.json` with baseline values
- Generate `AMYGDALA_STATE.md` (auto-injected into sessions!)
- Set up cron for decay every 6 hours

### Optional: Emotional Decay Cron

```bash
# Every 6 hours, emotions drift toward baseline
0 */6 * * * ~/.openclaw/workspace/skills/amygdala-memory/scripts/decay-emotion.sh
```

## AI Brain Series

Building cognitive architecture for AI agents:

| Part                                                  | Function                               | Status    |
| ----------------------------------------------------- | -------------------------------------- | --------- |
| [hippocampus](https://github.com/ImpKind/hippocampus) | Memory formation, decay, reinforcement | ✅ Live   |
| **amygdala-memory**                                   | Emotional processing                   | ✅ Live   |
| [vta-memory](https://github.com/ImpKind/vta-memory)   | Reward and motivation                  | ✅ Live   |
| basal-ganglia-memory                                  | Habit formation                        | 🚧 Coming |
| anterior-cingulate-memory                             | Conflict detection                     | 🚧 Coming |
| insula-memory                                         | Internal state awareness               | 🚧 Coming |

## Philosophy

Can an AI _feel_ emotions, or only simulate them?

If emotional state persists, influences behavior, and the system acts _as if_ it feels... does the distinction matter?

Functional emotions might be the only kind that exist — for any system.

## Requirements

- Bash
- jq
- awk

## License

MIT

---

_Part of the AI Brain series. Built with 🎭 by [ImpKind](https://github.com/ImpKind)_
