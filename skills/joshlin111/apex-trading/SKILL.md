---
name: apex
description: Trade and monitor ApeX perpetual futures. Check balances, view positions with P&L, place/cancel orders, execute market trades. Use when the user asks about ApeX trading, portfolio status, crypto positions, or wants to execute trades on ApeX.
---

# ApeX Trading Skill

Full trading and portfolio management for ApeX perpetual futures exchange.

## Prerequisites

Install dependencies once:

```bash
cd skills/apex/scripts && npm install
```

## Authentication

Private operations require API credentials and an Omni seed:

- `APEX_API_KEY`
- `APEX_API_SECRET`
- `APEX_API_PASSPHRASE`
- `APEX_OMNI_SEED`

Testnet:

- Set `APEX_TESTNET=1` (or `APEX_ENV=qa`).

## Core Operations

### Market Data (Public)

**Get price for a coin:**

```bash
node scripts/apex.mjs price BTC
```

**List available symbols:**

```bash
node scripts/apex.mjs meta
```

### Portfolio Monitoring (Private)

**Check balance:**

```bash
APEX_API_KEY=... APEX_API_SECRET=... APEX_API_PASSPHRASE=... APEX_OMNI_SEED=... \
  node scripts/apex.mjs balance
```

**View positions with P&L:**

```bash
APEX_API_KEY=... APEX_API_SECRET=... APEX_API_PASSPHRASE=... APEX_OMNI_SEED=... \
  node scripts/apex.mjs positions
```

**Check open orders:**

```bash
APEX_API_KEY=... APEX_API_SECRET=... APEX_API_PASSPHRASE=... APEX_OMNI_SEED=... \
  node scripts/apex.mjs orders
```

**View trade history:**

```bash
APEX_API_KEY=... APEX_API_SECRET=... APEX_API_PASSPHRASE=... APEX_OMNI_SEED=... \
  node scripts/apex.mjs fills
```

### Trading Operations

All trading commands require the ApeX API credentials and seed.

**Place limit orders:**

```bash
APEX_API_KEY=... APEX_API_SECRET=... APEX_API_PASSPHRASE=... APEX_OMNI_SEED=... \
  node scripts/apex.mjs limit-buy BTC 0.1 45000

APEX_API_KEY=... APEX_API_SECRET=... APEX_API_PASSPHRASE=... APEX_OMNI_SEED=... \
  node scripts/apex.mjs limit-sell ETH 1 3000
```

**Market orders:**

```bash
APEX_API_KEY=... APEX_API_SECRET=... APEX_API_PASSPHRASE=... APEX_OMNI_SEED=... \
  node scripts/apex.mjs market-buy BTC 0.5

APEX_API_KEY=... APEX_API_SECRET=... APEX_API_PASSPHRASE=... APEX_OMNI_SEED=... \
  node scripts/apex.mjs market-sell ETH 2
```

**Cancel orders:**

```bash
APEX_API_KEY=... APEX_API_SECRET=... APEX_API_PASSPHRASE=... APEX_OMNI_SEED=... \
  node scripts/apex.mjs cancel-all

APEX_API_KEY=... APEX_API_SECRET=... APEX_API_PASSPHRASE=... APEX_OMNI_SEED=... \
  node scripts/apex.mjs cancel-all BTC
```

## Output Formatting

All commands output JSON. Parse and format for chat display:

**For balance/portfolio:**

- Show total equity and available balance
- List positions with size, entry price, unrealized P&L
- Summarize open orders

**For trade execution:**

- Confirm order details before executing
- Report order ID and status after execution
- Show filled price if immediately executed

## Safety Guidelines

**Before executing trades:**

1. Confirm trade parameters with user (symbol, size, side, price)
2. Show current price and position for context
3. Calculate estimated cost/proceeds

**Position sizing:**

- Warn if trade is >20% of account equity
- Suggest appropriate sizes based on account balance

**Price checks:**

- For limit orders, compare limit price to current market price
- Warn if limit price is >5% away from market (likely mistake)

## Error Handling

**Common errors:**

- "Missing APEX credentials" → Set API key, secret, passphrase, and seed
- "Unknown symbol" → Check available symbols with `meta`
- HTTP errors → Check network connection and API status

**When errors occur:**

- Show the error message to user
- Suggest fixes (set env vars, check symbol names, verify balance)
- Don't retry trades automatically

## Workflow Examples

**"How's my ApeX portfolio?"**

1. Run `balance` to get total equity
2. Run `positions` to get open positions
3. Format summary: equity, positions with P&L, total unrealized P&L

**"Buy 0.5 BTC on ApeX"**

1. Run `price BTC` to get current price
2. Confirm with user: "Buy 0.5 BTC at market? Current price: $X. Estimated cost: $Y"
3. Execute `market-buy BTC 0.5`
4. Report result

**"What's the current BTC price on ApeX?"**

1. Run `price BTC`
2. Format response: "BTC: $X on ApeX"

**"Close my ETH position"**

1. Run `positions` to get current ETH position size
2. If long → market-sell, if short → market-buy
3. Execute with position size
4. Report result

## Advanced Features

**List all available symbols:**

```bash
node scripts/apex.mjs meta
```

## Notes

- Symbols use `-USDT` format for trading (e.g., `BTC-USDT`).
- Public market data endpoints often use `BTCUSDT` format.
- Prices are in USD.
- ApeX uses perpetual futures, not spot trading.
- Check references/api.md for API details.
