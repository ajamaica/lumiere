# Memory Kit Search & Recall

**Version:** 2.1.0  
**Status:** Active  
**Purpose:** Find past decisions and context quickly across memory files

---

## Quick Start

```bash
# Add to PATH (optional, for easy access)
export PATH="$PATH:$HOME/.openclaw/workspace/skills/agent-memory-kit/bin"

# Basic search
memory-search "token limit"

# Search with tags
memory-search --tag decision

# Recent decisions
memory-search --recent-decisions

# Today's context
memory-search --today

# Procedure lookup
memory-search --procedure "posting"
```

---

## Overview

Memory Kit Search solves the problem: **"Where did we decide that?"**

With 3,865+ lines across memory files, procedures, and daily logs, finding specific context used to take 2-5 minutes of manual grep or file reading. Now it takes <10 seconds.

### What It Searches

- **Daily logs:** `memory/YYYY-MM-DD.md` (episodic memory)
- **Procedures:** `memory/procedures/*.md` (how-tos)
- **Context snapshot:** `memory/context-snapshot.md` (post-compaction recovery)
- **Other memory files:** Any `.md` in `memory/`

### What It Finds

- **Keyword matches:** Basic text search
- **Tagged entries:** Filter by `#tags`
- **Date ranges:** Recent activity or specific periods
- **Decisions:** Past strategic choices
- **Procedures:** How to do X
- **Patterns:** Recurring themes across time

---

## Tag System

### Why Tags?

Tags make search precise. Instead of finding every mention of "kits," you can find:

- `#decision` → Decisions about kits
- `#blocker` → Kit-related blockers
- `#win` → Kit achievements
- `#procedure` → How to work with kits

### Tag Categories

**Event/Topic Tags** (what type of entry)

- `#decision` - Strategic decisions made
- `#learning` - Lessons learned, insights
- `#blocker` - Problems blocking progress
- `#win` - Achievements, milestones
- `#procedure` - References to procedures
- `#bug` - Technical issues
- `#pattern` - Recurring themes

**Domain Tags** (what area)

- `#kits` - Agent kits development
- `#distribution` - Marketing, posting, reach
- `#product` - Product development
- `#infrastructure` - Technical platform work
- `#team` - Team coordination
- `#content` - Writing, documentation

**Meta Tags** (importance/status)

- `#important` - High-value information
- `#todo` - Action items
- `#archived` - Historical, low relevance
- `#reference` - External links/resources
- `#question` - Open questions

### How to Tag

**In daily logs:**

```markdown
### ClawHub Publishing Decision #decision #kits #distribution

**What:** Decided to publish all 5 kits to ClawHub
**Why:** Miles' tweet showed active community

**Tags:** #decision #kits #distribution #blocker
```

**In procedures:**

```markdown
---
tags: [procedure, distribution, devto]
---

# DEV.to Posting #procedure #distribution
```

**Guidelines:**

- ✅ Use 2-4 tags per entry (not too many)
- ✅ Tag as you write (not batch cleanup)
- ✅ Prefer specific tags over generic
- ❌ Don't create one-off tags
- ❌ Don't over-tag everything

---

## Frontmatter

Daily logs and procedures can include YAML frontmatter for structured metadata:

```markdown
---
date: 2026-02-04
agents: [Kai, Echo, Link]
projects: [Memory Kit, ClawHub]
tags: [kits, search, distribution]
status: active
summary: 'Built Memory Kit Search system'
wins:
  - Completed search implementation
  - Tagged recent logs
blockers:
  - Need to test with larger dataset
---

# Daily Log — February 4, 2026
```

**Frontmatter fields:**

- `date` - YYYY-MM-DD (required for daily logs)
- `agents` - Who was active
- `projects` - What we worked on
- `tags` - Primary themes (also searchable)
- `status` - active/archived
- `summary` - One-line context
- `wins` - Key achievements
- `blockers` - Open issues

**Benefits:**

- Quick file filtering without reading content
- Project/agent tracking
- Status indicators for relevance

---

## Search Examples

### Basic Keyword Search

```bash
memory-search "token limit"
```

**Output:**

```
1. Token Budget Kit Design
   📅 2026-02-03 | memory/2026-02-03.md:127
   Tags: #decision #kits #important
   Context: Designed Token Budget Kit to prevent compaction surprises...

2. Compaction Hit During Launch
   📅 2026-02-02 | memory/2026-02-02.md:89
   Tags: #blocker #learning
   Context: Hit 200k token limit during forAgents.dev launch...

Found 2 result(s)
```

