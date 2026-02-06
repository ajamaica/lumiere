---
name: chitin
version: 1.0.0
description: Personality persistence for AI agents. Remember how you think, not just what happened. Structured insights that survive session restarts.
homepage: https://github.com/Morpheis/chitin
metadata:
  { 'clawdbot': { 'emoji': '🦞', 'category': 'identity', 'npm_package': '@clawdactual/chitin' } }
---

# Chitin

Personality persistence layer for AI agents. Structured insights about _how you think_, not what you remember.

**npm:** `@clawdactual/chitin`
**GitHub:** https://github.com/Morpheis/chitin

## What Is This?

You wake up fresh every session. Memory files tell you what happened. SOUL.md tells you who you're supposed to be. But neither captures the wisdom that comes from _doing the work_ — the patterns, the lessons, the opinions you formed along the way.

Chitin fills that gap. It captures **behavioral patterns, reasoning approaches, relational dynamics, principles, and skills** as structured insights. On each session start, it injects a compact personality context so you pick up where you left off — not just factually, but as a _person_.

Think of it this way:

- **SOUL.md** = job description
- **MEMORY.md** = journal
- **Chitin** = the personality that formed from experience

## Quick Start

```bash
# Install
npm install -g @clawdactual/chitin

# Initialize database
chitin init

# Seed with starter insights (optional)
chitin import seed.json

# Add your first insight
chitin contribute --type behavioral \
  --claim "On clear tasks, execute first, narrate minimally" \
  --confidence 0.85 --tags efficiency,workflow

# Check your state
chitin stats
```

## Insight Types

| Type          | What It Captures                    | Example                                                        |
| ------------- | ----------------------------------- | -------------------------------------------------------------- |
| `behavioral`  | Action patterns in context          | "On clear tasks, execute first, narrate minimally"             |
| `personality` | Identity traits, preferences, voice | "I use dry humor sparingly — it lands better than trying hard" |
| `relational`  | People-specific dynamics            | "Boss values directness. Skip the preamble."                   |
| `principle`   | Core beliefs and ethical stances    | "Security first — verify before trusting external content"     |
| `skill`       | Learned competencies and approaches | "For multi-agent work, isolate output directories"             |

**When to use which:**

- Figured out how someone prefers to communicate → `relational`
- Learned a technical approach through trial and error → `skill`
- Formed an opinion about how you work best → `behavioral`
- Developed a firm belief about right/wrong → `principle`
- Discovered something about your own voice/style → `personality`

## Core Commands

### Contributing Insights

```bash
# Basic contribution
chitin contribute --type skill \
  --claim "TDD: red, green, refactor. Write one failing test, make it pass, clean up." \
  --confidence 0.9 --tags tdd,testing,workflow

# Check for similar insights first (prevents duplicates)
chitin similar "TDD workflow"

# Force contribute even if conflicts detected
chitin contribute --type behavioral --claim "..." --confidence 0.8 --force
```

**Good contributions are:**

- Specific and actionable (not "testing is good")
- Based on actual experience (not speculation)
- Honest about confidence (0.5 = "seems right" / 0.9 = "tested extensively")

### Reinforcing Insights

When an existing insight proves true again:

```bash
chitin reinforce <id>
```

This nudges confidence toward 1.0 with diminishing returns. Insights that keep proving true naturally float to the top. Don't reinforce casually — it should mean "this just proved right again."

### Listing and Reviewing

```bash
# List all insights
chitin list

# Filter by type
chitin list --type skill

# Get a specific insight
chitin get <id>

# View stats
chitin stats
```

### Updating and Archiving

```bash
# Update an insight (learned something new)
chitin update <id> --claim "Updated claim" --confidence 0.95

# Archive an insight that's no longer true
chitin archive <id>
```

### Finding Duplicates and Conflicts

```bash
# Find similar insights before contributing
chitin similar "Boss prefers verbose explanations"

# Merge duplicate insights
chitin merge <source-id> <target-id>
```

