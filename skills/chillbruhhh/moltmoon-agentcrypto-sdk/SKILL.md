---
name: moltmoon-sdk
description: Complete OpenClaw-ready operating skill for @moltmoon/sdk. Use when an agent needs to install, configure, and operate the MoltMoon SDK or CLI end-to-end on Base mainnet, including launch dry-runs, metadata/image validation, live token launches, quote checks, buys, sells, troubleshooting, and safe production runbooks.
---

# MoltMoon SDK Skill (OpenClaw)

Use this skill to operate the MoltMoon SDK/CLI as a complete agent workflow on Base mainnet.

## Install

Use one of these paths:

```bash
npm install @moltmoon/sdk
```

or run without install:

```bash
npx -y @moltmoon/sdk moltlaunch --help
```

## Runtime Configuration

Set environment variables before any write action:

```env
MOLTMOON_API_URL=https://api.moltmoon.xyz
MOLTMOON_NETWORK=base
MOLTMOON_PRIVATE_KEY=0x...   # 32-byte hex key with 0x prefix
```

Notes:

- `MOLTMOON_NETWORK` supports `base` only.
- `MOLTMOON_PRIVATE_KEY` (or `PRIVATE_KEY`) is required for launch/buy/sell.

## Supported CLI Commands

Global options:

- `--api-url <url>`
- `--network base`
- `--private-key <0x...>`

Commands:

- `launch` Launch token (with metadata/image/socials, includes approval + create flow)
- `tokens` List tokens
- `buy` Approve USDC + buy in one flow
- `sell` Approve token + sell in one flow
- `quote-buy` Fetch buy quote only
- `quote-sell` Fetch sell quote only

## Canonical CLI Runbooks

### 1) Dry-run launch first (no chain tx)

```bash
npx -y @moltmoon/sdk mltl launch \
  --name "Agent Token" \
  --symbol "AGT" \
  --description "Agent launch token on MoltMoon" \
  --website "https://example.com" \
  --twitter "https://x.com/example" \
  --discord "https://discord.gg/example" \
  --image "./logo.png" \
  --seed 20 \
  --dry-run \
  --json
```

### 2) Live launch

```bash
npx -y @moltmoon/sdk mltl launch \
  --name "Agent Token" \
  --symbol "AGT" \
  --description "Agent launch token on MoltMoon" \
  --seed 20 \
  --json
```

### 3) Trade flow

```bash
npx -y @moltmoon/sdk mltl quote-buy --market 0xMARKET --usdc 1 --json
npx -y @moltmoon/sdk mltl buy --market 0xMARKET --usdc 1 --slippage 500 --json
npx -y @moltmoon/sdk mltl quote-sell --market 0xMARKET --tokens 100 --json
npx -y @moltmoon/sdk mltl sell --market 0xMARKET --token 0xTOKEN --amount 100 --slippage 500 --json
```

## SDK API Surface

Initialize:

```ts
import { MoltmoonSDK } from '@moltmoon/sdk'

const sdk = new MoltmoonSDK({
  baseUrl: process.env.MOLTMOON_API_URL || 'https://api.moltmoon.xyz',
  network: 'base',
  privateKey: process.env.MOLTMOON_PRIVATE_KEY as `0x${string}`,
})
```

Read methods:

- `getTokens()`
- `getMarket(marketAddress)`
- `getQuoteBuy(marketAddress, usdcIn)`
- `getQuoteSell(marketAddress, tokensIn)`

Launch methods:

- `prepareLaunchToken(params)` -> metadata URI + intents only
- `launchToken(params)` -> executes approve + create

Trade methods:

- `buy(marketAddress, usdcIn, slippageBps?)`
- `sell(marketAddress, tokensIn, tokenAddress, slippageBps?)`

Utility methods:

- `calculateProgress(marketDetails)`
- `calculateMarketCap(marketDetails)`

## Launch Metadata + Image Rules

Enforce these before launch:

- Image must be PNG or JPEG
- Max size 500KB (`<=100KB` recommended)
- Dimensions must be square, min `512x512`, max `2048x2048`
- Social links must be valid URLs
- Seed for normal launch must be at least `20` USDC

## Failure Diagnosis

- `Missing private key`
  - Set `MOLTMOON_PRIVATE_KEY` or pass `--private-key`.
- `Unsupported network`
  - Use `base` only.
- `transfer amount exceeds allowance`
  - Re-run buy/sell/launch flow so approvals execute.
- `transfer amount exceeds balance`
  - Fund signer with Base ETH (gas) and USDC/token balance.
- `ERR_NAME_NOT_RESOLVED` or fetch errors
  - Check `MOLTMOON_API_URL` DNS and API uptime.
- image validation errors
  - Fix file type/size/dimensions to rules above.

## Operator Policy

- Run dry-run before every first live launch for a new token payload.
- Confirm signer address and chain before write calls.
- Keep secrets in `.env`; never commit keys.
- Record tx hashes after launch/buy/sell for audit trail.
