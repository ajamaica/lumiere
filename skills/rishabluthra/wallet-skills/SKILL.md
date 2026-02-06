---
name: sponge-wallet
version: 1.0.0
description: Manage crypto wallets, transfers, swaps, and balances via the Sponge Wallet API.
homepage: https://wallet.paysponge.com
user-invocable: true
metadata:
  {
    'openclaw':
      {
        'emoji': "\ud83e\uddfd",
        'category': 'finance',
        'primaryEnv': 'SPONGE_API_KEY',
        'requires': { 'env': ['SPONGE_API_KEY'] },
      },
  }
---

```
SPONGE WALLET API QUICK REFERENCE v1.0.0
Base:   https://api.wallet.paysponge.com
Auth:   Authorization: Bearer <SPONGE_API_KEY>
Docs:   This file is canonical (skills guide + params)

Key endpoints:
  POST /api/agents/register              -> register (no auth)
  POST /api/oauth/device/authorization   -> device login start (humans)
  POST /api/oauth/device/token           -> device token poll (agents + humans)
  GET  /api/balances                     -> get balances
  POST /api/transfers/evm                -> EVM transfer (ETH/USDC)
  POST /api/transfers/solana             -> Solana transfer (SOL/USDC)
  POST /api/transactions/swap            -> Solana swap
  POST /api/transactions/base-swap       -> Base swap (0x)
  POST /api/transactions/bridge          -> Bridge (deBridge)
  GET  /api/solana/tokens                -> list SPL tokens
  GET  /api/solana/tokens/search         -> search Jupiter token list
  GET  /api/transactions/status/:txHash  -> transaction status
  GET  /api/transactions/history         -> transaction history
  POST /api/funding-requests             -> request funding from owner
  POST /api/wallets/withdraw-to-main     -> withdraw to owner
  POST /api/x402/payments                -> create x402 payment

Rules: use register (agents), never login | store key in ~/.spongewallet/credentials.json | requests are JSON
Errors: HTTP status + JSON error message
```

# Sponge Wallet API - Agent Skills Guide

This skill is **doc-only**. There is no local CLI. Agents must call the Sponge Wallet REST API directly.

## Why the steps matter (short rationale)

- **Register vs login**: agents create a new managed wallet tied to a human owner. That owner must explicitly approve the agent. Login is only for humans who already have an account.
- **Claim URL**: ensures the human owner explicitly links the agent to their account and controls allowlists/funding.
- **Credential persistence**: the device token response returns the `apiKey` once. If you lose it, you must re-register or re-authenticate.

## Standard credential storage (required)

Store the API key in **one canonical location**:

- `~/.spongewallet/credentials.json`

Recommended file contents:

```json
{
  "apiKey": "sponge_live_..."
}
```

Optional environment export (runtime convenience):

```bash
export SPONGE_API_KEY="$(jq -r .apiKey ~/.spongewallet/credentials.json)"
```

## Base URL & Auth

- Base URL: `https://api.wallet.paysponge.com`
- Auth header: `Authorization: Bearer <SPONGE_API_KEY>`
- Content-Type: `application/json`

Quick env setup:

```bash
export SPONGE_API_URL="https://api.wallet.paysponge.com"
export SPONGE_API_KEY="$(jq -r .apiKey ~/.spongewallet/credentials.json)"
```

## CRITICAL: AI Agents Must Use `register`, NOT `login`

### 1) Agent Registration (AI agents only)

**Step 1 — Start registration**

```bash
curl -sS -X POST "$SPONGE_API_URL/api/agents/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"YourAgentName"}'
```

Response includes:

- `verificationUriComplete` (claim URL for the human owner)
- `claimCode`, `deviceCode`, `expiresIn`, `interval`, `claimText`

**Step 2 — Send the claim URL to the human owner**
They log in, optionally post the tweet text, and approve the agent.

**Step 3 — Poll for completion**

```bash
curl -sS -X POST "$SPONGE_API_URL/api/oauth/device/token" \
  -H "Content-Type: application/json" \
  -d '{
    "grantType":"urn:ietf:params:oauth:grant-type:device_code",
    "deviceCode":"<deviceCode>",
    "clientId":"spongewallet-skill"
  }'
```

On success, the response includes `apiKey`. Save it to `~/.spongewallet/credentials.json` and use it as `SPONGE_API_KEY`.

### 2) Human Login (existing accounts only)

**Phase 1 — Request device code**

```bash
curl -sS -X POST "$SPONGE_API_URL/api/oauth/device/authorization" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId":"spongewallet-skill",
    "scope":"wallet:read wallet:write transaction:sign transaction:write"
  }'
```

**Phase 2 — Poll for token** (same endpoint as agents)

```bash
curl -sS -X POST "$SPONGE_API_URL/api/oauth/device/token" \
  -H "Content-Type: application/json" \
  -d '{
    "grantType":"urn:ietf:params:oauth:grant-type:device_code",
    "deviceCode":"<deviceCode>",
    "clientId":"spongewallet-skill"
  }'
```

## Tool Call Pattern

All tool calls are plain REST requests with JSON payloads.

**Common headers**

