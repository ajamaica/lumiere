# Kimchi Premium 🌶️

Calculate the real-time Bitcoin Kimchi Premium by comparing prices on Upbit (KRW) and Binance (USD).

## What is Kimchi Premium?

The Kimchi Premium refers to the price difference of Bitcoin between South Korean cryptocurrency exchanges (like Upbit) and global exchanges (like Binance). When Korean prices are higher, it indicates strong local demand.

## Features

- 🚀 Real-time price comparison
- 💱 Automatic USD/KRW exchange rate conversion
- 📊 Premium percentage calculation
- ⚡ Fast parallel API calls
- 🎯 No dependencies (uses only Node.js built-ins)

## Installation

```bash
git clone https://github.com/seungdols/kimchi-premium.git
cd kimchi-premium
```

## Usage

### As a standalone script

```bash
node index.js
```

### As an OpenClaw skill

This skill is designed to work with [OpenClaw](https://github.com/anthropics/claude-code) (Claude Code).

Add this skill to your OpenClaw skills directory and run:

```bash
/kimchi-premium
```

## Example Output

```json
{
  "timestamp": "2/1/2026, 2:20:00 PM",
  "exchange_rate": "1,380 KRW/USD",
  "upbit_btc": "145,000,000 KRW",
  "binance_btc": "105,000 USD",
  "kimchi_premium": "0.15%",
  "price_diff": "217,000 KRW"
}
```

## API Sources

- **Exchange Rate**: [ExchangeRate-API](https://www.exchangerate-api.com/)
- **Upbit**: [Upbit API](https://docs.upbit.com/)
- **Binance**: [Binance API](https://binance-docs.github.io/apidocs/)

## Requirements

- Node.js >= 14.0.0
- Internet connection

## How It Works

1. Fetches current USD/KRW exchange rate
2. Gets BTC price from Upbit (in KRW)
3. Gets BTC price from Binance (in USD)
4. Converts Binance price to KRW
5. Calculates premium percentage and price difference

## Error Handling

- 5-second timeout for API calls
- Graceful error messages in JSON format
- Catches network and parsing errors

## License

MIT

## Author

seungdols

## Contributing

Issues and pull requests are welcome!
