# Einstein x402 Services Catalog

Complete reference for all 27 Bitquery analytics endpoints available via x402 micropayments.

## Pricing Structure

Every endpoint has two variants:

- **Default (analyzed):** Includes AI-generated insights and analysis
- **Raw (`/raw` suffix):** Structured data only, saves $0.15 per query

**Payment:** USDC on Base network (chain ID 8453) via EIP-3009 TransferWithAuthorization.

---

## Tier 1: Basic Queries

### Latest Tokens

- **Command:** `latest-tokens`
- **Endpoint:** `/x402/bitquery/latest-pairs`
- **Price:** $0.25 raw / $0.40 analyzed
- **Parameters:** `chain` (required), `limit` (required)
- **Chains:** base, ethereum, bsc, arbitrum, polygon, optimism
- **Default chain:** base
- **Description:** Latest deployed tokens on-chain with liquidity pool data. Shows new token launches with initial liquidity and trading activity.

### Token Chart

- **Command:** `chart`
- **Endpoint:** `/x402/bitquery/tokenchart`
- **Price:** $0.25 raw / $0.40 analyzed
- **Parameters:** `chain` (required), `tokenAddress` (required), `timeperiod` (required)
- **Chains:** base, ethereum, bsc, arbitrum, polygon, optimism, zksync
- **Default chain:** base
- **Description:** Token price history and chart data for technical analysis. Returns time-series price points.

---

## Tier 2: Standard Analysis

### OHLCV

- **Command:** `ohlcv`
- **Endpoint:** `/x402/bitquery/ohlcv`
- **Price:** $0.40 raw / $0.55 analyzed
- **Parameters:** `chain` (required), `tokenAddress` (required), `timeperiod` (required)
- **Chains:** base, ethereum, bsc, arbitrum, polygon, optimism
- **Default chain:** base
- **Description:** Open, High, Low, Close, Volume candlestick data for advanced technical analysis. Returns full OHLC bars with volume metrics.

### Top Tokens

- **Command:** `top-tokens`
- **Endpoint:** `/x402/bitquery/top-tokens`
- **Price:** $0.40 raw / $0.55 analyzed
- **Parameters:** `chain` (required), `limit` (required)
- **Chains:** base, ethereum, bsc, arbitrum, polygon, optimism, zksync
- **Default chain:** base
- **Description:** Top tokens ranked by market cap with price, volume, and supply metrics.

### Top Movers

- **Command:** `top-movers`
- **Endpoint:** `/x402/bitquery/topvolume`
- **Price:** $0.40 raw / $0.55 analyzed
- **Parameters:** `chain` (required), `limit` (required), `timeperiod` (required)
- **Chains:** base, ethereum, bsc, arbitrum, polygon, optimism, zksync, solana
- **Default chain:** base
- **Description:** Top gainers/losers analysis with volume, price change percentage, and market insights.

### Virtuals Protocol

- **Command:** `virtuals`
- **Endpoint:** `/x402/bitquery/virtual-pools`
- **Price:** $0.40 raw / $0.55 analyzed
- **Parameters:** `limit` (required), `timeperiod` (required)
- **Chains:** base (only)
- **Default chain:** base
- **Description:** Virtuals Protocol agent tokens and bonding curves on Base.

### Wallet Holdings

- **Command:** `wallet`
- **Endpoint:** `/x402/bitquery/wallet-holdings`
- **Price:** $0.40 raw / $0.55 analyzed
- **Parameters:** `chain` (required), `walletAddress` (required)
- **Chains:** ethereum, base, bsc, arbitrum, polygon
- **Default chain:** ethereum
- **Description:** Complete wallet portfolio breakdown showing all token holdings and USD values.

### Holder Concentration

- **Command:** `holders`
- **Endpoint:** `/x402/bitquery/holderconcentration`
- **Price:** $0.40 raw / $0.55 analyzed
- **Parameters:** `chain` (required), `tokenAddress` (required), `limit` (required)
- **Chains:** ethereum, base, bsc, arbitrum, polygon
- **Default chain:** base
- **Description:** Token holder distribution analysis with concentration risk metrics.

---

## Tier 3: Platform Monitoring

### Zora Launches

- **Command:** `zora-launches`
- **Endpoint:** `/x402/bitquery/zora-launches`
- **Price:** $0.60 raw / $0.75 analyzed
- **Parameters:** `limit` (required), `timeperiod` (required)
- **Chains:** base (only)
- **Default chain:** base
- **Description:** Latest Zora Launchpad token deployments with deployer intel.

