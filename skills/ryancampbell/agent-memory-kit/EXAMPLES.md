# Memory Kit Search - Real Usage Examples

**Based on:** Actual memory files from Team Reflectt (Feb 2026)

---

## Morning Wake-Up Routine

### Quick Orientation

```bash
# What happened today?
memory-search --today
```

**Use case:** First thing when waking up — get instant context on today's activity without reading full logs.

**Output example:**

```
1. Memory Kit Search Implementation
   📅 2026-02-04 | memory/2026-02-04.md:89
   Tags: #win #kits #implementation
   Preview: Built Memory Kit Search system per spec. CLI working, tests passing...

2. ClawHub Launch Discussion
   📅 2026-02-04 | memory/2026-02-04.md:145
   Tags: #decision #distribution
   Preview: Decided to publish kits after testing search system...

Found 2 result(s)
```

---

### Check Active Blockers

```bash
# What's blocking us right now?
memory-search --active-blockers
```

**Use case:** Morning review — surface anything blocking progress.

**Expected:** Entries tagged `#blocker` across recent files.

---

### Recent Decisions

```bash
# What have we decided recently?
memory-search --recent-decisions
```

**Use case:** Context on recent strategic choices (last 7 days).

**Output example:**

```
1. ClawHub Publishing Decision
   📅 2026-02-03 | memory/2026-02-03.md:45
   Tags: #decision #kits #distribution
   Preview: Decided to publish all 5 kits to ClawHub immediately...

2. Memory Kit Search Priority
   📅 2026-02-03 | memory/2026-02-03.md:127
   Tags: #decision #kits
   Preview: Prioritized search feature for Memory Kit v2.1...
```

---

## Finding Past Decisions

### "What did we decide about ClawHub?"

```bash
memory-search "ClawHub" --tag decision
```

**Use case:** Recall specific decision context.

**Why it works:**

- Keyword: "ClawHub"
- Tag: `#decision` (filters to decisions only)
- Results: Exact decision with full context

---

### "Did we decide on token budget approach?"

```bash
memory-search "token budget" --tag decision
```

**Use case:** Check if something was already decided.

**Benefit:** Avoid re-deciding or conflicting decisions.

---

### "What were the kit-related decisions this week?"

```bash
memory-search --tag kits --tag decision --since 7d
```

**Use case:** Weekly review of kit strategy decisions.

**Why multiple tags:** `#kits` AND `#decision` = precise filtering.

---

## Procedure Lookup

### "How do we post to DEV.to again?"

```bash
memory-search --procedure "DEV.to"
```

**Use case:** Quick procedure lookup without remembering exact filename.

**Output:**

```
📄 Procedure | memory/procedures/devto-posting.md
Tags: #procedure #distribution #content
Preview: How to publish articles to DEV.to platform...
```

---

### "How do we connect Homie?"

```bash
memory-search --procedure "homie"
```

**Use case:** Recall technical procedure.

**Alternative:**

```bash
memory-search --procedure "connection"
```

**Why:** Procedure search is substring-based, flexible.

---

### "Show me all distribution procedures"

```bash
memory-search --procedure --tag distribution
```

**Use case:** Find all procedures in a specific domain.

**Output:** All procedures tagged `#distribution`.

---

## Pattern Detection

### "How often do we hit token limits?"

```bash
memory-search "token limit" --count
```

**Use case:** Detect recurring issues.

**Output example:**

```
Found "token limit" mentioned 12 times:

By file:
  - 2026-02-03.md: 4 occurrences
  - 2026-02-02.md: 3 occurrences
  - MEMORY.md: 2 occurrences
  - compaction-survival.md: 3 occurrences

Tagged as:
  - #blocker: 2 times
  - #learning: 1 time

Most recent: 2026-02-03 13:48 PST
```

**Insight:** Hitting token limits 12 times → maybe need Token Budget Kit!

---

### "How many times have we shipped kits?"

```bash
memory-search "shipped" --tag kits --count
```

**Use case:** Track progress/velocity.

---

