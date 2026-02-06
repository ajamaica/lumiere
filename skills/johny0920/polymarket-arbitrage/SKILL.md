---
name: polymarket-arbitrage
description: Monitor and execute arbitrage opportunities on Polymarket prediction markets. Detects math arbitrage (multi-outcome probability mismatches), cross-market arbitrage (same event different prices), and orderbook inefficiencies. Use when user wants to find or trade Polymarket arbitrage, monitor prediction markets for opportunities, or implement automated trading strategies. Includes risk management, P&L tracking, and alerting.
---

# Polymarket Arbitrage

Find and execute arbitrage opportunities on Polymarket prediction markets.

## Quick Start

### 1. Paper Trading (Recommended First Step)

Run a single scan to see current opportunities:

```bash
cd skills/polymarket-arbitrage
pip install requests beautifulsoup4
python scripts/monitor.py --once --min-edge 3.0
```

View results in `polymarket_data/arbs.json`

### 2. Continuous Monitoring

Monitor every 5 minutes and alert on new opportunities:

```bash
python scripts/monitor.py --interval 300 --min-edge 3.0
```

Stop with `Ctrl+C`

### 3. Understanding Results

Each detected arbitrage includes:

- **net_profit_pct**: Edge after 2% fees
- **risk_score**: 0-100, lower is better
- **volume**: Market liquidity
- **action**: What to do (buy/sell all outcomes)

Good opportunities:

- Net profit: 3-5%+
- Risk score: <50
- Volume: $1M+
- Type: `math_arb_buy` (safer)

## Arbitrage Types Detected

### Math Arbitrage (Primary Focus)

**Type A: Buy All Outcomes** (prob sum < 100%)

- Safest type
- Guaranteed profit if executable
- Example: 48% + 45% = 93% → 7% edge, ~5% net after fees

**Type B: Sell All Outcomes** (prob sum > 100%)

- Riskier (requires liquidity)
- Need capital to collateralize
- Avoid until experienced

See `references/arbitrage_types.md` for detailed examples and strategies.

### Cross-Market Arbitrage

Same event priced differently across markets (not yet implemented - requires semantic matching).

### Orderbook Arbitrage

Requires real-time orderbook data (homepage shows midpoints, not executable prices).

## Scripts

### fetch_markets.py

Scrape Polymarket homepage for active markets.

```bash
python scripts/fetch_markets.py --output markets.json --min-volume 50000
```

Returns JSON with market probabilities, volumes, and metadata.

### detect_arbitrage.py

Analyze markets for arbitrage opportunities.

```bash
python scripts/detect_arbitrage.py markets.json --min-edge 3.0 --output arbs.json
```

Accounts for:

- 2% taker fees (per leg)
- Multi-outcome fee multiplication
- Risk scoring

### monitor.py

Continuous monitoring with alerting.

```bash
python scripts/monitor.py --interval 300 --min-edge 3.0 [--alert-webhook URL]
```

Features:

- Fetches markets every interval
- Detects arbitrage
- Alerts on NEW opportunities only (deduplicates)
- Saves state to `polymarket_data/`

## Workflow Phases

### Phase 1: Paper Trading (1-2 weeks)

**Goal:** Understand opportunity frequency and quality

1. Run monitor 2-3x per day
2. Log opportunities in spreadsheet
3. Check if they're still available when you look
4. Calculate what profit would have been

**Decision point:** If seeing 3-5 good opportunities per week, proceed to Phase 2.

### Phase 2: Micro Testing ($50-100 CAD)

**Goal:** Learn platform mechanics

1. Create Polymarket account
2. Deposit $50-100 in USDC
3. Manual trades only (no automation)
4. Max $5-10 per opportunity
5. Track every trade in spreadsheet

**Decision point:** If profitable after 20+ trades, proceed to Phase 3.

### Phase 3: Scale Up ($500 CAD)

**Goal:** Increase position sizes

1. Increase bankroll to $500
2. Max 5% per trade ($25)
3. Still manual execution
4. Implement strict risk management

### Phase 4: Automation (Future)

Requires:

- Wallet integration (private key management)
- Polymarket API or browser automation
- Execution logic
- Monitoring infrastructure

**Only consider after consistently profitable manual trading.**

See `references/getting_started.md` for detailed setup instructions.

## Risk Management

### Critical Rules

1. **Maximum position size:** 5% of bankroll per opportunity
2. **Minimum edge:** 3% net (after fees)
3. **Daily loss limit:** 10% of bankroll
4. **Focus on buy arbs:** Avoid sell-side until experienced

### Red Flags

- Edge >10% (likely stale data)
- Volume <$100k (liquidity risk)
- Probabilities recently updated (arb might close)
- Sell-side arbs (capital + liquidity requirements)

## Fee Structure

Polymarket charges:

- **Maker fee:** 0%
- **Taker fee:** 2%

**Conservative assumption:** 2% per leg (assume taker)

**Breakeven calculation:**

- 2-outcome market: 2% × 2 = 4% gross edge needed
- 3-outcome market: 2% × 3 = 6% gross edge needed
- N-outcome market: 2% × N gross edge needed

**Target:** 3-5% NET profit (after fees)

## Common Issues

### "High edge but disappeared"

Homepage probabilities are stale or represent midpoints, not executable prices. This is normal. Real arbs disappear in seconds.

### "Can't execute at displayed price"

Liquidity issue. Low-volume markets show misleading probabilities. Stick to $1M+ volume markets.

### "Edge is too small after fees"

Increase `--min-edge` threshold. Try 4-5% for more conservative filtering.

## Files and Data

All monitoring data stored in `./polymarket_data/`:

- `markets.json` - Latest market scan
- `arbs.json` - Detected opportunities
- `alert_state.json` - Deduplication state (which arbs already alerted)

## Advanced Topics

### Telegram Integration (Future)

Pass webhook URL to monitor script for alerts:

```bash
python scripts/monitor.py --alert-webhook "https://api.telegram.org/bot<token>/sendMessage?chat_id=<id>"
```

### Position Sizing

For a 2-outcome math arb with probabilities p₁ and p₂ where p₁ + p₂ < 100%:

**Optimal allocation:**

- Bet on outcome 1: (100% / p₁) / [(100%/p₁) + (100%/p₂)] of capital
- Bet on outcome 2: (100% / p₂) / [(100%/p₁) + (100%/p₂)] of capital

This ensures equal profit regardless of which outcome wins.

**Simplified rule:** For small edges, split capital evenly across outcomes.

### Execution Speed

Arbs disappear fast. If planning automation:

- Use websocket connections (not polling)
- Place limit orders simultaneously
- Have capital pre-deposited
- Monitor gas fees on Polygon

## Resources

- **Polymarket:** https://polymarket.com
- **Documentation:** https://docs.polymarket.com
- **API (if available):** Check Polymarket docs
- **Community:** Polymarket Discord

## Support

For skill issues:

- Check `references/arbitrage_types.md` for strategy details
- Check `references/getting_started.md` for setup help
- Review output files in `polymarket_data/`
- Ensure dependencies installed: `pip install requests beautifulsoup4`
