# Agent Memory Kit

**Type:** Practice / Framework
**Dependencies:** None (markdown only)

---

## Description

A structured memory system for AI agents. Prevents the "forgot how to do things" problem by separating memory into episodic (what happened), semantic (what I know), and procedural (how to do things) layers.

## Installation

```bash
# Create memory folder structure
mkdir -p memory/procedures

# Copy templates
cp templates/ARCHITECTURE.md memory/
cp templates/feedback.md memory/
cp templates/procedure-template.md memory/procedures/
```

## Usage

1. Read `README.md` to understand the system
2. Add memory loading to your wake routine (AGENTS.md)
3. Use templates when logging events, creating procedures, tracking feedback

## Files

| File                                     | Purpose                                  |
| ---------------------------------------- | ---------------------------------------- |
| `README.md`                              | Full documentation                       |
| `templates/ARCHITECTURE.md`              | Memory system overview (copy to memory/) |
| `templates/feedback.md`                  | Success/failure tracking template        |
| `templates/procedure-template.md`        | How-to document template                 |
| `templates/daily-template.md`            | Daily log template                       |
| `templates/compaction-survival.md`       | **NEW:** Pre-compaction flush guide      |
| `templates/context-snapshot-template.md` | **NEW:** Quick context save template     |
| `helpers/check-compaction.sh`            | **NEW:** Token limit checker             |

## Key Concepts

- **Episodic memory:** Daily logs of WHAT happened
- **Semantic memory:** Curated knowledge (MEMORY.md)
- **Procedural memory:** HOW to do things
- **Feedback loops:** Learn from success/failure

## The Rule

Always capture the **HOW**, not just the WHAT. Future-you needs the steps.