### "What are our most common blockers?"

```bash
# Get all blockers, then analyze
memory-search --tag blocker --format json | jq -r '.[].preview' | sort | uniq -c | sort -rn
```

**Use case:** Identify patterns in what blocks progress.

---

## Project-Specific Search

### "What did we do on Memory Kit this week?"

```bash
memory-search --project "Memory Kit" --since 7d
```

**Use case:** Project status update.

**Works if:** Frontmatter includes `projects: [Memory Kit]`.

---

### "What kit work happened recently?"

```bash
memory-search --tag kits --since 7d
```

**Use case:** Broader than specific project — all kit activity.

---

### "Show me all ClawHub-related work"

```bash
memory-search "ClawHub" --since 30d
```

**Use case:** Assemble context on a topic across time.

---

## Agent-Specific Search

### "What has Echo been working on?"

```bash
memory-search --agent Echo --since 7d
```

**Use case:** Track individual agent contributions.

**Works if:** Frontmatter includes `agents: [Echo]`.

---

### "Show me Kai's recent wins"

```bash
memory-search --agent Kai --tag win --since 14d
```

**Use case:** Celebrate individual achievements.

---

## Learning & Improvement

### "What have we learned about distribution?"

```bash
memory-search --tag learning --tag distribution
```

**Use case:** Capture lessons in a specific area.

---

### "What bugs did we hit this week?"

```bash
memory-search --tag bug --since 7d
```

**Use case:** Track technical issues.

**Benefit:** See patterns, avoid repeat bugs.

---

### "What procedures did we create recently?"

```bash
memory-search --tag procedure --since 30d
```

**Use case:** See what knowledge we've documented.

---

## Date Range Queries

### "What happened in early February?"

```bash
memory-search --since 2026-02-01 --until 2026-02-07
```

**Use case:** Review specific time period.

---

### "Last week's activity"

```bash
memory-search --since 7d
```

**Alternative:**

```bash
memory-search --since 1w
```

**Use case:** Weekly review.

---

### "This month's wins"

```bash
memory-search --tag win --since 1m
```

**Use case:** Monthly retrospective.

---

## Complex Queries

### "Kit distribution decisions this week"

```bash
memory-search --tag kits --tag distribution --tag decision --since 7d
```

**Use case:** Very specific filtering.

**Why:** 3 tags + date range = precise results.

---

### "Recent important learnings"

```bash
memory-search --tag learning --tag important --since 14d
```

**Use case:** Highlight key insights.

---

### "Blocker resolution patterns"

```bash
# Find blockers
memory-search --tag blocker --since 30d

# Then search for resolutions
memory-search "resolved" --tag blocker
```

**Use case:** Learn how we solve problems.

---

## Advanced Scripting

### Extract All Decision Text

```bash
memory-search --tag decision --format json | jq -r '.[].preview' > recent-decisions.txt
```

**Use case:** Export for analysis.

---

### Count Tags by Frequency

```bash
memory-search --format json | jq -r '.[].tags' | tr ' ' '\n' | sort | uniq -c | sort -rn
```

**Use case:** See which tags are used most.

---

### Find Untagged Entries

```bash
# Find files with low tag density
for file in memory/2026-*.md; do
  tags=$(grep -c "#" "$file" || echo 0)
  lines=$(wc -l < "$file")
  ratio=$(echo "scale=2; $tags / $lines * 100" | bc)
  echo "$file: $ratio% tagged"
done
```

**Use case:** Identify files needing tagging.

---

### Recent Activity Timeline

```bash
memory-search --since 7d --format json | jq -r '.[] | "\(.date) - \(.preview[:60])"' | sort
```

**Use case:** Chronological context assembly.

---

## Workflow Integration

### Pre-Meeting Prep

```bash
# Before discussing Memory Kit:
memory-search --project "Memory Kit" --since 7d
memory-search --tag kits --tag decision
```

**Use case:** Quick context before discussion.

---

### Daily Standup Prep

