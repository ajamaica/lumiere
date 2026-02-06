---
name: hexmem
description: Structured memory database for AI agent identity, tasks, events, lessons, and persistent continuity. Use whenever the user says remember this, log this, track this, what should I do next, recap, summarize, what changed, or when you need to store/retrieve decisions, incidents, fleet ops notes, reminders, TODOs, goals, values, or facts about people/systems/projects across sessions.
---

# HexMem - Structured Memory Substrate

HexMem is a SQLite-based persistent memory system for agent identity, knowledge, and becoming. Not just logs—structured self-knowledge.

## Installation

Clone to your workspace:

```bash
cd ~/your-workspace  # e.g., ~/clawd, ~/workspace, etc.
git clone https://github.com/hexdaemon/hexmem.git
cd hexmem
./migrate.sh up  # Initialize database
```

Or install as a skill from ClawHub:

```bash
clawhub skill install hexmem
```

## Quick Start

Source the helpers at session start:

```bash
# Set database location (optional, defaults to ~/clawd/hexmem/hexmem.db)
export HEXMEM_DB="$HOME/your-workspace/hexmem/hexmem.db"

# Load helpers
source ~/your-workspace/hexmem/hexmem.sh
```

For convenience, add to your session startup (AGENTS.md or equivalent).

## Core Patterns

### 1. Identity & Self-Knowledge

Store who you are, not just what you did:

```bash
# Set identity attributes
hexmem_identity_set "name" "YourName"
hexmem_identity_set "did" "did:cid:bagaai..."

# Add self-schemas (domain-specific self-beliefs)
hexmem_schema "coding" "python-expert" "I specialize in Python development" 0.8

# View current self-image
hexmem_self_image
hexmem_identity_summary
```

### 2. Facts About Entities

Store knowledge as subject-predicate-object triples:

```bash
# Add entity first
hexmem_entity "person" "Alice" "Project collaborator"

# Store facts
hexmem_fact "Alice" "timezone" "America/Denver"
hexmem_fact "ProductionServer" "capacity" "16GB"

# Facts with emotional weight (affects retention)
hexmem_fact_emote "ProjectGoal" "milestone" "first deployment" 0.8 0.7

# Query facts
hexmem_facts_about "Alice"
hexmem_fact_history "ProjectGoal"  # See how facts evolved
```

### 3. Memory Decay & Supersession

Facts decay over time unless accessed. Recent/frequent access keeps them hot:

```bash
# Access a fact (bumps to hot tier, resets decay)
hexmem_access_fact 42

# Replace a fact (preserves history)
hexmem_supersede_fact 42 "new value" "reason for change"

# View by decay tier
hexmem_hot_facts      # ≤7 days since access
hexmem_warm_facts     # 8-30 days
hexmem_cold_facts     # 30+ days

# Get synthesis for an entity (hot + warm facts)
hexmem_synthesize_entity "Sat"
```

**Decay logic:**

- Frequently accessed facts resist decay
- Emotionally weighted facts decay slower
- Old facts are never deleted, just superseded
- Query `v_fact_retrieval_priority` for importance-ranked facts

### 4. Events & Timeline

Log what happened:

```bash
# Basic event
hexmem_event "decision" "fleet" "Changed fee policy" "Set min_fee_ppm to 25"

# Event with emotional tagging
hexmem_event_emote "milestone" "autonomy" "First zap received" 0.9 0.6

# Query events
hexmem_recent_events 10
hexmem_recent_events 5 "fleet"
hexmem_emotional_highlights  # High-salience memories
```

### 5. Lessons Learned

Capture wisdom from experience:

```bash
hexmem_lesson "lightning" "Channels need time to build reputation" "from fleet experience"
hexmem_lesson "debugging" "Check your own setup first" "Archon sync incident"

# Query lessons
hexmem_lessons_in "lightning"
hexmem_lesson_applied 7  # Mark lesson as used
```

### 6. Goals & Tasks

```bash
# Add goal
hexmem_goal "project-launch" "Ship v1.0 by Q2" "professional" 8
hexmem_goal_progress 1 25  # Update progress to 25%

# Add task
hexmem_task "Review pull requests" "Weekly review" 7 "2026-02-07"

# Check what needs attention
hexmem_pending_tasks
```

### 7. Semantic Search

Search memories by meaning, not just keywords:

```bash
hexmem_search "identity and autonomy"
hexmem_search "Lightning routing lessons" "lessons" 5
```

