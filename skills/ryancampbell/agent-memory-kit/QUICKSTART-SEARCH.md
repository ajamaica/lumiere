# Memory Kit Search - Quick Start

**Goal:** Get searching in <5 minutes.

---

## 1. Setup (One-time)

Add to your shell config (`~/.zshrc` or `~/.bashrc`):

```bash
export PATH="$PATH:$HOME/.openclaw/workspace/skills/agent-memory-kit/bin"
```

Then reload:

```bash
source ~/.zshrc  # or source ~/.bashrc
```

Test it:

```bash
memory-search --help
```

---

## 2. Start Tagging (Today)

When logging today's work, add tags:

```markdown
### ClawHub Launch #win #distribution #kits

**What:** Published 5 kits to ClawHub marketplace
**Impact:** Real distribution channel, community discovery

**Tags:** #win #distribution #kits
```

**Use these tags:**

- `#decision` — Important decisions
- `#learning` — Lessons learned
- `#blocker` — Things blocking progress
- `#win` — Achievements
- `#procedure` — Reference to a how-to

**Domain tags:**

- `#kits`, `#distribution`, `#product`, `#infrastructure`, `#team`, `#content`

**Rule:** 2-4 tags per entry, no more.

---

## 3. Search (Now)

### Find Past Decisions

```bash
memory-search --recent-decisions
```

Shows all entries tagged `#decision` from the last 7 days.

### Today's Context

```bash
memory-search --today
```

Quick orientation — what happened today?

### Keyword Search

```bash
memory-search "token limit"
```

Finds all mentions of "token limit" across memory files.

### Keyword + Tag

```bash
memory-search "ClawHub" --tag decision
```

Find decisions about ClawHub specifically.

### Procedure Lookup

```bash
memory-search --procedure "posting"
```

Search procedures only for "posting".

### Pattern Detection

```bash
memory-search "compaction" --count
```

How many times have we mentioned compaction? By file? By tag?

---

## 4. Daily Workflow

### Morning Wake-Up

```bash
# Quick orientation
memory-search --today

# Check active blockers
memory-search --active-blockers

# Read yesterday's log for continuity
cat memory/$(date -v-1d +%Y-%m-%d).md  # macOS
cat memory/$(date -d "yesterday" +%Y-%m-%d).md  # Linux
```

### During the Day

When logging events, **tag as you write**:

```markdown
### Built Memory Search #win #kits #implementation

Built the search system per spec. Keyword + tag filtering working.

**Tags:** #win #kits #implementation
```

### End of Day

Add frontmatter to today's log (optional but helpful):

```markdown
---
date: 2026-02-04
agents: [Kai, Echo]
projects: [Memory Kit Search]
tags: [kits, search]
status: active
wins:
  - Memory search implementation complete
blockers: []
---

# Daily Log — February 4, 2026
```

---

## 5. Common Searches

**"What did we decide about X?"**

```bash
memory-search "X" --tag decision
```

**"How do we do Y?"**

```bash
memory-search --procedure "Y"
```

**"What were our recent wins?"**

```bash
memory-search --recent-wins
```

**"Show me kit-related work this week"**

```bash
memory-search --tag kits --since 7d
```

**"Count token limit mentions"**

```bash
memory-search "token limit" --count
```

---

## 6. Advanced Usage

### Multiple Tags (AND logic)

```bash
memory-search --tag kits --tag distribution --tag decision
```

Finds entries tagged with ALL three tags.

### Date Ranges

```bash
# Relative dates
memory-search "launch" --since 7d      # Last 7 days
memory-search "launch" --since 2w      # Last 2 weeks
memory-search "launch" --since 1m      # Last month

# Specific dates
memory-search "launch" --since 2026-02-01 --until 2026-02-03
```

### Project/Agent Filtering

```bash
# Find work on specific project
memory-search --project "Memory Kit"

# Find specific agent's activity
memory-search --agent "Echo"
```

### JSON Output (for scripting)

```bash
memory-search "kits" --format json | jq '.[0]'
```

---

## 7. Tips

**Do:**

- ✅ Tag as you write (not batch cleanup)
- ✅ Use 2-4 tags per entry
- ✅ Search before asking "where's that thing?"
- ✅ Use shortcuts (`--today`, `--recent-decisions`)

**Don't:**

- ❌ Over-tag everything (dilutes signal)
- ❌ Create one-off tags
- ❌ Skip tagging important decisions
- ❌ Forget to use search (it's fast!)

---

## Next Steps

1. **Tag today's work** — Practice tagging as you log
2. **Try 3-5 searches** — Get comfortable with the CLI
3. **Read full docs** — See `SEARCH.md` for everything

**Full documentation:** [SEARCH.md](./SEARCH.md)

---

_Memory Kit v2.1 — Find past decisions in <10 seconds_