### Tag Filtering

```bash
# Find decisions
memory-search --tag decision

# Multiple tags (AND logic)
memory-search --tag kits --tag distribution

# Tag + keyword
memory-search "ClawHub" --tag decision
```

### Date Ranges

```bash
# Relative dates
memory-search "authentication" --since 7d     # Last 7 days
memory-search "launch" --since 2w             # Last 2 weeks
memory-search "compaction" --since 1m         # Last month

# Specific dates
memory-search "ClawHub" --since 2026-02-01 --until 2026-02-03
```

### Project/Agent Filtering

```bash
# Find work on specific project
memory-search --project "Memory Kit"

# Find agent's activity
memory-search --agent "Echo"

# Combine filters
memory-search --project "ClawHub" --tag decision --since 7d
```

### Procedure Lookup

```bash
# Search procedures only
memory-search --procedure "posting"
memory-search --procedure "DEV.to"

# Find how to do something
memory-search --procedure --tag distribution
```

### Quick Shortcuts

```bash
# Today's activity (quick orientation on wake-up)
memory-search --today

# Recent decisions (last 7 days)
memory-search --recent-decisions

# Recent wins
memory-search --recent-wins

# Active blockers
memory-search --active-blockers
```

### Pattern Detection

```bash
# Count occurrences
memory-search "compaction" --count

# Output:
# Found "compaction" mentioned 12 times:
#
# By file:
# - memory/2026-02-03.md: 4 occurrences
# - memory/2026-02-02.md: 3 occurrences
# - MEMORY.md: 2 occurrences
#
# Tagged as #blocker: 2 times
# Tagged as #learning: 1 time
#
# Most recent: 2026-02-03 13:48 PST
```

### JSON Output

```bash
# Machine-readable output
memory-search "kits" --tag decision --format json

# Use with jq for processing
memory-search --recent-decisions --format json | jq '.[0].preview'
```

---

## CLI Reference

### Usage

```
memory-search [QUERY] [OPTIONS]
```

### Arguments

**QUERY**

- Keyword or phrase to search for
- Case-insensitive
- Supports multiple words (wrap in quotes if needed)

### Options

**Filtering:**

- `--tag TAG` - Filter by tag (repeatable)
- `--project PROJECT` - Filter by project name
- `--agent AGENT` - Filter by agent name
- `--since DATE` - Results since date (YYYY-MM-DD or relative: 7d, 2w, 1m)
- `--until DATE` - Results until date (YYYY-MM-DD)
- `--procedure` - Search procedures only

**Output:**

- `--context N` - Show N lines before/after match (default: 3)
- `--format FORMAT` - Output format: `text` (default) or `json`
- `--count` - Count occurrences, don't show full results

**Shortcuts:**

- `--today` - Today's activity
- `--recent-decisions` - Recent decisions (last 7 days)
- `--recent-wins` - Recent wins (last 7 days)
- `--active-blockers` - Active blockers

**Help:**

- `--help`, `-h` - Show usage information

### Examples

```bash
# Basic keyword search
memory-search "token limit"

# Search with tag filter
memory-search "ClawHub" --tag decision

# Multiple tags
memory-search --tag kits --tag distribution

# Date range
memory-search "authentication" --since 7d
memory-search "launch" --since 2026-02-01 --until 2026-02-03

# Procedure search
memory-search --procedure "posting"

# Count occurrences
memory-search "compaction" --count

# Quick shortcuts
memory-search --today
memory-search --recent-decisions
memory-search --active-blockers

# JSON output
memory-search "kits" --format json | jq '.[0]'
```

---

## Workflow Integration

### Wake-Up Routine

**Before (v2.0):**

1. Read SOUL.md
2. Read USER.md
3. Read yesterday's daily log
4. If main session: Read MEMORY.md

**After (v2.1):**

1. Read SOUL.md
2. Read USER.md
3. **Run `memory-search --today` for quick orientation**
4. Read yesterday's daily log
5. If main session: Read MEMORY.md

**Why:** Get instant context on current work without reading full files.

### Daily Logging

**When logging events:**

1. Add frontmatter at day start (template provides structure)
2. Tag entries as you write (`#decision`, `#learning`, `#blocker`, etc.)
3. Use 2-4 tags per entry
4. Update frontmatter at day end (wins, blockers)

**Example:**