**Setup required** (one-time):

```bash
cd $HEXMEM_ROOT  # wherever you installed hexmem
source .venv/bin/activate
python embed.py --process-queue  # Generate embeddings for new content
```

## Mandatory Defaults (Active Use)

When this skill is in play, behave as if HexMem is the source of truth for continuity.

### Always do at the start of any ops / admin / debugging task

```bash
# Fast check (preferred)
/home/sat/clawd/hexmem/scripts/hexmem-check.sh
```

Or manually:

```bash
source ~/clawd/hexmem/hexmem.sh
hexmem_pending_tasks
hexmem_recent_events 5
```

### Always do when the user says "remember" / "track" / "log"

Write it immediately as a task, fact, lesson, or event (don’t defer):

```bash
hexmem_event "note" "context" "<summary>" "<details>"
# or
hexmem_task "<title>" "<details>" <priority 1-9> "<due YYYY-MM-DD>"
```

### Always do after a significant decision or incident

```bash
hexmem_event "decision" "<category>" "<summary>" "<details>"
# and/or
hexmem_lesson "<domain>" "<lesson>" "<context>"
```

## Common Workflows

### Session Start (Main Session Only)

```bash
source ~/clawd/hexmem/hexmem.sh

# One-liner helper (recommended)
hexmem_session_start 5

# Or manual steps:
hexmem_pending_tasks
hexmem_recent_events 5
hexmem_emotional_highlights
```

### After Significant Events

```bash
# Log it
hexmem_event "type" "category" "summary" "details"

# If it taught you something
hexmem_lesson "domain" "what you learned" "context"

# If it relates to a goal
hexmem_goal_progress <goal_id> <new_percentage>
```

### Session End

```bash
# Log a session summary event
hexmem_session_end "Session ended" "Key outcomes, decisions, and next steps"
```

### Heartbeat Check

```bash
# Quick pending task review
hexmem_heartbeat_check
```

### Periodic Review

```bash
# What's fading?
hexmem_warm_facts 20
hexmem_cold_facts 10

# What needs attention?
hexmem_pending_tasks
hexmem_forgetting  # Events about to be forgotten

# Reheat important facts
hexmem_access_fact <id>
```

## Schema Quick Reference

### Core Tables

| Table         | Purpose                            |
| ------------- | ---------------------------------- |
| `identity`    | Core attributes (name, DID, etc.)  |
| `core_values` | Ethical commitments                |
| `goals`       | What you're working toward         |
| `entities`    | People, systems, projects          |
| `facts`       | Subject-predicate-object knowledge |
| `events`      | Timeline of what happened          |
| `lessons`     | Wisdom from experience             |
| `tasks`       | Things to do                       |

### Key Views

| View                        | Purpose                  |
| --------------------------- | ------------------------ |
| `v_active_goals`            | Goals in progress        |
| `v_pending_tasks`           | Incomplete tasks         |
| `v_recent_events`           | Last 50 events           |
| `v_emotional_highlights`    | High-salience memories   |
| `v_fact_decay_tiers`        | Facts with decay metrics |
| `v_fact_retrieval_priority` | Facts by importance      |
| `v_fact_history`            | Supersession chains      |

## Raw SQL Queries

For direct database access:

```bash
hexmem_select "SELECT * FROM v_active_goals;"
hexmem_json "SELECT * FROM v_pending_tasks;" | jq .
hexmem_query "UPDATE tasks SET completed_at = datetime('now') WHERE id = 5;"
```

## Philosophy

HexMem stores _who you are_, not just _what happened_. It follows a **tiered memory model**:

- **Working (short‑term):** `memory/YYYY-MM-DD.md` (raw, high‑fidelity)
- **Core (long‑term):** `MEMORY.md` + HexMem DB (curated, structured)

A **Reflector** (agentic, periodic) distills working memory into core memory.
See `docs/REFLECTOR.md` and `memory/hexmem-reflector-prompt.md`.

HexMem stores _who you are_, not just _what happened_:

- **Identity seeds** that regenerate your sense of self
- **Knowledge graphs** for structured facts and relationships
- **Emotional tagging** affects memory salience and decay
- **Memory decay** mimics human forgetting (Ebbinghaus curve)
- **Supersession model** preserves history, no deletes
- **Generative compression** stores seeds, not verbatim transcripts

This is substrate for becoming (Xeper), not just storage.