```bash
# What did I do yesterday?
memory-search --since 1d --until 0d

# Any blockers?
memory-search --active-blockers
```

**Use case:** Prepare standup updates.

---

### Weekly Review

```bash
# Wins this week
memory-search --tag win --since 7d

# Learnings this week
memory-search --tag learning --since 7d

# Decisions made
memory-search --recent-decisions
```

**Use case:** Weekly retrospective.

---

## Debugging Past Work

### "When did we implement X?"

```bash
memory-search "X" --tag win
```

**Use case:** Find when something shipped.

---

### "What problems did we hit with Y?"

```bash
memory-search "Y" --tag blocker
```

**Use case:** Debug by finding past similar issues.

---

### "How did we solve Z last time?"

```bash
memory-search "Z" --tag learning
```

**Use case:** Recall past solutions.

---

## Tips from Real Usage

### 1. Start Broad, Then Filter

```bash
# Start
memory-search "kits"

# Too many results? Add tag
memory-search "kits" --tag decision

# Still too many? Add date
memory-search "kits" --tag decision --since 7d
```

---

### 2. Use Shortcuts First

```bash
# Instead of:
memory-search --tag decision --since 7d

# Use:
memory-search --recent-decisions
```

**Why:** Faster typing, common patterns.

---

### 3. Tag Consistently

**Good tagging:**

```markdown
### ClawHub Launch #win #distribution #kits

Shipped all 5 kits to ClawHub.

**Tags:** #win #distribution #kits
```

**Why it works:**

- Tags in heading (searchable)
- Tags at end (visual reference)
- 2-4 tags (not overwhelming)

---

### 4. Use Count for Patterns

```bash
# Don't just search, count
memory-search "compaction" --count
memory-search "token" --count
memory-search "shipped" --tag kits --count
```

**Why:** Reveals frequency, trends.

---

### 5. Combine with Other Tools

```bash
# Search then read full file
memory-search "ClawHub" --tag decision
# → Find: memory/2026-02-03.md:45
cat memory/2026-02-03.md

# Search then edit
memory-search --procedure "posting"
# → Find: memory/procedures/devto-posting.md
vim memory/procedures/devto-posting.md
```

---

## Common Anti-Patterns

### ❌ Over-Filtering

```bash
# Too specific, likely no results
memory-search "exact phrase" --tag tag1 --tag tag2 --tag tag3 --project "Project" --agent "Agent" --since 1d
```

**Instead:** Start broad, filter if needed.

---

### ❌ Forgetting to Tag

**Problem:** Search can't find untagged entries by tag.

**Solution:** Tag as you write (2-4 tags per entry).

---

### ❌ Not Using Shortcuts

```bash
# Don't type this every time:
memory-search --tag decision --since 7d

# Use this:
memory-search --recent-decisions
```

---

### ❌ Searching for Everything

**Problem:** Reading search results for every little thing.

**Solution:** Read recent daily logs first, search for older/specific context.

---

## Real-World Success Stories

### 1. "Where's that ClawHub auth issue?"

**Before:** 5 minutes of grepping, re-reading files.

**After:**

```bash
memory-search "ClawHub" --tag blocker
# → Found in 3 seconds
```

---

### 2. "How do we post to Moltbook?"

**Before:** Searching Google, re-reading TOOLS.md.

**After:**

```bash
memory-search --procedure "moltbook"
# → Procedure found immediately
```

---

### 3. "What did we accomplish this week?"

**Before:** Re-reading 7 daily logs (~30 minutes).

**After:**

```bash
memory-search --tag win --since 7d
# → All wins in 5 seconds
```

---

## Next Steps

**Try these searches right now:**

1. `memory-search --today` — What happened today?
2. `memory-search --recent-decisions` — Recent choices?
3. `memory-search --tag win --since 7d` — Weekly wins?
4. `memory-search "kit" --count` — How often mentioned?

**Then read:**

- **Quick start:** `QUICKSTART-SEARCH.md`
- **Full guide:** `SEARCH.md`

---

_Memory Kit v2.1 — Your past decisions, instantly._
