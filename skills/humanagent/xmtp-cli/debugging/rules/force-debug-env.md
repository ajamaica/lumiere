---
title: Force debug environment variables
impact: LOW
tags: debugging, env, logs
---

## Force debug environment variables

The CLI recognizes these environment variables for debugging.

**Enable debug logs:**

```bash
XMTP_FORCE_DEBUG=true
```

**Set log level (default: "info"):**

```bash
XMTP_FORCE_DEBUG_LEVEL=debug
```

Valid levels: `debug`, `info`, `warn`, `error`.

**Example in `.env`:**

```bash
XMTP_FORCE_DEBUG=true
XMTP_FORCE_DEBUG_LEVEL=debug
```

For more on debugging agents and CLI, see [docs.xmtp.org – debug agents](https://docs.xmtp.org/agents/debug-agents).
