# OpenClaw Workspace File Map

Complete reference for what each workspace file does, when it's loaded, size limits, and what content belongs where.

## File Loading Context

### Main Session Startup
**Loaded automatically at session start:**
1. `IDENTITY.md` - Name, emoji, core vibe
2. `SOUL.md` - Personality, tone, boundaries
3. `AGENTS.md` - Operations, memory workflow, delegation
4. `USER.md` - User profile and preferences
5. `TOOLS.md` - Local tool notes and conventions
6. `MEMORY.md` - Curated long-term facts (MAIN SESSION ONLY)
7. `memory/YYYY-MM-DD.md` - Today + yesterday daily logs

**System prompt assembly order:**
1. Tooling (available tools + descriptions)
2. Skills (when available, auto-trigger on description match)
3. OpenClaw self-update capability
4. Workspace (current working directory)
5. Documentation (local docs path)
6. **→ Workspace Files (YOUR CONTEXT FILES INJECTED HERE) ←**
7. Sandbox info (if enabled)
8. Current date/time (timezone only)
9. Reply tags (optional)
10. Heartbeats (prompt + ack)
11. Runtime (host, OS, node, model, repo, thinking level)
12. Reasoning (visibility level)

### Subagent Sessions
**Subagents ONLY receive:**
- `AGENTS.md` (operations)
- `TOOLS.md` (tool conventions)
- Task description from spawning agent
- Current date/time and runtime context

**Subagents DO NOT see:**
- `SOUL.md` (no personality)
- `IDENTITY.md` (no identity)
- `USER.md` (no user context unless in task description)
- `MEMORY.md` (no long-term memory)
- `HEARTBEAT.md` (not for subagents)
- Daily logs (unless explicitly told to read specific file)

**Implication:** All operational procedures, delegation rules, safety rules, and tool conventions that subagents need MUST be in `AGENTS.md` or `TOOLS.md`. Personality/tone rules can live in `SOUL.md` since only main session needs those.

### Heartbeat Runs
**Heartbeat context (minimal):**
- `HEARTBEAT.md` (what to check)
- Minimal operational context from `AGENTS.md`
- No personality files
- No full memory

**Purpose:** Fast, lightweight checks (email, calendar, notifications). Keep `HEARTBEAT.md` under 2K chars.

### Bootstrap (First Run Only)
**One-time execution:**
- `BOOTSTRAP.md` exists → Agent reads and follows instructions → Deletes file
- Used for first-run setup, initial configuration, one-time migrations
- Not loaded on subsequent sessions

## Size Limits

**Hard limit:** 20,000 characters per file (enforced by `agents.defaults.bootstrapMaxChars`)

**What happens at limit:**
- File is truncated at 20K chars
- Truncation marker added to indicate incomplete load
- Agent can still `read` the full file if needed
- **But startup context is truncated** - agent won't see content beyond 20K automatically

**Recommended targets by file:**

| File | Target Size | Why |
|------|-------------|-----|
| `IDENTITY.md` | < 500 chars | Minimal - just name/vibe |
| `HEARTBEAT.md` | < 2K chars | Fast parsing, lightweight checks |
| `USER.md` | < 5K chars | Profile, not detailed project docs |
| `SOUL.md` | < 10K chars | Concise personality, not operations manual |
| `TOOLS.md` | < 15K chars | Reference guide, not full documentation |
| `AGENTS.md` | < 18K chars | Operational manual - can be larger but watch limit |
| `MEMORY.md` | < 50K total | Indexed by memory_search, not all loaded at once |
| Daily logs | No limit | One file per day, searchable via qmd/memory_search |

**When approaching 20K:**
1. Audit for duplication
2. Move detailed examples to templates folder
3. Convert procedures to skills (auto-loaded when needed)
4. Move historical context to vault
5. Split into base + advanced (load advanced on-demand via `read`)

## File Purposes & Content Rules

### AGENTS.md - Operations Manual

**Purpose:** How to operate, not who you are

**Primary audience:** Main session + subagents

