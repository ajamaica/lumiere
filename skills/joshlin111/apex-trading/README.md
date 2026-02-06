# ApeX Trading Skill for Clawdbot

Full-featured Clawdbot skill for trading ApeX perpetual futures. Monitor your portfolio, analyze markets with charts/volume, and execute trades with AI assistance.

## Features

### Core Trading

- **Portfolio Monitoring**: Balance, positions, P&L tracking
- **Order Execution**: Market and limit orders (long & short)
- **Order Management**: Cancel specific orders or all at once
- **Trade History**: View recent fills
- **Security**: API credentials required for private operations

### Market Analysis Tools

- **Chart Data with Volume**: Historical price action via CoinGecko
- **Momentum Detection**: Automated signal generation (strong bull/bear/neutral)
- **Volume Analysis**: Compare current volume vs average
- **Multi-timeframe**: 1-hour and 6-hour trend analysis
- **Multi-Asset Coverage**: Trade any perpetual supported by ApeX

### Strategy Support

- **Position Monitoring**: Check P&L with automated alerts
- **Risk Management**: 10% position size, stop losses, profit targets
- **Market Scanner**: Quick overview of all major assets
- **Decision Support**: Wait for high-probability setups

## Installation

```bash
# Install via ClawdHub (recommended)
clawdhub install apex

# Or install manually in your Clawdbot workspace
cd skills
# Clone or copy the apex skill folder here

# Install dependencies
cd apex/scripts
npm install
```

## Configuration

### API Credentials (Required for Private Operations)

```bash
export APEX_API_KEY=your_api_key
export APEX_API_SECRET=your_api_secret
export APEX_API_PASSPHRASE=your_passphrase
export APEX_OMNI_SEED=your_omni_seed
```

**Or use `.env` file** (recommended for security):

```bash
cd apex
cp .env.example .env
# Edit .env with your credentials
nano .env
```

### Testnet

To use ApeX testnet (QA):

```bash
export APEX_TESTNET=1
# or
export APEX_ENV=qa
```

## Usage

### Market Analysis

**Analyze market with charts and volume:**

```bash
cd scripts
./analyze-coingecko.mjs
```

**Quick market scan:**

```bash
./scan-market.mjs
```

**Check your positions:**

```bash
./check-positions.mjs
```

### Direct CLI Trading

```bash
# Check balance
node scripts/apex.mjs balance

# View positions with P&L
node scripts/apex.mjs positions

# Get current BTC price
node scripts/apex.mjs price BTC

# Place market orders
node scripts/apex.mjs market-buy SOL 0.1
node scripts/apex.mjs market-sell ETH 0.5

# Place limit orders
node scripts/apex.mjs limit-buy BTC 0.001 88000
node scripts/apex.mjs limit-sell ETH 1 3100

# Cancel all orders
node scripts/apex.mjs cancel-all
```

### Through Clawdbot

Once installed, interact naturally:

- "Analyze the crypto market on ApeX"
- "What's the momentum on BTC right now?"
- "Check my ApeX positions"
- "Show me current SOL price and volume"
- "Enter a BTC long position"
- "Close my ETH position"

## Commands Reference

### Public Operations

- `price <coin>` - Get current price (auto-maps to `-USDT`)
- `meta` - List all available symbols

### Trading Operations (Requires ApeX API Credentials)

- `balance` - Show account balance and equity
- `positions` - Show open positions with P&L
- `orders` - Show open orders
- `fills` - Show recent trade history
- `market-buy <coin> <size>` - Market buy
- `market-sell <coin> <size>` - Market sell
- `limit-buy <coin> <size> <price>` - Place limit buy order
- `limit-sell <coin> <size> <price>` - Place limit sell order
- `cancel-all [coin]` - Cancel all orders (optionally for one coin)

### Analysis Scripts

- `analyze-coingecko.mjs` - Full market analysis with charts/volume
- `check-positions.mjs` - Monitor open positions and P&L
- `scan-market.mjs` - Quick price overview

## Strategy Examples

### Momentum Scalping (Recommended for Small Accounts)

```bash
# 1. Analyze market conditions
./analyze-coingecko.mjs

# 2. If signal is "STRONG BULLISH" or "STRONG BEARISH", check position size
# Account: $100, 10% position = $10

# 3. Enter trade
node scripts/apex.mjs market-buy ETH 0.0033  # ~$10 position

# 4. Monitor position every 30-60 minutes
./check-positions.mjs

# 5. Exit at +2% profit target or -1% stop loss
node scripts/apex.mjs market-sell ETH 0.0033
```

### Risk Parameters (Example)

- **Position Size**: 10% of account per trade
- **Max Loss**: 1% per trade (stop loss)
- **Profit Target**: 2% per trade
- **Max Positions**: 1 at a time (focus)
- **Entry Signal**: Volume >1.5x average + price move >0.5%

## Architecture

- **CLI Client**: `scripts/apex.mjs` - ApeX Omni SDK wrapper
- **Market Analysis**: `scripts/analyze-coingecko.mjs` - CoinGecko API integration
- **Position Monitor**: `scripts/check-positions.mjs` - Real-time P&L tracking
- **Market Scanner**: `scripts/scan-market.mjs` - Quick price overview
- **Skill Definition**: `SKILL.md` - Instructions for Clawdbot
- **API Reference**: `references/api.md` - ApeX API docs
- **Dependencies**: `apexpro-connector-node`, `node-fetch`

## API & Data Sources

**Trading**:

- ApeX Omni API (mainnet: `https://omni.apex.exchange`)
- Official SDK: `apexpro-connector-node`

**Market Data**:

- CoinGecko Free API (no auth required)
- 24-hour historical data with volume
- Automatic momentum signal generation

## Safety Features

- **Credential-based access**: Private operations require API key + seed
- **Position size validation**: Checks minimum order size via ApeX rules
- **Stop loss alerts**: Automated notifications when hit
- **Profit target tracking**: Know when to take gains
- **Clear signal thresholds**: Only trade strong momentum (>0.5% + volume)

## Development

Built with:

- Node.js (ES modules)
- ApeX Omni SDK for trading
- CoinGecko API for market analysis
- node-fetch for HTTP requests

## License

MIT

## About Clawdbot

Clawdbot is an AI assistant framework with extensible skills. Learn more at https://clawd.bot

---

**Disclaimer**: This is unofficial software. Use at your own risk. Trading cryptocurrency perpetual futures is high risk. Always verify trades before execution. The automated signals are for informational purposes only and not financial advice.
