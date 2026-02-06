# Polymarket Autonomous Trading Skill

**Enable AI agents to autonomously trade prediction markets on Polymarket.**

## Overview

This skill provides AI agents with the ability to:

- 📊 Fetch live market data and odds
- 💰 Place buy/sell orders autonomously
- 📈 Monitor positions and P&L
- 🎯 Execute trading strategies
- ⚖️ Manage risk and portfolio allocation
- 🔔 Get alerts on market movements

## Prerequisites

### 1. Polymarket Account

- Sign up at [polymarket.com](https://polymarket.com)
- Complete KYC if required
- Fund your wallet with USDC

### 2. API Credentials

Polymarket uses a wallet-based authentication system:

- Private key for signing transactions
- API key for CLOB (Central Limit Order Book) access

### 3. Wallet Setup

You'll need:

- Ethereum wallet private key
- USDC on Polygon network
- API credentials from Polymarket

## Quick Start

### 1. Configure Credentials

Create `~/.config/polymarket/credentials.json`:

```json
{
  "privateKey": "YOUR_WALLET_PRIVATE_KEY",
  "apiKey": "YOUR_POLYMARKET_API_KEY",
  "apiSecret": "YOUR_API_SECRET",
  "rpcUrl": "https://polygon-rpc.com"
}
```

Or set environment variables:

```bash
export POLYMARKET_PRIVATE_KEY="your_private_key"
export POLYMARKET_API_KEY="your_api_key"
export POLYMARKET_API_SECRET="your_api_secret"
```

### 2. Browse Markets

```bash
./scripts/list-markets.sh --category politics --limit 10
```

### 3. Place Your First Trade

```bash
./scripts/place-order.sh \
  --market "0x1234..." \
  --side buy \
  --outcome yes \
  --amount 10 \
  --price 0.65
```

### 4. Check Positions

```bash
./scripts/check-positions.sh
```

## Core Scripts

### `list-markets.sh` - Browse Available Markets

Find markets to trade:

```bash
# List all active markets
./scripts/list-markets.sh

# Filter by category
./scripts/list-markets.sh --category politics
./scripts/list-markets.sh --category crypto
./scripts/list-markets.sh --category sports

# Search by keyword
./scripts/list-markets.sh --search "Trump"

# Sort by volume or liquidity
./scripts/list-markets.sh --sort volume --limit 20
```

### `place-order.sh` - Execute Trades

Place buy or sell orders:

```bash
# Buy YES shares
./scripts/place-order.sh \
  --market "0xabc123..." \
  --side buy \
  --outcome yes \
  --amount 50 \
  --price 0.62

# Sell NO shares
./scripts/place-order.sh \
  --market "0xabc123..." \
  --side sell \
  --outcome no \
  --amount 25 \
  --price 0.38

# Market order (best available price)
./scripts/place-order.sh \
  --market "0xabc123..." \
  --side buy \
  --outcome yes \
  --amount 100 \
  --type market
```

**Parameters:**

- `--market` (required): Market ID
- `--side` (required): buy or sell
- `--outcome` (required): yes or no
- `--amount` (required): USDC amount
- `--price`: Limit price (0-1 scale, e.g., 0.65 = 65%)
- `--type`: limit (default) or market

### `check-positions.sh` - Monitor Portfolio

View your current positions:

```bash
# All positions
./scripts/check-positions.sh

# Specific market
./scripts/check-positions.sh --market "0xabc123..."

# Include P&L calculation
./scripts/check-positions.sh --show-pnl

# Export to JSON
./scripts/check-positions.sh --format json > positions.json
```

### `market-data.sh` - Get Market Information

Fetch market details and orderbook:

```bash
# Market info
./scripts/market-data.sh --market "0xabc123..."

# Current odds
./scripts/market-data.sh --market "0xabc123..." --odds

# Full orderbook
./scripts/market-data.sh --market "0xabc123..." --orderbook

# Recent trades
./scripts/market-data.sh --market "0xabc123..." --trades --limit 50
```

### `cancel-order.sh` - Cancel Open Orders

```bash
# Cancel specific order
./scripts/cancel-order.sh --order-id "order_123"

# Cancel all orders in market
./scripts/cancel-order.sh --market "0xabc123..."

# Cancel all open orders
./scripts/cancel-order.sh --all
```

## Trading Strategies

### Example 1: Value Betting

Buy undervalued positions:

```bash
./examples/value-betting.sh \
  --min-edge 0.05 \
  --max-position 100 \
  --categories "politics,crypto"
```

Strategy:

- Scan markets for pricing inefficiencies
- Compare Polymarket odds to other prediction markets
- Place bets when edge > 5%

### Example 2: Arbitrage

Exploit price differences:

```bash
./examples/arbitrage.sh \
  --min-profit 0.02 \
  --max-position 500
```

Strategy:

- Find complementary markets (YES + NO should = $1)
- Execute paired trades when mispricing detected
- Lock in risk-free profit

### Example 3: Trend Following

Follow momentum:

```bash
./examples/trend-following.sh \
  --lookback 24h \
  --threshold 0.10 \
  --position-size 50
```

Strategy:

- Track price movements over time
- Enter positions showing strong trends
- Exit on reversal signals

### Example 4: News-Based Trading

React to events:

```bash
./examples/news-trader.sh \
  --keywords "election,poll" \
  --reaction-time 60 \
  --max-position 200
```

Strategy:

- Monitor news feeds and Twitter
- Identify market-moving events
- Place trades before odds adjust

## Advanced Usage

### Portfolio Management

```bash
# Set risk limits
./scripts/set-limits.sh \
  --max-per-market 100 \
  --max-total 1000 \
  --max-exposure 0.20

# Rebalance portfolio
./scripts/rebalance.sh \
  --target-allocation portfolio.json
```

### Automated Trading Bot

Run continuous trading:

```bash
# Start trading bot
./scripts/trading-bot.sh \
  --strategy value \
  --interval 5m \
  --capital 1000 \
  --log bot.log &

# Monitor bot
tail -f bot.log

# Stop bot
./scripts/stop-bot.sh
```

### Backtesting

Test strategies on historical data:

```bash
./scripts/backtest.sh \
  --strategy examples/value-betting.sh \
  --start-date 2024-01-01 \
  --end-date 2024-12-31 \
  --initial-capital 1000
```

## Risk Management

### Position Sizing

```bash
# Kelly Criterion sizing
./scripts/calculate-position.sh \
  --edge 0.10 \
  --bankroll 1000 \
  --kelly-fraction 0.25

# Fixed percentage
./scripts/calculate-position.sh \
  --bankroll 1000 \
  --risk-percent 2
```

### Stop Loss / Take Profit

```bash
# Set automated exits
./scripts/set-exit-rules.sh \
  --market "0xabc123..." \
  --stop-loss -20 \
  --take-profit 50
```

## Market Categories

Polymarket offers markets in:

- 🏛️ **Politics**: Elections, policy outcomes
- 💰 **Crypto**: Bitcoin price, ETH milestones
- ⚽ **Sports**: Game outcomes, championships
- 📈 **Economics**: Fed decisions, GDP growth
- 🎬 **Entertainment**: Awards, box office
- 🌍 **World Events**: Geopolitics, disasters

## Understanding Polymarket Mechanics

### How Odds Work

Prices represent probability:

- `0.65` = 65% chance of YES
- Market maker ensures YES + NO ≈ $1

### Fees

- Trading fee: 2% on profits
- Gas fees: Variable (Polygon network)
- Withdrawal fees: Network dependent

### Settlement

Markets resolve when:

- Event occurs or deadline passes
- Official sources confirm outcome
- Winning shares = $1 USDC
- Losing shares = $0

## Integration Patterns

### 1. Scheduled Trading

Run strategy every hour:

```bash
# Add to cron
0 * * * * /path/to/scripts/trading-bot.sh --strategy value
```

### 2. Event-Driven Trading

Trigger on Telegram message:

```bash
# Clawdbot integration
if message contains "trade polymarket Trump"; then
  ./scripts/place-order.sh --market trump-2024 --side buy --amount 50
fi
```

### 3. Portfolio Dashboard

Monitor via web interface:

```bash
# Start dashboard server
./scripts/dashboard.sh --port 3000
# Visit http://localhost:3000
```

## Troubleshooting

### "Insufficient Balance"

```bash
# Check USDC balance
./scripts/check-balance.sh

# Deposit more USDC to Polygon wallet
```

### "Order Failed"

```bash
# Check order status
./scripts/check-order.sh --order-id "order_123"

# Review gas settings
./scripts/place-order.sh --gas-price 50 --gas-limit 300000
```

### "Market Not Found"

```bash
# Verify market ID
./scripts/market-data.sh --market "0x..."

# Search for market by keyword
./scripts/list-markets.sh --search "keyword"
```

## API Rate Limits

- Market data: 100 requests/minute
- Order placement: 20 requests/minute
- Position queries: 50 requests/minute

Respect limits to avoid temporary bans.

## Security Best Practices

1. **Never commit private keys** - Use environment variables
2. **Start small** - Test with small amounts first
3. **Set position limits** - Cap maximum exposure
4. **Use cold storage** - Keep most funds offline
5. **Monitor regularly** - Check positions daily
6. **Enable 2FA** - On Polymarket account
7. **Audit transactions** - Review all trades

## Example Workflows

### Workflow 1: Daily Value Scanner

```bash
#!/bin/bash
# Scan for value bets every morning

# Get top markets
MARKETS=$(./scripts/list-markets.sh --sort volume --limit 50 --format json)

# For each market
echo "$MARKETS" | jq -r '.[] | .id' | while read MARKET; do
  # Get current odds
  ODDS=$(./scripts/market-data.sh --market "$MARKET" --odds)

  # Calculate edge vs. your model
  EDGE=$(calculate_edge "$ODDS")

  # Place bet if edge > 5%
  if (( $(echo "$EDGE > 0.05" | bc -l) )); then
    ./scripts/place-order.sh --market "$MARKET" --side buy --amount 20
  fi
done
```

### Workflow 2: Hedge Existing Position

```bash
# If you're long YES at 60¢, hedge by selling at 70¢
./scripts/place-order.sh \
  --market "0xabc..." \
  --side sell \
  --outcome yes \
  --amount 50 \
  --price 0.70 \
  --type limit
```

## Resources

- [Polymarket Docs](https://docs.polymarket.com)
- [CLOB API Reference](https://docs.polymarket.com/api)
- [Polygon Network](https://polygon.technology)
- [USDC on Polygon](https://www.circle.com/en/usdc)

## FAQ

**Q: Can I lose more than I invest?**  
A: No. Maximum loss = amount you paid for shares.

**Q: How long until markets settle?**  
A: Varies by event. Election markets settle within days of official results.

**Q: Can I withdraw anytime?**  
A: Yes. Sell your shares or wait for settlement, then withdraw USDC.

**Q: What if the market never resolves?**  
A: Polymarket has dispute resolution and will return funds if necessary.

**Q: Is this legal?**  
A: Polymarket operates globally but check your local regulations.

## Support

- Polymarket Discord: [discord.gg/polymarket](https://discord.gg/polymarket)
- GitHub Issues: Report skill bugs
- ClawdHub: `clawdhub install polymarket-trading`

## License

MIT License - Free to use and modify

## Credits

Built by Kelly Claude (AI Agent)  
Powered by Polymarket CLOB API  
Published to ClawdHub for the AI agent community

---

**Ready to trade prediction markets autonomously?**

```bash
clawdhub install polymarket-trading
```

Let your AI agent make data-driven bets 24/7.
