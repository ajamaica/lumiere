# MarketPulse (Stocks + Crypto Data) 📊

Query real-time and historical financial data across equities and crypto—prices, market moves, metrics, and trends for analysis, alerts, and reporting.

## Features

- **Stock Data**: Historical prices, real-time quotes
- **Company News**: Latest news by ticker
- **Financial Statements**: Income, balance sheets, cash flow
- **Analyst Estimates**: EPS forecasts, recommendations
- **Insider Trading**: Track insider transactions
- **SEC Filings**: 10-K, 10-Q, 8-K and more
- **Crypto Data**: Real-time prices, historical OHLCV
- **Stock Screener**: Filter by metrics

## Quick Start

```bash
export AISA_API_KEY="your-key"

# Stock data
python scripts/market_client.py stock prices --ticker AAPL

# Crypto data
python scripts/market_client.py crypto snapshot --symbol BTC
```

## Documentation

See [SKILL.md](SKILL.md) for complete API documentation.
