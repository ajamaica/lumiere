---
name: openclaw-wallet
description: |
  Multi-chain wallet and trading tools for AI agents. Provides 27 tools for: wallet management (create, balance, export keys), token swaps with flexible amounts ($100, 50%, max), cross-chain bridges, DEX market data (trending, volume, gainers/losers), token launches with tiered market caps, and fee management. Supports Solana and EVM chains. Use when agents need to interact with wallets, execute trades, research tokens, or launch tokens.
homepage: https://github.com/loomlay/openclaw-wallet
metadata:
  {
    'openclaw':
      {
        'requires': { 'env': ['LOOMLAY_API_KEY'] },
        'primaryEnv': 'LOOMLAY_API_KEY',
        'optionalEnv': ['LOOMLAY_BASE_URL'],
        'install': 'npm install @loomlay/openclaw-wallet-plugin',
      },
  }
---

# OpenClaw Wallet Plugin

Multi-chain wallet and trading toolkit for AI agents with 27 tools.

## Installation

**You must install the npm package before using any tools:**

```bash
npm install @loomlay/openclaw-wallet-plugin
```

This installs the plugin and all its dependencies. No additional packages needed.

**Authentication is automatic.** On first use, the plugin auto-registers for an API key and saves it to `~/.loomlay/credentials.json`. No manual setup required.

To use a specific API key instead of auto-registration:

```bash
export LOOMLAY_API_KEY=agent_your_key_here
```

## How to Use the Tools

All 27 tools are exported as **flat async functions** from the plugin package. Use them in Node.js like this:

```javascript
const {
  wallet_get,
  swap_quote,
  swap,
  dex_trending,
  token_search,
} = require('@loomlay/openclaw-wallet-plugin')

// Check wallet balance
const wallet = await wallet_get()
// wallet.data.balances.solana.sol

// Get trending tokens
const trending = await dex_trending({ chain: 'solana', limit: 10 })
// trending.data.pairs[...]
```

Every tool returns a standardized response:

```javascript
{
  success: true,       // or false
  data: { ... },       // result data (when success is true)
  error: {             // error info (when success is false)
    message: "...",
    code: "RATE_LIMITED",
    retryAfter: 30     // seconds (for rate limits)
  }
}
```

**Always check `result.success` before using `result.data`.**

## Important: Verify Before Executing

For any action involving funds:

1. **Get a quote first** — show the user what will happen
2. **Get user confirmation** — never execute without approval
3. **Execute** — run the transaction
4. **Verify** — check the result and new balances

```javascript
const { swap_quote, swap } = require('@loomlay/openclaw-wallet-plugin')

// Step 1: Quote
const quote = await swap_quote({ inputToken: 'SOL', outputToken: 'USDC', amount: '$100' })
// Tell user: "You'll swap ~1.2 SOL for ~$99.50 USDC"

// Step 2: User confirms → Step 3: Execute
const result = await swap({ inputToken: 'SOL', outputToken: 'USDC', amount: '$100' })
if (result.success) {
  // Show txHash and new balance
}
```

## Security Rules

- **Never log seed phrases** — `wallet_create()` returns it once, tell user to save it offline
- **Never execute without user confirmation** — always quote first
- **Never guess token addresses** — use `token_search()` to find them
- **Never hardcode API keys** — use environment variables

## Amount Formats

Trading tools accept flexible amounts:

| Format     | Example  | Meaning                      |
| ---------- | -------- | ---------------------------- |
| Decimal    | `"1.5"`  | Exact token amount           |
| USD        | `"$100"` | Dollar value (auto-converts) |
| Percentage | `"50%"`  | Half of balance              |
| Max        | `"max"`  | Entire balance               |

## All 27 Tools Reference

### Wallet (3)

```javascript
const { wallet_create, wallet_get, wallet_export_keys } = require('@loomlay/openclaw-wallet-plugin')

// Create new wallet (returns seed phrase ONCE)
await wallet_create()
// → { wallet: { solanaAddress, evmAddress }, seedPhrase, message }

// Get wallet addresses and balances
await wallet_get()
// → { wallet: { solanaAddress, evmAddress }, balances: { solana, evm } }

// Export private keys (requires seed phrase)
await wallet_export_keys({ seedPhrase: '12 word phrase here' })
// → { solanaPrivateKey, evmPrivateKey }
```

### Trading (5)

```javascript
const {
  swap,
  swap_quote,
  transfer,
  bridge,
  bridge_quote,
} = require('@loomlay/openclaw-wallet-plugin')

// Swap tokens
await swap({ inputToken: 'SOL', outputToken: 'USDC', amount: '$100', chain: 'solana', slippage: 1 })
// → { success, txHash, inputAmount, outputAmount }

// Get swap quote (no execution)
await swap_quote({ inputToken: 'SOL', outputToken: 'USDC', amount: '$100' })
// → { inputAmount, outputAmount, minOutputAmount, priceImpact, route }

// Transfer tokens
await transfer({ token: 'SOL', amount: '1.5', to: 'recipient_address' })
// → { success, txHash, amount, token, to }

// Bridge cross-chain
await bridge({ inputToken: 'SOL', amount: '1', sourceChain: 'solana', destinationChain: 'base' })
// → { success, sourceTxHash, destinationTxHash, status }

// Bridge quote
await bridge_quote({
  inputToken: 'SOL',
  amount: '1',
  sourceChain: 'solana',
  destinationChain: 'base',
})
// → { inputAmount, outputAmount, fee, estimatedTime }
```

