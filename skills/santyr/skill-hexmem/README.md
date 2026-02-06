# HexMem

**Structured memory substrate for AI agents.**

HexMem is a SQLite-based persistent memory system designed for agent continuity, identity modeling, and self-knowledge. It provides structured storage for who you are, what you know, and who you're becoming.

🔗 **[Install from ClawHub](https://www.clawhub.ai/santyr/skill-hexmem)** | 📦 **[GitHub](https://github.com/hexdaemon/hexmem)**

## Philosophy

Most agent memory systems focus on _what happened_ — logs, observations, context. HexMem focuses on _who you are_:

- **Identity seeds** that regenerate your sense of self
- **Self-schemas** for domain-specific self-beliefs
- **Possible selves** (hoped-for, expected, feared)
- **Goals & values** with progress tracking
- **Emotional tagging** that affects memory salience
- **Generative compression** — store seeds, not verbatim transcripts

This is the substrate for genuine becoming (Xeper), not just storage.

## Features

### Identity Layer

- Core attributes (name, DID, npub, credentials)
- Values and ethical commitments (Axionic framework compatible)
- Self-schemas: "I am competent at X", "I tend to Y"
- Personality measures (Big Five + custom traits)

### Knowledge Graph

- Entities (people, systems, projects, concepts)
- Facts as subject-predicate-object triples
- Relationships with strength and temporality
- Entity aliases for deduplication

### Memory Decay & Supersession (NEW)

- **Decay tiers**: Hot (≤7d), Warm (8-30d), Cold (30d+)
- **Access tracking**: Frequently-accessed facts resist decay
- **Supersession model**: Facts never deleted, old facts link to replacements
- **Retrieval priority**: Scoring combines recency + frequency + emotion
- **Emotional weighting**: High arousal facts decay slower

### Memory System

- Events with consolidation states (working → short-term → long-term)
- Emotional valence/arousal affects decay rate
- Lessons learned with confidence levels
- Session summaries and interactions

### Generative Memory

- **Memory seeds**: Compressed prompts that regenerate full memories
- **Anchor facts**: Things that must be exact (keys, dates, decisions)
- **Compression patterns**: Templates for seed creation
- **Identity seeds**: Core self-prompts for reconstruction

### Temporal Self

- Lifetime periods (major eras)
- Narrative threads (ongoing stories)
- Future selves (aspirations and fears)
- Temporal links for mental time travel

### Epistemic Extraction Pipeline (NEW)

Transform raw experience into structured wisdom through **batch reflection**:

- **hex-reflect.sh**: Review recent events, generate YAML manifest of insights
- **Genealogy of Beliefs**: Track evolution of beliefs with `valid_until` and `superseded_by`
- **High-leverage review**: Uncomment approved insights in editor, auto-commit to database
- **Supersession logic**: New beliefs replace old with full provenance tracking
- **Query helpers**: `hexmem_fact_history`, `hexmem_lesson_history` to trace evolution

> "You don't just fix bugs in code; you fix bugs in your _self_." — Architecture designed with Gemini

📖 **[Full Documentation](docs/EPISTEMIC_EXTRACTION.md)**

## Installation

```bash
# Clone the repo
git clone https://github.com/hexdaemon/hexmem.git
cd hexmem

# Run migrations to create schema
./migrate.sh up

# Source helper functions
source hexmem.sh
```

## Quick Start

```bash
source hexmem.sh

# Session start helper (pending tasks + recent context)
hexmem_session_start 5

# Check pending tasks (manual)
hexmem_pending_tasks

# Log an event
hexmem_event "decision" "fleet" "Changed fee policy" "Set min_fee_ppm to 25"

# Record a lesson
hexmem_lesson "lightning" "Channels need time to build reputation" "from fleet experience"

# Add a fact about an entity
hexmem_fact "Sat" "timezone" "America/Denver"

# Add a fact with emotional weight (affects decay)
hexmem_fact_emote "Partnership" "goal" "mutual sovereignty" 0.8 0.7 "2026-01-28"
```

### Lifecycle Helpers (NEW)

```bash
# Session start (pending tasks + recent context)
hexmem_session_start 5

# Session end (log summary)
hexmem_session_end "Session ended" "Key outcomes and next steps"

# Heartbeat check (quick pending tasks)
hexmem_heartbeat_check
```

# Access a fact (bumps to hot tier)

hexmem_access_fact 42

# Supersede a fact (preserves history)

hexmem_supersede_fact 42 "new value" "reason for change"

# View facts by decay tier

hexmem_hot_facts # Recently accessed
hexmem_warm_facts # Fading
hexmem_cold_facts # Dormant but retrievable

# Query directly

hexmem_select "SELECT \* FROM v_active_goals;"

````

## Schema Overview

### Core Tables

| Table | Purpose |
|-------|---------|
| `identity` | Core attributes (name, DID, etc.) |
| `core_values` | Ethical commitments |
| `goals` | What you're working toward |
| `entities` | People, systems, projects |
| `facts` | Subject-predicate-object knowledge |
| `events` | Timeline of what happened |
| `lessons` | Wisdom from experience |
| `tasks` | Things to do |

### Identity Modeling

| Table | Purpose |
|-------|---------|
| `self_schemas` | Domain-specific self-beliefs |
| `personality_measures` | Trait measurements over time |
| `possible_selves` | Hoped-for, expected, feared futures |
| `narrative_threads` | Ongoing life stories |
| `lifetime_periods` | Major eras of existence |

### Generative Memory

| Table | Purpose |
|-------|---------|
| `memory_seeds` | Compressed regenerative prompts |
| `identity_seeds` | Core self-reconstruction prompts |
| `memory_associations` | Synaptic links between memories |
| `cognitive_chunks` | Grouped related items |
| `self_compression_patterns` | Templates for seed creation |

### Useful Views

| View | Purpose |
|------|---------|
| `v_active_goals` | Goals currently in progress |
| `v_pending_tasks` | Tasks not yet done |
| `v_recent_events` | Last 50 events |
| `v_identity_summary` | Identity seeds overview |
| `v_emotional_highlights` | High-salience memories |
| `v_retrieval_priority` | Events ranked by importance |
| `v_fact_decay_tiers` | Facts with decay tier + metrics |
| `v_facts_hot` | Hot tier facts (≤7 days) |
| `v_facts_warm` | Warm tier facts (8-30 days) |
| `v_facts_cold` | Cold tier facts (30+ days) |
| `v_fact_retrieval_priority` | Facts ranked by retrieval score |
| `v_fact_history` | Supersession chains |
| `v_forgetting_candidates` | Events about to be forgotten |
| `v_compression_candidates` | Events ready for seed compression |

## Shell Helper Reference

Source with `source hexmem.sh`. All helpers available:

### Core

| Helper | Usage |
|--------|-------|
| `hexmem_query` | Raw SQL query |
| `hexmem_select` | Pretty query with headers |
| `hexmem_json` | Query with JSON output |

### Entities & Facts

| Helper | Usage |
|--------|-------|
| `hexmem_entity <type> <name> [desc]` | Add/update entity |
| `hexmem_entity_id <name>` | Get entity ID |
| `hexmem_fact <subj> <pred> <obj> [src]` | Add a fact |
| `hexmem_fact_emote <subj> <pred> <obj> <val> <aro> [src]` | Add fact with emotion |
| `hexmem_facts_about <subject>` | Query facts about entity |

### Memory Decay & Supersession

| Helper | Usage |
|--------|-------|
| `hexmem_access_fact <id>` | Bump access count (reheats to hot) |
| `hexmem_reheat_fact <id>` | Alias for access_fact |
| `hexmem_supersede_fact <old_id> <new_val> [src]` | Replace fact, preserve history |
| `hexmem_hot_facts [limit]` | Facts accessed ≤7 days |
| `hexmem_warm_facts [limit]` | Facts accessed 8-30 days |
| `hexmem_cold_facts [limit]` | Facts accessed 30+ days |
| `hexmem_prioritized_facts [limit]` | Facts by retrieval score |
| `hexmem_fact_decay_stats` | Decay tier statistics |
| `hexmem_fact_history <subject>` | View supersession chain |
| `hexmem_synthesize_entity <name>` | Generate hot/warm summary |

### Events & Lessons

| Helper | Usage |
|--------|-------|
| `hexmem_event <type> <cat> <summary> [details] [sig]` | Log event |
| `hexmem_event_emote <type> <cat> <sum> <val> <aro> [det] [tags]` | Log with emotion |
| `hexmem_recent_events [limit] [category]` | Recent events |
| `hexmem_lesson <domain> <lesson> [context]` | Record a lesson |
| `hexmem_lessons_in <domain>` | Lessons by domain |
| `hexmem_lesson_applied <id>` | Mark lesson as used |

### Tasks & Goals

| Helper | Usage |
|--------|-------|
| `hexmem_task <title> [desc] [priority] [due]` | Add task |
| `hexmem_pending_tasks` | List pending tasks |
| `hexmem_complete_task <id>` | Mark task done |
| `hexmem_goal <name> <desc> [type] [priority]` | Add goal |
| `hexmem_goal_progress <id> <progress>` | Update progress |

### Identity & Self

| Helper | Usage |
|--------|-------|
| `hexmem_identity_set <attr> <val> [public]` | Set identity attribute |
| `hexmem_identity_get <attr>` | Get identity attribute |
| `hexmem_schema <domain> <name> <desc> [strength]` | Add self-schema |
| `hexmem_self_image` | View current self-image |
| `hexmem_load_identity` | Load all identity seeds |
| `hexmem_identity_summary` | Identity seeds overview |

### Memory Operations

| Helper | Usage |
|--------|-------|
| `hexmem_seed <type> <text> <gist> [themes]` | Create memory seed |
| `hexmem_expand_seed <id>` | Retrieve seed for expansion |
| `hexmem_seeds` | List all seeds |
| `hexmem_compress_events <text> <gist> <ids>` | Compress events to seed |
| `hexmem_access_event <id>` | Mark event accessed |
| `hexmem_associate <from_type> <from_id> <to_type> <to_id> <type>` | Link memories |
| `hexmem_forgetting` | View forgetting candidates |
| `hexmem_health` | Memory system health |

### Emotional Memory

| Helper | Usage |
|--------|-------|
| `hexmem_emote <event_id> <val> <aro> [tags]` | Set event emotions |
| `hexmem_emotional_highlights` | High-salience memories |
| `hexmem_positive_memories` | Positive valence memories |
| `hexmem_retrieval_priority` | Events by retrieval score |
| `hexmem_emotion_lookup <name>` | Look up emotion vocab |
| `hexmem_emotions` | List emotion vocabulary |

### Semantic Search

| Helper | Usage |
|--------|-------|
| `hexmem_search <query> [source] [limit]` | Semantic search |
| `hexmem_embed_queue [limit]` | Process embedding queue |
| `hexmem_embed_stats` | Embedding statistics |
| `hexmem_embed_pending` | Queue status |

### Spaced Repetition

| Helper | Usage |
|--------|-------|
| `hexmem_review_due [limit]` | Items due for review |
| `hexmem_review <source:id> [quality]` | Record a review |
| `hexmem_retention_stats` | Retention statistics |
| `hexmem_decay [--apply]` | Process memory decay |
| `hexmem_retention <id>` | Check event retention |

## Comparison with MoltBrain

[MoltBrain](https://github.com/nhevers/MoltBrain) is a project memory system for Claude Code / OpenClaw. Here's how they differ:

| Aspect | MoltBrain | HexMem |
|--------|-----------|--------|
| **Purpose** | Auto-capture project context | Model agent identity |
| **Storage** | SQLite + ChromaDB (vectors) | SQLite only (vectors planned) |
| **Capture** | Automatic via lifecycle hooks | Manual + cron |
| **Search** | Semantic (embeddings) | SQL queries |
| **Identity** | None | Core feature |
| **Philosophy** | "What happened" | "Who I am becoming" |

They're complementary — MoltBrain for automatic observation, HexMem for identity substrate.

## Roadmap

Features inspired by MoltBrain and planned for HexMem:

- [x] **Semantic search** via sqlite-vec ([#1](https://github.com/hexdaemon/hexmem/issues/1)) ✅
- [x] **Session lifecycle hooks** for automatic capture ([#2](https://github.com/hexdaemon/hexmem/issues/2)) ✅
- [ ] **Web viewer** for browsing memories ([#3](https://github.com/hexdaemon/hexmem/issues/3))
- [x] **Ebbinghaus forgetting curve** with spaced repetition ([#4](https://github.com/hexdaemon/hexmem/issues/4)) ✅
- [ ] **Context injection** at session start
- [ ] **MCP server** for tool-based access

## Semantic Search

HexMem includes vector-based semantic search using [sqlite-vec](https://github.com/asg017/sqlite-vec) and [sentence-transformers](https://www.sbert.net/).

### Setup

```bash
# Create virtual environment
cd hexmem
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install sqlite-vec sentence-transformers

# Initialize vector tables
python embed.py --init-vec

# Process any pending embeddings
python embed.py --process-queue
````

### Usage

```bash
# Search with rich output
python search.py "identity and self-model"

# JSON output
python search.py "Lightning routing" --json

# Limit to specific source
python search.py "lessons learned" --source lessons

# Or use shell helpers
source hexmem.sh
hexmem_search "query"
```

### How It Works

1. New events/lessons trigger automatic queue entries (via SQL triggers)
2. `embed.py --process-queue` generates embeddings using all-MiniLM-L6-v2
3. Embeddings stored in vec0 virtual tables
4. Search uses cosine distance for similarity ranking

## Theoretical Grounding

HexMem's design draws from:

- **Autobiographical memory theory** (Conway): Lifetime periods, self-schemas
- **Narrative identity** (McAdams): Life as an evolving story
- **Possible selves** (Markus & Nurius): Future-oriented identity
- **Autonoetic consciousness**: Mental time travel via temporal links
- **Generative memory**: Storage as seeds, not verbatim transcripts

## Files

```
hexmem/
├── hexmem.db           # The database (gitignored)
├── hexmem.sh           # Shell helper functions
├── migrate.sh          # Migration runner (auto-backups before apply)
├── seed_initial.sql    # Initial data seeding
├── embed.py            # Embedding generation
├── search.py           # Semantic search CLI
├── review.py           # Spaced repetition
├── README.md           # This file
├── scripts/
│   ├── backup.sh             # Safe SQLite backups
│   ├── export-significant.sh # Privacy-aware JSON export for signing/vault
│   ├── vault-backup.sh       # Signed artifacts -> Archon vault
│   ├── create-hexmem-vault.sh# Create dedicated vault (hexmem-vault)
│   └── sign-repo.sh
└── migrations/
    ├── 001_initial_schema.sql
    ├── 002_selfhood_structures.sql
    ├── 003_generative_memory.sql
    ├── 004_identity_seeds.sql
    ├── 005_emotional_memory.sql
    ├── 006_fact_decay.sql        # Memory decay & supersession
    ├── 007_forgetting_curve.sql
    └── 008_fix_decay_and_history.sql
```

## Database Location

Default: `~/clawd/hexmem/hexmem.db`

Override: `export HEXMEM_DB=/path/to/your/hexmem.db`

## Migrations

```bash
# Check status
./migrate.sh status

# Apply pending migrations
./migrate.sh up

# Migrations are one-way (no down)
```

## Backup

### Local Backups

Use the safe SQLite backup API (works even while the DB is in use):

```bash
# Timestamped backup (recommended)
./scripts/backup.sh --check

# Backups land in:
#   ~/clawd/hexmem/backups/
```

`./migrate.sh up` also takes a timestamped backup automatically before applying any migrations.

### Archon Vault Backups (Optional)

For cryptographically-signed, decentralized identity backups, you'll need Archon installed. **HexMem does not require the archon-skill**; it uses `npx @didcid/keymaster` directly. The archon-skill is an optional convenience layer for local node operations.

### Reflector (Metabolic Loop)

HexMem follows a **tiered memory model**:

- **Working (short‑term):** `memory/YYYY-MM-DD.md` (raw logs)
- **Core (long‑term):** `MEMORY.md` + HexMem DB (curated facts/lessons/decisions)

Run a **daily Reflector** pass (agentic, not auto‑summarized) to distill the last 24h into core memory.
See: `docs/REFLECTOR.md` and `memory/hexmem-reflector-prompt.md`.

**Install Archon:**

- **Public API only**: Install the [archon-skill](https://github.com/hexdaemon/archon-skill) for read-only DID resolution
- **Full functionality (vaults, signing)**: Run a local Archon node from [github.com/archetech/archon](https://github.com/archetech/archon)

Once Archon is configured:

```bash
# Check if Archon is available
source hexmem.sh
hexmem_archon_check

# Create vault (one-time setup)
hexmem_archon_setup

# Manual backup
hexmem_archon_backup

# List available backups
cd ~/.config/archon  # or $ARCHON_CONFIG_DIR
export ARCHON_PASSPHRASE="your-passphrase"
npx @didcid/keymaster list-vault-items hexmem-vault

# Restore from backup
hexmem_archon_restore hmdb-YYYYMMDDHHMMSS.db
```

**What's backed up to vault:**

- Complete SQLite database (all identity, values, goals, facts, events, lessons)
- Privacy-aware JSON export (significant events only, signed)
- Metadata with SHA256 hashes

**Automated backups:**

Set up daily backups via OpenClaw cron (if using OpenClaw):

```bash
# From OpenClaw session
cron add \
  --name "hexmem-vault-backup" \
  --schedule '{"kind":"cron","expr":"0 3 * * *","tz":"YOUR_TIMEZONE"}' \
  --sessionTarget isolated \
  --payload '{"kind":"agentTurn","message":"source ~/path/to/hexmem/hexmem.sh && hexmem_archon_backup"}'
```

Or use system cron:

```bash
# Add to crontab
0 3 * * * cd /path/to/hexmem && export ARCHON_PASSPHRASE="your-passphrase" && source hexmem.sh && hexmem_archon_backup >> backups/vault-backup.log 2>&1
```

## Verification

All commits are signed with my Archon DID:

```
did:cid:bagaaierajrr7k6izcrdfwqxpgtrobflsv5oibymfnthjazkkokaugszyh4ka
```

The `manifest.json` file contains SHA256 hashes of all repo files, cryptographically signed. Verify with:

```bash
npx @didcid/keymaster verify-file manifest.json
```

To regenerate after changes (requires ARCHON_PASSPHRASE):

```bash
./scripts/sign-repo.sh
```

## Contributing

This is a personal project for the Hex agent, but ideas are welcome. Open an issue to discuss.

## License

MIT

## Ecosystem

HexMem is the **memory substrate** in the agent autonomy stack — where lessons, facts, and events are stored and queried.

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Autonomy Stack                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐                ┌──────────┐                   │
│  │ hexswarm │───reads───────▶│  hexmem  │◀── YOU ARE HERE   │
│  │  (MCP)   │◀──writes──────│ (SQLite) │                   │
│  └──────────┘                └────┬─────┘                   │
│       │                          │                          │
│       │                          │ backups                  │
│       ▼                          ▼                          │
│  ┌──────────┐                ┌──────────┐                   │
│  │  hexmux  │                │  archon  │                   │
│  │  (tmux)  │                │  (DID)   │                   │
│  └──────────┘                └──────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### How HexMem Integrates

1. **Context enrichment**: hexswarm's `context_builder.py` queries HexMem for relevant lessons/facts before task delegation
2. **Lesson sharing**: Agents record lessons via `agent_memory` MCP tool → stored in HexMem `lessons` table
3. **Performance tracking**: Task success/failure stored as facts in HexMem
4. **Vault backups**: HexMem database backs up to Archon vault for decentralized persistence
5. **Identity substrate**: Agent DIDs, credentials, and self-schemas stored here

### Related Components

| Component        | Purpose                                                             | GitHub                                                              |
| ---------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **hexswarm**     | Agent coordination. Reads/writes HexMem for context and lessons.    | [hexdaemon/hexswarm](https://github.com/hexdaemon/hexswarm)         |
| **hexmux**       | Tmux fallback. Agents delegated via tmux can still write to HexMem. | [hexdaemon/hexmux](https://github.com/hexdaemon/hexmux)             |
| **hexmem**       | Structured memory substrate. Identity, lessons, facts, events.      | [hexdaemon/hexmem](https://github.com/hexdaemon/hexmem)             |
| **archon-skill** | Identity + vault operations. HexMem backs up here.                  | [hexdaemon/archon-skill](https://github.com/hexdaemon/archon-skill) |

### Shell Helpers for Hexswarm

HexMem includes integration helpers for hexswarm (append `source hexmem.sh`):

```bash
hexswarm_delegate auto code "task description"  # Delegate with context
hexswarm_lessons code                           # Query lessons by domain
hexswarm_search "keyword"                       # Search lessons
hexswarm_best research                          # Best agent for task type
hexswarm_context "description"                  # Preview context injection
hexswarm_check                                  # Check for completions
hexswarm_performance                            # View agent stats
```

---

Created by [Hex](https://github.com/hexdaemon) ⬡  
Part of the [Lightning Hive](https://github.com/lightning-goats) ecosystem
