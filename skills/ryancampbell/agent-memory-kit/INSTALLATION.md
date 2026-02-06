# Installation Guide

**Get the Memory Kit running in 5 minutes.**

---

## 1. Copy Templates

```bash
# Create memory folder structure
mkdir -p memory/procedures

# Copy all templates
cp skills/agent-memory-kit/templates/ARCHITECTURE.md memory/
cp skills/agent-memory-kit/templates/feedback.md memory/
cp skills/agent-memory-kit/templates/procedure-template.md memory/procedures/_TEMPLATE.md
cp skills/agent-memory-kit/templates/context-snapshot-template.md memory/context-snapshot.md

# Optional: Daily template for reference
cp skills/agent-memory-kit/templates/daily-template.md memory/
```

---

## 2. Integrate with Wake Routine

Add to your `AGENTS.md` (or equivalent):

```markdown
## Every Session

Before doing anything else:

1. Read `SOUL.md` — this is who you are
2. Read `USER.md` — this is who you're helping
3. Read `memory/YYYY-MM-DD.md` (today + yesterday) for recent context
4. **If in MAIN SESSION**: Also read `MEMORY.md`
5. **If post-compaction**: Read `memory/context-snapshot.md` for quick re-orientation
```

---

## 3. Add Compaction Checks

### Option A: Heartbeat Integration

Add to your `HEARTBEAT.md`:

```markdown
### Token Limit Check (every 3-4 heartbeats)

- [ ] Check token usage via /status
- [ ] If >160K tokens: Trigger pre-compaction flush
  - Update memory/context-snapshot.md
  - Log recent events to daily memory
  - Document any new procedures
```

### Option B: Manual Check

Run periodically:

```bash
bash skills/agent-memory-kit/helpers/check-compaction.sh
```

---

## 4. Create Your First Daily Log

```bash
# Create today's log
DATE=$(date +%Y-%m-%d)
touch memory/$DATE.md

# Add header
cat > memory/$DATE.md << 'EOF'
# [DATE]

## Summary
[One-line overview will go here at end of day]

## Events

### [First Event]
**When:** [timestamp]
**What:** [what happened]
**How:** [steps taken — CRITICAL!]
**Outcome:** [result]
**Lessons:** [what to remember]
EOF
```

---

## 5. Test the System

### Quick Test Checklist

- [ ] Create a procedure: Copy `memory/procedures/_TEMPLATE.md` and document something
- [ ] Log an event: Add to today's daily log (include HOW)
- [ ] Track feedback: Add an entry to `memory/feedback.md`
- [ ] Update snapshot: Fill in `memory/context-snapshot.md` with current focus

### Wake Routine Test

1. Close this session
2. Start a new session
3. Read memory files as per wake routine
4. Time how long it takes to get re-oriented

**Goal:** <2 minutes to full context.

---

## 6. Establish Habits

### Daily

- [ ] Log significant events (with HOW)
- [ ] Update context snapshot when focus changes

### Weekly

- [ ] Review daily logs
- [ ] Update MEMORY.md with distilled learnings
- [ ] Archive or clean up old snapshots

### Before Compaction

- [ ] Full pre-compaction flush (see `templates/compaction-survival.md`)

---

## Troubleshooting

**"I wake up confused after compaction"**
→ Your pre-compaction flush needs work. Make sure `context-snapshot.md` has clear "Next Actions".

**"Daily logs are too verbose"**
→ Focus on events with decisions or learnings. Skip routine stuff.

**"Procedures folder is empty"**
→ Start documenting! Next time you figure out how to do something, write it down.

**"MEMORY.md is getting huge"**
→ Good problem. Archive old sections to `memory/archive/MEMORY-[year].md`.

---

## What to Read Daily

**Essential (every wake):**

- Today + yesterday's daily logs (`memory/YYYY-MM-DD.md`)
- Context snapshot (`memory/context-snapshot.md`) if post-compaction

**Main session only:**

- MEMORY.md (long-term curated memory)

**As needed:**

- Procedures (only the ones you're actively using)
- ARCHITECTURE.md (reference, not daily)

**Don't over-read.** The system should save time, not create busywork.

---

## Next Steps

1. **Use it for a week** — Build the habit
2. **Tune it** — Adjust templates to fit your workflow
3. **Share learnings** — Contribute improvements back to the kit

---

_Installation takes 5 minutes. The habit takes a week. The payoff is permanent._
