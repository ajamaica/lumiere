---
name: amped-defi
version: 1.0.0
description: DeFi operations plugin for OpenClaw enabling cross-chain swaps, bridging, and money market operations via SODAX. Use when building trading bots, DeFi agents, or portfolio management tools that need cross-chain execution.
---

# Amped DeFi Plugin

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
openclaw plugins install amped-defi
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

## Available Tools (24 Total)

### Discovery

| Tool                           | Description                                 |
| ------------------------------ | ------------------------------------------- |
| `amped_supported_chains`       | List all supported spoke chains             |
| `amped_supported_tokens`       | Get supported tokens by module and chain    |
| `amped_cross_chain_positions`  | ⭐ Unified portfolio view across ALL chains |
| `amped_money_market_positions` | Single-chain position details               |
| `amped_money_market_reserves`  | Market reserves, APYs, liquidity            |
| `amped_user_intents`           | Query intent history via SODAX API          |
| `amped_portfolio_summary`      | Wallet balances + MM positions combined     |

### Swap & Bridge

| Tool                    | Description                          |
| ----------------------- | ------------------------------------ |
| `amped_swap_quote`      | Get exact-in/exact-out swap quote    |
| `amped_swap_execute`    | Execute swap with policy enforcement |
| `amped_swap_status`     | Check swap/intent status             |
| `amped_swap_cancel`     | Cancel pending swap                  |
| `amped_bridge_discover` | Discover bridge routes               |
| `amped_bridge_quote`    | Check bridgeability and max amount   |
| `amped_bridge_execute`  | Execute bridge operation             |

### Money Market

| Tool                | Description                          |
| ------------------- | ------------------------------------ |
| `amped_mm_supply`   | Supply tokens as collateral          |
| `amped_mm_withdraw` | Withdraw supplied tokens             |
| `amped_mm_borrow`   | Borrow tokens (cross-chain capable!) |
| `amped_mm_repay`    | Repay borrowed tokens                |

### Wallet Management

| Tool                       | Description                    |
| -------------------------- | ------------------------------ |
| `amped_list_wallets`       | List all configured wallets    |
| `amped_add_wallet`         | Add a new wallet with nickname |
| `amped_rename_wallet`      | Rename existing wallet         |
| `amped_remove_wallet`      | Remove wallet from config      |
| `amped_set_default_wallet` | Set default wallet             |
| `amped_wallet_address`     | Get wallet address by nickname |

---

## ⚠️ Critical: Money Market Architecture

### Hub-Spoke Model

SODAX uses a **hub-spoke architecture**:

- **Hub chain**: Sonic (chain ID: 146) — where reserves live
- **Spoke chains**: Base, Arbitrum, Ethereum, Optimism, etc. — user interaction points

**Rule**: Money market operations (supply, borrow, withdraw, repay) must be initiated from **spoke chains**, NOT the hub chain (Sonic).

### Per-Chain Health Factors

🚨 **Each spoke chain maintains its OWN independent health factor.**

- Collateral on Base does **NOT** protect positions on Arbitrum
- Each chain's positions are **isolated** for liquidation purposes
- You MUST display health factor **per chain**, not aggregated

**Example of dangerous misinterpretation:**

```
❌ WRONG: "Combined health factor: 2.65"
✅ RIGHT: "Base HF: 4.11 ✅ | Arbitrum HF: 1.2 ⚠️ (at risk!)"
```

When using `amped_cross_chain_positions`, always check the `chainBreakdown` array:

```json
{
  "chainBreakdown": [
    { "chainId": "base", "healthFactor": "4.11", "supplyUsd": "17.25", "borrowUsd": "4.20" },
    { "chainId": "arbitrum", "healthFactor": "1.20", "supplyUsd": "100.00", "borrowUsd": "83.00" }
  ]
}
```

**Never show an aggregated health factor** — it could mislead users into thinking they're safe when one chain is at liquidation risk.

---

## Example: Cross-Chain Swap

```
"Swap 1000 USDC on Ethereum to USDT on Arbitrum"
```

Or via tools:

```typescript
// Get quote
const quote = await agent.call('amped_swap_quote', {
  walletId: 'main',
  srcChainId: 'ethereum',
  dstChainId: 'arbitrum',
  srcToken: 'USDC',
  dstToken: 'USDT',
  amount: '1000',
  type: 'exact_input',
  slippageBps: 50,
})

// Execute
const result = await agent.call('amped_swap_execute', {
  walletId: 'main',
  quote: quote,
})
```

## Example: Cross-Chain Money Market

Supply on Base, borrow on Arbitrum:

