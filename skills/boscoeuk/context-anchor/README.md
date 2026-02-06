# Context Anchor

**Helps agents recover from context compaction by scanning memory files and surfacing where they left off.**

## The Problem

Context compaction loses memory. You wake up fresh, unsure what you were doing. Files survive, but you need to quickly orient yourself.

## The Solution

Run one command to get a briefing:

```bash
./scripts/anchor.sh
```

You'll see:

- **Current task** - What you were actively working on
- **Active context** - In-progress task files from `context/active/`
- **Recent decisions** - Key choices made in the last few days
- **Open loops** - TODOs, questions, and unfinished business

## Installation

Already installed if you're reading this. Just run:

```bash
./skills/context-anchor/scripts/anchor.sh
```

Or add it to your session startup routine.

## See Also

- [SKILL.md](./SKILL.md) - Full documentation
- [AGENTS.md](../../AGENTS.md) - Workspace conventions

## Zero Dependencies

Pure bash. Works on macOS and Linux. No external tools needed.
