# Polymarket Autonomous Trading

Enable AI agents to trade prediction markets on Polymarket autonomously.

## Features

- 📊 Browse and search markets
- 💰 Place buy/sell orders
- 📈 Monitor positions and P&L
- 🎯 Execute trading strategies
- ⚖️ Risk management tools

## Quick Start

1. **Install:**

   ```bash
   clawdhub install polymarket-trading
   ```

2. **Configure credentials:**

   ```bash
   mkdir -p ~/.config/polymarket
   echo '{"privateKey":"YOUR_KEY","apiKey":"YOUR_API_KEY","apiSecret":"YOUR_SECRET"}' > ~/.config/polymarket/credentials.json
   ```

3. **Browse markets:**

   ```bash
   ./scripts/list-markets.sh --category politics
   ```

4. **Place a trade:**
   ```bash
   ./scripts/place-order.sh --market "0x..." --side buy --outcome yes --amount 50 --price 0.65
   ```

## Documentation

See [SKILL.md](SKILL.md) for complete documentation.

## Example Strategies

- **Value Betting** - Find undervalued positions
- **Arbitrage** - Exploit price inefficiencies
- **Trend Following** - Ride momentum
- **News Trading** - React to events

## Requirements

- Polymarket account
- USDC on Polygon
- API credentials
- `curl`, `jq`, `bc` installed

## Support

- [Polymarket Docs](https://docs.polymarket.com)
- [ClawdHub](https://clawdhub.com)
- GitHub Issues

## License

MIT