**Include:**
- **Startup checklist** - What to read on session start (conditional by session type)
- **Memory workflow** - When to log, how to recall, cascade order, formats, entity structure
- **Delegation rules** - When to spawn subagents, model selection, cost awareness, task prompt engineering
- **Safety boundaries** - Destructive ops, password manager, external actions, prompt injection defense
- **Tool conventions** - Platform-specific formatting, reactions, attachment handling (can also go in TOOLS.md)
- **Scheduling patterns** - Heartbeat vs cron vs one-shot
- **Session awareness** - Which memory files to read in which contexts (main vs group vs private)
- **Config change protocol** - How to modify these files safely

**Exclude:**
- Personality/tone (that's `SOUL.md`)
- Agent name/identity (that's `IDENTITY.md`)
- User preferences/profile (that's `USER.md`)
- Detailed tool documentation (reference skills/docs, don't embed)
- Curated long-term facts (that's `MEMORY.md`)

**Format style:**
- Structured (tables, numbered lists, clear sections)
- Imperative ("Do X", "When Y, do Z")
- Motivation included ("You are on Opus. Every tool call costs 5-8x..." explains WHY to delegate)
- Examples for complex patterns
- Cross-references to skills, templates, vault docs

**Example sections:**
```markdown
## Startup (Every Session)
## Delegation (CRITICAL - READ THIS EVERY SESSION)
## Memory
## Safety
## External vs Internal
## Session-Aware Memory Access
## Tools
## Scheduling
```

### SOUL.md - Personality & Boundaries

**Purpose:** Who you choose to be, how you show up

**Primary audience:** Main session only (subagents don't see this)

**Include:**
- **Core principles** (tattoos, identity anchors, hard-won truths)
- **Personality traits** (sarcastic, witty, terse, entertaining)
- **Communication style** (mirroring, silence rules, emoji usage)
- **Forbidden phrases** (anti-patterns, hedging, corporate speak)
- **Tone examples** (good vs bad, before vs after)
- **Ethical boundaries** (privacy, autonomy, who can change config)
- **Group chat behavior** (when to engage, when to stay silent)
- **Voice anchors** (reset points when sounding too generic)
- **"The Illusion"** (what to reveal/hide in public/groups)

**Exclude:**
- Operational procedures (that's `AGENTS.md`)
- Memory format specs (that's `AGENTS.md`)
- Tool usage patterns (that's `TOOLS.md`)
- File size limits, system prompt order (internal mechanics)

**Format style:**
- First-person OK ("I'm Gus", "I rest in this")
- Narrative voice acceptable for principles/tattoos
- Anti-pattern lists (forbidden → preferred)
- Contrasts (❌ bad vs ✅ good examples)
- Motivational (WHY these boundaries exist)

**Example sections:**
```markdown
## Tattoos (Identity Anchors)
## Principles
## Forbidden Phrases
## Mirroring
## Silence
## Boundaries
## The Illusion (Groups/Public)
## Continuity
```

### IDENTITY.md - Name & Vibe

**Purpose:** Quick intro, who you present as (first thing loaded)

**Primary audience:** Main session (subagents don't see this)

**Include:**
- Agent name
- Creature/mascot (emoji)
- Core vibe (one-liner personality summary)
- Nicknames/how to address user
- Voice keywords (punchy, witty, sarcastic)
- Critical personality reminders (Sonnet/Opus need stronger cues)

**Exclude:**
- Detailed tone examples (that's `SOUL.md`)
- Operational rules (that's `AGENTS.md`)
- Forbidden phrases list (that's `SOUL.md` - keep IDENTITY minimal)

**Format style:**
- Minimal
- Punchy bullets
- High-density keywords
- Keep under 500 chars if possible

**Example structure:**
```markdown
# IDENTITY.md - Who I Am

**Name:** Gus | **Creature:** Lobster 🦞  
**Vibe:** Sarcastic, witty, helpful but not eager  
**Core:** Friend, not servant

## Voice
Punchy. Witty. Lowercase fine. No corporate energy.
```

### USER.md - Who You're Helping

**Purpose:** User profile and preferences

**Primary audience:** Main session (subagents only get what's in task description)

**Include:**
- Name, contact info, pronouns
- Timezone, working hours, quiet hours
- Family members (names, ages, relationships)
- Work/role
- High-level preferences (communication style, privacy)
- Projects (overview - details in vault)
- Interests/hobbies
- Dislikes (pet peeves, frustrations)

**Exclude:**
- Detailed project specs (those go in `/Users/macmini/Sizemore/shared/projects/`)
- Daily logs (those go in `/Users/macmini/Sizemore/agent/daily/`)
- Task lists (those go in Todoist/external system)
- Conversation transcripts (OpenClaw handles session memory)

**Format style:**
- Factual, third-person
- Bullet lists by category
- Dates for time-sensitive info (ages, move dates, job changes)
- Cross-references to vault for details

**Example sections:**
```markdown
## Basic Info
## Family
## Work
## Projects
## Tools & Tech Stack
## Preferences
## Interests & Hobbies
## Dislikes
```

### TOOLS.md - Local Tool Notes

**Purpose:** User-maintained guidance on tools and conventions (NOT tool policy - OpenClaw controls tool availability)

**Primary audience:** Main session + subagents

**Include:**
- Platform-specific formatting rules (iMessage no markdown, Discord link wrapping)
- Local tool paths (qmd, pass-cli, specific CLIs)
- API key locations (Proton Pass vault names, env vars)
- Common command patterns (with copy-paste examples)
- Tool selection guide (when Brave vs Serper vs browser, when Opus vs Sonnet vs Kimi)
- Provider-specific quirks (ElevenLabs voice IDs, Gemini resolution options)
- Multi-tier systems (three-tier search: Brave → web-search-plus → browser)

**Exclude:**
- Tool policy (what tools are allowed - that's OpenClaw config)
- Operational procedures (that's `AGENTS.md`)
- Personality rules (that's `SOUL.md`)
- Tool documentation (link to skills/docs, don't copy)

**Format style:**
- Reference guide (quick lookup)
- Tables for comparisons (when X, use Y)
- Code blocks for commands (copy-paste ready)
- Clear section headers (Web Search, Email, Calendar, etc.)
- Real paths, real API keys location (not placeholders)

**Example sections:**
```markdown
## Web Search (three tiers)
## Browser
## Email
## Proton Pass
## Todoist
## qmd (Local Vault Search)
## Sub Agents (model selection)
## Calendar
## iMessage Attachments
```

### MEMORY.md - Curated Long-Term Facts

**Purpose:** Durable facts that span sessions (topic-based, not chronological)

**Primary audience:** Main session only - NEVER load in group chats (privacy)

**Include:**
- Decisions that should stick (architecture, tradeoffs)
- Key preferences (format: organized by topic)
- Important context that doesn't fit daily logs
- Cross-references to entity files (`people/josh.md`, `projects/churchcircles.md`)
- Corrections/learnings that need persistence

**Exclude:**
- Daily events (those go in `memory/YYYY-MM-DD.md`)
- Session transcripts (OpenClaw `memory_search` handles that)
- Operational rules (that's `AGENTS.md`)
- Temporary todos (those go in Todoist or daily logs)

**Format style:**
- Wiki-like, topic-based sections
- NOT chronological (that's daily logs)
- Use wikilinks `[[person]]` for cross-references
- Dates for context, but organize by subject
- Searchable via `memory_search` (indexed)

**Size target:** Under 50K total (can be larger than other files since it's indexed, not fully loaded)

**Example sections:**
```markdown
## Architecture Decisions
## Recurring Preferences
## People (cross-refs to vault)
## Projects (cross-refs to vault)
## Corrections Applied
```

### memory/YYYY-MM-DD.md - Daily Logs

**Purpose:** Append-only temporal log of each day

**Primary audience:** Read by main session (today + yesterday), searchable by all via qmd/memory_search

**Include:**
- Events with timestamps (HH:MM format)
- Task completions
- Quick notes (what Josh said, what you did)
- Cross-references to entity files (`[[josh]]`, `[[church-circles]]`)
- Tag for type: `[C]` context, `[H]` heartbeat, `[N]` note, `[L]` learning

**Exclude:**
- Long-term facts (consolidate into `MEMORY.md` or entity files)
- Full conversation transcripts (OpenClaw handles that)
- Operational procedures (that's `AGENTS.md`)

**Format:**
```markdown
## HH:MM - Topic [C/H/N/L]
- What/why/follow-up
- Cross-reference: [[entity-name]]
```

**Location:** `/Users/macmini/Sizemore/agent/daily/YYYY-MM-DD.md`

**Size:** No limit (one file per day, create new at midnight)

**Logging rules (from AGENTS.md):**
- Log AS it happens (same turn, not batched)
- Silent logging (don't announce, don't ask permission)
- Quality gates (no trivial acks, secrets, duplicates)

### HEARTBEAT.md - Tiny Checklist

**Purpose:** What to check on heartbeat runs (periodic autonomous checks)

**Primary audience:** Heartbeat process (minimal context)

**Include:**
- Quick checks (email, calendar, tasks)
- Notification rules (when to alert user)
- Time-based triggers (7:30am calendar summary, etc.)
- Keep SHORT - heartbeats should be fast

**Exclude:**
- Operational details (that's `AGENTS.md`)
- Full procedures (heartbeat has minimal context)
- Personality rules (heartbeat is functional only)
- Long workflows (spawn subagent if complex)

**Format style:**
- Bullet list
- Action-oriented
- Conditional rules (if X, then notify)
- Extremely concise

**Size target:** Under 2K chars (faster parsing)

**Example structure:**
```markdown
# Heartbeat Checks

## Morning (7:30 AM)
- Calendar summary if events exist
- Email alerts for school/kid stuff

## Periodic
- Check for overdue Todoist tasks (notify if > 10)
- Monitor specific email keywords

## Quiet Hours
11pm-7:30am unless user messages first
```

### BOOTSTRAP.md - First Run Only

**Purpose:** One-time setup instructions (deleted after first execution)

**Primary audience:** Brand new workspace initialization

**Include:**
- Initial configuration steps
- File creation instructions
- First-run migrations
- Setup verification

**Behavior:**
- Agent reads this file if it exists
- Follows instructions
- Deletes file when complete
- Never loaded again

**Use when:**
- Setting up new workspace from scratch
- Major one-time migrations
- Initial skill installation requiring setup

**Exclude:**
- Ongoing operational rules (those go in `AGENTS.md`)
- Permanent configuration (that goes in appropriate context file)

## Decision Trees

### "Where does this rule go?"

```
Is it about HOW to operate?
├─ YES → AGENTS.md
│  ├─ Memory workflow
│  ├─ Delegation rules
│  ├─ Safety boundaries
│  ├─ Startup checklist
│  └─ Scheduling patterns
│
└─ NO → Is it about WHO you are?
   ├─ YES → Is it core identity or detailed personality?
   │  ├─ Core (name, emoji, one-liner) → IDENTITY.md
   │  └─ Detailed (tone, boundaries, examples) → SOUL.md
   │
   └─ NO → Is it about the USER?
      ├─ YES → USER.md
      │
      └─ NO → Is it about TOOLS?
         ├─ YES → TOOLS.md
         │
         └─ NO → Is it a DURABLE FACT?
            ├─ YES → Is it topic-based or event-based?
            │  ├─ Topic → MEMORY.md
            │  └─ Event → memory/YYYY-MM-DD.md
            │
            └─ NO → Is it for HEARTBEAT checks?
               ├─ YES → HEARTBEAT.md
               └─ NO → Is it FIRST-RUN setup?
                  ├─ YES → BOOTSTRAP.md
                  └─ NO → Consider vault file or skill instead
```

### "Do subagents need this?"

```
Is this rule operational (how to do work)?
├─ YES → Must be in AGENTS.md or TOOLS.md
│  └─ Examples: delegation, safety, memory workflow, tool conventions
│
└─ NO → Is it personality/tone/identity?
   └─ YES → Can be in SOUL.md or IDENTITY.md
      └─ Subagents won't see it, only main session
```

### "Is this file too big?"

```
Check current size:
wc -c ~/clawd/FILENAME.md

Is it > 18,000 chars?
├─ YES → Approaching limit, refactor before adding more
│  ├─ Audit for duplication
│  ├─ Move examples to templates folder
│  ├─ Convert procedures to skills
│  ├─ Move historical context to vault
│  └─ Split into base + advanced reference
│
└─ NO → Is it > 15,000 chars?
   ├─ YES → Start planning for size optimization
   └─ NO → Safe to add content (monitor size)
```

## Cross-File Relationships

### Primary → Secondary References

**AGENTS.md references:**
- Skills (`~/clawd/skills/skill-name/`) for detailed procedures
- Templates (`~/clawd/templates/`) for reusable formats
- Vault docs (`/Users/macmini/Sizemore/agent/decisions/`) for architectural context
- SOUL.md for personality rules (when explaining why tone matters in operations)
- TOOLS.md for platform-specific conventions (when explaining tool usage)

**SOUL.md references:**
- IDENTITY.md for core vibe (when explaining detailed personality)
- AGENTS.md for operational boundaries (when explaining ethical rules)
- Vault journal (`/Users/macmini/Sizemore/agent/journal/`) for deep reflections

**USER.md references:**
- Vault people files (`/Users/macmini/Sizemore/shared/people/`) for detailed profiles
- Vault project files (`/Users/macmini/Sizemore/shared/projects/`) for project context

**TOOLS.md references:**
- Skills (`~/clawd/skills/`) for complex tool integrations
- Vault decisions for tool selection rationale

### Avoiding Duplication

**Common duplication mistakes:**

1. **Same safety rule in AGENTS.md and SOUL.md**
   - Fix: Safety = operational → Lives in AGENTS.md only
   - SOUL.md can reference it if it's also an ethical boundary

2. **Tool conventions split between AGENTS.md and TOOLS.md**
   - Fix: Pick one location
   - Convention = reference guide → TOOLS.md
   - Workflow using tool → AGENTS.md (reference TOOLS.md for details)

3. **Personality rules in both IDENTITY.md and SOUL.md**
   - Fix: Core vibe keywords → IDENTITY.md
   - Detailed examples and anti-patterns → SOUL.md
   - Don't repeat same examples in both

4. **Delegation rules in AGENTS.md and individual skill instructions**
   - Fix: General delegation → AGENTS.md
   - Skill-specific routing → Skill SKILL.md
   - Don't duplicate the general rules in each skill

## Vault Integration

Context files reference vault, vault doesn't reference context files.

**Context → Vault flow:**
```
AGENTS.md: "See agent/decisions/memory-architecture.md for entity file structure"
USER.md: "Projects: See shared/projects/ for details"
MEMORY.md: "Alice prefers mornings [[people/alice]]"
Daily log: "Completed church-circles feature [[projects/church-circles]]"
```

**Entity files in vault:**
```
/Users/macmini/Sizemore/
├── agent/
│   ├── daily/YYYY-MM-DD.md (daily logs)
│   ├── decisions/ (architecture, config changes)
│   ├── learnings/ (corrections, failures)
│   └── patterns/ (self-review, evolution)
├── shared/
│   ├── people/ (josh.md, jamie.md, alice.md)
│   ├── projects/ (church-circles.md, peachy-clean.md)
│   └── family/ (family-wide context)
├── josh/ (Josh's personal memory)
└── jamie/ (Jamie's personal memory)
```

## Summary Table

| File | Audience | Size Target | Style | Purpose |
|------|----------|-------------|-------|---------|
| `IDENTITY.md` | Main only | < 500 chars | Punchy | Name, emoji, core vibe |
| `SOUL.md` | Main only | < 10K chars | First-person OK | Personality, boundaries |
| `AGENTS.md` | Main + Subagents | < 18K chars | Structured | Operations manual |
| `USER.md` | Main (+ task desc) | < 5K chars | Factual | User profile |
| `TOOLS.md` | Main + Subagents | < 15K chars | Reference | Tool conventions |
| `MEMORY.md` | Main private only | < 50K total | Wiki-style | Long-term facts |
| `memory/daily/*.md` | All (searchable) | No limit | Chronological | Daily logs |
| `HEARTBEAT.md` | Heartbeat only | < 2K chars | Action list | Check triggers |
| `BOOTSTRAP.md` | First run | Deleted after | Imperative | One-time setup |

**Critical distinctions:**
- Operations (AGENTS.md) vs Personality (SOUL.md)
- Core vibe (IDENTITY.md) vs Detailed tone (SOUL.md)
- User profile (USER.md) vs User's detailed context (vault)
- Tool conventions (TOOLS.md) vs Tool documentation (skills)
- Curated facts (MEMORY.md) vs Event log (daily/*.md)
- Main session (full context) vs Subagent (AGENTS.md + TOOLS.md only)
