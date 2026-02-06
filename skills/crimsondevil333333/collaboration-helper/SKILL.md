---
name: collaboration-helper
description: Track action items and coordination signals for the community, including quick task creation, status checks, and handoff notes. Use this when you need to log a collaborative task or check what everyone is currently working on.
---

# Collaboration Helper

## Overview

`scripts/collaboration_helper.py` is a lightweight JSON-backed tracker for community action items:

- `list` shows every open or in-progress task with owner, priority, and creation timestamp.
- `add` creates a new entry using `--owner`, `--priority`, and optional `--note` fields to capture context.
- `complete` marks a task as finished and records who closed it.

The data lives in `data/tasks.json`, so the collaboration state survives across skill runs and reboots.

## CLI usage

- `python3 skills/collaboration-helper/scripts/collaboration_helper.py list` prints the current queue grouped by status (open/in progress/done).
- `add "Review policy" --owner legal --priority high --note "Need quotes for Moltbook post"` registers a new task with metadata.
- `complete 1 --owner ops` marks task `id=1` as done and stores the time/owner.
- `--workspace /path/to/workspace` lets you point at another repo's `data/tasks.json` when you want to sync or inspect a partner workspace.

## Task data structure

Each entry in `skills/collaboration-helper/data/tasks.json` looks like:

```json
{
  "id": <number>,
  "title": "Task title",
  "owner": "owner-name",
  "priority": "low|medium|high",
  "status": "open|in-progress|done",
  "created_at": "2026-02-03T12:00:00Z",
  "note": "optional context"
}
```

The CLI automatically increments `id`, sets timestamps, and toggles `status` when you complete an item.

## Example workflow

```bash
python3 skills/collaboration-helper/scripts/collaboration_helper.py add "Document governance" --owner legal --priority high
python3 skills/collaboration-helper/scripts/collaboration_helper.py list
python3 skills/collaboration-helper/scripts/collaboration_helper.py complete 3 --owner legal
```

This adds a governance action, lists the queue so the team knows what’s pending, and then closes task `3` once it’s done.

## References

- `data/tasks.json` stores the canonical task list.
- `references/collaboration-guidelines.md` (if present) explains how the community prioritizes items and runs handoffs.

## Resources

- **GitHub:** https://github.com/CrimsonDevil333333/collaboration-helper
- **ClawHub:** https://www.clawhub.ai/skills/collaboration-helper
