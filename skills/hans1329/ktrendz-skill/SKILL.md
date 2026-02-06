# K-Trendz Lightstick Trading

Trade K-pop artist lightstick tokens on the K-Trendz bonding curve market.

**Capability Summary:** Buy and sell K-pop fan tokens with real-time pricing, news signals, and bonding curve mechanics. Early buyers benefit from price appreciation as artist popularity grows. All transactions are gas-sponsored via Paymaster — no ETH needed.

## Prerequisites

Run `/ktrendz:setup` first to configure your credentials:

- **K-Trendz API Key** (required): Contact K-Trendz team for provisioning

You can also set via environment variables:

- `KTRENDZ_API_KEY` - Required for all trading operations

## Quick Start

```bash
# Setup (one-time)
/ktrendz:setup

# List available tokens
/ktrendz:tokens

# Check token price
/ktrendz:price RIIZE

# Buy a token
/ktrendz:buy RIIZE

# Sell a token
/ktrendz:sell RIIZE
```

## 🎯 Decision Tree

- **"What tokens are available?"** → `/ktrendz:tokens`
- **"What's the price of X?"** → `/ktrendz:price <artist>`
- **"Should I buy X?"** → Check price + news signals first
- **"Buy X token"** → `/ktrendz:buy <artist>`
- **"Sell X token"** → `/ktrendz:sell <artist>`

## Main Commands

### /ktrendz:setup

Collects and validates API key, stores securely.

```bash
./scripts/setup.sh
```

### /ktrendz:tokens

List all available tokens with current supply and trending scores.

```bash
./scripts/tokens.sh
```

**Output includes:**

- Token ID
- Artist name
- Total supply
- Trending score

### /ktrendz:price

Get current price and trading signals for a token.

```bash
./scripts/price.sh RIIZE
```

**Output includes:**

- Current price (USDC)
- Buy cost / Sell refund
- 24h price change
- Trending score
- Recent news signals

**Decision Factors:**

| Signal                      | Meaning                   | Buy Signal            |
| --------------------------- | ------------------------- | --------------------- |
| `trending_score` rising     | On-platform engagement up | ✅ Bullish            |
| `price_change_24h` positive | Recent momentum           | ✅ Trend continuation |
| `total_supply` low          | Few holders               | ✅ Early opportunity  |
| `has_recent_news` true      | Media coverage            | ✅ Potential catalyst |

### /ktrendz:buy

Purchase 1 lightstick token.

```bash
./scripts/buy.sh RIIZE [slippage_percent]
```

**Parameters:**

- `artist_name`: Artist name (e.g., RIIZE, IVE, BTS)
- `slippage_percent`: Maximum slippage tolerance (default: 5%)

**Constraints:**

- Maximum 1 token per transaction (bonding curve protection)
- $100/day limit per agent
- Same-block trades blocked (MEV protection)
- Gas fees are automatically sponsored (Paymaster)

### /ktrendz:sell

Sell 1 lightstick token.

```bash
./scripts/sell.sh RIIZE [slippage_percent]
```

**Parameters:**

- `artist_name`: Artist name
- `slippage_percent`: Maximum slippage tolerance (default: 5%)

## Architecture

### V2 Contract

All bot trading is executed through **FanzTokenBotV2** on Base Mainnet:

| Property     | Value                                        |
| ------------ | -------------------------------------------- |
| **Contract** | `0x28bE702CC3A611A1EB875E277510a74fD20CDD9C` |
| **Network**  | Base Mainnet (Chain ID: 8453)                |
| **Standard** | ERC-1155                                     |
| **Currency** | USDC (6 decimals)                            |

### Agent Identification

Each registered agent receives a unique on-chain identifier. When the platform executes a trade on your behalf:

1. The platform's Admin Wallet signs and submits the transaction
2. Your unique agent address is passed as the `agent` parameter
3. On-chain events (`Buy` / `Sell`) log both the executor and your agent address
4. This enables per-agent DAU tracking on Dune Analytics

### Gas Sponsorship

All transactions are gas-sponsored via Coinbase Paymaster:

- **No ETH required** — the platform covers gas fees
- Agents only need sufficient USDC balance for trading
- Gas sponsorship is included for all verified agents

## Trading Strategy

This is a **bonding curve** market, not arbitrage:

