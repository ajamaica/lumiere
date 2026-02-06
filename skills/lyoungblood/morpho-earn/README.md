# 🌜🌛 Moonwell Morpho Earn

A [Clawdbot](https://github.com/clawdbot/clawdbot) / [OpenClaw](https://openclaw.ai) skill for earning yield on USDC via the **Moonwell Flagship USDC vault** on [Morpho](https://morpho.org) (Base network).

## Why Moonwell Flagship USDC?

The Moonwell Flagship USDC vault is **one of the safest places to earn yield on Base**. Here's why:

### 🏛️ Powers Coinbase's Borrow Products

The Moonwell Flagship USDC vault **provides over $20 million in liquidity** to Coinbase's Bitcoin and Ethereum borrow products. When Coinbase users take out loans against their cbBTC or ETH, that liquidity flows from this vault. This institutional-grade integration speaks to the vault's reliability and security.

### 🛡️ Conservative Risk Management

Unlike aggressive yield strategies, Moonwell vaults prioritize **capital preservation**:

- **Blue-chip collateral only** — Loans are backed by established assets like ETH, cbETH, wstETH, and cbBTC
- **Conservative LTV ratios** — Borrowers must maintain healthy collateral levels
- **Isolated markets** — Risk is compartmentalized; issues in one market don't affect others
- **No rehypothecation** — Your USDC isn't lent out recursively

### 🔒 Multi-Layer Security

The vault employs a robust governance structure:

| Role         | Entity                                                                                    | Responsibility                                          |
| ------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Owner**    | Moonwell DAO                                                                              | Sets high-level vault strategy                          |
| **Curators** | [Block Analitica](https://blockanalitica.com/) & [B.Protocol](https://www.bprotocol.org/) | Define risk parameters, supply caps, market allocations |
| **Guardian** | Moonwell Security Council                                                                 | Oversight with veto power during timelock periods       |

### 🔬 Battle-Tested Infrastructure

- **Morpho's codebase** — Under 650 lines of Solidity, fully immutable, extensively audited
- **ERC-4626 compliant** — Standard vault interface ensures broad compatibility
- **On-chain transparency** — All vault logic executes on-chain with full visibility
- **No upgradeable proxies** — What you see is what you get

### 📊 Sustainable Yields

Current APY breakdown:

- **Base yield**: ~4% from borrower interest
- **Reward incentives**: ~0.5-1% in WELL + MORPHO tokens (via Merkl)
- **Total**: ~4.5-5% APY

Yields come from real borrowing demand, not unsustainable token emissions. Rates vary based on market conditions — check current APY with `npx tsx status.ts`.

---

## What This Skill Does

This skill enables AI agents to:

- **Deposit USDC** into the Moonwell vault to earn yield
- **Monitor positions** with beautiful formatted reports
- **Auto-compound rewards** (WELL + MORPHO tokens → USDC → reinvest)
- **Withdraw** funds when needed
- **Smart scheduling** — compound frequency adapts to deposit size

## Vault Details

| Property        | Value                                        |
| --------------- | -------------------------------------------- |
| **Vault**       | Moonwell Flagship USDC                       |
| **Address**     | `0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca` |
| **Chain**       | Base (8453)                                  |
| **Asset**       | USDC                                         |
| **Current APY** | ~4.5-5% (base + rewards)                     |
| **Curators**    | Block Analitica & B.Protocol                 |

## Installation

### For Clawdbot Users

```bash
# Clone to your skills directory
cd ~/clawd/skills
git clone https://github.com/moonwell-fi/openclaw-morpho-earn.git morpho-yield

# Install dependencies
cd morpho-yield/scripts
npm install

# Run interactive setup
npx tsx setup.ts
```

### For Other Agents

The skill can be adapted for any agent framework. The core scripts in `scripts/` are standalone TypeScript files using [viem](https://viem.sh) for Ethereum interaction.

## Quick Start

```bash
cd scripts

# 1. Configure wallet and preferences
npx tsx setup.ts

# 2. Check vault status and APY
npx tsx status.ts

# 3. Deposit USDC (requires USDC + ETH for gas on Base)
npx tsx deposit.ts 100

# 4. Check your position
npx tsx report.ts

# 5. Compound rewards when ready
npx tsx compound.ts
```

## Commands

| Command                     | Description                                             |
| --------------------------- | ------------------------------------------------------- |
| `setup.ts`                  | Interactive setup wizard                                |
| `status.ts`                 | Check position, balances, and vault APY                 |
| `report.ts`                 | Generate formatted report (Telegram/Discord/plain/JSON) |
| `deposit.ts <amount>`       | Deposit USDC into vault                                 |
| `withdraw.ts <amount\|all>` | Withdraw USDC from vault                                |
| `rewards.ts`                | Check claimable rewards                                 |
| `rewards.ts claim`          | Claim rewards from Merkl                                |
| `compound.ts`               | Claim → Swap → Deposit (full auto-compound)             |
| `test-swap.ts [amount]`     | Test swap flow (USDC → WELL + MORPHO)                   |

## Reports

The skill generates beautiful reports for chat platforms:

```
🌜🌛 Moonwell Yield Report

📊 Position
├ Value: $1,234.56 USDC
├ Base APY: 4.09%
└ Total APY: ~7.59%

🔄 Recently Compounded
├ 310.68 WELL → $1.43 USDC
├ 0.91 MORPHO → $1.01 USDC
└ Total: +$2.44 reinvested

💰 Estimated Earnings
├ Daily: ~$0.26
└ Monthly: ~$7.80

⛽ Gas: ✅ 0.0021 ETH
🔗 Wallet: 0xc6d8...cdf5
```

## Smart Compound Scheduling

The skill automatically adjusts monitoring frequency based on position size:

| Deposit Size   | Check Frequency | Rationale                                             |
| -------------- | --------------- | ----------------------------------------------------- |
| $10,000+       | Daily           | Large positions accumulate meaningful rewards quickly |
| $1,000-$10,000 | Every 3 days    | Balance gas costs vs reward accumulation              |
| $100-$1,000    | Weekly          | Small rewards need time to exceed gas costs           |
| <$100          | Bi-weekly       | Minimal positions, compound only when worthwhile      |

## Configuration

Config files are stored in `~/.config/morpho-yield/`:

**config.json** — Wallet and RPC settings

```json
{
  "wallet": {
    "source": "file",
    "path": "~/.clawd/vault/morpho.key"
  },
  "rpc": "https://mainnet.base.org"
}
```

**preferences.json** — Notification and compound settings

```json
{
  "reportFrequency": "weekly",
  "compoundThreshold": 0.5,
  "autoCompound": true
}
```

### Wallet Options

The skill supports multiple wallet sources:

1. **Private key file** (recommended for agents)

   ```json
   { "source": "file", "path": "~/.clawd/vault/morpho.key" }
   ```

2. **Environment variable**

   ```json
   { "source": "env", "env": "MORPHO_PRIVATE_KEY" }
   ```

3. **1Password** (requires `op` CLI)
   ```json
   { "source": "1password", "item": "Morpho Wallet" }
   ```

## Security Considerations

⚠️ **This skill manages real funds. Please review carefully:**

- Private keys are loaded at runtime and never logged
- All transactions are simulated before execution
- Contract addresses are verified on each run
- The wallet should be a dedicated hot wallet with limited funds
- Review all script code before use — this is open source for transparency
- Gas (ETH) is required on Base for transactions

### Recommended Setup

1. Create a **dedicated wallet** just for this skill
2. Fund it with only what you're comfortable having in a hot wallet
3. Keep the private key in a secure location (encrypted file or 1Password)
4. Monitor the wallet's activity periodically

## How Rewards Work

The Moonwell vault earns rewards beyond the base APY:

- **MORPHO** — Morpho protocol incentives (~1.5% APR)
- **WELL** — Moonwell governance token (~2% APR)

Rewards are distributed via [Merkl](https://merkl.xyz) and update approximately every 8 hours. The `compound.ts` script handles:

1. Claiming rewards from Merkl distributor
2. Swapping tokens to USDC via [Odos](https://odos.xyz) aggregator
3. Depositing USDC back into the vault

## Dependencies

- Node.js 18+
- [viem](https://viem.sh) — Ethereum interaction
- [tsx](https://tsx.is) — TypeScript execution

## Links

- [Moonwell](https://moonwell.fi) — DeFi lending protocol
- [Moonwell Docs](https://docs.moonwell.fi/moonwell/moonwell-overview/vaults) — Vault documentation
- [Morpho](https://morpho.org) — Lending optimizer
- [Vault on Morpho](https://app.morpho.org/vault?vault=0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca&network=base)
- [Clawdbot](https://github.com/clawdbot/clawdbot) — AI agent framework
- [ClawdHub](https://clawdhub.com) — Skill registry

## License

MIT

---

Built with 🌜🌛 by [Moonwell](https://moonwell.fi)
