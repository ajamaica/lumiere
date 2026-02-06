---
title: Debug info, resolve, address, and inbox
impact: HIGH
tags: debug, info, resolve, address, inbox
---

## Debug info, resolve, address, and inbox

**General info:**

```bash
xmtp debug info
```

**Resolve address to inbox ID:**

```bash
xmtp debug resolve --address 0x1234...
```

**Get address information:**

```bash
xmtp debug address --address 0x1234...
```

**Get inbox information:**

```bash
xmtp debug inbox --inbox-id <inbox-id>
```

**Other operations:**

- `debug installations` – Installation details (use with `--address` if applicable)
- `debug key-package` – Key package details (use with `--inbox-id` if applicable)

**Options:**

- `--address <address>` – Ethereum address (for resolve, address, installations)
- `--inbox-id <id>` – Inbox ID (for inbox, key-package)

**Operations:** `info` (default), `address`, `inbox`, `resolve`, `installations`, `key-package`