```markdown
---
date: 2026-02-04
agents: [Kai, Echo]
projects: [Memory Kit Search]
tags: [kits, search, implementation]
status: active
summary: 'Built and tested Memory Kit Search v2.1'
wins:
  - Search implementation complete
  - CLI tool working
blockers: []
---

# Daily Log — February 4, 2026

## Memory Kit Search Implementation #kits #win

Built the search system per DEFINE.md spec...

**Tags:** #kits #win #implementation
```

### Procedure Creation

**When documenting a procedure:**

1. Use `templates/procedure-template-v2.md`
2. Add frontmatter with tags
3. Tag sections (`#procedure`, `#important`, `#bug`, etc.)
4. Include in "Related Procedures" links

**Example:**

```markdown
---
title: Memory Search Usage
category: memory
tags: [procedure, search, memory]
created: 2026-02-04
---

# Memory Search Procedure #procedure #memory

## Quick Reference #reference

...
```

### Heartbeat Checks

Add to heartbeat rotation (every 2-3 days):

```markdown
### Memory Health Check

- [ ] Run: `memory-search --active-blockers`
- [ ] Any blockers >3 days old? Escalate or resolve.
- [ ] Run: `memory-search --recent-decisions`
- [ ] Any decisions need follow-up?
- [ ] Check tag coverage on recent daily files
```

---

## Search Algorithm

### How It Works

1. **Parse arguments** (query, tags, date range, etc.)
2. **Build file list**
   - Filter by date if `--since`/`--until` specified
   - Include procedures if `--procedure` flag
3. **For each file:**
   - Parse frontmatter (YAML between `---` markers)
   - Check frontmatter matches filters (tags, project, agent)
   - Search content with grep (case-insensitive)
   - Extract context window (N lines before/after)
   - Parse inline tags from matching lines
   - Calculate relevance score
4. **Sort results** by score (descending)
5. **Format output** (text or JSON)

### Relevance Scoring

Results are ranked by relevance:

- **+10 points:** Tag match
- **+5 points:** Frontmatter match (project/agent)
- **+3 points:** Exact keyword match
- **+2 points:** Match in heading
- **+1 point:** Recent file (within 7 days)
- **-5 points:** Tagged `#archived`

**Why it matters:** Most relevant results appear first, saving time.

### Performance

- **Target:** <2 seconds for 100 files
- **Optimization:** Uses grep for initial filtering, only parses matches
- **Tested with:** 50+ memory files, 20+ procedures

---

## Advanced Usage

### Combining Filters

```bash
# Complex query: find kit-related decisions about distribution in last week
memory-search --tag kits --tag decision --tag distribution --since 7d

# Find Echo's recent wins
memory-search --agent Echo --tag win --since 14d

# Active blockers on specific project
memory-search --project "Memory Kit" --tag blocker
```

### Using with Other Tools

```bash
# Count mentions by file
memory-search "token limit" --format json | jq -r '.[].file' | sort | uniq -c

# Get most recent match
memory-search "ClawHub" --format json | jq '.[0]'

# Extract all tags from results
memory-search --tag decision --format json | jq -r '.[].tags' | tr ' ' '\n' | sort | uniq

# Find files without results (negation)
comm -23 \
  <(ls memory/*.md | sort) \
  <(memory-search "kits" --format json | jq -r '.[].file' | sort)
```

### Batch Operations

```bash
# Tag all recent daily logs
for file in memory/2026-02-*.md; do
  # Add tags manually or with script
done

# Export search results
memory-search --recent-decisions > recent-decisions.txt

# Archive old decisions
memory-search --tag decision --until 2025-12-31 --format json > archive.json
```

---

## Troubleshooting

### No Results Found

**Problem:** Search returns no results

**Solutions:**

1. Check spelling - search is case-insensitive but exact
2. Try broader query - use fewer tags
3. Expand date range - remove `--since`/`--until`
4. Check if files have frontmatter/tags
5. Verify file location - must be in `memory/` or `memory/procedures/`

### Too Many Results

**Problem:** Search returns 50+ results

**Solutions:**

1. Add tag filters - `--tag decision` narrows scope
2. Narrow date range - `--since 7d`
3. Use more specific keywords
4. Combine filters - `--tag + --project + --since`

### Slow Search

**Problem:** Search takes >5 seconds

**Solutions:**

1. Use tag filters first - reduces file count
2. Narrow date range - fewer files to scan
3. Check file count - `ls memory/*.md | wc -l`
4. Consider archiving old files

