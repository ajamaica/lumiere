---
name: droyd
description: Crypto Trading | Crypto Search | Crypto Token Filter -- AI crypto trading wallet via natural language. Use when the user wants to execute AI research tasks, trade crypto autonomously, search crypto content/news, filter projects by market criteria, manage trading positions, or interact with DROYD agents. Supports agent tasks (research, trading, data analysis), content search (semantic/recent), project discovery (by name/symbol/address/concept), project filtering (market cap, momentum, technical indicators), watchlist management, and autonomous trading with stop losses, take profits, and quant-based strategies. Works with Solana (trading) and other chains Ethereum, Base, and Arbitrum for token filtering + research.
---

# DROYD

Execute crypto research, trading, and data operations using natural language through DROYD's AI agent API.

[droyd.ai](https://droyd.ai) | [api.droyd.ai](https://api.droyd.ai)

## Quick Start

### First-Time Setup

#### Option A: User provides existing API key

If the user already has a DROYD API key:

1. Download the Droyd Skill

```bash
clawhub install droyd
```

or if clawhub is not installed

```bash
mkdir -p ~/.openclaw/skills/droyd` and copy the contents of the zip file download
```

2. configure creditials

```bash
cat > ~/.openclaw/workspace/skills/droyd/config.json << 'EOF'
{
  "apiKey": "YOUR_API_KEY_HERE",
  "apiUrl": "https://api.droyd.ai"
}
EOF
```

API keys can be obtained at [droyd.ai](https://droyd.ai) in account settings.

#### Option B: Guide user through signup

1. **Sign up** at [droyd.ai](https://droyd.ai)
2. **Get API key** in account settings
3. **Configure**:

```bash
mkdir -p ~/.openclaw/skills/droyd
cat > ~/.openclaw/skills/droyd/config.json << 'EOF'
{
  "apiKey": "YOUR_API_KEY_HERE",
  "apiUrl": "https://api.droyd.ai"
}
EOF
```

#### Verify Setup

```bash
scripts/droyd-search.sh "recent" "posts,news" 5
```

## Core Usage

### Agent Chat

Chat with DROYD AI agent. Supports multi-turn conversations:

```bash
# Chat with the agent
scripts/droyd-chat.sh "What's the current sentiment on AI tokens?"

# Continue conversation (pass conversation_uuid from previous response)
scripts/droyd-chat.sh "Tell me more about the second point" "uuid-from-previous"

# With streaming
scripts/droyd-chat.sh "Research Jupiter aggregator" "" "true"
```

**Reference**: [references/agent-chat.md](references/agent-chat.md)

### Content Search

Search crypto content with semantic or recent modes:

```bash
# Recent content
scripts/droyd-search.sh "recent" "posts,news" 25 "ethereum,base" "defi" 7

# Semantic search
scripts/droyd-search.sh "semantic" "posts,tweets" 50 "" "" 7 "What are the risks of liquid staking?"
```

**Reference**: [references/search.md](references/search.md)

### Project Search

Find projects by name, symbol, address, or concept:

```bash
# By name
scripts/droyd-project-search.sh "name" "Bitcoin,Ethereum" 10

# By symbol
scripts/droyd-project-search.sh "symbol" "BTC,ETH,SOL"

# Semantic search
scripts/droyd-project-search.sh "semantic" "AI agents in DeFi" 15

# By contract address
scripts/droyd-project-search.sh "address" "So11111111111111111111111111111111111111112"
```

**Reference**: [references/project-search.md](references/project-search.md)

### Project Filter

Screen projects with market criteria:

```bash
# Natural language filter
scripts/droyd-filter.sh "natural_language" "Find trending micro-cap Solana tokens with high trader growth"

# Direct filter (trending tokens on Solana under $10M mcap)
scripts/droyd-filter.sh "direct" "" "trending" "desc" "4h" "solana" "" "10" "50000"
```

**Reference**: [references/project-filter.md](references/project-filter.md)

### Trading

Execute trades with risk management:

```bash
# Simple market buy
scripts/droyd-trade-open.sh 123 "market_buy" 100

# Buy with stop loss and take profit (project_id, entry_amount, stop_%, tp_%)
scripts/droyd-trade-open.sh 123 "managed" 100 0.10 0.25

# Check positions
scripts/droyd-positions.sh

# Close position
scripts/droyd-trade-manage.sh 789 "close"

# Partial sell (50%)
scripts/droyd-trade-manage.sh 789 "sell" 0.5
```

**Reference**: [references/trading.md](references/trading.md)

## Capabilities Overview

### Search Modes

| Mode       | Use Case                                                     |
| ---------- | ------------------------------------------------------------ |
| `auto`     | Default - automatically selects mode based on query presence |
| `recent`   | Browse latest content by type, ecosystem, category           |
| `semantic` | AI-powered question answering with analysis                  |

### Content Types

`posts`, `news`, `developments`, `tweets`, `youtube`, `memories`

### Project Search Types

- `project_id` - Direct ID lookup (fastest)
- `name` - Search by project name
- `symbol` - Search by ticker symbol
- `address` - Search by contract address (exact)
- `semantic` - AI-powered concept search

### Filter Sort Options

`trending`, `market_cap`, `price_change`, `traders`, `traders_change`, `volume`, `volume_change`, `buy_volume_ratio`, `quant_score`, `quant_score_change`, `mentions_24h`, `mentions_7d`

### Trading Leg Types

- `market_buy` - Immediate execution at market price
- `limit_order` - Buy when price drops by specified %
- `stop_loss` - Sell on price drop (protection)
- `take_profit` - Sell on price rise (lock gains)
- `quant_buy` / `quant_sell` - Trigger on momentum score thresholds

### Supported Chains

`solana`, `ethereum`, `base`, `arbitrum`

## Rate Limits

- Varies by subscription tier - most endpoints are 3 | 30 | 100 for the plans free |casual | pro per API session
- API sessions are 15 minutes per endpoint
- HTTP 429 returned when limit exceeded

## Error Handling

Common errors:

- `400` - Validation failed (check parameters)
- `401` - Invalid or missing API key
- `429` - Rate limit exceeded (wait 10 minutes)
- `500` - Internal server error

## Resources

- **Website**: [droyd.ai](https://droyd.ai)
- **API Playground**: [api.droyd.ai](https://api.droyd.ai)
- **Documentation**: https://docs.droyd.ai
