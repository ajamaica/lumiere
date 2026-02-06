# Mamo CLI

[![CI](https://github.com/moonwell-fi/openclaw-mamo-skill/actions/workflows/ci.yml/badge.svg)](https://github.com/moonwell-fi/openclaw-mamo-skill/actions/workflows/ci.yml)

A command-line interface for [Mamo](https://mamo.xyz), the DeFi yield aggregator built by [Moonwell](https://moonwell.fi) on Base.

## What is Mamo?

Mamo deploys personal smart contracts for each user that automatically:

- Split deposits between Moonwell core markets and Morpho vaults for optimal yield
- Claim and compound rewards (WELL, MORPHO) via CowSwap
- Maintain full user custody - only your wallet can withdraw

## Installation

### Global Installation (Recommended)

```bash
npm install -g mamo-cli
```

After installation, the `mamo` command will be available globally:

```bash
mamo --help
```

### Local Development

```bash
git clone https://github.com/moonwell-fi/openclaw-mamo-skill.git
cd openclaw-mamo-skill
npm install
npm run build
npm link  # Makes 'mamo' command available locally
```

## Quick Start

```bash
# Set your wallet private key
export MAMO_WALLET_KEY=0x...

# Check available APY rates
mamo apy

# Create a USDC yield strategy
mamo create usdc_stablecoin

# Deposit 100 USDC
mamo deposit 100 usdc

# Check your positions
mamo status

# Withdraw 50 USDC
mamo withdraw 50 usdc

# Withdraw everything
mamo withdraw all usdc
```

## Commands

### `mamo create <strategy>`

Create a yield strategy on-chain. This deploys a personal ERC1967 proxy contract owned by your wallet.

```bash
mamo create usdc_stablecoin
mamo create cbbtc_lending
mamo create eth_lending
```

### `mamo deposit <amount> <token>`

Deposit tokens into your yield strategy. The CLI will handle token approval if needed.

```bash
mamo deposit 100 usdc
mamo deposit 0.5 cbbtc
mamo deposit 1.0 eth
```

### `mamo withdraw <amount|all> <token>`

Withdraw tokens from your yield strategy. Use `all` to withdraw the entire balance.

```bash
mamo withdraw 50 usdc
mamo withdraw all cbbtc
```

### `mamo status`

Display account overview including wallet balances and strategy positions.

```bash
mamo status
mamo --json status  # Output as JSON
```

### `mamo apy [strategy]`

Show current APY rates for all strategies or a specific one.

```bash
mamo apy
mamo apy usdc_stablecoin
```

## Global Options

| Option      | Description                                      |
| ----------- | ------------------------------------------------ |
| `--dry-run` | Simulate transactions without executing on-chain |
| `--json`    | Output results as JSON (useful for scripting)    |
| `--help`    | Display help information                         |
| `--version` | Display version number                           |

## Supported Strategies

| Strategy          | Token | Description              |
| ----------------- | ----- | ------------------------ |
| `usdc_stablecoin` | USDC  | Stablecoin lending/yield |
| `cbbtc_lending`   | cbBTC | Bitcoin lending          |
| `eth_lending`     | ETH   | Ethereum lending         |
| `mamo_staking`    | MAMO  | MAMO token staking       |

## Configuration

### Environment Variables

| Variable          | Required | Description                                         |
| ----------------- | -------- | --------------------------------------------------- |
| `MAMO_WALLET_KEY` | Yes      | Hex private key for wallet signing and transactions |
| `MAMO_RPC_URL`    | No       | Base RPC URL (default: `https://mainnet.base.org`)  |

### Setting Up

Create a `.env` file in your working directory or export variables:

```bash
# Option 1: Environment variables
export MAMO_WALLET_KEY=0xYourPrivateKeyHere
export MAMO_RPC_URL=https://mainnet.base.org

# Option 2: .env file
echo "MAMO_WALLET_KEY=0xYourPrivateKeyHere" > .env
```

## How It Works

### Deposits

1. **Create strategy** - `mamo create usdc_stablecoin` calls the Mamo API to deploy a personal ERC1967 proxy contract owned by your wallet
2. **Approve** - CLI checks allowance and approves the strategy contract to spend your tokens
3. **Deposit** - CLI calls `deposit(amount)` on your strategy contract, which transfers tokens and splits them between Moonwell + Morpho
4. **Auto-compound** - Mamo's backend periodically claims WELL/MORPHO rewards and compounds them via CowSwap

### Withdrawals

Only the wallet owner can withdraw. The strategy contract pulls funds from Moonwell and Morpho as needed, then transfers tokens directly to your wallet.

## Security

**This CLI manages real funds on Base mainnet.**

- Use a **dedicated hot wallet** - never your main holdings wallet
- Only deposit what you're comfortable having in a hot wallet
- Store `MAMO_WALLET_KEY` in environment variables, never in committed files
- All transactions are simulated before execution
- Contract addresses are verified against the Mamo Strategy Registry

## Examples

### Basic Workflow

```bash
# 1. Check current APY rates
mamo apy

# 2. Create a strategy
mamo create usdc_stablecoin

# 3. Deposit tokens
mamo deposit 1000 usdc

# 4. Check your position
mamo status

# 5. Withdraw when ready
mamo withdraw all usdc
```

### Dry Run Mode

Test commands without executing on-chain:

```bash
mamo --dry-run deposit 100 usdc
mamo --dry-run withdraw all usdc
```

### JSON Output for Scripting

```bash
# Get status as JSON
mamo --json status | jq '.strategies'

# Get APY data
mamo --json apy | jq '.rates'
```

## Troubleshooting

### "MAMO_WALLET_KEY not set"

Make sure your private key is exported:

```bash
export MAMO_WALLET_KEY=0x...
```

### "Insufficient balance"

Check your wallet balance with `mamo status` before depositing.

### "Strategy not found"

Create a strategy first with `mamo create <strategy>` before depositing.

## Dependencies

- [viem](https://viem.sh) - Ethereum client (wallet, contracts, transactions)
- [siwe](https://login.xyz) - Sign-In With Ethereum message creation
- [commander](https://github.com/tj/commander.js) - CLI framework

## Links

- [Mamo](https://mamo.xyz) - Yield aggregator
- [Moonwell](https://moonwell.fi) - DeFi lending protocol
- [Mamo Docs](https://docs.mamo.xyz) - Documentation
- [Mamo Contracts](https://github.com/moonwell-fi/mamo-contracts) - Smart contract source

## License

MIT

Built by [Moonwell](https://moonwell.fi)
