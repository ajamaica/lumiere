# Getting Started with Polymarket Arbitrage

## Phase 1: Paper Trading (Recommended)

Before risking real money, monitor markets to understand:

- How often arbs appear
- How quickly they disappear
- Typical edge sizes
- Which market types are most profitable

### Running the Monitor

```bash
cd skills/polymarket-arbitrage

# Install dependencies
pip install requests beautifulsoup4

# Test single run
python scripts/monitor.py --once --min-edge 3.0

# Continuous monitoring (every 5 minutes)
python scripts/monitor.py --interval 300 --min-edge 3.0
```

### Interpreting Results

Good opportunities:

- **Net Profit:** 3-5% or higher
- **Volume:** $1M+ (better liquidity)
- **Risk Score:** <50 (lower is better)
- **Type:** `math_arb_buy` (safer than sell)

Warning signs:

- **Very high edge (>10%):** Likely stale data or error
- **Low volume (<$100k):** Liquidity risk
- **Sell arbs:** Require capital and liquidity

---

## Phase 2: Setting Up a Polymarket Account

### Prerequisites

1. **Crypto Wallet:** MetaMask or WalletConnect
2. **USDC:** Polymarket uses USDC (stablecoin on Polygon network)
3. **Small test amount:** Start with $50-100 CAD

### Steps

1. Go to [polymarket.com](https://polymarket.com)
2. Connect your wallet (MetaMask recommended)
3. Bridge funds to Polygon network (if needed)
4. Buy USDC (or bridge from Ethereum mainnet)
5. Deposit USDC to Polymarket

**Important:** Gas fees on Polygon are low (~$0.01), but bridging from Ethereum can cost $5-50 depending on congestion.

---

## Phase 3: Manual Trading

Once you've:

- Monitored for 1-2 weeks
- Seen consistent opportunities
- Understand the patterns

Start with **manual trading**:

1. Run monitor to find opportunities
2. Review the arbitrage details
3. Manually verify on Polymarket website
4. Execute trades if prices still valid
5. Track P&L in a spreadsheet

**Why manual first?**

- Learn the platform mechanics
- Verify the detection logic is sound
- Avoid automated losses from bugs
- Build confidence

---

## Phase 4: Automated Trading (Future)

Once profitable with manual trading, automation makes sense.

**Requirements:**

- Polymarket API access or browser automation
- Wallet integration (private key management)
- Order execution logic
- Monitoring and alerting

**Warning:** Automated trading introduces new risks:

- Bug could lose money quickly
- API rate limits
- Execution failures
- Smart contract risks

---

## Risk Management Guidelines

### Position Sizing

- **Never risk more than 5% of bankroll on one arb**
- Example: $500 bankroll → max $25 per opportunity
- This allows for 20 independent opportunities

### Edge Requirements

- **Minimum net edge:** 3% after fees
- **Preferred edge:** 4-5%+
- Higher edge = more margin for error

### Loss Limits

- **Daily loss limit:** 10% of bankroll
- Example: $500 bankroll → stop at -$50/day
- Prevents catastrophic losses from bugs or bad data

### Diversification

- Don't put all capital in one market category
- Spread across politics, sports, crypto, etc.
- Reduces correlation risk

---

## Common Pitfalls

1. **Chasing stale arbs** - Homepage prices lag the orderbook
2. **Ignoring liquidity** - Can't fill large orders at displayed price
3. **Forgetting fees** - 2% × N outcomes adds up fast
4. **Overconfidence** - Small sample sizes can be misleading
5. **Not tracking P&L** - Need accurate records for tax and learning

---

## Recommended Workflow

**Week 1-2:** Paper trading

- Run monitor 2-3x/day
- Log all opportunities in a spreadsheet
- Track which ones would have been profitable

**Week 3-4:** Micro testing ($50-100)

- Manual trades only
- Max $5-10 per opportunity
- Focus on learning, not profit

**Month 2+:** Scale up gradually

- Increase bankroll if profitable
- Still manual execution
- Keep detailed records

**Month 3+:** Consider automation

- Only if consistently profitable (>10% monthly ROI)
- Start with small limits
- Monitor closely

---

## Tools and Resources

### Essential

- **Python 3.8+** for running scripts
- **Spreadsheet** for P&L tracking
- **Telegram** for alerts (optional)

### Helpful

- **Polymarket Discord** - Community insights
- **DeFi news** - Market-moving events
- **Gas tracker** - Polygon gas prices

### Advanced (Future)

- **Polymarket API** - Direct order placement
- **Browser automation** - Selenium/Playwright
- **Database** - PostgreSQL for historical tracking

---

## Next Steps

1. **Install dependencies:** `pip install requests beautifulsoup4`
2. **Run first scan:** `python scripts/monitor.py --once`
3. **Review results:** Check `polymarket_data/arbs.json`
4. **Paper trade:** Run monitor daily for 1-2 weeks
5. **Decide:** Continue if opportunities look promising

Questions? Check `references/arbitrage_types.md` for strategy details.