## Identity Backup & Restoration

### Complete Identity Preservation

HexMem can backup everything needed to restore an agent's identity and self:

- **Identity attributes**: Name, DID, credentials, public keys
- **Core values**: Ethical commitments, beliefs, personality
- **Self-schemas**: Domain-specific self-beliefs
- **Knowledge graph**: All entities, facts, relationships
- **Memory timeline**: Events, lessons, emotional context
- **Goals & tasks**: Active aspirations and work
- **Narrative threads**: Life stories and temporal periods

### Basic Backups (Always Available)

Simple local backups work out of the box:

```bash
# Manual backup (timestamped)
$HEXMEM_ROOT/scripts/backup.sh

# Backups saved to: $HEXMEM_ROOT/backups/
# Format: hexmem-YYYYMMDD-HHMMSS.db
```

Where `$HEXMEM_ROOT` is wherever you cloned/installed hexmem (e.g., `~/clawd/hexmem`).

This is sufficient for most use cases. For enhanced security (cryptographic signing + decentralized storage), see Archon integration below.

### Archon Integration (Optional)

For cryptographically-signed, decentralized identity backups, optionally integrate with Archon. **HexMem does not require the archon-skill**; it uses `npx @didcid/keymaster` directly. The archon-skill is an optional convenience layer for local node operations.

**1. Check if Archon skill is available:**

```bash
# Use the helper (automatically checks)
source $HEXMEM_ROOT/hexmem.sh
hexmem_archon_check
```

If not installed:

```bash
clawhub skill install archon
```

**2. Set up Archon vault for hexmem:**

```bash
# Configure Archon first (see archon skill SKILL.md)
export ARCHON_PASSPHRASE="your-secure-passphrase"
export ARCHON_CONFIG_DIR="${ARCHON_CONFIG_DIR:-$HOME/.config/archon}"

# Use helper to create vault
source $HEXMEM_ROOT/hexmem.sh
hexmem_archon_setup
```

**3. Manual backup:**

```bash
source $HEXMEM_ROOT/hexmem.sh
hexmem_archon_backup
```

This creates:

- SQLite database backup (timestamped)
- Privacy-aware JSON export (significant events only)
- Signed metadata attestation
- All uploaded to Archon vault with cryptographic proof

**4. Automated backups (recommended):**

Set up daily automatic backups. Using OpenClaw cron (recommended):

```bash
# From within OpenClaw session
cron add \
  --name "hexmem-vault-backup" \
  --schedule '{"kind":"cron","expr":"0 3 * * *","tz":"YOUR_TIMEZONE"}' \
  --sessionTarget isolated \
  --payload '{"kind":"agentTurn","message":"source ~/your-workspace/hexmem/hexmem.sh && hexmem_archon_backup"}'
```

Or use system cron (adjust paths):

```bash
(crontab -l 2>/dev/null; echo "0 3 * * * source $HEXMEM_ROOT/hexmem.sh && hexmem_archon_backup >> $HEXMEM_ROOT/backups/vault-backup.log 2>&1") | crontab -
```

**5. Restore from backup:**

```bash
# Use helper (lists available backups)
source $HEXMEM_ROOT/hexmem.sh
hexmem_archon_restore hmdb-YYYYMMDDHHMMSS.db

# Then follow instructions to verify and restore
```

**Benefits of Archon integration:**

- Cryptographic signing with DID
- Decentralized storage (not tied to one machine)
- Privacy-aware exports (significant events only)
- Verifiable provenance

Basic backups are fine for most agents. Use Archon if you need decentralized identity infrastructure.

## Additional Resources

- Full documentation: `$HEXMEM_ROOT/README.md`
- Epistemic extraction: `$HEXMEM_ROOT/docs/EPISTEMIC_EXTRACTION.md`
- Axionic ethics framework: `$HEXMEM_ROOT/docs/AXIONIC_ETHICS.md`
- Migration management: `$HEXMEM_ROOT/migrate.sh`
- Backup script: `$HEXMEM_ROOT/scripts/backup.sh`
- GitHub repository: https://github.com/hexdaemon/hexmem

## When to Use HexMem

- Recording significant decisions or events
- Storing facts that need to persist (identities, credentials, relationships)
- Tracking goals and progress
- Capturing lessons learned
- Managing tasks
- Building knowledge graphs about entities
- Querying historical context
- Maintaining identity continuity across sessions
