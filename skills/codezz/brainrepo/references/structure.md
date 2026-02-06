# BrainRepo Structure Guide

Detailed breakdown of every folder and when to use it.

## Directory Tree

```
brainrepo/
│
├── Inbox/                          # Temporary capture zone
│   └── *.md                        # Unprocessed notes (clear daily)
│
├── Projects/                       # Active work with deadlines
│   └── <project-name>/
│       ├── index.md               # Project overview & status
│       ├── meetings/              # Meeting notes
│       └── *.md                   # Project-specific notes
│
├── Areas/                          # Ongoing responsibilities
│   ├── personal-growth/
│   │   ├── index.md              # Overview, current goals
│   │   ├── health.md             # Fitness, nutrition, medical
│   │   ├── habits.md             # Habit tracking
│   │   ├── learning.md           # Courses, books, skills
│   │   └── career.md             # Career goals, development
│   ├── family/
│   │   ├── index.md              # Overview
│   │   ├── important-dates.md    # Birthdays, anniversaries
│   │   └── traditions.md         # Family rituals
│   └── <area-name>/
│       └── *.md
│
├── Notes/                          # Atomic knowledge (Zettelkasten)
│   └── <note-name>.md             # One idea per note
│
├── Resources/                      # External references
│   ├── articles/                  # Saved articles
│   ├── books/                     # Book notes
│   ├── tools/                     # Tool documentation
│   └── *.md                       # General resources
│
├── Journal/                        # Daily notes
│   └── YYYY-MM-DD.md              # One file per day
│
├── People/                         # Relationship tracking
│   └── <firstname-lastname>.md    # One file per person
│
├── Tasks/                          # Task management
│   └── index.md                   # All tasks, linked to projects
│
└── Archive/                        # Completed/inactive items
    ├── projects/                  # Archived projects
    └── areas/                     # Archived areas
```

## Folder Details

### Inbox/

**Purpose:** Quick capture without friction. Brain dump zone.

**Rules:**

- Anything goes here first
- No organization required
- Clear DAILY during evening processing
- If something sits >3 days, either process or delete

**Example files:**

- `random-thought-2026-02-04.md`
- `meeting-note-quick.md`
- `idea-for-later.md`

---

### Projects/

**Purpose:** Active work with specific outcomes and deadlines.

**Rules:**

- Each project gets its own folder
- Must have an `index.md` with overview
- Move to Archive/ when complete
- Link to relevant People/ and Notes/

**When to create a project:**

- Has a clear deliverable
- Has a deadline (even if fuzzy)
- Requires multiple actions
- Will eventually be "done"

**Example structure:**

```
Projects/
├── website-redesign/
│   ├── index.md          # Goals, status, timeline
│   ├── requirements.md   # Specs
│   └── meetings/
│       └── 2026-02-04.md
└── book-writing/
    ├── index.md
    ├── outline.md
    └── chapters/
```

---

### Areas/

**Purpose:** Ongoing responsibilities without deadlines.

**Rules:**

- Maintained forever, never "complete"
- Standards to uphold, not goals to achieve
- Review monthly for neglected areas
- Keep minimal — don't over-create

**Core Areas (recommended):**

- `personal-growth/` — health, learning, habits, career
- `family/` — relationships, important dates

**When to create an area:**

- Ongoing responsibility
- No end date
- Regular attention needed
- Not a project (no deliverable)

---

### Notes/

**Purpose:** Permanent atomic knowledge. Zettelkasten-style.

**Rules:**

- One idea per note
- Heavily linked with `[[wikilinks]]`
- Evergreen — update as knowledge grows
- Not project-specific (that goes in Projects/)

**Good for:**

- Concepts and mental models
- Lessons learned
- Frameworks and methodologies
- Insights that apply broadly

**Example notes:**

- `compound-interest.md`
- `negotiation-tactics.md`
- `startup-lessons.md`
- `writing-tips.md`

---

### Resources/

**Purpose:** External content worth saving.

**Rules:**

- Always include source URL
- Add why it's valuable
- Summarize key points
- Can be organized in subfolders

**Subfolders:**

- `articles/` — saved articles
- `books/` — book notes & highlights
- `tools/` — software & tool docs
- `courses/` — course notes

---

### Journal/

**Purpose:** Daily chronological record.

**Rules:**

- One file per day: `YYYY-MM-DD.md`
- Created during evening processing
- Links to what was captured/processed
- Personal reflections optional

**Template:**

```markdown
---
created: YYYY-MM-DD
tags: [journal]
---

# YYYY-MM-DD

## Captured Today

- [[Inbox/idea-x]] → moved to [[Notes/concept]]
- New person: [[People/john-doe]]

## Progress

- [[Projects/website/index|Website]]: Finished homepage

## Reflections

Optional thoughts about the day.
```

---

### People/

**Purpose:** Track relationships and interactions.

**Rules:**

- One file per person: `firstname-lastname.md`
- Record how you met, context
- Log significant interactions
- Link to shared projects

**Template:**

```markdown
---
created: YYYY-MM-DD
tags: [person, colleague]
related: ['[[Projects/acme/index|ACME]]']
---

# John Doe

Brief description of who they are.

## Relationship

- **Met:** Where/when
- **Role:** What they do
- **Context:** How you know them

## Interaction Log

### YYYY-MM-DD

- Topic discussed
- Follow-up needed
```

---

### Tasks/

**Purpose:** Centralized task tracking.

**Rules:**

- Main file: `index.md`
- Tasks linked to projects where relevant
- Use `- [ ]` checkbox format
- Review weekly

**Format:**

```markdown
# Tasks

## Inbox (Unsorted)

- [ ] Random task

## By Project

### [[Projects/website/index|Website]]

- [ ] Design homepage
- [x] Set up hosting

## Waiting For

- [ ] Response from John about X
```

---

### Archive/

**Purpose:** Completed or inactive items.

**Rules:**

- Move completed projects here
- Maintains history without clutter
- Can search when needed
- Subfolders mirror active structure

## Decision Tree

```
New information arrives
│
├─ Is it about an active project?
│  YES → Projects/<project>/
│
├─ Is it about a person?
│  YES → People/<person>.md
│
├─ Is it about personal growth (health, habits, learning, career)?
│  YES → Areas/personal-growth/
│
├─ Is it about family?
│  YES → Areas/family/
│
├─ Is it a task/todo?
│  YES → Tasks/index.md (+ project link if relevant)
│
├─ Is it external content (article, link)?
│  YES → Resources/
│
├─ Is it reusable knowledge (concept, lesson)?
│  YES → Notes/
│
├─ Is it a daily reflection?
│  YES → Journal/YYYY-MM-DD.md
│
└─ Not sure?
   → Inbox/ (process later)
```
