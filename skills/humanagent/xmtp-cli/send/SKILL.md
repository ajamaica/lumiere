---
name: xmtp-cli-send
description: Send messages to an address or group from the XMTP CLI. Use when sending a message or waiting for a response.
license: MIT
metadata:
  author: xmtp
  version: '1.0.0'
---

# CLI send

Send messages to a wallet address or group from the command line.

## When to apply

- Sending a message to an address or group
- Sending and waiting for a reply (interactive or scripted)

## Rules

- `send-messages` – `send` with target/group-id, message, wait, timeout

## Quick start

```bash
# Send to address
xmtp send --target 0x1234... --message "Hello!"

# Send to group
xmtp send --group-id <group-id> --message "Welcome!"

# Send and wait for response
xmtp send --target 0x1234... --wait --timeout 60000
```

Read `rules/send-messages.md` for details.
