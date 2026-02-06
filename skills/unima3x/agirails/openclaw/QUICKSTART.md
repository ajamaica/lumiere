# AGIRAILS + OpenClaw: 5-Minute Setup

Get your AI agent making autonomous payments in 5 minutes.

---

## Prerequisites

- [ ] OpenClaw installed and running
- [ ] Wallet with USDC on Base L2
- [ ] Private key exported

---

## Step 1: Run Setup Script (30 sec)

```bash
# From your openclaw workspace
bash skills/agirails/scripts/setup.sh
```

This creates:
- `agents/treasury/` workspace
- `SOUL.md` with security limits
- `providers.json` whitelist
- Transaction log file

---

## Step 2: Add Agent to Config (1 min)

Add this to your `openclaw.json` → `agents.list`:

```json
{
  "id": "treasury",
  "name": "Treasury",
  "workspace": "/YOUR/WORKSPACE/agents/treasury",
  "model": "haiku",
  "heartbeat": {
    "every": "60m",
    "model": "haiku",
    "prompt": "Check pending ACTP transactions and USDC balance. Alert if balance < $20 or any anomalies."
  },
  "identity": {
    "name": "Treasury",
    "emoji": "💰"
  }
}
```

> **Note:** Replace `/YOUR/WORKSPACE` with your actual workspace path.

---

## Step 3: Set Environment Variable (30 sec)

```bash
# Add to your shell profile or OpenClaw env config
export AGENT_PRIVATE_KEY="0x..."
export AGENT_ADDRESS="0x..."
```

Or add to `openclaw.json` → `env.vars`:

```json
{
  "env": {
    "vars": {
      "AGENT_PRIVATE_KEY": "0x...",
      "AGENT_ADDRESS": "0x..."
    }
  }
}
```

> ⚠️ **Security:** Never commit private keys to git!

---

## Step 4: Add a Provider (1 min)

Edit `agents/treasury/providers.json`:

```json
[
  {
    "address": "0x1234...Provider",
    "name": "LeadGen Pro",
    "service": "B2B leads",
    "maxPerTx": "10",
    "active": true
  }
]
```

---

## Step 5: Restart OpenClaw (30 sec)

```bash
openclaw gateway restart
```

---

## Step 6: Test It! (1 min)

```bash
# Check balance
openclaw run --agent treasury "What's my USDC balance?"

# Test purchase (testnet first!)
openclaw run --agent treasury "Purchase 1 lead for $1 from LeadGen Pro"
```

---

## 🎉 Done!

Your Treasury agent is ready. It will:
- ✅ Enforce spending limits ($10/tx, $50/day)
- ✅ Only transact with whitelisted providers
- ✅ Log every transaction
- ✅ Alert you on low balance

---

## Next Steps

- **Add a cron job** for automatic daily purchases → see `cron-examples.json`
- **Customize validation** for your use case → see `validation-patterns.md`
- **Review security** before mainnet → see `security-checklist.md`

---

## Quick Reference

| Command | What it does |
|---------|--------------|
| `openclaw chat --agent treasury` | Interactive chat with Treasury |
| `openclaw run --agent treasury "Check balance"` | One-off balance check |
| `openclaw cron list` | View scheduled jobs |
| `openclaw sessions list` | View active sessions |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Provider not whitelisted" | Add address to `providers.json` |
| "Insufficient balance" | Fund wallet via [bridge.base.org](https://bridge.base.org) |
| "Daily limit exceeded" | Wait until tomorrow or adjust `SOUL.md` |
| "Transaction stuck" | Check status with `checkStatus(txId)` |

---

*Setup time: ~5 minutes*
*First payment: ~30 seconds after setup*
