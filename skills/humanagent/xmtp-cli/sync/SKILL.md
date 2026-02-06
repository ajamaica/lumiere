---
name: xmtp-cli-sync
description: Sync conversations and messages with the XMTP CLI. Use when syncing conversations or syncing all.
license: MIT
metadata:
  author: xmtp
  version: '1.0.0'
---

# CLI sync

Sync conversations and groups, or sync all conversations and messages.

## When to apply

- Syncing conversations (incremental)
- Syncing all conversations and messages (full sync)

## Rules

- `sync-syncall` – `sync` and `syncall` commands

## Quick start

```bash
# Sync conversations
xmtp sync

# Sync all conversations and messages
xmtp syncall
```

Read `rules/sync-syncall.md` for details.