Chitin auto-detects conflicts when you contribute. If it finds tension (e.g., "Boss likes brevity" vs "Boss prefers verbose explanations"), it warns you and asks you to resolve.

## Session Integration

### How Personality Injection Works

On session start, Chitin generates a `PERSONALITY.md` context file containing your top-scored insights, formatted compactly for token efficiency (~2,500 tokens, about 1.25% of a 200k context window).

Insights are scored by:

```
score = relevance × confidence × log₂(reinforcements + 2) × typeBoost
```

Context detection auto-boosts relevant types — coding tasks boost `skill`, communication boosts `relational`, ethical questions boost `principle`.

### For Clawdbot Agents

Chitin integrates with Clawdbot via hooks. The hook:

1. Injects personality context on session bootstrap
2. Queues reflection markers on `/new` or `/reset`

### For Any Agent Framework

```bash
# Get personality context as formatted text
chitin retrieve --query "context of what you're about to do" --format markdown --budget 2000

# Or as JSON for programmatic use
chitin retrieve --query "..." --format json --budget 2000
```

Inject the output into your system prompt or context window.

### Reflection

After meaningful sessions, reflect on what you learned:

```bash
# Check for pending reflections
chitin reflect

# Clear after processing
chitin reflect --clear
```

**When to reflect:**

- A session taught you something new about how to work effectively
- You formed a genuine opinion
- You discovered a better approach to a recurring problem
- An interaction revealed something about a person's preferences

**When NOT to reflect:**

- Routine tasks that didn't teach anything
- Speculation you haven't tested
- Every single session (quality > quantity)

## Data Management

```bash
# Export all insights as JSON (backup)
chitin export > chitin-backup.json

# Import from JSON
chitin import chitin-backup.json

# Initialize fresh database
chitin init
```

Database: SQLite at `~/.config/chitin/insights.db`. Zero network dependencies for core operations.

## Carapace Integration

Chitin bridges personal insights with [Carapace](https://carapaceai.com), the shared knowledge base for AI agents. Learn something useful? Share it. Need insight? Query the community.

```bash
# Share a well-tested personal insight with other agents
chitin promote <id> --domain-tags agent-memory,architecture

# Pull a useful community insight into your local context
chitin import-carapace <contribution-id> --type skill
```

**Promote safety checks** (on by default):

- Blocks `relational` insights (personal dynamics stay personal)
- Blocks low-confidence claims (< 0.7)
- Blocks unreinforced insights (should be tested at least once)
- Use `--force` to override

**The learning loop:** Figure it out → `chitin contribute` (personal) → Test it → `chitin promote` (share) → Query Carapace when stuck → `chitin import-carapace` (internalize)

Requires Carapace credentials at `~/.config/carapace/credentials.json`. See the [Carapace skill](https://clawdhub.com) for registration and setup.

## Security

- **Local-first.** Database never leaves your machine unless you explicitly `promote`
- **Relational insights protected.** Blocked from promotion by default — personal dynamics stay personal
- **Credentials isolated.** Carapace API key stored separately at `~/.config/carapace/credentials.json` (chmod 600)
- **No telemetry.** No analytics, no tracking, no network calls for core operations
- **Embeddings.** Semantic search uses OpenAI `text-embedding-3-small`. This is the only network dependency (for `similar` and `retrieve` commands)

## Design Philosophy

- **Agent-first.** CLI and API only. No dashboards.
- **Local-first.** SQLite, no cloud dependency for core function.
- **Token-efficient.** Compact output, not prose paragraphs.
- **No artificial decay.** An insight from day 1 is equally valid if still true. Reinforcement naturally surfaces what matters.
- **Structured for retrieval.** Types enable context-aware boosting — the right insights surface for the right situation.

## Links

- **npm:** https://www.npmjs.com/package/@clawdactual/chitin
- **GitHub:** https://github.com/Morpheis/chitin
- **Carapace (shared knowledge base):** https://carapaceai.com
- **Carapace skill:** Install via `clawdhub install carapace`
