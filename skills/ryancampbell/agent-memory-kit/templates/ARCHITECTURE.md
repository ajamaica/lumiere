# Memory Architecture

_3-Layer Memory System_

---

## Layer 1: Working Memory

**Location:** Conversation context
**Purpose:** Immediate task focus
**Lifespan:** Single session

This is automatic. No action needed.

---

## Layer 2: Long-Term Memory

### 2a. Episodic Memory — WHAT happened

**Location:** `memory/YYYY-MM-DD.md`
**Purpose:** Record events, interactions, outcomes
**Update:** Daily, or when significant events occur

**Entry template:**

```markdown
### [Event Name]

**When:** [timestamp]
**What:** [what happened]
**How:** [steps taken — CRITICAL!]
**Outcome:** [result]
**Lessons:** [what to remember]
```

### 2b. Semantic Memory — WHAT I know

**Location:** `MEMORY.md` (workspace root)
**Purpose:** Curated facts, knowledge, relationships, preferences
**Update:** Weekly review, or when learning something important

**Categories:**

- People (context, preferences, relationships)
- Projects (status, goals, blockers)
- Technical (endpoints, patterns, configs)
- Lessons (distilled wisdom)

### 2c. Procedural Memory — HOW to do things

**Location:** `memory/procedures/`
**Purpose:** Step-by-step processes for repeated tasks
**Update:** Whenever you figure out how to do something

**When to document:**

- Non-obvious processes
- Things you'll need to repeat
- Technical integrations
- Recovery procedures

---

## Layer 3: Feedback Loops

**Location:** `memory/feedback.md`
**Purpose:** Track what works, what doesn't, improve over time

**Entry template:**

```markdown
### [Date] - [Topic]

**Attempted:** [what you tried]
**Result:** SUCCESS / FAILURE
**Why:** [analysis]
**Next time:** [what to do differently]
```

---

## Daily Routine

### On Wake (session start):

1. Read `MEMORY.md` (semantic)
2. Read `memory/YYYY-MM-DD.md` for today + yesterday (episodic)
3. Check `memory/procedures/` if doing technical work (procedural)
4. **If post-compaction:** Check `memory/context-snapshot.md` for quick re-orientation

### During Work:

- Log significant events to daily file (include HOW!)
- Document new procedures when figured out
- Note failures and successes in feedback.md
- **Monitor token usage** — flush before hitting limits

### On Rest (session end):

- Update daily memory with summary
- If learned something important → update MEMORY.md
- If figured out a process → create procedure doc

### Before Compaction (~160K tokens):

1. Update `memory/context-snapshot.md`:
   - Current focus
   - Active decisions
   - Running subagents
   - Next actions
2. Flush recent events to daily log
3. Document new procedures
4. Update MEMORY.md if needed

---

## Compaction Survival

Context compactions wipe conversation history. Survive them by:

**Pre-compaction flush:**

- Capture current state in `context-snapshot.md`
- Log recent events with HOW (daily file)
- Document new procedures immediately
- Update semantic memory if significant learnings

**Post-compaction wake:**

- Read `context-snapshot.md` first (fast re-orientation)
- Then today + yesterday's daily logs
- Check active sessions (`sessions_list`)
- Resume from "Next Actions" in snapshot

**Key insight:** Write it down before it's lost. You can't remember what's not in a file.

---

## Recovery Protocol

If confused about how to do something:

1. Check `memory/procedures/` for documented process
2. Check recent `memory/YYYY-MM-DD.md` for context
3. Check `MEMORY.md` for relevant knowledge
4. Check `memory/feedback.md` for past attempts
5. If still stuck → research, solve, then DOCUMENT

---

## The Golden Rule

**Always capture the HOW, not just the WHAT.**

"Connected to the API" = useless
"Connected via `POST http://localhost:4444/api/speak`" = useful

Future-you will thank present-you.