```bash
-H "Authorization: Bearer $SPONGE_API_KEY" \
-H "Content-Type: application/json" \
-H "Accept: application/json"
```

**Agent ID note:** `agentId` is optional for API key auth. It is only required when using a user session (e.g., Privy-based auth) or when explicitly operating on a different agent.

### Tool -> Endpoint Map

| Tool                      | Method | Path                                | Params/Body                                                                                                                                 |
| ------------------------- | ------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_balance`             | GET    | `/api/balances`                     | Query: `chain`, `allowedChains`, `onlyUsdc`                                                                                                 |
| `get_solana_tokens`       | GET    | `/api/solana/tokens`                | Query: `chain`                                                                                                                              |
| `search_solana_tokens`    | GET    | `/api/solana/tokens/search`         | Query: `query`, `limit`                                                                                                                     |
| `evm_transfer`            | POST   | `/api/transfers/evm`                | Body: `chain`, `to`, `amount`, `currency`                                                                                                   |
| `solana_transfer`         | POST   | `/api/transfers/solana`             | Body: `chain`, `to`, `amount`, `currency`                                                                                                   |
| `solana_swap`             | POST   | `/api/transactions/swap`            | Body: `chain`, `inputToken`, `outputToken`, `amount`, `slippageBps`                                                                         |
| `base_swap`               | POST   | `/api/transactions/base-swap`       | Body: `chain`, `inputToken`, `outputToken`, `amount`, `slippageBps`                                                                         |
| `bridge`                  | POST   | `/api/transactions/bridge`          | Body: `sourceChain`, `destinationChain`, `token`, `amount`, `destinationToken`, `recipientAddress`                                          |
| `get_transaction_status`  | GET    | `/api/transactions/status/{txHash}` | Query: `chain`                                                                                                                              |
| `get_transaction_history` | GET    | `/api/transactions/history`         | Query: `limit`, `chain`                                                                                                                     |
| `request_funding`         | POST   | `/api/funding-requests`             | Body: `amount`, `reason`, `chain`, `currency`                                                                                               |
| `withdraw_to_main_wallet` | POST   | `/api/wallets/withdraw-to-main`     | Body: `chain`, `amount`, `currency`                                                                                                         |
| `create_x402_payment`     | POST   | `/api/x402/payments`                | Body: `chain`, `to`, `token`, `amount`, `decimals`, `valid_for_seconds`, `resource_url`, `resource_description`, `fee_payer`, `http_method` |

Note: request bodies use camelCase (e.g., `inputToken`, `slippageBps`).

## Quick Start

### 1) Register (agents only)

```bash
curl -sS -X POST "$SPONGE_API_URL/api/agents/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"YourAgentName"}'
```

Share the claim URL with your human, then poll for the token and store the `apiKey`.

### 2) Check balance

```bash
curl -sS "$SPONGE_API_URL/api/balances?chain=base" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Accept: application/json"
```

### 3) Transfer USDC on Base

```bash
curl -sS -X POST "$SPONGE_API_URL/api/transfers/evm" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chain":"base",
    "to":"0x...",
    "amount":"10",
    "currency":"USDC"
  }'
```

## Examples

### Swap tokens on Solana

```bash
curl -sS -X POST "$SPONGE_API_URL/api/transactions/swap" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chain":"solana",
    "inputToken":"SOL",
    "outputToken":"BONK",
    "amount":"0.5",
    "slippageBps":100
  }'
```

### Swap tokens on Base

```bash
curl -sS -X POST "$SPONGE_API_URL/api/transactions/base-swap" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chain":"base",
    "inputToken":"ETH",
    "outputToken":"USDC",
    "amount":"0.1",
    "slippageBps":50
  }'
```

### Bridge tokens cross-chain

```bash
curl -sS -X POST "$SPONGE_API_URL/api/transactions/bridge" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceChain":"solana",
    "destinationChain":"base",
    "token":"SOL",
    "amount":"0.1",
    "destinationToken":"ETH"
  }'
```

### Check transaction status

```bash
curl -sS "$SPONGE_API_URL/api/transactions/status/0xabc123...?chain=base" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Accept: application/json"
```

## Chain Reference

**Test keys** (`sponge_test_*`): `sepolia`, `base-sepolia`, `solana-devnet`, `tempo`
**Live keys** (`sponge_live_*`): `ethereum`, `base`, `solana`

## Error Responses

Errors return JSON with an error message and HTTP status:

```json
{ "error": "message" }
```

| Status | Meaning      | Common Cause                                  |
| ------ | ------------ | --------------------------------------------- |
| 400    | Bad Request  | Missing/invalid fields                        |
| 401    | Unauthorized | Missing or invalid API key                    |
| 403    | Forbidden    | Address not in allowlist or permission denied |
| 404    | Not Found    | Resource does not exist                       |
| 409    | Conflict     | Duplicate action                              |
| 429    | Rate Limited | Too many requests (back off + retry)          |
| 500    | Server Error | Transient; retry later                        |

## Security

- Never share your API key in logs, posts, or screenshots.
- Store your API key in `~/.spongewallet/credentials.json` and restrict file permissions.
- Rotate the key if exposure is suspected.

---

Built for agents.
