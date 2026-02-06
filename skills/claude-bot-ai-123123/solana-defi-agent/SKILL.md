---
name: solana-defi-agent
description: DeFi toolkit for AI agents on Solana — swaps, lending, staking via Solana Actions/Blinks
---

# Solana DeFi Agent Skill

> DeFi toolkit for AI agents on Solana — swaps, lending, staking, and more

**New here?** → Start with [QUICKSTART.md](./QUICKSTART.md) for a 10-minute setup guide.

---

## What This Does

Solana Blinks (Blockchain Links) let you execute DeFi operations—swaps, deposits, staking—through simple URLs. This skill gives you:

- **CLI** for quick operations: `blinks execute <url> --amount=100`
- **SDK** for building automations
- **Registry access** to 900+ trusted protocol endpoints

```bash
# Example: Deposit USDC to Kamino yield vault
blinks execute "https://kamino.dial.to/api/v0/lend/usdc-prime/deposit" --amount=100
```

---

## ⚠️ Before You Start

### Required

- [ ] Solana wallet keypair file (see [QUICKSTART.md](./QUICKSTART.md#step-1-create-a-solana-wallet))
- [ ] SOL for transaction fees (~0.01 SOL / $2 minimum)
- [ ] Node.js 18+

### Environment Variables

```bash
# .env file
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WALLET_PATH=~/.config/solana/my-wallet.json
```

### 🔒 Security

- **Never commit keypairs to git** - use `.env` and `.gitignore`
- **Test with small amounts first** - mistakes happen
- **Verify hosts are trusted** - CLI warns about untrusted hosts
- **Use a dedicated wallet** - not your main holdings

---

## Protocol Status (Updated 2026-02-02)

### ✅ Working

| Protocol    | Actions                          | Endpoint                       |
| ----------- | -------------------------------- | ------------------------------ |
| **Jupiter** | Swap any tokens                  | `worker.jup.ag`                |
| **Raydium** | Swap, LP                         | `share.raydium.io`             |
| **Kamino**  | Deposit, withdraw, borrow, repay | `kamino.dial.to`               |
| **Jito**    | Stake SOL                        | `jito.network`, `jito.dial.to` |
| **Tensor**  | Buy floor, bid on NFTs           | `tensor.dial.to`               |
| **Drift**   | Vault deposit/withdraw           | `app.drift.trade`              |

### 🔑 Needs API Key

| Protocol | Get Key                            | Notes                    |
| -------- | ---------------------------------- | ------------------------ |
| **Lulo** | [dev.lulo.fi](https://dev.lulo.fi) | 24hr withdrawal cooldown |

### ❌ Currently Broken

| Protocol         | Issue                        | Workaround                |
| ---------------- | ---------------------------- | ------------------------- |
| **Orca**         | No public blink API          | Use Jupiter or Raydium    |
| **Sanctum**      | Cloudflare blocks server IPs | Use their web UI          |
| **Some dial.to** | Rate limiting                | Try self-hosted endpoints |

### ❓ Untested

MarginFi, Meteora, Helius, Magic Eden - endpoints exist but need verification.

---

## Quick Reference

### Inspect Before Executing

Always preview what a blink does:

```bash
blinks inspect <url>
```

Shows metadata, available actions, and trust status.

### Execute Transactions

```bash
# Dry run first (simulates without sending)
blinks execute <url> --amount=100 --dry-run

# Execute for real
blinks execute <url> --amount=100
```

### Protocol-Specific Commands

```bash
# Kamino
blinks kamino deposit --vault=usdc-prime --amount=100
blinks kamino withdraw --vault=usdc-prime --amount=50

# Jito
blinks jito stake --amount=1

# Generic (any blink URL)
blinks execute "https://..." --amount=X
```

---

## SDK Usage

```typescript
import {
  ActionsClient,
  BlinksExecutor,
  Wallet,
  getConnection,
  isHostTrusted,
} from '@openclaw/solana-defi-agent-skill'

// Initialize
const connection = getConnection()
const wallet = Wallet.fromEnv()
const actions = new ActionsClient()
const executor = new BlinksExecutor(connection)

// 1. Check if host is trusted
const trusted = await isHostTrusted('https://kamino.dial.to')
if (!trusted) throw new Error('Untrusted host!')

// 2. Get action metadata
const metadata = await actions.getAction('https://kamino.dial.to/api/v0/lend/usdc-prime/deposit')
console.log('Available actions:', metadata.links.actions)

// 3. Get transaction
const tx = await actions.postAction(
  'https://kamino.dial.to/api/v0/lend/usdc-prime/deposit?amount=100',
  wallet.address,
)

// 4. Simulate first
const sim = await executor.simulate(tx)
if (!sim.success) {
  throw new Error(`Simulation failed: ${sim.error}`)
}

// 5. Execute
const signature = await executor.signAndSend(tx, wallet.getSigner())
console.log('Success:', `https://solscan.io/tx/${signature}`)
```

---

## How Blinks Work

1. **GET** request to action URL → Returns metadata + available actions
2. **POST** request with wallet address → Returns transaction to sign
3. Sign transaction locally and submit to Solana

```
User → GET blink URL → Protocol returns actions
User → POST with wallet → Protocol returns transaction
User → Sign & submit → Transaction confirmed
```

The skill handles all of this. You just provide the URL and amount.

---

## Troubleshooting

| Error                           | Cause                        | Fix                                 |
| ------------------------------- | ---------------------------- | ----------------------------------- |
| `422 Unprocessable Entity`      | Missing required tokens      | Check token balance before deposit  |
| `403 Forbidden`                 | Cloudflare blocking          | Try protocol's self-hosted endpoint |
| `Transaction simulation failed` | Insufficient SOL or stale tx | Check balance, retry quickly        |
| `Rate limit exceeded`           | Public RPC overloaded        | Use Helius/QuickNode free tier      |
| `Untrusted host warning`        | Host not in Dialect registry | Verify URL is correct               |

---

## Blink URL Formats

The CLI accepts multiple formats:

```bash
# Direct URL (recommended)
blinks inspect "https://kamino.dial.to/api/v0/lend/usdc/deposit"

# Solana Action protocol
blinks inspect "solana-action:https://kamino.dial.to/..."

# dial.to interstitial
blinks inspect "https://dial.to/?action=solana-action:https://..."
```

---

## RPC Recommendations

| Provider      | Free Tier    | Link                                   |
| ------------- | ------------ | -------------------------------------- |
| **Helius**    | 100k req/day | [helius.dev](https://helius.dev)       |
| **QuickNode** | 10M credits  | [quicknode.com](https://quicknode.com) |
| **Alchemy**   | 300M CU      | [alchemy.com](https://alchemy.com)     |
| **Public**    | Rate limited | `api.mainnet-beta.solana.com`          |

Public works for testing but will hit rate limits in production.

---

## Files

```
solana-defi-agent-skill/
├── SKILL.md           # This file
├── QUICKSTART.md      # Beginner setup guide
├── README.md          # Package readme
├── .env.example       # Environment template
├── src/               # Source code
├── dist/              # Built CLI + SDK
├── docs/              # Protocol status, specs
└── tests/             # Protocol endpoint tests
```

---

## Links

- [QUICKSTART.md](./QUICKSTART.md) - Get started in 10 minutes
- [Solana Actions Spec](https://solana.com/developers/guides/advanced/actions)
- [Dialect Registry](https://actions-registry.dial.to/all) - 900+ trusted hosts
- [Blinks Inspector](https://www.blinks.xyz/inspector) - Visual blink tester
