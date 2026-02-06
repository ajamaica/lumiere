---
title: Send messages
impact: HIGH
tags: send, message, target, group, wait
---

## Send messages

Send a message to a wallet address or to a group.

**Send to address:**

```bash
xmtp send --target 0x1234... --message "Hello!"
xmtp send -t 0x1234... -m "Hello!"
```

**Send to group:**

```bash
xmtp send --group-id <group-id> --message "Welcome!"
```

**Send and wait for response:**

```bash
xmtp send --target 0x1234... --message "Hello!" --wait
xmtp send --target 0x1234... --message "Hello!" --wait --timeout 60000
```

**Options:**

- `--target <address>` / `-t` – Target wallet address
- `--group-id <id>` – Group ID (use instead of target for group)
- `--message <text>` / `-m` – Message text (default: "hello world")
- `--wait` – Wait for a response after sending (default: false)
- `--timeout <ms>` – Timeout in ms when waiting for response (default: 30000)
