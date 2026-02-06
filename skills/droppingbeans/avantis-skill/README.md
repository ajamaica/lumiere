# Avantis Leverage Trading Skill

Execute leverage trades on Avantis - Base's largest derivatives exchange for crypto, forex, commodities, and indices.

## Features

- **Direct wallet integration** - No API key needed
- **Multiple markets** - Crypto (50x), forex/commodities (100x), indices (50x)
- **Long and short** - Profit from price movements in either direction
- **Risk management** - Take profit, stop loss, margin updates
- **Python SDK** - Reliable, well-documented integration

## Quick Start

### Check Positions

```bash
avantis_venv/bin/python skills/avantis/scripts/positions.py
```

### Open Trade

```bash
# 5x long ETH with $10 collateral
avantis_venv/bin/python skills/avantis/scripts/trade.py long ETH 10 5

# 10x short BTC with $20 collateral, TP/SL
avantis_venv/bin/python skills/avantis/scripts/trade.py short BTC 20 10 --tp 95000 --sl 102000
```

### Close Position

```bash
# Full close
avantis_venv/bin/python skills/avantis/scripts/close.py 0 0

# Partial close
avantis_venv/bin/python skills/avantis/scripts/close.py 0 0 --amount 5
```

## Requirements

- Python 3.12+
- `avantis-trader-sdk` (installed in virtual env)
- Wallet with USDC on Base
- Gas ETH on Base

## Installation

```bash
# Create virtual environment
python3 -m venv avantis_venv

# Install SDK
avantis_venv/bin/pip install avantis-trader-sdk

# Set up wallet
echo "Private Key: 0xYOUR_KEY_HERE" > MAIN_WALLET.txt
```

## Supported Markets

### Crypto (up to 50x)

ETH, BTC, SOL, LINK, ARB, OP, AVAX, and more

### Forex (up to 100x)

EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, USD/CHF, NZD/USD

### Commodities (up to 100x)

Gold (XAU/USD), Silver (XAG/USD), Oil (WTI, Brent)

### Indices (up to 50x)

SPX, NDX, DJI

## Position Sizing

**Minimum position size**: ~$100

- $4 collateral × 25x leverage = $100 ✅
- $5 collateral × 20x leverage = $100 ✅
- $10 collateral × 10x leverage = $100 ✅

## Fee Structure

- **Opening**: 0.04-0.1% of position size (dynamic)
- **Closing**: 0.04-0.1% of position size
- **Margin**: 0.02-0.05% daily
- **Execution**: ~$0.10-0.30 in ETH per transaction

Example: $100 position × 0.08% = $0.08 per trade

## Risk Warnings

⚠️ **High Risk**: Leverage trading can result in rapid losses exceeding your collateral.

- Use stop losses
- Start with low leverage (2-5x)
- Never risk more than you can afford to lose
- Monitor positions regularly

## Resources

- **Platform**: https://avantisfi.com
- **SDK Docs**: https://sdk.avantisfi.com
- **Trading Guide**: https://docs.avantisfi.com
- **Discord**: https://discord.gg/avantis

## Testing

Tested successfully with:

- Long position: $4 @ 25x leverage ✅
- Short position: $5 @ 20x leverage ✅
- Total test cost: $0.47 in fees

## License

MIT

## Author

beanbot (@droppingbeans)
