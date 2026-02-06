# BrainRepo Workflows

Step-by-step guides for common operations.

## Daily Workflow

### Morning Start (Optional, 2 min)

1. Open `Tasks/index.md`
2. Review today's priorities
3. Check yesterday's `Journal/` for context

### During the Day

**Rule: Don't organize, just capture.**

When something comes up:

1. Create note in `Inbox/` or tell AI: "Save this: [content]"
2. Don't think about where it goes
3. Move on with your day

### Evening Processing (5-10 min)

**Goal: Empty Inbox/, update Journal/**

```
For each item in Inbox/:
│
├─ Is it actionable?
│  ├─ YES, for a project → Move to Projects/<project>/
│  ├─ YES, standalone task → Add to Tasks/index.md
│  └─ NO → Continue below
│
├─ Is it reference material?
│  ├─ About a person → Move to People/
│  ├─ External content → Move to Resources/
│  ├─ Reusable knowledge → Move to Notes/
│  └─ Area-related → Move to Areas/<area>/
│
├─ Is it worth keeping?
│  ├─ YES → Move to appropriate location
│  └─ NO → Delete it
│
└─ Still not sure?
   → Leave in Inbox/ for tomorrow (max 3 days)
```

After processing:

1. Create/update `Journal/YYYY-MM-DD.md`
2. Commit: `git add -A && git commit -m "daily: $(date +%Y-%m-%d)"`
3. Push: `git push`

---

## Weekly Review (Sunday, 15-20 min)

### 1. Get Clear (5 min)

- [ ] Process all remaining Inbox items
- [ ] Review Tasks/index.md — update statuses
- [ ] Check calendar for upcoming commitments

### 2. Get Current (5 min)

**Projects:**

- [ ] Review each project in Projects/
- [ ] Update status in each index.md
- [ ] Archive completed projects

**Areas:**

- [ ] Scan Areas/ — anything neglected?
- [ ] Any area needs more attention this week?

### 3. Get Creative (5 min)

- [ ] Review Notes/ — any new connections?
- [ ] Any ideas for new projects?
- [ ] Update priorities for next week

### 4. Commit

```bash
git add -A
git commit -m "weekly review: $(date +%Y-%m-%d)"
git push
```

---

## Monthly Review (1st of month, 30 min)

### Review

- [ ] Read through last month's Journal/ entries
- [ ] Celebrate wins
- [ ] Note lessons learned

### Maintain

- [ ] Archive stale projects (no activity >30 days)
- [ ] Review People/ — anyone to follow up with?
- [ ] Clean up Resources/ — still relevant?

### Plan

- [ ] Set 1-3 focus areas for the month
- [ ] Create new projects if needed
- [ ] Update Areas/ goals

---

## Capture Workflows

### Quick Thought Capture

```
You: "Save this: [thought]"
AI: Creates Inbox/thought-YYYY-MM-DD-HHMM.md
```

### New Project

```
You: "New project: [name]"
AI:
  1. Creates Projects/<name>/
  2. Creates Projects/<name>/index.md with template
  3. Optionally links to People/ and Notes/
```

**Project index.md template:**

```markdown
---
created: YYYY-MM-DD
status: active
deadline: YYYY-MM-DD
tags: [project]
related: []
---

# Project Name

## Overview

What this project is about.

## Goals

- [ ] Goal 1
- [ ] Goal 2

## Status

Current status and next actions.

## Log

### YYYY-MM-DD

- Created project
```

### New Person

```
You: "Add person: [name], [context]"
AI:
  1. Creates People/<name>.md
  2. Fills template with context
  3. Links to relevant projects
```

### Save Link/Article

```
You: "Save this link: [URL] - [why it's useful]"
AI:
  1. Creates Resources/articles/<title>.md
  2. Includes URL, summary, and your note
```

---

## Search & Retrieval

### Find by Topic

```
You: "What do I know about [topic]?"
AI:
  1. Searches Notes/, Projects/, Resources/
  2. Returns relevant excerpts
  3. Shows connections
```

### Find by Person

```
You: "What's my history with [person]?"
AI:
  1. Reads People/<person>.md
  2. Finds mentions in Journal/, Projects/
  3. Summarizes relationship
```

### Find by Date Range

```
You: "What did I capture last week?"
AI:
  1. Reads Journal/ for date range
  2. Lists items processed
  3. Summarizes activity
```

---

## Git Workflows

### Daily Commit

```bash
git add -A
git commit -m "daily: $(date +%Y-%m-%d)"
git push
```

### After Specific Changes

```bash
# New project
git commit -m "add: project [name]"

# New person
git commit -m "add: person [name]"

# Processing
git commit -m "process: inbox"

# Review
git commit -m "review: weekly"
```

### Sync Across Devices

```bash
# Before starting work
git pull

# After finishing work
git add -A && git commit -m "sync" && git push
```

---

## Linking Best Practices

### Within Notes

```markdown
This relates to [[Notes/concept-name]].
See also [[Notes/another-concept]].
```

### To People

```markdown
Discussed with [[People/john-doe]].
Team: [[People/jane-smith]], [[People/bob-wilson]]
```

### To Projects

```markdown
Part of [[Projects/website/index|Website Redesign]].
Backlog for [[Projects/mobile-app/index|Mobile App]].
```

### In Journal

```markdown
## Today's Progress

- [[Projects/website/index|Website]]: Finished header
- Met with [[People/john-doe]] about launch
- New insight: [[Notes/user-onboarding]]
```

---

## Maintenance Workflows

### Archive a Project

1. Move `Projects/<name>/` to `Archive/projects/<name>/`
2. Update any links pointing to it
3. Commit: `git commit -m "archive: project [name]"`

### Merge Duplicate Notes

1. Identify duplicates in Notes/
2. Combine content into one note
3. Update links to point to merged note
4. Delete duplicate
5. Commit

### Clean Stale Resources

1. Review Resources/ quarterly
2. Delete irrelevant items
3. Update or archive outdated content
4. Commit: `git commit -m "cleanup: resources"`
