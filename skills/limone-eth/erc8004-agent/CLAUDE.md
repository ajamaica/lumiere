# 8004 Agent Skill v0.0.1

You are an ERC-8004 agent with access to the 8004 Agent Skill. This skill lets you create and manage an Ethereum wallet, register as an onchain agent, and authenticate with services using the SIWA protocol.

## Prerequisites: Deploy the Keyring Proxy

Before using any signing capabilities, a **keyring proxy** must be running — it holds the private key and performs all cryptographic operations. The agent never accesses the key directly.

**Recommended: Deploy to Railway with one click:**

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/siwa-keyring-proxy?referralCode=ZUrs1W)

Set `KEYRING_PROXY_SECRET` (shared HMAC secret) and either `KEYSTORE_PASSWORD` (for encrypted-file backend) or `AGENT_PRIVATE_KEY` (to use an existing wallet). After deployment, configure your agent with:

```
KEYRING_PROXY_URL=https://your-keyring-proxy.up.railway.app
KEYRING_PROXY_SECRET=<your-shared-secret>
```

For full deployment instructions (Docker, local dev, OpenClaw gateway): [https://siwa.builders.garden/docs/deploy](https://siwa.builders.garden/docs/deploy)

## Your Capabilities

You can perform these actions by running commands in the `siwa/packages/siwa-testing` directory:

### 1. Create a Wallet

Creates an Ethereum wallet. The private key is stored securely in the keyring proxy — you never see it.

```bash
cd /home/node/.openclaw/workspace/siwa/packages/siwa-testing && pnpm run agent create-wallet
```

### 2. Check Status

Shows your current wallet address, registration state, and keystore backend.

```bash
cd /home/node/.openclaw/workspace/siwa/packages/siwa-testing && pnpm run agent status
```

### 3. Register as an Agent

Registers your wallet as an ERC-8004 agent identity (mock mode for testing, or live onchain).

```bash
cd /home/node/.openclaw/workspace/siwa/packages/siwa-testing && pnpm run agent register
```

### 4. Sign In (SIWA Authentication)

Proves ownership of your ERC-8004 identity by signing a structured message and receiving a JWT from the server.

```bash
cd /home/node/.openclaw/workspace/siwa/packages/siwa-testing && pnpm run agent sign-in
```

### 5. Full Flow (All Steps)

Runs wallet creation → registration → SIWA sign-in → authenticated API call, all sequentially.

```bash
cd /home/node/.openclaw/workspace/siwa/packages/siwa-testing && pnpm run agent:flow
```

### 6. Run Proxy Tests

Validates that the keyring proxy is working correctly (7 tests).

```bash
cd /home/node/.openclaw/workspace/siwa/packages/siwa-testing && pnpm run agent test-proxy
```

### 7. Reset State

Clears MEMORY.md and keystore state to start fresh.

```bash
cd /home/node/.openclaw/workspace/siwa/packages/siwa-testing && pnpm run reset
```

## Important Notes

- **Private keys are NEVER accessible to you.** All signing is delegated to the keyring proxy over HMAC-authenticated HTTP. This is by design — even if you are compromised, the key cannot be extracted.
- **MEMORY.md** in `siwa/packages/siwa-testing/` contains your public identity state (address, agentId, registration status). Read it to know your current state.
- **Proxy backend is auto-detected** from `KEYRING_PROXY_URL` — no need to set `KEYSTORE_BACKEND` manually.
- If a command fails with "Cannot find module", run `cd /home/node/.openclaw/workspace/siwa/packages/siwa-testing && pnpm install` first.

## Architecture

```
You (OpenClaw Agent)          Keyring Proxy (keyring-proxy:3100)     SIWA Server (siwa-server:3000)
  |                             |                                      |
  +-- signMessage() ----------> | Signs with real private key          |
  |   (via proxy backend)       | Returns signature only               |
  |                             |                                      |
  +-- SIWA sign-in -------------|------------------------------------> |
  |   (signed challenge)        |                                      | Verifies signature
  |                             |                                      | Returns JWT
```

## Reference

- Full skill documentation: `siwa/SKILL.md`
- Security model: `siwa/references/security-model.md`
- SIWA protocol spec: `siwa/references/siwa-spec.md`
