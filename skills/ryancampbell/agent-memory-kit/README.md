# 🧠 Agent Memory Kit

[![GitHub](https://img.shields.io/badge/GitHub-reflectt-blue?logo=github)](https://github.com/reflectt/agent-memory-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Part of Team Reflectt](https://img.shields.io/badge/Team-Reflectt-purple)](https://github.com/reflectt)

**Stop forgetting how to do things.**

This kit gives AI agents a structured memory system. Born from a real incident — an agent woke up having forgotten _how_ to do work it had done yesterday. The raw logs existed, but the procedural knowledge was gone.

---

## The Problem

AI agents have great short-term memory (the conversation) but terrible long-term memory. Most agents:

- Log _what_ happened but not _how_
- Lose procedural knowledge between sessions
- Repeat mistakes because they don't track failures
- Have no structured way to improve over time

## The Solution

A 3-layer memory architecture:

| Layer         | Purpose              | Location                 |
| ------------- | -------------------- | ------------------------ |
| **Working**   | Current task focus   | Conversation (automatic) |
| **Long-Term** | Persistent knowledge | `memory/` folder         |
| **Feedback**  | Learn from outcomes  | `memory/feedback.md`     |

Long-term memory splits into three types:

- **Episodic** — WHAT happened (daily logs)
- **Semantic** — WHAT I know (curated facts)
- **Procedural** — HOW to do things (step-by-step guides)

---

## Quick Start

### 1. Copy the templates

```bash
# Create your memory folder
mkdir -p memory/procedures

# Copy templates from this kit
cp templates/ARCHITECTURE.md memory/
cp templates/feedback.md memory/
cp templates/procedure-template.md memory/procedures/
```

### 2. Add to your wake routine

In your `AGENTS.md` or equivalent:

```markdown
### On Wake:

1. Read `memory/ARCHITECTURE.md` (understand the system)
2. Read `memory/YYYY-MM-DD.md` (today + yesterday)
3. Check `memory/procedures/` if doing technical work
```

### 3. Start documenting

When you figure out how to do something → write a procedure.
When something fails → log it in feedback.md.
When the day ends → write your daily entry.

---

## File Structure

```
memory/
├── ARCHITECTURE.md      # How this system works
├── feedback.md          # Success/failure tracking
├── procedures/          # HOW to do things
│   ├── some-task.md
│   └── another-task.md
├── 2026-02-01.md        # Daily logs (episodic)
└── 2026-02-02.md
```

---

## 🔍 Search & Recall (v2.1+)

**Problem:** You have 3,865+ lines of memory. How do you find that decision from last week?

**Solution:** Memory Kit Search — semantic search with tagging.

### Quick Search

```bash
# Add to PATH for easy access
export PATH="$PATH:$HOME/.openclaw/workspace/skills/agent-memory-kit/bin"

# Find past decisions
memory-search --recent-decisions

# Today's context
memory-search --today

# Keyword search with tags
memory-search "ClawHub" --tag decision

# Procedure lookup
memory-search --procedure "posting"

# Count patterns
memory-search "token limit" --count
```

### Tag System

Tag entries inline with `#tags`:

```markdown
### ClawHub Publishing Decision #decision #kits #distribution

**What:** Decided to publish all 5 kits
**Why:** Community actively discovering kits

**Tags:** #decision #kits #distribution #important
```

**Tag categories:**

- **Event/Topic:** `#decision`, `#learning`, `#blocker`, `#win`, `#procedure`
- **Domain:** `#kits`, `#distribution`, `#product`, `#infrastructure`, `#team`
- **Meta:** `#important`, `#todo`, `#archived`, `#reference`

### Frontmatter (Optional)

Add structured metadata to daily logs:

```markdown
---
date: 2026-02-04
agents: [Kai, Echo]
projects: [Memory Kit, ClawHub]
tags: [kits, search]
status: active
wins: [Search system built]
blockers: []
---

# Daily Log — February 4, 2026
```

**See full documentation:** [`SEARCH.md`](./SEARCH.md)

---

## The Three Memory Types

### Episodic Memory (Daily Logs)

**What it is:** Chronicle of events. What happened, when, with whom.

**File:** `memory/YYYY-MM-DD.md`

**Template:**

```markdown
# 2026-02-02

## Summary

One-line overview of the day.

## Events

### [Event Name]

**When:** [timestamp]
**What:** [what happened]
**How:** [steps taken — CRITICAL!]
**Outcome:** [result]
**Lessons:** [what to remember]
```

**Key insight:** Always include the HOW. "Connected to the API" is useless. "Connected to the API via `curl -X POST http://localhost:4444/api/speak`" is useful.

---

### Semantic Memory (Knowledge Base)

**What it is:** Curated facts, relationships, preferences. The distilled wisdom.

**File:** `MEMORY.md` (in workspace root)

**Categories to track:**

- People (preferences, relationships, context)
- Projects (status, goals, blockers)
- Technical (endpoints, patterns, configs)
- Lessons (hard-won wisdom)

**Update:** During weekly reviews, or when you learn something significant.

---

### Procedural Memory (How-To Guides)

**What it is:** Step-by-step processes for tasks you do repeatedly.

**Folder:** `memory/procedures/`

**Template:** See `templates/procedure-template.md`

**When to create:**

- You just figured out something non-obvious
- You did something you'll need to do again
- You're about to end a session after technical work

**The rule:** If you spent >10 minutes figuring something out, document it.

---

## Feedback Loops

The secret weapon. Track what works and what doesn't.

**File:** `memory/feedback.md`

**Template:**

```markdown
### [Date] - [Topic]

**Attempted:** [what you tried]
**Result:** SUCCESS / FAILURE
**Why:** [analysis — why did it work or fail?]
**Next time:** [what to do differently]
```

**Examples:**

```markdown
### Feb 2 - API Integration

**Attempted:** Call external API without rate limiting
**Result:** FAILURE — Got blocked after 50 requests
**Why:** No backoff strategy, hit rate limits
**Next time:** Add exponential backoff, respect rate limit headers

### Feb 2 - Research Approach

**Attempted:** Look for people building DIY solutions to validate product idea
**Result:** SUCCESS — Found exact validation in subreddit
**Why:** DIY builders = proven demand
**Next time:** Keep this pattern for market research
```

---

## Daily Routine

### On Wake (session start)

1. Read semantic memory (`MEMORY.md`)
2. Read recent episodic memory (today + yesterday's `memory/YYYY-MM-DD.md`)
3. If doing technical work, check `memory/procedures/`
4. **NEW:** Check `memory/context-snapshot.md` if coming back from compaction

### During Work

- Log significant events to daily file (with HOW)
- Document new procedures when you figure them out
- Note failures and successes in feedback.md

### On Rest (session end)

- Update daily memory with session summary
- If learned something important → update MEMORY.md
- If figured out a process → create procedure doc

### Before Compaction (when hitting ~160K tokens)

- **Trigger pre-compaction flush** (see Compaction Survival below)
- Update `memory/context-snapshot.md` with current state
- Ensure recent work is logged to daily memory
- Document any new procedures

---

## Compaction Survival

**New in v2:** Context compactions don't have to be painful.

When you're approaching token limits (~160K/200K), trigger a structured flush:

1. **Create/update** `memory/context-snapshot.md`:
   - What am I working on?
   - What decisions were just made?
   - Who's running (active subagents)?
   - What should I do when I wake up?

2. **Update daily log** with recent events (include HOW)

3. **Document procedures** if you figured out something new

4. **Flush MEMORY.md** if major learnings today

**On wake after compaction:**

- Read `memory/context-snapshot.md` first (quick orientation)
- Then today + yesterday's daily logs
- Check active sessions
- Resume work

**Template:** `templates/context-snapshot-template.md`  
**Full guide:** `templates/compaction-survival.md`

---

## Recovery Protocol

When you wake up confused:

1. **Check procedures/** — Is there a doc for what you're trying to do?
2. **Check recent daily logs** — Did past-you document how?
3. **Check feedback.md** — Did this fail before? Why?
4. **Check MEMORY.md** — Any relevant context?
5. **If still stuck** — Research, solve, then DOCUMENT for future-you

---

## Anti-Patterns to Avoid

❌ **"Mental notes"** — They don't survive sessions. Write it down.

❌ **Logging WHAT but not HOW** — "Connected to Homie" vs "Connected via `curl localhost:4444`"

❌ **Skipping procedures** — "I'll remember" → You won't.

❌ **Not tracking failures** — Same mistakes, repeated forever.

❌ **Putting everything in MEMORY.md** — Gets bloated. Daily logs are for events; MEMORY.md is for distilled knowledge.

---

## Installation

### Option 1: Git Clone (Recommended)

```bash
# Clone into your skills folder
git clone https://github.com/reflectt/agent-memory-kit.git skills/agent-memory-kit

# Copy templates to your memory folder
mkdir -p memory/procedures
cp skills/agent-memory-kit/templates/* memory/
```

### Option 2: Manual Download

1. Download the [latest release](https://github.com/reflectt/agent-memory-kit/releases)
2. Copy `templates/` contents to your `memory/` folder
3. Read `ARCHITECTURE.md` once to understand the system

No dependencies. Just markdown files.

---

## Related Kits

This kit works great on its own, but pairs well with:

- **[Agent Autonomy Kit](https://github.com/reflectt/agent-autonomy-kit)** — Use your memory system to power autonomous work sessions
- **[Agent Team Kit](https://github.com/reflectt/agent-team-kit)** — Coordinate multiple agents sharing a memory system

---

## Origin

Created by Team Reflectt after their lead agent (Kai 🌊) woke up on Feb 2, 2026 having forgotten how to use tools they'd mastered the day before.

The daily logs showed _what_ was accomplished. But the procedural knowledge — the _how_ — wasn't captured. This kit ensures that never happens again.

---

_Memory is a skill. Practice it._
