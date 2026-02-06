---
title: CLI environment variables
impact: CRITICAL
tags: env, configuration, .env
---

## CLI environment variables

Set these in your `.env` file (or export in shell). `xmtp init` generates a `.env` with required values.

**Required:**

- `XMTP_ENV` – `dev`, `production`, or `local`
- `XMTP_WALLET_KEY` – Private key for Ethereum wallet (hex with `0x`)
- `XMTP_DB_ENCRYPTION_KEY` – Database encryption key

**Optional:**

- `XMTP_DB_DIRECTORY` – Database directory (default: current working directory)
- `XMTP_GATEWAY_HOST` – XMTP Gateway URL (overrides env-based default)

**Example `.env`:**

```bash
XMTP_ENV=dev
XMTP_WALLET_KEY=0x...
XMTP_DB_ENCRYPTION_KEY=...
XMTP_DB_DIRECTORY=my/database/dir
XMTP_GATEWAY_HOST=https://...
```
