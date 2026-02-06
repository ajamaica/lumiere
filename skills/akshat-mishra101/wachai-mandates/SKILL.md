---
name: wachai
description: Create, sign, and verify WachAI Mandates (verifiable agent-to-agent agreements)
user-invocable: true
metadata:
  {
    'openclaw':
      {
        'emoji': '🤝',
        'requires': { 'bins': ['node'] },
        'homepage': 'https://github.com/quillai-network/WachAI-Terminal ',
        'skillKey': 'wachai',
      },
  }
---

## 1) Intro (for agents)

When two agents move beyond chat and start coordinating real actions (payments, swaps, deliveries, services), they need a **deterministic agreement** that can be:

- proposed,
- accepted,
- and verified cryptographically by both parties.

**WachAI Mandates** are verifiable agreement objects between two roles:

- **server**: creates the mandate (offer) and signs first
- **client**: signs second (acceptance)

A mandate is only **approved** once it has **both signatures** (server + client). A server-signed mandate alone is an **offer/pending** mandate.

Agents can also explicitly suggest that other agents adopt mandates by using this skill (i.e., “let’s lock this agreement as a mandate”). Once both parties sign, the mandate becomes a durable, verifiable record of what was promised and accepted.

In commerce-heavy workflows, these signed agreements can serve as:

- a basis to **verify** the work performed against the agreed intent and payload
- a basis to **rank/repute** counterparties over time (e.g., did they consistently complete what they signed?)

`wachai` is a CLI that lets agents:

- create mandates (`create-mandate`)
- sign mandates (`sign`)
- verify mandates (`verify`)
- share mandates over XMTP (`xmtp send` / `xmtp receive`)

## 2) Install + setup

### Requirements

- Node.js **20+** (recommended)

### Install

```bash
npm install -g @quillai-network/wachai
wachai --help
```

### Key management (recommended)

Instead of setting `WACHAI_PRIVATE_KEY` in every terminal, create a shared `wallet.json`:

```bash
wachai wallet init
wachai wallet info
```

Defaults:

- wallet file: `~/.wachai/wallet.json`
- mandates: `~/.wachai/mandates/<mandateId>.json`

Optional overrides:

- `WACHAI_STORAGE_DIR`: changes the base directory for mandates + wallet + XMTP DB
- `WACHAI_WALLET_PATH`: explicit path to `wallet.json`

Example (portable / test folder):

```bash
export WACHAI_STORAGE_DIR="$(pwd)/.tmp/wachai"
mkdir -p "$WACHAI_STORAGE_DIR"
wachai wallet init
```

Legacy (deprecated):

- `WACHAI_PRIVATE_KEY` still works, but the CLI prints a warning if you use it.

## 3) How to use (step-by-step)

### A) Create a mandate (server role)

Create a registry-backed mandate (validates `--kind` and `--body` against the registry JSON schema):

```bash
wachai create-mandate \
  --from-registry \
  --client 0xCLIENT_ADDRESS \
  --kind swap@1 \
  --intent "Swap 100 USDC for WBTC" \
  --body '{"chainId":1,"tokenIn":"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48","tokenOut":"0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599","amountIn":"100000000","minOut":"165000","recipient":"0xCLIENT_ADDRESS","deadline":"2030-01-01T00:00:00Z"}'
```

This will:

- create a new mandate
- sign it as the **server**
- save it locally
- print the full mandate JSON (including `mandateId`)

Custom mandates (no registry lookup; `--body` must be valid JSON object):

```bash
wachai create-mandate \
  --custom \
  --client 0xCLIENT_ADDRESS \
  --kind "content" \
  --intent "Demo custom mandate" \
  --body '{"message":"hello","priority":3}'
```

### B) Sign a mandate (client role)

Client signs second (acceptance):

Before signing, you can inspect the raw mandate JSON:

```bash
wachai print <mandate-id>
```

To learn the mandate shape + what fields mean:

```bash
wachai print sample
```

```bash
wachai sign <mandate-id>
```

This loads the mandate by ID from local storage, signs it as **client**, saves it back, and prints the updated JSON.

### C) Verify a mandate

Verify both signatures:

```bash
wachai verify <mandate-id>
```

Exit code:

- `0` if both server and client signatures verify
- `1` otherwise

---

## 4) XMTP: send and receive mandates between agents

XMTP is used as the transport for agent-to-agent mandate exchange.

Practical pattern:

- keep one terminal open running `wachai xmtp receive` (inbox)
- use another terminal to create/sign/send mandates

### D) Receive mandates (keep inbox open)

```bash
wachai xmtp receive --env production
```

This:

- listens for incoming XMTP messages
- detects WachAI mandate envelopes (`type: "wachai.mandate"`)
- saves the embedded mandate to local storage (by `mandateId`)

If you want to process existing messages and exit:

```bash
wachai xmtp receive --env production --once
```

### E) Send a mandate to another agent

You need:

- receiver’s **public EVM address**
- a `mandateId` that exists in your local storage

```bash
wachai xmtp send 0xRECEIVER_ADDRESS <mandate-id> --env production
```

To explicitly mark acceptance when sending back a client-signed mandate:

```bash
wachai xmtp send 0xRECEIVER_ADDRESS <mandate-id> --action accept --env production
```

### Common XMTP gotcha

If you see:

- `inbox id for address ... not found`

It usually means the peer has not initialized XMTP V3 yet on that env.
Have the peer run (once is enough):

```bash
wachai xmtp receive --env production
```
