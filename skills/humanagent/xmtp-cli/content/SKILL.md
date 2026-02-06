---
name: xmtp-cli-content
description: Demonstrate XMTP content types from the CLI. Use when sending text, markdown, attachment, transaction, deeplink, or miniapp content.
license: MIT
metadata:
  author: xmtp
  version: '1.0.0'
---

# CLI content

Demonstrate various XMTP content types: text (with reply/reaction), markdown, attachment, transaction, deeplink, miniapp.

## When to apply

- Sending or testing text, markdown, or attachment content
- Sending or testing transaction, deeplink, or miniapp content

## Rules

- `content-types` – `content text` / `markdown` / `attachment` / `transaction` / `deeplink` / `miniapp` and options

## Quick start

```bash
xmtp content text --target 0x1234...
xmtp content markdown --target 0x1234...
xmtp content attachment --target 0x1234...
xmtp content transaction --target 0x1234... --amount 0.1
```

Read `rules/content-types.md` for details.
