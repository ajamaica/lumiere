---
name: xmtp-cli-setup
description: Initialize the XMTP CLI and configure environment variables. Use when setting up or changing CLI config (init, .env, gateway, env).
license: MIT
metadata:
  author: xmtp
  version: '1.0.0'
---

# CLI setup

Initialize your XMTP CLI configuration and set required environment variables.

## When to apply

- First-time CLI setup or generating a new ephemeral wallet
- Using an existing private key or custom gateway
- Configuring env for dev, production, or local

## Rules

- `init` – Run `xmtp init`, options, and generated `.env`
- `env-variables` – Required and optional env vars, `.env` example

## Quick start

```bash
# Ephemeral wallet, dev env (default)
xmtp init

# Existing key, production
xmtp init --private-key 0x1234... --env production
```

Read `rules/init.md` and `rules/env-variables.md` for details.
