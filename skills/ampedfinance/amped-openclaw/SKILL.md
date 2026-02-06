---
name: amped-openclaw
description: DeFi operations plugin for OpenClaw enabling cross-chain swaps, bridging, and money market operations via SODAX. Use when building trading bots, DeFi agents, or portfolio management tools that need cross-chain execution.
---

# Amped OpenClaw Plugin

DeFi operations plugin for [OpenClaw](https://openclaw.ai) enabling cross-chain swaps, bridging, and money market operations via the [SODAX SDK](https://docs.sodax.com).

## Features

- 🔁 **Cross-Chain Swaps** — Execute token swaps across Ethereum, Arbitrum, Base, Optimism, Avalanche, BSC, Sonic
- 🌉 **Token Bridging** — Bridge assets between spoke chains and the Sonic hub chain
- 🏦 **Cross-Chain Money Market** — Supply on Chain A, borrow to Chain B (your collateral stays put!)
- 📊 **Unified Portfolio View** — Cross-chain position aggregator with health metrics, risk analysis & recommendations
- 📜 **Intent History** — Query complete swap/bridge history via SODAX API
- 🔐 **Security First** — Policy engine with spend limits, slippage caps, allowlists

## Installation

```bash
openclaw plugins install amped-openclaw
```

Verify with:

```bash
openclaw plugins list
openclaw tools list | grep amped_oc
```

## Wallet Setup

The plugin works **without a wallet** for read-only operations (quotes, balances, discovery). To execute transactions, install [evm-wallet-skill](https://github.com/amped-finance/evm-wallet-skill):

```bash
git clone https://github.com/amped-finance/evm-wallet-skill.git ~/.openclaw/skills/evm-wallet-skill
cd ~/.openclaw/skills/evm-wallet-skill && npm install
node src/setup.js  # Generate a new wallet
```

Or use [Bankr](https://bankr.bot) for managed key infrastructure:

```bash
export BANKR_API_KEY=your-bankr-api-key
```

## Available Tools (23 Total)

### Discovery

| Tool                             | Description                                 |
| -------------------------------- | ------------------------------------------- |
| `amped_oc_supported_chains`      | List all supported spoke chains             |
| `amped_oc_supported_tokens`      | Get supported tokens by module and chain    |
| `amped_oc_cross_chain_positions` | ⭐ Unified portfolio view across ALL chains |
| `amped_oc_user_intents`          | Query intent history via SODAX API          |

### Swap & Bridge

| Tool                      | Description                          |
| ------------------------- | ------------------------------------ |
| `amped_oc_swap_quote`     | Get exact-in/exact-out swap quote    |
| `amped_oc_swap_execute`   | Execute swap with policy enforcement |
| `amped_oc_bridge_quote`   | Check bridgeability and max amount   |
| `amped_oc_bridge_execute` | Execute bridge operation             |

### Money Market

| Tool                   | Description                          |
| ---------------------- | ------------------------------------ |
| `amped_oc_mm_supply`   | Supply tokens as collateral          |
| `amped_oc_mm_withdraw` | Withdraw supplied tokens             |
| `amped_oc_mm_borrow`   | Borrow tokens (cross-chain capable!) |
| `amped_oc_mm_repay`    | Repay borrowed tokens                |

### Wallet Management

| Tool                          | Description                    |
| ----------------------------- | ------------------------------ |
| `amped_oc_list_wallets`       | List all configured wallets    |
| `amped_oc_add_wallet`         | Add a new wallet with nickname |
| `amped_oc_set_default_wallet` | Set default wallet             |

## Example: Cross-Chain Swap

```
"Swap 1000 USDC on Ethereum to USDT on Arbitrum"
```

Or via tools:

```typescript
// Get quote
const quote = await agent.call('amped_oc_swap_quote', {
  walletId: 'main',
  srcChainId: 'ethereum',
  dstChainId: 'arbitrum',
  srcToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  dstToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDT
  amount: '1000',
  type: 'exact_input',
})

// Execute
const result = await agent.call('amped_oc_swap_execute', {
  walletId: 'main',
  quote: quote,
  maxSlippageBps: 100,
})
```

## Example: Cross-Chain Money Market

Supply on Ethereum, borrow on Arbitrum:

```typescript
// Supply on Ethereum
await agent.call('amped_oc_mm_supply', {
  walletId: 'main',
  chainId: 'ethereum',
  token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  amount: '50000',
  useAsCollateral: true,
})

// Borrow to Arbitrum (different chain!)
await agent.call('amped_oc_mm_borrow', {
  walletId: 'main',
  chainId: 'ethereum', // Collateral source
  dstChainId: 'arbitrum', // Borrowed tokens destination
  token: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDT
  amount: '20000',
})
```

## Supported Chains

Ethereum, Arbitrum, Base, Optimism, Avalanche, BSC, Polygon, Sonic (hub), LightLink, HyperEVM, MegaETH

## Resources

- **npm:** https://www.npmjs.com/package/amped-openclaw
- **GitHub:** https://github.com/amped-finance/amped-openclaw
- **SODAX Docs:** https://docs.sodax.com
- **Discord:** https://discord.gg/amped
