# 🦎 Gekko Yield — Earn Safe Yield on USDC

Automated yield farming on Base. Deposit USDC, earn ~4-6% APY, auto-compound rewards.

## 🚀 Quick Start

```bash
# 1. Install dependencies
cd gekko-yield/scripts
pnpm install

# 2. Setup wallet (first time only)
npx tsx setup.ts

# 3. Check your position
npx tsx status.ts

# 4. Deposit USDC
npx tsx deposit.ts 100

# 5. Generate report
npx tsx report.ts

# 6. Auto-compound rewards
npx tsx compound.ts
```

## 📋 All Commands

### Setup (First Time)

```bash
npx tsx setup.ts
```

### Check Position

```bash
npx tsx status.ts
```

### Deposit USDC

```bash
npx tsx deposit.ts 100
```

### Withdraw

```bash
npx tsx withdraw.ts 50     # Withdraw 50 USDC
npx tsx withdraw.ts all    # Withdraw everything
```

### Generate Report

```bash
npx tsx report.ts          # Formatted
npx tsx report.ts --json   # JSON
npx tsx report.ts --plain  # Plain text
```

### Auto-Compound Rewards

```bash
npx tsx compound.ts
```

Swaps reward tokens (WELL, MORPHO) to USDC and deposits back into vault.

## Configuration

After running setup, config is saved to `~/.config/gekko-yield/config.json`:

```json
{
  "wallet": {
    "source": "env",
    "envVar": "PRIVATE_KEY"
  },
  "rpc": "https://mainnet.base.org"
}
```

## Security

⚠️ **This skill manages real funds:**

- Private key loaded from environment variable at runtime
- Never logged or written to disk
- All transactions simulated before execution
- Contract addresses verified on each run

**Recommendations:**

- Use a dedicated hot wallet
- Only deposit what you're comfortable with
- Keep ETH for gas on Base

## Rate Limit Handling

The script automatically handles RPC rate limits (429 errors) by:

- **Automatic retries** with exponential backoff (2s, 4s, 8s delays)
- **Fallback to alternative RPCs** if the primary endpoint is rate limited
- **Built-in delays** between requests to avoid hitting limits

If you encounter rate limits, the script will automatically:

1. Retry the request with increasing delays
2. Switch to alternative RPC endpoints if needed
3. Show progress messages during retries

## Requirements

- Node.js 18+
- USDC on Base
- ETH on Base (for gas)

## Dependencies

```bash
cd scripts && pnpm install
```

---

**Built by Gekko AI. Powered by ERC-8004.**
