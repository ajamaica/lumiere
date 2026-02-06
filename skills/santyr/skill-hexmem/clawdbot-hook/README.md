# HexMem Clawdbot Hook

This directory contains the Clawdbot hook for HexMem integration.

## Installation

Copy the hook to your Clawdbot hooks directory:

```bash
# Option 1: Workspace hooks (per-agent)
cp -r clawdbot-hook ~/clawd/hooks/hexmem-sync

# Option 2: Managed hooks (shared)
cp -r clawdbot-hook ~/.clawdbot/hooks/hexmem-sync
```

Enable the hook:

```bash
clawdbot hooks enable hexmem-sync
```

## What It Does

### On `/new` (new session)

- Logs session start event to HexMem

### On `/reset` or `/stop` (session end)

- Reads the session transcript
- Extracts observations (preferences, decisions)
- Logs session summary to HexMem events
- Queues events for embedding

## Extracted Patterns

**Preferences** (from user messages):

- "I prefer..."
- "I like..."
- "I always..."
- "I never..."
- "I want..."

**Decisions** (from assistant responses):

- "I'll..."
- "Let's..."
- "We should..."

## Requirements

- HexMem database at `~/clawd/hexmem/hexmem.db`
- `sqlite3` command available

## Events

The hook listens for:

- `command:new`
- `command:reset`
- `command:stop`

## Notes

- Observations are queued in `embedding_queue` but not embedded automatically
- Run `python embed.py --process-queue` to generate embeddings
- The hook runs synchronously; keep processing light