```typescript
// Supply on Base
await agent.call('amped_mm_supply', {
  walletId: 'main',
  chainId: 'base',
  token: 'USDC',
  amount: '1000',
  useAsCollateral: true,
})

// Borrow to Arbitrum (different chain!)
await agent.call('amped_mm_borrow', {
  walletId: 'main',
  chainId: 'base', // Where collateral lives
  dstChainId: 'arbitrum', // Where borrowed tokens go
  token: 'USDT',
  amount: '500',
})
```

## Example: Portfolio Display

When displaying portfolio data, always:

1. **Show balances per chain** (not totaled)
2. **Show health factor per chain** (not aggregated)
3. **Flag at-risk positions** (HF < 1.5)

```typescript
const positions = await agent.call('amped_cross_chain_positions', {
  walletId: 'main',
})

// Good display:
positions.chainBreakdown.forEach((chain) => {
  console.log(
    `${chain.chainId}: Supply $${chain.supplyUsd} | Borrow $${chain.borrowUsd} | HF: ${chain.healthFactor}`,
  )
})
```

## Supported Chains

Ethereum, Arbitrum, Base, Optimism, Avalanche, BSC, Polygon, Sonic (hub), LightLink, HyperEVM, Kaia

## Resources

- **npm:** https://www.npmjs.com/package/amped-defi
- **GitHub:** https://github.com/amped-finance/amped-defi
- **SODAX Docs:** https://docs.sodax.com
- **Discord:** https://discord.gg/amped

---

## 🧠 Agent Gotchas

### Bankr Wallet Limitations

**Bankr wallets have restricted chain support:**

| Chain        | As Source | As Destination    |
| ------------ | --------- | ----------------- |
| Ethereum     | ✅        | ✅                |
| Base         | ✅        | ✅                |
| Polygon      | ✅        | ✅                |
| Solana       | ❌        | ✅ (receive only) |
| Arbitrum     | ❌        | ❌                |
| Optimism     | ❌        | ❌                |
| Other chains | ❌        | ❌                |

**Example:** Cross-chain swap from Base to Solana works with Bankr:

```typescript
await agent.call('amped_swap_execute', {
  walletId: 'bankr',
  srcChainId: 'base',      // ✅ Bankr supports as source
  dstChainId: 'solana',    // ✅ Solana OK as destination
  recipient: '8qguBqM4UHQ...',  // Solana base58 address
  ...
});
```

**Will fail:** Trying to swap FROM Arbitrum using Bankr wallet.

### Intent-Based Settlement

Swaps and bridges use **intent-based execution**:

- Transactions are NOT instant
- Settlement typically takes **30-60 seconds**
- Use `amped_swap_status` to check completion
- The `sodaxScanUrl` in responses shows full intent lifecycle

**Don't assume completion** just because the tool returned success — that means the intent was submitted, not settled.

### Solana Address Format

Solana addresses use **base58 encoding**, not hex:

- ✅ Correct: `8qguBqM4UHQNHgBm18NLPeonSSFEB3RWBdbih6FXhwZu`
- ❌ Wrong: `0x8qguBqM4UHQ...`

When specifying a Solana recipient for cross-chain swaps, use the base58 format.

### Slippage in Volatile Markets

Default slippage (50 bps / 0.5%) may cause reverts during high volatility:

- Normal conditions: 50 bps is fine
- Volatile markets: Consider 100-200 bps
- Very volatile: Up to 300 bps

```typescript
await agent.call('amped_swap_quote', {
  ...
  slippageBps: 150  // 1.5% for volatile conditions
});
```

### Token Decimals

The plugin handles decimals automatically, but be aware:

- **USDC, USDT**: 6 decimals
- **Most ERC20s**: 18 decimals
- **Native tokens (ETH, MATIC)**: 18 decimals

When displaying amounts, the plugin returns human-readable values (e.g., "100.5" not "100500000").

---

## 🎨 Chain Display Emoji

Use these emoji for consistent chain identification in portfolio displays:

| Chain     | Emoji | Hex Code |
| --------- | ----- | -------- |
| LightLink | ⚡    | U+26A1   |
| Base      | 🟦    | U+1F7E6  |
| Sonic     | ⚪    | U+26AA   |
| Arbitrum  | 🔽    | U+1F53D  |
| Optimism  | 🔴    | U+1F534  |
| Polygon   | ♾️    | U+267E   |
| BSC       | 🔶    | U+1F536  |
| Ethereum  | 💎    | U+1F48E  |
| Avalanche | 🔺    | U+1F53A  |
| HyperEVM  | 🌀    | U+1F300  |
| Kaia      | 🟢    | U+1F7E2  |

**Usage Example:**

```
⚡ LightLink    │ 0.002 ETH + 5.49 USDC       │   $9.78
🟦 Base         │ 0.002 ETH + 0.39 USDC       │   $4.55
                │ 💰 Supply $21.93 Borrow $5.00
                │ 🏥 HF: 3.51 🟢
```
