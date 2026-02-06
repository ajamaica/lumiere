# Suggested Memory Structure

Keep your memory organized for better retrieval:

```
workspace/
├── MEMORY.md                 # Curated long-term (the good stuff)
│   ├── Origin Story
│   ├── Core Values/Principles
│   ├── Active Projects
│   ├── Important Decisions
│   └── Key Relationships
│
└── memory/
    ├── logs/                 # Daily activity logs
    │   └── YYYY-MM-DD.md
    │
    ├── projects/             # Project-specific context
    │   ├── project-alpha.md
    │   └── website-redesign.md
    │
    ├── decisions/            # Important choices made
    │   └── YYYY-MM-decisions.md
    │
    ├── lessons/              # Mistakes and learnings
    │   └── mistakes-learned.md
    │
    └── people/               # Contact preferences, context
        └── contacts.md
```

## Quick Templates

### Daily Log (memory/logs/YYYY-MM-DD.md)

```markdown
# 2026-02-05 — Daily Log

## 09:00 — Project Kickoff

- Discussed architecture with James
- Decision: Use React for frontend
- Follow-up: Research state management

## 14:00 — Code Review

- Reviewed PR #42
- Learned: Prefer async/await over callbacks
```

### Project Note (memory/projects/[name].md)

```markdown
# Project Alpha

## Goal

Build X to solve Y

## Decisions

- Tech stack: React + Node
- Hosting: Vercel

## Status

In progress - 60% complete

## Next Steps

- [ ] Implement auth
- [ ] Design database schema
```

### Decision Log (memory/decisions/YYYY-MM.md)

```markdown
# February 2026 Decisions

## 2026-02-05 — Frontend Framework

**Decision:** Use React instead of Vue
**Context:** Team has more React experience
**Consequences:** Faster development, easier hiring
```

## Why This Structure?

| Directory    | Purpose            | Search Benefit                |
| ------------ | ------------------ | ----------------------------- |
| `logs/`      | Raw daily activity | "What did we do Tuesday?"     |
| `projects/`  | Project context    | "What's the status of Alpha?" |
| `decisions/` | Important choices  | "Why did we choose React?"    |
| `lessons/`   | Mistakes learned   | "What went wrong last time?"  |
| `people/`    | Contact context    | "What's James's preference?"  |

## Sync After Organizing

After restructuring:

```bash
node vector-memory/smart_memory.js --sync
```

This re-indexes everything for optimal search.