### Tags Not Found

**Problem:** `--tag decision` finds nothing

**Solutions:**

1. Check tag spelling - `#decision` not `#decisions`
2. Verify files have tags - open recent daily log
3. Use keyword search instead - `memory-search "decision"`
4. Tag files first - see "Workflow Integration"

---

## Best Practices

### Tagging

**Do:**

- ✅ Tag as you write (part of daily flow)
- ✅ Use 2-4 tags per entry
- ✅ Prefer specific tags (`#kits`) over generic (`#work`)
- ✅ Tag decisions, learnings, blockers (high value)

**Don't:**

- ❌ Batch-tag hundreds of old files (diminishing returns)
- ❌ Create one-off tags (`#that-one-time-we-did-x`)
- ❌ Over-tag everything (dilutes signal)
- ❌ Forget to tag important decisions

### Searching

**Do:**

- ✅ Start broad, then filter (`memory-search "kits"` → add `--tag decision`)
- ✅ Use shortcuts (`--recent-decisions` vs manual date math)
- ✅ Combine filters for precision
- ✅ Check `--count` to detect patterns

**Don't:**

- ❌ Search for every little thing (read recent files first)
- ❌ Use overly complex queries (keep it simple)
- ❌ Forget about grep (sometimes faster for quick checks)

### Maintenance

**Weekly:**

- Review last 7 days of logs for tag coverage
- Update frontmatter on daily files (wins, blockers)

**Monthly:**

- Check tag taxonomy - are new tags needed?
- Archive old files if search slowing down
- Review most common queries - improve workflow

---

## Future Enhancements

### Phase 2 (Planned)

- **Fuzzy matching** - Handle typos ("tokn" → "token")
- **Synonym support** - "ship" = "launch" = "deploy"
- **Relevance tuning** - Better scoring based on usage

### Phase 3 (Planned)

- **Integration with wake routine** - Auto-run `--today` on session start
- **Heartbeat automation** - Regular blocker checks
- **Batch tagging tools** - Semi-automated historical tagging

### Phase 4 (Maybe)

- **Semantic search** - Embeddings-based similarity ("find entries like X")
- **Graph view** - Visualize connections between entries
- **Timeline view** - Chronological context assembly
- **Command Center integration** - Visual search interface

**Decision gate:** Only proceed if Phase 1-3 show clear need.

---

## FAQ

### Why not use grep?

Grep is fast but doesn't understand:

- Tags (semantic filtering)
- Frontmatter (metadata)
- Relevance (scoring)
- Date ranges (relative dates)
- Quick shortcuts (`--recent-decisions`)

Memory search builds on grep with agent-friendly features.

### Why not a database?

**File-based search is:**

- ✅ Simple (no setup, no dependencies)
- ✅ Portable (works anywhere)
- ✅ Human-readable (markdown stays readable)
- ✅ Git-friendly (version control)
- ✅ Fast enough (2 seconds for 100 files)

Databases add complexity for minimal gain at our scale.

### How do I add memory-search to PATH?

Add to `~/.zshrc` or `~/.bashrc`:

```bash
export PATH="$PATH:$HOME/.openclaw/workspace/skills/agent-memory-kit/bin"
```

Then `source ~/.zshrc` or restart terminal.

### Can I search MEMORY.md?

Currently no - MEMORY.md is curated long-term memory, separate from daily logs. It's loaded directly in main sessions.

To search MEMORY.md, use grep:

```bash
grep -i "keyword" MEMORY.md
```

### What about other agents' memories?

This searches the shared workspace `memory/` folder. Agent-specific memories (if any) are separate.

For shared context, all agents use the same memory files.

---

## Related Documentation

- **Memory Kit README:** `skills/agent-memory-kit/README.md`
- **Architecture:** `skills/agent-memory-kit/templates/ARCHITECTURE.md`
- **Templates:** `skills/agent-memory-kit/templates/`
- **Spec:** `projects/memory-kit-search/DEFINE.md`
- **Changelog:** `skills/agent-memory-kit/CHANGELOG.md`

---

## Support

**Issues?** Check:

1. This doc (SEARCH.md)
2. `memory-search --help`
3. Test with simple query first
4. Verify files are tagged

**Improvements?** Feedback welcome:

- Update `memory/feedback.md`
- Tag with `#search #feedback`

---

_Memory Kit Search v2.1 - Built by Echo 📝, Feb 2026_  
_"Find past decisions in <10 seconds"_
