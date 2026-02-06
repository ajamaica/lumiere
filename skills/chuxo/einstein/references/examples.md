# Einstein x402 — Usage Examples

Detailed examples organized by use case. All examples assume the skill is set up with a funded wallet.

## Market Analysis

### "What are the top movers on Base today?"

```bash
node scripts/einstein.mjs top-movers --chain base --timeperiod 1d --limit 10
```

Cost: $0.55 USDC (analyzed) or $0.40 (raw with `--raw`)

### "Show me the top tokens on Ethereum by market cap"

```bash
node scripts/einstein.mjs top-tokens --chain ethereum --limit 20
```

### "What tokens were just deployed on Base?"

```bash
node scripts/einstein.mjs latest-tokens --chain base --limit 15
```

### "Check the biggest volume movers on Solana this week"

```bash
node scripts/einstein.mjs top-movers --chain solana --timeperiod 7d --limit 10
```

---

## Whale & Smart Money Tracking

### "Track whale accumulation on Ethereum"

```bash
node scripts/einstein.mjs whale-intel --chain ethereum --limit 10 --timeperiod 7d
```

Cost: $1.00 USDC (analyzed) or $0.85 (raw)

### "Show me the smart money leaderboard on Base"

```bash
node scripts/einstein.mjs smart-money --chain base --limit 20 --timeperiod 7d
```

### "Who are the biggest DEX traders on Arbitrum?"

```bash
node scripts/einstein.mjs dex-capital --chain arbitrum --limit 10 --timeperiod 3d
```

### "Find top meme traders on BSC"

```bash
node scripts/einstein.mjs top-traders --chain bsc --limit 15 --timeperiod 7d
```

---

## Token Security & Risk

### "Is this token a rug pull?"

```bash
node scripts/einstein.mjs rug-scan --chain ethereum --token 0x1234567890abcdef1234567890abcdef12345678
```

Cost: $1.15 USDC (analyzed) or $1.00 (raw)

Returns: Holder concentration, liquidity locks, deployer history, risk score.

### "Check for MEV attacks on Ethereum"

```bash
node scripts/einstein.mjs mev-detect --chain ethereum --limit 10 --timeperiod 1d
```

### "Who sniped this token at launch?"

```bash
node scripts/einstein.mjs token-snipe --chain base --token 0xabcdef... --limit 20
```

### "Check holder concentration for a token"

```bash
node scripts/einstein.mjs holders --chain base --token 0xabcdef... --limit 50
```

---

## Launchpad Monitoring

### "What's launching on Pump.fun?"

```bash
node scripts/einstein.mjs pump-launches --limit 15 --timeperiod 1d
```

Cost: $0.75 USDC (analyzed) or $0.60 (raw)

### "Which Pump.fun tokens are about to graduate to Raydium?"

```bash
node scripts/einstein.mjs pump-grads --limit 10
```

### "Show me Pump.fun tokens with the most volume"

```bash
node scripts/einstein.mjs pump-volume --limit 10 --timeperiod 1d
```

### "What's new on Zora Launchpad?"

```bash
node scripts/einstein.mjs zora-launches --limit 10 --timeperiod 3d
```

### "Top Zora tokens by volume"

```bash
node scripts/einstein.mjs zora-volume --limit 10 --timeperiod 7d
```

### "Show me Virtuals Protocol agent tokens"

```bash
node scripts/einstein.mjs virtuals --limit 10 --timeperiod 7d
```

---

## Portfolio & Wallet Analysis

### "What does this wallet hold?"

```bash
node scripts/einstein.mjs wallet --chain ethereum --wallet 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

Cost: $0.55 USDC (analyzed) or $0.40 (raw)

### "Show me OHLCV data for a token"

```bash
node scripts/einstein.mjs ohlcv --chain base --token 0xabcdef... --timeperiod 30d
```

### "Get price chart for a token"

```bash
node scripts/einstein.mjs chart --chain base --token 0xabcdef... --timeperiod 7d
```

---

## DeFi Intelligence

### "Find arbitrage opportunities"

```bash
node scripts/einstein.mjs arbitrage --chain ethereum --limit 10 --timeperiod 1d
```

Cost: $1.15 USDC (analyzed) or $1.00 (raw)

### "Check liquidity movements"

```bash
node scripts/einstein.mjs liquidity --chain ethereum --limit 10 --timeperiod 3d
```

### "BSC alpha signals"

```bash
node scripts/einstein.mjs alpha --chain bsc --limit 10 --timeperiod 1d
```

---

## Investment Reports

### "Give me a multi-chain investment overview"

```bash
node scripts/einstein.mjs investment-report --chains base,ethereum,bsc --limit 10 --timeperiod 7d
```

Cost: $1.15 USDC (analyzed) or $1.00 (raw)

This is the most comprehensive endpoint — combines bonding curve analysis, liquidity metrics, whale intel, and market signals across multiple chains.

---

## NFT Analytics

### "Analyze NFT collections on Ethereum"

```bash
node scripts/einstein.mjs nft-analytics --chain ethereum --limit 10 --timeperiod 7d
```

Cost: $1.15 USDC (analyzed) or $1.00 (raw)

Returns: Mint activity, whale collectors, floor prices, wash trading detection.

---

## Prediction Markets

### "What's happening on Polymarket?"

```bash
node scripts/einstein.mjs polymarket --limit 10 --timeperiod 7d
```

Cost: $1.00 USDC (analyzed) or $0.85 (raw)

### "Compare Polymarket API vs on-chain data"

```bash
node scripts/einstein.mjs polymarket-compare --limit 10
```

Cost: $1.15 USDC (analyzed) or $1.00 (raw)

Useful for detecting latency between API prices and actual blockchain settlements.

---

## Getting Data-Only (Raw) Responses

Add `--raw` to any command to skip AI analysis and save $0.15:

```bash
# Analyzed (default): $0.55
node scripts/einstein.mjs top-movers --chain base --limit 10

# Raw data only: $0.40
node scripts/einstein.mjs top-movers --chain base --limit 10 --raw
```

Raw responses return structured JSON without the `analysis` field. Useful when your agent will process the data with its own logic.

---

## Batch Queries

Run multiple queries sequentially:

```bash
# Morning market scan
node scripts/einstein.mjs top-movers --chain base --timeperiod 1d --limit 10 && \
node scripts/einstein.mjs whale-intel --chain base --timeperiod 1d --limit 5 && \
node scripts/einstein.mjs pump-grads --limit 5
```

Total cost: ~$0.55 + $1.00 + $0.75 = $2.30 USDC

---

## Output Handling

All data goes to **stdout** as JSON. Diagnostic messages go to **stderr**.

```bash
# Save to file
node scripts/einstein.mjs top-movers --chain base > movers.json 2>/dev/null

# Pipe to jq
node scripts/einstein.mjs top-movers --chain base 2>/dev/null | jq '.tokens[0]'

# Parse in another script
MOVERS=$(node scripts/einstein.mjs top-movers --chain base --raw 2>/dev/null)
echo "$MOVERS" | jq -r '.tokens[].symbol'
```
