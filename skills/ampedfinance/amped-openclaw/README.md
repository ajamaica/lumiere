# Amped OpenClaw Plugin

[![npm version](https://img.shields.io/npm/v/amped-openclaw.svg)](https://www.npmjs.com/package/amped-openclaw)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

DeFi operations plugin for [OpenClaw](https://openclaw.ai) enabling seamless cross-chain swaps, bridging, and money market operations via the [SODAX SDK](https://docs.sodax.com).

## Features

- **🔁 Cross-Chain Swaps** - Execute token swaps across multiple chains via SODAX's intent-based solver network
- **🌉 Token Bridging** - Bridge assets between spoke chains and the Sonic hub chain
- **🏦 Cross-Chain Money Market** - Supply on Chain A, borrow to Chain B - your collateral stays put!
- **📊 Unified Portfolio View** - Cross-chain position aggregator with health metrics, risk analysis & recommendations
- **📜 Intent History** - Query complete swap/bridge history via SODAX API
- **🔐 Security First** - Policy engine with spend limits, slippage caps, allowlists
- **⚡ Dual Mode** - Execute mode (agent signs) or prepare mode (unsigned txs for external signing)

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Quick Start](#quick-start)
- [Available Tools](#available-tools)
- [Usage Examples](#usage-examples)
- [Cross-Chain Money Market](#cross-chain-money-market)
- [API Integration](#api-integration)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [License](#license)

## Installation

### Prerequisites

- Node.js >= 18.0.0
- [OpenClaw](https://openclaw.ai) installed and configured
- **[evm-wallet-skill](https://github.com/surfer77/evm-wallet-skill)** (recommended) - For wallet and RPC configuration

### Quick Install

```bash
openclaw plugins install amped-openclaw
```

Verify with `openclaw plugins list`.

### Install from Source

If you prefer installing from source:

```bash
cd ~/.openclaw/extensions/amped-openclaw
npm install
```

#### 4. Verify Installation

```bash
# List loaded plugins
openclaw plugins list

# Check for amped tools (should see 18 tools)
openclaw tools list | grep amped_oc
```

You should see tools like:

- `amped_oc_supported_chains`
- `amped_oc_swap_quote`
- `amped_oc_mm_supply`
- `amped_oc_cross_chain_positions`
- etc.

### Updating the Plugin

```bash
openclaw plugins uninstall amped-openclaw
openclaw plugins install amped-openclaw
```

### Uninstalling

```bash
openclaw plugins uninstall amped-openclaw
```

### Troubleshooting Installation

**"Cannot find module 'viem'" or similar errors:**

```bash
cd ~/.openclaw/extensions/amped-openclaw
npm install
```

**"plugin not found" after uninstall:**
Edit `~/.openclaw/openclaw.json` and remove the `amped-openclaw` entry from `plugins.entries`.

**Plugin not loading:**
Check OpenClaw logs for errors:

```bash
tail -f ~/.openclaw/logs/openclaw.log
```

## Configuration

### Wallet Setup (Optional)

The plugin works without a wallet for **read-only operations** (quotes, balances, discovery). To execute transactions, configure a wallet using one of the options below.

> **No wallet configured?** The agent will prompt you to install [evm-wallet-skill](https://github.com/amped-finance/evm-wallet-skill) when you try to execute a transaction.

### 🔌 evm-wallet-skill Integration (Recommended)

Install [evm-wallet-skill](https://github.com/amped-finance/evm-wallet-skill) for self-sovereign wallet management:

```bash
git clone https://github.com/amped-finance/evm-wallet-skill.git ~/.openclaw/skills/evm-wallet-skill
cd ~/.openclaw/skills/evm-wallet-skill && npm install
node src/setup.js  # Generate a new wallet
```

The plugin automatically detects wallets from `~/.evm-wallet.json`.

**Supported chains:** Ethereum, Base, Arbitrum, Optimism, Polygon, Sonic, LightLink, HyperEVM, Avalanche, BSC, MegaETH, and more.

**Add custom chains via natural language:**

> "Add Berachain with chain ID 80094 and RPC https://rpc.berachain.com"

Or directly:

```bash
node src/add-chain.js berachain 80094 https://rpc.berachain.com --native-token BERA
```

The plugin will automatically detect and use:

- `EVM_WALLETS_JSON` or `WALLET_CONFIG_JSON`
- `EVM_RPC_URLS_JSON` or `RPC_URLS_JSON`

### 🤖 Bankr Integration

For users with [Bankr](https://bankr.bot) wallets, the plugin supports the Bankr Agent API for transaction execution. This allows agents to execute transactions through Bankr's managed infrastructure.

**Option 1: Environment Variable**

```bash
export BANKR_API_KEY=your-bankr-api-key
```

**Option 2: Config File**

Create `~/.openclaw/extensions/amped-openclaw/config.json`:

```json
{
  "walletBackend": "bankr",
  "bankrApiKey": "your-bankr-api-key"
}
```

> ⚠️ **Important:** Your Bankr API key must have **"Agent API" access enabled** in your Bankr dashboard. A standard bot key won't work.

When configured, the plugin automatically uses Bankr for transaction execution instead of local key signing.

### Manual Configuration

If you're not using evm-wallet-skill, set these environment variables:

#### Required

```bash
# Wallet configuration (JSON map of walletId -> {address, privateKey})
export AMPED_OC_WALLETS_JSON='{
  "main": {
    "address": "0xYourWalletAddress",
    "privateKey": "0xYourPrivateKey"
  },
  "trading": {
    "address": "0xAnotherAddress",
    "privateKey": "0xAnotherPrivateKey"
  }
}'

# RPC URLs for all supported chains
export AMPED_OC_RPC_URLS_JSON='{
  "ethereum": "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
  "arbitrum": "https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY",
  "base": "https://base-mainnet.g.alchemy.com/v2/YOUR_KEY",
  "sonic": "https://rpc.soniclabs.com"
}'
```

#### Optional

```bash
# Operation mode: "execute" (default) or "prepare"
export AMPED_OC_MODE=execute

# Enable dynamic SODAX config (fetches from API)
export AMPED_OC_SODAX_DYNAMIC_CONFIG=true

# Policy limits (JSON)
export AMPED_OC_LIMITS_JSON='{
  "default": {
    "maxSlippageBps": 100,
    "maxSwapInputUsd": 10000,
    "maxBorrowUsd": 50000,
    "allowedChains": ["ethereum", "arbitrum", "base", "sonic"],
    "allowedTokensByChain": {
      "ethereum": ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"]
    }
  }
}'

# SODAX API configuration
export SODAX_API_URL=https://canary-api.sodax.com  # or https://api.sodax.com
export SODAX_API_KEY=your-api-key  # if required
```

### 🏦 Bankr Integration (Alternative Wallet Backend)

Instead of using local private keys, you can use [Bankr](https://bankr.bot) as your wallet backend. Bankr manages keys securely and executes transactions on your behalf via their AI Agent API.

#### Why Bankr?

- **No private key exposure** - Keys stay with Bankr, never in your config
- **Multi-chain support** - Base, Ethereum, Polygon, Solana, and more
- **Built-in trading features** - DCA, limit orders, stop-loss
- **Social trading** - Send to ENS, Twitter handles, Farcaster

#### Setup

1. **Create a Bankr account** at [bankr.bot](https://bankr.bot)

2. **Generate an API key** at [bankr.bot/api](https://bankr.bot/api)
   - Enable **"Agent API"** access on the key

3. **Configure the plugin:**

```bash
# Set your Bankr API key
export BANKR_API_KEY=bk_your_api_key_here

# Optionally specify the backend explicitly
export AMPED_OC_WALLET_BACKEND=bankr
```

Or via config file (`~/.openclaw/extensions/amped-openclaw/config.json`):

```json
{
  "walletBackend": "bankr",
  "bankrApiKey": "bk_your_api_key_here",
  "bankrApiUrl": "https://api.bankr.bot"
}
```

#### How It Works

When using Bankr backend:

1. Plugin prepares transaction calldata (approvals, swaps, etc.)
2. Submits to Bankr Agent API as an execution request
3. Bankr signs and broadcasts the transaction
4. Plugin receives transaction hash on completion

#### Important Notes

- **Separate wallet**: Your Bankr wallet address is different from your personal wallets
- **Check your address**: Run `"What is my wallet address?"` in Bankr terminal
- **Fund the wallet**: Send ETH/gas tokens to your Bankr wallet before trading
- **Rate limits**: Agent API may have rate limits depending on your plan

#### Bankr vs Local Keys

| Feature     | Local Keys            | Bankr              |
| ----------- | --------------------- | ------------------ |
| Key storage | Your machine          | Bankr servers      |
| Setup       | Configure private key | API key only       |
| Security    | You manage keys       | Bankr manages keys |
| Execution   | Direct RPC calls      | Via Bankr API      |
| Speed       | Instant               | ~2-45 seconds      |
| Features    | Basic tx signing      | Full trading suite |

## Quick Start

```typescript
import { activate, deactivate } from '@amped/openclaw-plugin'

// In your OpenClaw agent setup
async function setupAgent(agentTools) {
  // Activate the plugin
  await activate(agentTools)

  // Plugin is now ready with all tools registered
  // Tools can be called via the agent
}

// Cleanup when done
await deactivate()
```

## Available Tools

### Wallet Management Tools (5)

| Tool                          | Description                                              |
| ----------------------------- | -------------------------------------------------------- |
| `amped_oc_list_wallets`       | List all configured wallets with nicknames and addresses |
| `amped_oc_add_wallet`         | Add a new wallet with a nickname                         |
| `amped_oc_rename_wallet`      | Rename an existing wallet                                |
| `amped_oc_remove_wallet`      | Remove a wallet from configuration                       |
| `amped_oc_set_default_wallet` | Set which wallet to use by default                       |

### Discovery Tools (8)

| Tool                              | Description                                     |
| --------------------------------- | ----------------------------------------------- |
| `amped_oc_supported_chains`       | List all supported spoke chains                 |
| `amped_oc_supported_tokens`       | Get supported tokens by module and chain        |
| `amped_oc_wallet_address`         | Resolve wallet address by walletId              |
| `amped_oc_money_market_reserves`  | View market reserves and liquidity              |
| `amped_oc_money_market_positions` | View positions on a single chain                |
| `amped_oc_cross_chain_positions`  | ⭐ **Unified portfolio view across ALL chains** |
| `amped_oc_user_intents`           | Query intent history via SODAX API              |

### Swap Tools (4)

| Tool                    | Description                            |
| ----------------------- | -------------------------------------- |
| `amped_oc_swap_quote`   | Get exact-in/exact-out swap quote      |
| `amped_oc_swap_execute` | Execute swap with policy enforcement   |
| `amped_oc_swap_status`  | Check swap status by txHash/intentHash |
| `amped_oc_swap_cancel`  | Cancel pending swap intent             |

### Bridge Tools (3)

| Tool                       | Description                            |
| -------------------------- | -------------------------------------- |
| `amped_oc_bridge_discover` | Discover bridgeable tokens for a route |
| `amped_oc_bridge_quote`    | Check bridgeability and max amount     |
| `amped_oc_bridge_execute`  | Execute bridge operation               |

### Money Market Tools (4)

| Tool                   | Description                          |
| ---------------------- | ------------------------------------ |
| `amped_oc_mm_supply`   | Supply tokens as collateral          |
| `amped_oc_mm_withdraw` | Withdraw supplied tokens             |
| `amped_oc_mm_borrow`   | Borrow tokens (cross-chain capable!) |
| `amped_oc_mm_repay`    | Repay borrowed tokens                |

## Wallet Management

Manage wallets through natural language or tool calls:

### Natural Language Examples

```
"What wallets do I have?"
"Add a wallet called trading with address 0x... and private key 0x..."
"Rename main to savings"
"Make bankr my default wallet"
"Remove the trading wallet"
```

### Multiple Wallet Support

| Source           | Default Nickname | Supported Chains        |
| ---------------- | ---------------- | ----------------------- |
| evm-wallet-skill | `main`           | All SODAX chains        |
| Bankr            | `bankr`          | Ethereum, Base, Polygon |
| Environment      | Custom           | All SODAX chains        |

### Using Wallets in Operations

Specify a wallet nickname in any operation:

```typescript
// Swap using a specific wallet
await agent.call('amped_oc_swap_execute', {
  walletId: 'trading', // Use the "trading" wallet
  quote: quoteResult,
  maxSlippageBps: 50,
})
```

Or in natural language:

```
"Swap 100 USDC to ETH using trading"
"Check balance on bankr"
```

### Wallet Config File

Configurations persist to `~/.openclaw/extensions/amped-openclaw/wallets.json`:

```json
{
  "wallets": {
    "trading": {
      "source": "env",
      "address": "0x...",
      "privateKey": "0x..."
    }
  },
  "default": "main"
}
```

## Usage Examples

### 1. Cross-Chain Position View (Recommended)

Get a complete portfolio overview across all chains:

```typescript
const positions = await agentTools.call('amped_oc_cross_chain_positions', {
  walletId: 'main'
});

// Response:
{
  summary: {
    totalSupplyUsd: "25000.00",
    totalBorrowUsd: "8000.00",
    netWorthUsd: "17000.00",
    availableBorrowUsd: "12000.00",
    healthFactor: "2.65",
    healthFactorStatus: { status: "healthy", color: "green" },
    liquidationRisk: "none",
    weightedSupplyApy: "4.52%",
    weightedBorrowApy: "3.21%",
    netApy: "2.89%"
  },
  chainBreakdown: [
    { chainId: "ethereum", supplyUsd: "15000.00", borrowUsd: "5000.00", healthFactor: "2.80" },
    { chainId: "arbitrum", supplyUsd: "5000.00", borrowUsd: "2000.00", healthFactor: "2.50" },
    { chainId: "sonic", supplyUsd: "5000.00", borrowUsd: "1000.00", healthFactor: "5.00" }
  ],
  collateralUtilization: {
    totalCollateralUsd: "20000.00",
    usedCollateralUsd: "8000.00",
    utilizationRate: "40.00%"
  },
  riskMetrics: {
    maxLtv: "80.00%",
    currentLtv: "32.00%",
    bufferUntilLiquidation: "53.00%",
    safeMaxBorrowUsd: "13600.00"
  },
  recommendations: [
    "💡 You have $12000.00 in available borrowing power.",
    "🌐 You have positions across 3 chains."
  ]
}
```

### 2. Cross-Chain Swap

```typescript
// Step 1: Get quote
const quote = await agentTools.call('amped_oc_swap_quote', {
  walletId: 'main',
  srcChainId: 'ethereum',
  dstChainId: 'arbitrum',
  srcToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  dstToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDT
  amount: '1000',
  type: 'exact_input',
  slippageBps: 100,
})

// Step 2: Execute
const result = await agentTools.call('amped_oc_swap_execute', {
  walletId: 'main',
  quote: quote,
  maxSlippageBps: 100,
})

// Returns: { spokeTxHash, hubTxHash, intentHash, status }
```

### 3. Query Intent History

```typescript
const history = await agentTools.call('amped_oc_user_intents', {
  walletId: 'main',
  status: 'all', // 'all', 'open', or 'closed'
  limit: 50,
  offset: 0,
})

// Returns paginated intent history with event details
```

## Cross-Chain Money Market

The plugin's standout feature is **cross-chain money market operations**:

```
Supply USDC on Ethereum → Borrow USDT on Arbitrum
```

Your collateral stays on the source chain, but you receive borrowed tokens on the destination chain.

### Example: Cross-Chain Borrow

```typescript
// Step 1: Supply on Ethereum
await agentTools.call('amped_oc_mm_supply', {
  walletId: 'main',
  chainId: 'ethereum',
  token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  amount: '50000',
  useAsCollateral: true,
})

// Step 2: Borrow to Arbitrum (different chain!)
await agentTools.call('amped_oc_mm_borrow', {
  walletId: 'main',
  chainId: 'ethereum', // Collateral source
  dstChainId: 'arbitrum', // Borrowed tokens destination
  token: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDT
  amount: '20000',
  interestRateMode: 2, // Variable rate
})

// Result: User has 20k USDT on Arbitrum, 50k USDC collateral remains on Ethereum
```

## API Integration

The plugin integrates with the SODAX backend API for enhanced querying:

| Environment          | Base URL                       |
| -------------------- | ------------------------------ |
| Canary (Pre-release) | `https://canary-api.sodax.com` |
| Production           | `https://api.sodax.com`        |

### Features:

- **Paginated Intent History** - Query all intents with offset/limit
- **Status Filtering** - Filter by open/closed status
- **Chain/Token Filtering** - Filter by source/destination chain or token
- **Event History** - Full event log for each intent (fills, cancels, etc.)

### API Configuration:

```bash
export SODAX_API_URL=https://canary-api.sodax.com
export SODAX_API_KEY=your-api-key  # if required
```

## Partner Fee Configuration

To earn partner fees from swaps and bridges, modify the hardcoded values in `src/sodax/client.ts`:

```typescript
// src/sodax/client.ts

// HARDCODED PARTNER CONFIGURATION
const PARTNER_ADDRESS: string | undefined = '0xYourPartnerWalletAddress'
const PARTNER_FEE_BPS: number | undefined = 10 // 0.1%
```

Partner fees are automatically collected from swap and bridge operations and sent to the specified address. These values are hardcoded to ensure consistent fee collection across all plugin instances.

## Error Handling

The plugin provides structured error codes for better debugging:

```typescript
import { ErrorCode, wrapError } from '@amped/openclaw-plugin'

try {
  await agentTools.call('amped_oc_swap_execute', params)
} catch (error) {
  const ampedError = wrapError(error)

  console.log(ampedError.code) // POLICY_SLIPPAGE_EXCEEDED
  console.log(ampedError.message) // Human-readable message
  console.log(ampedError.remediation) // Suggestion to fix
}
```

### Error Categories:

- **Policy Errors** - Slippage exceeded, spend limits, chain/token restrictions
- **Wallet Errors** - Not found, invalid address, missing private key
- **Transaction Errors** - Failed, timeout, rejected, simulation failed
- **SDK Errors** - Not initialized, configuration errors

## Troubleshooting

### Plugin Not Loading in OpenClaw

**Issue:** Tools not showing up in `openclaw tools list`

**Solutions:**

1. Ensure dependencies are installed in the extension directory:

   ```bash
   cd ~/.openclaw/extensions/amped-openclaw
   npm install
   ```

2. Check OpenClaw config has the plugin enabled:

   ```yaml
   plugins:
     entries:
       amped-openclaw:
         enabled: true
   ```

3. Check OpenClaw logs for errors:
   ```bash
   tail -100 ~/.openclaw/logs/openclaw.log
   ```

### "Cannot find module" Errors

This means dependencies weren't installed in the extension directory:

```bash
cd ~/.openclaw/extensions/amped-openclaw
npm install
```

### "plugin not found" After Uninstall

Edit `~/.openclaw/openclaw.json` and remove the stale entry:

```bash
# Remove the amped-openclaw entry from plugins.entries
nano ~/.openclaw/openclaw.json
```

### Wallet Not Found Errors

Ensure you have either:

- `EVM_WALLETS_JSON` set (if using evm-wallet-skill)
- `AMPED_OC_WALLETS_JSON` set (plugin-specific)
- Or configure via OpenClaw plugin settings

### RPC URL Not Configured

Ensure you have either:

- `EVM_RPC_URLS_JSON` set (if using evm-wallet-skill)
- `AMPED_OC_RPC_URLS_JSON` set (plugin-specific)
- Or configure via OpenClaw plugin settings

## Testing

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Type check
npm run typecheck

# Lint
npm run lint
```

### Test Coverage

- ✅ Error handling utilities
- ✅ Policy engine
- ✅ Position aggregator
- ✅ Wallet registry
- ✅ SODAX API client

## Project Structure

```
src/
├── index.ts                    # Plugin entry point
├── types.ts                    # Shared TypeScript types
├── sodax/
│   └── client.ts               # SODAX SDK singleton client
├── providers/
│   └── spokeProviderFactory.ts # Evm/Sonic spoke provider factory
├── wallet/
│   └── walletRegistry.ts       # Wallet resolution by walletId
├── policy/
│   └── policyEngine.ts         # Security policy enforcement
├── tools/
│   ├── discovery.ts            # Discovery/read tools
│   ├── swap.ts                 # Swap operations
│   ├── bridge.ts               # Bridge operations
│   └── moneyMarket.ts          # Money market operations
├── utils/
│   ├── errors.ts               # Error handling utilities
│   ├── positionAggregator.ts   # Cross-chain position aggregation
│   └── sodaxApi.ts             # SODAX backend API client
└── __tests__/                  # Test suite
```

## Architecture

### Cross-Chain Money Market Flow

```
┌─────────────┐         ┌─────────┐         ┌─────────────┐
│  Ethereum   │ ──────► │  Sonic  │ ──────► │  Arbitrum   │
│  (Supply)   │         │  (Hub)  │         │  (Borrow)   │
└─────────────┘         └─────────┘         └─────────────┘
       │                      │                     │
       │  1. Supply USDC      │                     │
       │  2. Record collateral│                     │
       │─────────────────────►│                     │
       │                      │  3. Verify collateral
       │                      │  4. Process borrow  │
       │                      │────────────────────►│
       │                      │                     │ 5. Deliver USDT
```

### Security Model

- **Key Segregation** - Each agent workspace has distinct wallet configurations
- **Spoke Provider Caching** - Cached per `walletId`, never shared across agents
- **Policy Enforcement** - Spend limits, slippage caps, chain/token allowlists
- **Simulation** - Transactions simulated before execution by default
- **No Key Logging** - Private keys never logged or exposed

## Supported Chains

| Chain     | Chain ID    | Type |
| --------- | ----------- | ---- |
| Ethereum  | `ethereum`  | EVM  |
| Arbitrum  | `arbitrum`  | EVM  |
| Base      | `base`      | EVM  |
| Optimism  | `optimism`  | EVM  |
| Avalanche | `avalanche` | EVM  |
| BSC       | `bsc`       | EVM  |
| Sonic     | `sonic`     | Hub  |

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [https://docs.sodax.com](https://docs.sodax.com)
- **Issues**: [GitHub Issues](https://github.com/amped-finance/amped-openclaw/issues)
- **Discord**: [Amped Finance Community](https://discord.gg/amped)

---

<p align="center">
  Built with ❤️ by <a href="https://amped.finance">Amped Finance</a>
</p>