### Zora Volume

- **Command:** `zora-volume`
- **Endpoint:** `/x402/bitquery/zora-volume`
- **Price:** $0.60 raw / $0.75 analyzed
- **Parameters:** `limit` (required), `timeperiod` (required)
- **Chains:** base (only)
- **Default chain:** base
- **Description:** Top Zora Launchpad tokens by trading volume.

### Pump.fun Launches

- **Command:** `pump-launches`
- **Endpoint:** `/x402/bitquery/pumpfun-launches`
- **Price:** $0.60 raw / $0.75 analyzed
- **Parameters:** `limit` (required), `timeperiod` (required)
- **Chains:** solana (only)
- **Default chain:** solana
- **Description:** Fresh Pump.fun token launches with bonding curve progress.

### Pump.fun Volume

- **Command:** `pump-volume`
- **Endpoint:** `/x402/bitquery/pumpfun-volume`
- **Price:** $0.60 raw / $0.75 analyzed
- **Parameters:** `limit` (required), `timeperiod` (required)
- **Chains:** solana (only)
- **Default chain:** solana
- **Description:** Top Pump.fun tokens by volume with buyer/seller flow.

### Pump.fun Graduation

- **Command:** `pump-grads`
- **Endpoint:** `/x402/bitquery/pumpfun-graduation`
- **Price:** $0.60 raw / $0.75 analyzed
- **Parameters:** `limit` (required)
- **Chains:** solana (only)
- **Default chain:** solana
- **Description:** Pump.fun tokens approaching Raydium graduation threshold.

### BSC Alpha

- **Command:** `alpha`
- **Endpoint:** `/x402/bitquery/bscalpha`
- **Price:** $0.60 raw / $0.75 analyzed
- **Parameters:** `chain` (required), `limit` (required), `timeperiod` (required)
- **Chains:** bsc (only)
- **Default chain:** bsc
- **Description:** Aggregated alpha signals for early opportunities on BSC.

### Liquidity Shifts

- **Command:** `liquidity`
- **Endpoint:** `/x402/bitquery/liquidityshifts`
- **Price:** $0.60 raw / $0.75 analyzed
- **Parameters:** `chain` (required), `limit` (required), `timeperiod` (required)
- **Chains:** ethereum, base, bsc, arbitrum, polygon, optimism, zksync
- **Default chain:** ethereum
- **Description:** High-velocity DEX liquidity changes detecting significant market moves.

---

## Tier 4: Advanced Intelligence

### Whale Intel

- **Command:** `whale-intel`
- **Endpoint:** `/x402/bitquery/whaleintel`
- **Price:** $0.85 raw / $1.00 analyzed
- **Parameters:** `chain` (required), `limit` (required), `timeperiod` (required)
- **Chains:** ethereum, base, bsc, arbitrum, polygon
- **Default chain:** base
- **Description:** Token-centric whale accumulation view with net capital flows and top holders.

### Top Traders

- **Command:** `top-traders`
- **Endpoint:** `/x402/bitquery/toptraders`
- **Price:** $0.85 raw / $1.00 analyzed
- **Parameters:** `chain` (required), `limit` (required), `timeperiod` (required)
- **Chains:** bsc (only)
- **Default chain:** bsc
- **Description:** Top meme/bonding-curve traders on Four.meme platform.

### DEX Capital

- **Command:** `dex-capital`
- **Endpoint:** `/x402/bitquery/dexcapital`
- **Price:** $0.85 raw / $1.00 analyzed
- **Parameters:** `chain` (required), `limit` (required), `timeperiod` (required)
- **Chains:** bsc, base, ethereum, arbitrum, polygon, optimism, zksync
- **Default chain:** base
- **Description:** Capital-intensive traders across DEXes showing big money flows.

### Smart Money

- **Command:** `smart-money`
- **Endpoint:** `/x402/bitquery/smartmoney`
- **Price:** $0.85 raw / $1.00 analyzed
- **Parameters:** `chain` (required), `limit` (required), `timeperiod` (required)
- **Chains:** ethereum, base, bsc, arbitrum, polygon
- **Default chain:** base
- **Description:** Leaderboard of top trader wallets with buy/sell flow analysis and accumulation patterns.

### Token Sniping

