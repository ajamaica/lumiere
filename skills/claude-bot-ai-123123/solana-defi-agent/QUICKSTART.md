# Solana DeFi Agent Skill - Quickstart

> From zero to your first DeFi transaction in 10 minutes

## Prerequisites

You need:

- Node.js 18+ installed
- A terminal
- ~0.01 SOL ($2) for transaction fees

**Don't have SOL?** You can buy on Coinbase/Kraken and withdraw to your wallet, or ask a friend to send you some.

---

## Step 1: Create a Solana Wallet

If you already have a wallet keypair file, skip to Step 2.

```bash
# Install Solana CLI (if needed)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Create a new wallet
solana-keygen new --outfile ~/.config/solana/my-wallet.json

# IMPORTANT: Save the seed phrase somewhere safe!
# This is your backup if you lose the file.

# Get your wallet address
solana address -k ~/.config/solana/my-wallet.json
# Example output: 7xKp...abc
```

**⚠️ Security:**

- Never share your keypair file or seed phrase
- Never commit it to git
- Use a dedicated wallet for testing with small amounts

---

## Step 2: Fund Your Wallet

Send at least 0.01 SOL to your wallet address for transaction fees.

**Options:**

1. Transfer from an exchange (Coinbase, Kraken, Binance)
2. Transfer from another wallet (Phantom, Solflare)
3. Ask a friend to send you some

**Verify your balance:**

```bash
solana balance -k ~/.config/solana/my-wallet.json
# Should show > 0 SOL
```

---

## Step 3: Set Up Environment

```bash
# Clone/install the toolkit
cd your-project
npm install @openclaw/solana-defi-agent-skill

# Create environment file
cat > .env << 'EOF'
# Solana RPC (public works, but rate-limited)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Your wallet keypair path
SOLANA_WALLET_PATH=~/.config/solana/my-wallet.json
EOF
```

**Better RPC options (free tiers available):**

- [Helius](https://helius.dev) - 100k requests/day free
- [QuickNode](https://quicknode.com) - 10M credits free
- [Alchemy](https://alchemy.com) - 300M compute units free

---

## Step 4: Your First Transaction

Let's inspect an action before executing anything:

```bash
# See what a Kamino deposit looks like
npx solana-toolkit inspect "https://kamino.dial.to/api/v0/lend/usdc-main/deposit"
```

Output shows:

- Title and description
- Available actions (25%, 50%, 100%, custom amount)
- Whether the host is trusted

---

## Step 5: Execute a Transaction

**Always dry-run first:**

```bash
# Simulate without sending
npx solana-toolkit execute "https://kamino.dial.to/api/v0/lend/usdc-main/deposit" \
  --amount=1 \
  --dry-run
```

If simulation succeeds:

```bash
# Execute for real
npx solana-toolkit execute "https://kamino.dial.to/api/v0/lend/usdc-main/deposit" \
  --amount=1
```

🎉 **Congratulations!** You just executed a DeFi transaction via Solana Actions.

---

## What Can You Do?

### Working Protocols ✅

| Protocol   | What it does          | Example                  |
| ---------- | --------------------- | ------------------------ |
| **Kamino** | Yield vaults, lending | Deposit USDC, earn yield |
| **Jito**   | Liquid staking        | Stake SOL for JitoSOL    |
| **Tensor** | NFT trading           | Buy floor, place bids    |
| **Drift**  | Perps, vaults         | Deposit to vaults        |

### Needs API Key 🔑

| Protocol    | Get key at                                               |
| ----------- | -------------------------------------------------------- |
| **Lulo**    | [dev.lulo.fi](https://dev.lulo.fi)                       |
| **Jupiter** | [portal.jup.ag](https://portal.jup.ag) (paid plans only) |

### Currently Broken ❌

| Protocol                   | Issue                        |
| -------------------------- | ---------------------------- |
| **Sanctum**                | Cloudflare blocks server IPs |
| **Some dial.to endpoints** | Rate limiting or 403s        |

---

## Common Errors

### "422 Unprocessable Entity"

**Cause:** Your wallet doesn't have the required tokens.
**Fix:** Check you have the token you're trying to deposit.

```bash
# Check all token balances
spl-token accounts
```

### "403 Forbidden"

**Cause:** Cloudflare blocking your IP (common with dial.to endpoints).
**Fix:** Try the protocol's self-hosted endpoint if available, or use a different RPC.

### "Transaction simulation failed"

**Cause:** Usually insufficient SOL for fees, or stale transaction.
**Fix:**

1. Check SOL balance (need ~0.001 SOL per tx)
2. Try again (transactions expire after ~60 seconds)

### "Rate limit exceeded"

**Cause:** Public RPC is overloaded.
**Fix:** Use a dedicated RPC (Helius, QuickNode free tiers).

---

## Pro Tips

1. **Start small** - Test with $1 before going bigger
2. **Check protocol UIs** - If something fails, try the web UI to understand the flow
3. **Watch for cooldowns** - Some protocols (like Lulo) have withdrawal delays
4. **Simulate everything** - `--dry-run` is your friend
5. **Use trusted hosts only** - The CLI warns about untrusted hosts

---

## Example Workflows

### Deposit USDC to Kamino for yield

```bash
solana-toolkit kamino deposit --vault=usdc-main --amount=100
```

### Stake SOL with Jito

```bash
solana-toolkit jito stake --amount=1
```

### Check available vaults

```bash
solana-toolkit inspect "https://kamino.dial.to/api/v0/lend"
```

---

## Getting Help

- **Inspect any URL:** `solana-toolkit inspect <url>` shows what's possible
- **Check protocol status:** See the table above or run tests
- **Solana Discord:** [discord.gg/solana](https://discord.gg/solana)
- **Dialect Docs:** [docs.dialect.to](https://docs.dialect.to)

---

## Next Steps

1. Explore different protocols with `solana-toolkit inspect`
2. Build automations using the SDK (see SKILL.md)
3. Set up better RPC for reliability
4. Check the [Dialect Registry](https://actions-registry.dial.to/all) for 900+ trusted hosts