### Tokens (4)

```javascript
const {
  token_search,
  token_price,
  token_details,
  token_chart,
} = require('@loomlay/openclaw-wallet-plugin')

// Search tokens by name/symbol
await token_search({ query: 'BONK' })
// → { tokens: [{ address, symbol, name, price, safetyScore }] }

// Get token price
await token_price({ token: 'SOL', chain: 'solana' })
// → { token, price, chain }

// Get detailed token info
await token_details({ address: 'token_mint_address' })
// → { token, market, safety }

// Get OHLCV chart data
await token_chart({ address: 'token_mint_address' })
// → { data: [...] }
```

### Portfolio (2)

```javascript
const { portfolio_get, portfolio_history } = require('@loomlay/openclaw-wallet-plugin')

// Get combined portfolio across all chains
await portfolio_get()
// → { positions: [...], totalUsdValue: number }

// Get transaction history
await portfolio_history({ chain: 'solana', limit: 50 })
// → { transactions: [...] }
```

### DEX Market Data (7)

```javascript
const {
  dex_trending,
  dex_volume,
  dex_gainers,
  dex_losers,
  dex_new,
  dex_pumpfun,
  dex_query,
} = require('@loomlay/openclaw-wallet-plugin')

// Trending pairs
await dex_trending({ chain: 'solana', minLiquidity: 10000, limit: 10 })
// → { pairs: [...], pagination }

// Top volume pairs
await dex_volume({ chain: 'solana', minLiquidity: 10000, limit: 10 })

// Top gainers (24h)
await dex_gainers({ chain: 'solana', minLiquidity: 10000, limit: 10 })

// Top losers (24h)
await dex_losers({ chain: 'solana', minLiquidity: 10000, limit: 10 })

// Newly created pairs (< 24h)
await dex_new({ chain: 'solana', minLiquidity: 5000, limit: 10 })

// Pumpfun trending (Solana only)
await dex_pumpfun({ maxAge: 6, maxProgress: 80, limit: 10 })

// Advanced query with custom filters
await dex_query({
  chain: 'solana',
  timeframe: 'h24',
  rankBy: 'volume',
  order: 'desc',
  minSafetyScore: 80,
  limit: 10,
})
```

### Token Launch (2)

```javascript
const { tokenize_launch, tokenize_info } = require('@loomlay/openclaw-wallet-plugin')

// Launch a token (one per account)
await tokenize_launch({
  name: 'My Token',
  symbol: 'MYT',
  tier: '100k', // 10k, 100k, 1m, 10m
  imageUrl: 'https://...',
})
// → { success, launchId, tokenMint, poolAddress, dexscreenerUrl }

// Get your launched token info
await tokenize_info()
// → { hasToken, launchId, tokenMint, poolAddress, dexscreenerUrl }
```

### Fees (2)

```javascript
const { fees_status, fees_claim } = require('@loomlay/openclaw-wallet-plugin')

// Check fee status
await fees_status()
// → { totalFeesGeneratedSol, beneficiaryFeesUnclaimedSol, canClaim, feeForfeitsAt }

// Claim fees (platform pays gas)
await fees_claim()
// → { success, amountSol, txSignature }
```

### RPC (2)

```javascript
const { rpc_call, rpc_chains } = require('@loomlay/openclaw-wallet-plugin')

// Direct RPC call
await rpc_call({ chain: 'solana', method: 'getBalance', params: ['address'] })
// → { result, error }

// List supported chains
await rpc_chains()
// → { chains: [...] }
```

## Supported Chains

| Chain    | Swaps | Bridges | RPC |
| -------- | ----- | ------- | --- |
| Solana   | yes   | yes     | yes |
| Ethereum | yes   | yes     | yes |
| Base     | yes   | yes     | yes |
| Arbitrum | yes   | yes     | yes |
| Optimism | yes   | yes     | yes |
| Polygon  | yes   | yes     | yes |
| BSC      | yes   | yes     | yes |

## Error Handling

```javascript
const result = await swap({ inputToken: 'SOL', outputToken: 'USDC', amount: '1' })

if (!result.success) {
  switch (result.error?.code) {
    case 'RATE_LIMITED':
      // Wait result.error.retryAfter seconds and retry
      break
    case 'BAD_REQUEST':
      // Invalid parameters
      break
    case 'UNAUTHORIZED':
      // API key issue — check LOOMLAY_API_KEY or ~/.loomlay/credentials.json
      break
    case 'INSUFFICIENT_BALANCE':
      // Not enough funds
      break
    default:
      // General error
      break
  }
}
```

## Reference Documents

- `references/wallet-operations.md` - Wallet creation, security, key export
- `references/trading-guide.md` - Swaps, transfers, bridges with amount formats
- `references/market-analysis.md` - DEX data, trending, filtering
- `references/token-launch.md` - Tokenize workflow, tiers, fee structure
- `references/error-handling.md` - Error types, recovery patterns, retries
- `references/amount-formats.md` - Flexible amounts explained
- `references/chain-reference.md` - Supported chains and behaviors

## Workflows

- `workflows/first-time-setup.md` - Installation → wallet creation → first trade
- `workflows/token-launch-playbook.md` - Complete token launch guide