- **Command:** `token-snipe`
- **Endpoint:** `/x402/bitquery/tokensniping`
- **Price:** $0.85 raw / $1.00 analyzed
- **Parameters:** `chain` (required), `tokenAddress` (required), `limit` (required)
- **Chains:** ethereum, base, bsc, arbitrum, polygon
- **Default chain:** base
- **Description:** Early token buyers analysis with bot detection and sniper identification.

### Polymarket Events

- **Command:** `polymarket`
- **Endpoint:** `/x402/bitquery/polymarket-events`
- **Price:** $0.85 raw / $1.00 analyzed
- **Parameters:** `limit` (required), `timeperiod` (required)
- **Chains:** polygon (only)
- **Default chain:** polygon
- **Description:** Real-time Polymarket contract events and position changes.

---

## Tier 5: Comprehensive Reports

### Polymarket Chain Compare

- **Command:** `polymarket-compare`
- **Endpoint:** `/x402/bitquery/polymarket-chain-compare`
- **Price:** $1.00 raw / $1.15 analyzed
- **Parameters:** `limit` (required)
- **Chains:** polygon (only)
- **Default chain:** polygon
- **Description:** Compare Polymarket API vs Polygon blockchain events for latency arbitrage, whale signals, settlement predictions.

### Investment Report

- **Command:** `investment-report`
- **Endpoint:** `/x402/bitquery/investment-report`
- **Price:** $1.00 raw / $1.15 analyzed
- **Parameters:** `chains` (required, comma-separated), `limit` (required), `timeperiod` (required)
- **Chains:** base, ethereum, bsc, solana, arbitrum, polygon, optimism, zksync
- **Default chain:** base
- **Description:** Multi-chain investment report with bonding curves, liquidity, and whale intel.

### NFT Analytics

- **Command:** `nft-analytics`
- **Endpoint:** `/x402/bitquery/nftanalytics`
- **Price:** $1.00 raw / $1.15 analyzed
- **Parameters:** `chain` (required), `limit` (required), `timeperiod` (required)
- **Chains:** ethereum, base, bsc, arbitrum, polygon, optimism
- **Default chain:** ethereum
- **Description:** NFT collection analysis: mints, whales, floor prices, wash trading detection.

### MEV Detection

- **Command:** `mev-detect`
- **Endpoint:** `/x402/bitquery/mevdetection`
- **Price:** $1.00 raw / $1.15 analyzed
- **Parameters:** `chain` (required), `limit` (required), `timeperiod` (required)
- **Chains:** ethereum, base, bsc, arbitrum, polygon
- **Default chain:** ethereum
- **Description:** Detect MEV activity: sandwich attacks, front-running, toxic flow analysis.

### Arbitrage Scanner

- **Command:** `arbitrage`
- **Endpoint:** `/x402/bitquery/arbitragescanner`
- **Price:** $1.00 raw / $1.15 analyzed
- **Parameters:** `chain` (required), `limit` (required), `timeperiod` (required)
- **Chains:** ethereum, base, bsc, arbitrum, polygon, optimism
- **Default chain:** ethereum
- **Description:** Cross-chain price discrepancies and profitable arbitrage routes.

### Rug Pull Scanner

- **Command:** `rug-scan`
- **Endpoint:** `/x402/bitquery/rug-pull-scanner`
- **Price:** $1.00 raw / $1.15 analyzed
- **Parameters:** `chain` (required), `tokenAddress` (required)
- **Chains:** ethereum, base, bsc, arbitrum, polygon
- **Default chain:** base
- **Description:** Token security analysis: holder concentration, liquidity locks, risk scoring.

---

## Parameter Reference

| Parameter       | Type     | Constraints                       | Description                              |
| --------------- | -------- | --------------------------------- | ---------------------------------------- |
| `chain`         | string   | See supported chains per endpoint | Blockchain network to query              |
| `chains`        | string[] | Comma-separated                   | Multiple chains (investment-report only) |
| `limit`         | integer  | 1-500                             | Number of results to return              |
| `timeperiod`    | string   | 1d, 3d, 7d, 30d (max)             | Time window for data                     |
| `tokenAddress`  | string   | 0x-prefixed hex (EVM)             | Token contract address                   |
| `walletAddress` | string   | 0x-prefixed hex (EVM)             | Wallet address                           |

**Time period note:** Periods longer than 30d (e.g., 3m, 1y) are automatically clamped to 30d by the server.

## Response Format

All endpoints return JSON. The analyzed variant includes an `analysis` field with AI-generated insights. The raw variant returns only the structured data fields.
