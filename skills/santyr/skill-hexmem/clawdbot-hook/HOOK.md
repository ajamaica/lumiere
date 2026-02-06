---
name: hexmem-sync
description: 'Syncs session context with HexMem - injects relevant memories on start, extracts observations on end'
metadata:
  {
    'clawdbot':
      {
        'emoji': '🧠',
        'events': ['command:new', 'command:reset', 'command:stop'],
        'requires': { 'bins': ['python3'] },
      },
  }
---

# HexMem Sync Hook

Integrates Clawdbot sessions with HexMem structured memory.

## What It Does

### On Session Start (`command:new`)

- Searches HexMem for memories relevant to the new session context
- Could inject relevant context into the session (future)

### On Session End (`command:reset`, `command:stop`)

- Parses the session transcript for extractable observations
- Queues observations for embedding in HexMem
- Logs session summary as an event

## Requirements

- Python 3 with HexMem dependencies installed
- HexMem database at `~/clawd/hexmem/hexmem.db`
- HexMem venv at `~/clawd/hexmem/.venv`

## Configuration

Set `HEXMEM_DB` environment variable to override database location.

## Extracted Patterns

The hook looks for:

- **Preferences**: "I prefer...", "I like...", "I always...", "I never..."
- **Decisions**: "I'll...", "Let's...", "We should..."
- **Learnings**: Tool outputs, error resolutions
- **Facts**: Explicit statements about entities

## Notes

This hook saves observations to the embedding queue, which must be processed
separately with `python embed.py --process-queue`.
