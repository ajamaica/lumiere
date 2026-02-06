---
title: Initialize CLI configuration
impact: CRITICAL
tags: init, setup, env, gateway
---

## Initialize CLI configuration

Creates a `.env` file with the necessary XMTP CLI configuration.

**Quick start (ephemeral wallet, dev):**

```bash
xmtp init
```

**Options:**

- `--ephemeral` – Generate a new random wallet key (default; conflicts with `--private-key`)
- `--private-key <key>` – Use existing private key in hex with `0x` prefix (conflicts with `--ephemeral`)
- `--gateway <url>` – XMTP Gateway URL (sets `XMTP_GATEWAY_HOST`)
- `--env <environment>` – `dev`, `production`, or `local` (sets `XMTP_ENV`; defaults to `dev` unless `--gateway` is set)

**Examples:**

```bash
xmtp init --ephemeral
xmtp init --private-key 0x1234...
xmtp init --gateway https://my-gateway.example.com
xmtp init --env production
xmtp init --private-key 0x1234... --gateway https://... --env production
```

**Generated `.env` contents:**

- `XMTP_WALLET_KEY`
- `XMTP_DB_ENCRYPTION_KEY`
- `XMTP_GATEWAY_HOST` (if `--gateway` specified)
- `XMTP_ENV`
- Comment with wallet address
