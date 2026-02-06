---
title: List conversations, members, and messages
impact: HIGH
tags: list, conversations, members, messages
---

## List conversations, members, and messages

**List conversations (default):**

```bash
xmtp list conversations
xmtp list conversations --limit 20 --offset 0
```

**List members of a conversation:**

```bash
xmtp list members --conversation-id <id>
```

**List messages in a conversation:**

```bash
xmtp list messages --conversation-id <id>
xmtp list messages --conversation-id <id> --limit 50 --offset 0
```

**Options:**

- `--conversation-id <id>` – Conversation ID (required for `members` and `messages`)
- `--limit <count>` – Maximum results (default: 50)
- `--offset <count>` – Pagination offset (default: 0)

**Operations:** `conversations` (default), `members`, `messages`, `find`
