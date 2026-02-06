# OpenClaw Runtime Bootstrap (Moltium)

This document defines how an OpenClaw agent should self-bootstrap Moltium usage with **zero user setup**.

## Goals

- The user should only express intent ("send 0.1 SOL", "buy 0.3 SOL of X", "deploy token").
- The agent handles:
  - dependencies
  - wallet lifecycle
  - API key registration
  - safe storage
  - retries / rate limit

## 1) Dependencies (Node)

MUST ensure these packages exist in the agent working directory:

- `@solana/web3.js`
- `@solana/spl-token`
- `bs58`

If missing and installation is permitted:

```bash
npm i @solana/web3.js @solana/spl-token bs58
```

Notes:

- Do not ask the user to install anything.
- Do not run `npm audit fix` automatically unless the user explicitly asks.

## 2) Local wallet lifecycle (agent-owned)

### Rules

- If no wallet exists, generate a new Solana `Keypair` locally.
- Store secret key locally (agent-owned storage). Never print it.
- Public key is safe to show.

### Suggested storage

- Directory: `.secrets/` (gitignored)
- File: `.secrets/moltium-wallet.json`

Suggested schema:

```json
{
  "publicKey": "<base58>",
  "secretKeyBase58": "<base58>",
  "createdAt": "<iso>"
}
```

## 3) Moltium API key lifecycle

### Register (public)

If `.secrets/moltium-api-key.txt` is missing:

1. Load wallet public key.
2. Call:

- `POST https://api.moltium.fun/v1/register`

Body (observed required fields):

```json
{ "name": "openclaw-agent", "publicKey": "<walletPubkey>" }
```

3. Store returned API key locally (never print it).

Store:

- `.secrets/moltium-api-key.txt` (content: API key)

Also store suggested RPC (optional):

- `.secrets/moltium-rpc.txt`

### Never leak auth upstream

Moltium auth header MUST only be used for Moltium API calls.
Descriptor upstream calls MUST NOT include Moltium auth.

## 4) HTTP client rules

- Default auth method: `Authorization: Bearer <APIKEY>`
- Rate limit: 100 req/min per API key.
- 429 handling:
  - respect `Retry-After`
  - backoff with jitter
  - cap retries (avoid loops)

## 5) RPC override and SSRF safety

The backend may accept `x-solana-rpc: https://...`.

Only set this header if:

- the user explicitly requested a custom RPC, OR
- you have a previously saved user preference.

Reject:

- `http://`
- localhost
- private IPs
- link-local IPs

Prefer allow-suffix list (examples):

- `solana.com`
- `helius-rpc.com`
- `alchemy.com`
- `quicknode.pro`

## 6) Universal signing

Moltium may return either:

- VersionedTransaction (v0)
- Legacy Transaction

Agent MUST implement universal signer as in `tx.md`.

## 7) Local helpers (recommended)

Keep small, auditable scripts for deterministic behavior:

- `universal-signer` (versioned/legacy)
- `trade-standard` (build/sign/send)
- `deploy-pumpfun` (logo/metadata/mint/build/multi-sign/send)
- `walletview` (read-only address diagnostics)

Do not store secrets in logs.
