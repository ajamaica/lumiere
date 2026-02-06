---
name: xmtp-cli-list
description: List conversations, members, and messages from the XMTP CLI. Use when listing or finding conversations.
license: MIT
metadata:
  author: xmtp
  version: '1.0.0'
---

# CLI list

List conversations, members, and messages, or find a conversation by address or inbox ID.

## When to apply

- Listing conversations, members of a conversation, or messages
- Finding a conversation by address or inbox ID

## Rules

- `conversations-members-messages` – `list conversations` / `members` / `messages` and options
- `find` – `list find` by address or inbox-id

## Quick start

```bash
xmtp list conversations
xmtp list members --conversation-id <id>
xmtp list messages --conversation-id <id>
xmtp list find --address 0x1234...
```

Read `rules/conversations-members-messages.md` and `rules/find.md` for details.
