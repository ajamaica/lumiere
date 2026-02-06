---
title: Content types (text, markdown, attachment, transaction, deeplink, miniapp)
impact: MEDIUM
tags: content, text, markdown, attachment, transaction, deeplink, miniapp
---

## Content types

Demonstrate XMTP content types by sending sample content to a target or group.

**Text (with reply and reaction):**

```bash
xmtp content text --target 0x1234...
```

**Markdown:**

```bash
xmtp content markdown --target 0x1234...
```

**Attachment:**

```bash
xmtp content attachment --target 0x1234...
```

**Transaction:**

```bash
xmtp content transaction --target 0x1234...
xmtp content transaction --target 0x1234... --amount 0.1
```

**Deeplink and miniapp:**

```bash
xmtp content deeplink --target 0x1234...
xmtp content miniapp --target 0x1234...
```

**Options:**

- `--target <address>` – Target wallet address
- `--group-id <id>` – Group ID (use instead of target for group)
- `--amount <amount>` – Amount for transaction content (default: 0.1)

**Operations:** `text` (default), `markdown`, `attachment`, `transaction`, `deeplink`, `miniapp`
