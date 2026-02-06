---
name: brainrepo
description: >
  Your personal knowledge repository — capture, organize, and retrieve everything using PARA + Zettelkasten.
  Triggers on: "save this", "remember", "note", "capture", "brain dump", daily/weekly
  reviews, searching stored knowledge, managing projects/areas/people. Works with any AI agent that reads
  markdown. Stores everything as .md files in a Git repo for Obsidian, VS Code, or any editor.
---

# BrainRepo

Your personal knowledge repository. Capture fast, organize automatically, retrieve instantly.

## Brain Location

**Fixed path:** `~/Documents/brainrepo/`

This is not configurable. All brain data lives here.

## First Run Check

**Before any action**, check if brainrepo is initialized:

1. Check if `~/Documents/brainrepo/` exists with expected structure (Inbox/, Projects/, Areas/)
2. If NOT found → **Run onboarding automatically**
3. If found → Proceed with user request

## Onboarding

Triggers automatically on first interaction, or when user says "set up brainrepo":

1. Create brain at `~/Documents/brainrepo/`
2. Create the folder structure:

```bash
mkdir -p <path>/{Inbox,Projects,Areas/personal-growth,Areas/family,Notes,Resources,Journal,People,Tasks,Archive}
```

3. Create initial files from templates in `assets/templates/`:
   - `Tasks/index.md` — task hub
   - `Areas/personal-growth/index.md` — personal growth area
   - `Areas/family/index.md` — family area

4. Initialize git (optional):

```bash
cd <path> && git init && git add -A && git commit -m "init: brainrepo"
```

5. Confirm setup and show quick start commands

## Core Concept

**DUMP → PROCESS → RETRIEVE**

1. **Dump** — Capture everything to Inbox/ (don't organize yet)
2. **Process** — Evening review: Inbox → permanent home
3. **Retrieve** — Ask AI to find anything

## Repository Structure

```
brainrepo/
├── Inbox/          # Quick capture (clear daily)
├── Projects/       # Active work with deadlines
├── Areas/          # Ongoing responsibilities (no deadline)
├── Notes/          # Permanent atomic knowledge
├── Resources/      # External links, articles, references
├── Journal/        # Daily notes (YYYY-MM-DD.md)
├── People/         # One note per person
├── Tasks/          # Centralized task tracking
└── Archive/        # Completed projects
```

See [references/structure.md](references/structure.md) for detailed breakdown.

## Capture Rules

### What to Capture (Immediately)

| Type            | Destination              | Example                  |
| --------------- | ------------------------ | ------------------------ |
| Quick thought   | `Inbox/`                 | "Maybe we should..."     |
| Decision made   | `Inbox/` or `Notes/`     | "Decided to use Next.js" |
| Person info     | `People/`                | New contact or update    |
| Project update  | `Projects/<name>/`       | Meeting notes, progress  |
| Task/Todo       | `Tasks/index.md`         | "Need to finish X"       |
| Link/Article    | `Resources/` or `Inbox/` | URL with context         |
| Personal growth | `Areas/personal-growth/` | Health, habits, learning |
| Family info     | `Areas/family/`          | Important dates, notes   |

### What NOT to Capture

- Casual chat without information value
- Temporary queries ("what time is it")
- Information easily searchable online

## Note Format

Every note uses minimal frontmatter:

```markdown
---
created: YYYY-MM-DD
tags: [tag1, tag2]
related: ['[[Other Note]]']
---

# Title

Content here. Link to [[Related Notes]] freely.
```

Use templates from `assets/templates/` when creating new notes.

## Daily Workflow

### During Day

- Dump everything to `Inbox/`
- Don't organize — just capture

### Evening (5-10 min)

Process Inbox/:

1. Each item → permanent home or delete
2. Update `Journal/YYYY-MM-DD.md` with summary
3. `git commit -am "daily processing"`

## Weekly Review (Sunday, 15 min)

1. Review all Projects/ — still active?
2. Check Areas/ — anything neglected?
3. Move completed projects to Archive/
4. Update `Tasks/index.md`

See [references/workflows.md](references/workflows.md) for detailed workflows.

## Commands

| User says                 | Action                              |
| ------------------------- | ----------------------------------- |
| "Set up brainrepo"        | Run onboarding, create structure    |
| "Save this: [text]"       | Capture to Inbox/                   |
| "New project: [name]"     | Create Projects/name/ with template |
| "Add person: [name]"      | Create People/name.md with template |
| "What do I know about X?" | Search & retrieve                   |
| "Daily review"            | Process Inbox/, update Journal/     |
| "Weekly review"           | Full system review                  |

## Linking

Use `[[wiki-links]]` to connect notes:

```markdown
Met with [[People/john]] about [[Projects/acme/index|ACME Project]].
Relevant insight: [[Notes/negotiation-tactics]]
```

## Projects vs Areas

| Projects         | Areas              |
| ---------------- | ------------------ |
| Have deadlines   | No end date        |
| Can be "done"    | Maintained forever |
| Specific outcome | Standard to uphold |

## File Naming

- Folders: `kebab-case/`
- Files: `kebab-case.md`
- Dates: `YYYY-MM-DD.md`
- People: `firstname-lastname.md`

## References

- [Structure Guide](references/structure.md) — Detailed folder breakdown
- [Workflows](references/workflows.md) — Daily/weekly/monthly workflows
- [Templates](assets/templates/) — Note templates
