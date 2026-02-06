# Compaction Survival Guide

**Purpose:** Make context compactions less painful by preserving what matters.

---

## The Problem

Every compaction = context loss. You wake up disoriented, have to re-read files, lose track of active work. The conversation history is gone, and with it:

- What you were working on
- Recent decisions made
- Active subagents and their tasks
- Ephemeral context not yet written down

---

## The Solution: Pre-Compaction Flush

When you hit ~160K tokens (80% of 200K limit), trigger a structured flush.

### 1. Capture Active Context

Create or update `memory/context-snapshot.md`:

```markdown
# Context Snapshot

_Last updated: [timestamp]_

## Current Focus

[What am I working on right now?]

## Active Decisions

[Recent decisions that haven't been documented elsewhere]

## Active Subagents

[Who's running? What are they working on?]

- label: task description (spawned at [time])

## Next Actions

[What should I do when I wake up?]

1. [First thing]
2. [Second thing]

## Recent Wins

[What just shipped? Keep morale high across compactions]

## Blockers

[What's stuck? What needs escalation?]

## Notes to Future-Me

[Anything else that will be confusing if forgotten]
```

### 2. Update Daily Log

Ensure today's `memory/YYYY-MM-DD.md` has:

- Recent events logged (with HOW, not just WHAT)
- Any new learnings captured
- Active work documented

### 3. Update Procedures (If Needed)

Did you figure out something new? Document it now:

```bash
# If you solved something non-obvious
echo "## New Thing I Learned" >> memory/procedures/relevant-doc.md
```

### 4. Flush MEMORY.md (If Significant)

If today had major learnings, update MEMORY.md with distilled insights.

### 5. Save Queue State

Check `tasks/QUEUE.md` and `memory/queue-state.json` are in sync.

---

## Automatic Detection

Add to your heartbeat check (`HEARTBEAT.md`):

```markdown
### Token Limit Check

- [ ] Check context usage via status
- [ ] If >160K tokens: Trigger pre-compaction flush
```

Or add to daily wake routine:

```markdown
### On Wake:

1. Check token count
2. If >160K: Plan to flush soon
```

---

## Post-Compaction Wake Routine

When you wake up after a compaction:

### Quick Start Checklist

1. **Read context snapshot** — `memory/context-snapshot.md` (if exists)
2. **Read recent memory** — Today + yesterday's daily logs
3. **Check active sessions** — `sessions_list` to see who's still running
4. **Review queue** — `tasks/QUEUE.md` for current priorities
5. **Check heartbeat state** — `memory/heartbeat-state.json` for recent activity

### Don't Re-Read Everything

You don't need to re-read:

- ❌ MEMORY.md (unless >3 days since last read)
- ❌ All procedures (only the ones you're actively using)
- ❌ Old daily logs (unless debugging something)

**Focus on recency:** context-snapshot.md + today + yesterday = enough to get oriented.

---

## Reduce What Needs Re-Reading

### Keep Context Lean

- Don't load MEMORY.md on every wake if it's not needed
- Procedures are reference docs, not startup files
- Only read what's relevant to current work

### Write More, Read Less

- Good daily logs = less need to re-read conversation history
- Procedures capture HOW once = don't need to re-figure-out
- Context snapshot = targeted refresh, not full memory reload

---

## The Pre-Compaction Checklist

Copy this when approaching limits:

```markdown
## Pre-Compaction Flush

- [ ] Update `memory/context-snapshot.md` with current focus
- [ ] Log recent events to `memory/YYYY-MM-DD.md`
- [ ] Document any new HOWs (procedures)
- [ ] Check `sessions_list` — note active subagents
- [ ] Sync queue state if needed
- [ ] Update MEMORY.md if major learnings today
- [ ] Mark this flush in daily log: "Pre-compaction flush #N at [time]"
```

---

## Integration with Memory Kit

This guide extends the Memory Kit with compaction-specific patterns:

- **Episodic memory** (daily logs) — capture events before they're lost
- **Semantic memory** (MEMORY.md) — flush insights before compaction
- **Procedural memory** (procedures/) — document HOWs immediately
- **Context snapshot** (NEW) — targeted pre-compaction state capture

---

## Tips

**1. Flush early, flush often**
Don't wait until 195K tokens. Flush at 160K and have breathing room.

**2. Context snapshot is cheap**
It's a single file. Update it whenever you make a big decision or start new work.

**3. Track your flushes**
In daily logs, note: "Pre-compaction flush #N at [time]" — helps you track frequency.

**4. Test your wake routine**
After compaction, time how long it takes to get re-oriented. If >5 min, your flush needs work.

**5. Automate the reminder**
Add token checks to heartbeat or wake routine so you never forget.

---

_Compactions are inevitable. Make them survivable._
