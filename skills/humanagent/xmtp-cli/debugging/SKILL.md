---
name: xmtp-cli-debugging
description: Enable CLI debug logging with environment variables. Use when troubleshooting or inspecting CLI behavior.
license: MIT
metadata:
  author: xmtp
  version: '1.0.0'
---

# CLI debugging

Enable debug logging for the XMTP CLI via environment variables.

## When to apply

- Troubleshooting CLI behavior or connection issues
- Inspecting verbose logs (debug level)

## Rules

- `force-debug-env` – `XMTP_FORCE_DEBUG` and `XMTP_FORCE_DEBUG_LEVEL`

## Quick start

Set in `.env` or export:

```bash
XMTP_FORCE_DEBUG=true
XMTP_FORCE_DEBUG_LEVEL=debug
```

Read `rules/force-debug-env.md` for details.