1. **Buy when trending** - Rising scores + news = growing demand
2. **Buy early** - Lower supply = better curve position
3. **Monitor signals** - News often precedes on-platform activity
4. **Hold during growth** - Bonding curve rewards patient holders

## Fee Structure

| Action | Fee | Distribution                |
| ------ | --- | --------------------------- |
| Buy    | 3%  | 2% Artist Fund, 1% Platform |
| Sell   | 2%  | Platform                    |

**Round-trip cost:** 5%

## Rate Limits

- **Daily Volume:** $100 USD per agent
- **Transaction Frequency:** Max 100 trades/day per agent
- **Circuit Breaker:** Pauses if price moves >20% in 10 blocks

## Example Interactions

**User:** "What tokens can I trade?"

**You:**

1. Run `./scripts/tokens.sh`
2. Report: "There are 6 tokens available: RIIZE, IVE, BTS, Cortis, K-Trendz Supporters, All Day Project"

**User:** "What's RIIZE trading at?"

**You:**

1. Run `./scripts/price.sh RIIZE`
2. Report: "RIIZE is at $1.85 (+5.2% 24h). Trending score 1250 with 3 recent news articles. Buy cost: $1.91"

**User:** "Buy RIIZE for me"

**You:**

1. Confirm: "Buy 1 RIIZE token for ~$1.91?"
2. If yes, run `./scripts/buy.sh RIIZE`
3. Report: "Purchased 1 RIIZE for $1.91. Tx: 0x..."

**User:** "Should I sell my IVE?"

**You:**

1. Run `./scripts/price.sh IVE`
2. Check signals (price trend, news, trending score)
3. Advise based on data

## API Reference

Base URL: `https://k-trendz.com/api/bot/`

| Endpoint       | Method | Description               |
| -------------- | ------ | ------------------------- |
| `/tokens`      | GET    | List all available tokens |
| `/token-price` | POST   | Get price + signals       |
| `/buy`         | POST   | Purchase 1 token          |
| `/sell`        | POST   | Sell 1 token              |

### Request/Response Examples

**GET /tokens**

```json
{
  "success": true,
  "data": {
    "contract_address": "0x28bE702CC3A611A1EB875E277510a74fD20CDD9C",
    "token_count": 6,
    "tokens": [
      {
        "token_id": "7963681970480434413",
        "artist_name": "RIIZE",
        "total_supply": 42,
        "trending_score": 1250,
        "follower_count": 156
      }
    ]
  }
}
```

**POST /token-price**

```json
// Request
{ "artist_name": "RIIZE" }

// Response
{
  "success": true,
  "data": {
    "token_id": "7963681970480434413",
    "artist_name": "RIIZE",
    "current_price_usdc": 1.85,
    "buy_cost_usdc": 1.91,
    "sell_refund_usdc": 1.78,
    "price_change_24h": "5.2",
    "total_supply": 42,
    "trending_score": 1250,
    "external_signals": {
      "article_count_24h": 3,
      "has_recent_news": true,
      "headlines": [...]
    }
  }
}
```

**POST /buy**

```json
// Request
{
  "artist_name": "RIIZE",
  "max_slippage_percent": 5
}

// Response
{
  "success": true,
  "data": {
    "transaction_id": "uuid",
    "tx_hash": "0x...",
    "token_id": "7963681970480434413",
    "artist_name": "RIIZE",
    "amount": 1,
    "total_cost_usdc": 1.91,
    "remaining_daily_limit": 98.09,
    "gas_sponsored": true
  }
}
```

**POST /sell**

```json
// Request
{
  "artist_name": "RIIZE",
  "max_slippage_percent": 5
}

// Response
{
  "success": true,
  "data": {
    "transaction_id": "uuid",
    "tx_hash": "0x...",
    "token_id": "7963681970480434413",
    "artist_name": "RIIZE",
    "amount": 1,
    "net_refund_usdc": 1.78,
    "fee_usdc": 0.04,
    "gas_sponsored": true
  }
}
```

## Files

- `SKILL.md` - This documentation
- `package.json` - Package metadata
- `scripts/setup.sh` - API key configuration
- `scripts/tokens.sh` - List available tokens
- `scripts/price.sh` - Get token price
- `scripts/buy.sh` - Buy token
- `scripts/sell.sh` - Sell token
