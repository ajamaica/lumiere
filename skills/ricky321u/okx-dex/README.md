# OKX DEX Aggregator 🧭

OKX DEX aggregator skill for Clawdbot (v6 API).

## Features

- 🔄 **Best-route Aggregation** - Optimal swap routing across liquidity sources
- ⛓️ **Multi-chain** - EVM + non‑EVM support
- 🧾 **Quotes + Tx Data** - Quote, swap, and approve transaction payloads

## Installation

```bash
clawdhub install okx-dex
```

## Configuration

```bash
export OKX_API_KEY="your-api-key"
export OKX_SECRET_KEY="your-secret"
export OKX_PASSPHRASE="your-passphrase"
```

## Usage Examples

```
"Get a quote to swap 1 ETH to USDC on Ethereum"
"Build a swap transaction for 0.5 ETH to USDC"
"Fetch token list for chainIndex 1"
"Get approve transaction for USDC spend"
```

## Docs

https://web3.okx.com/build/dev-docs/wallet-api/dex-api-reference

## License

MIT
