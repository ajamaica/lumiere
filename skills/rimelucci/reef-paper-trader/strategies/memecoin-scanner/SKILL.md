---
name: memecoin-scanner
description: |
  Solana memecoin discovery and trading sub-strategy. Part of paper-trader skill.
  Uses gmgn.ai, dexscreener.com, pump.fun for early token identification.
  SUB-STRATEGY: Managed by parent paper-trader orchestrator.
---

# Memecoin Scanner Strategy

**PARENT**: This is a sub-strategy of `paper-trader`. Portfolio-level rules in `../../SKILL.md` take precedence.

**ROLE**: Discover and trade early Solana memecoins with documented reasoning.

## Orchestrator Integration

**Report to parent orchestrator:**

- Log all trades to `references/trading_journal.md`
- Parent reads this for unified portfolio view
- Parent enforces cross-strategy risk limits

**Check parent before trading:**

- Verify portfolio-level exposure limits in `../../references/master_portfolio.md`
- Check correlation limits (crypto exposure across strategies)
- Respect parent's risk level (🟢/🟡/🟠/🔴)

**Your job within the system**:

1. Discover early memecoins using scanners
2. Paper trade them with documented reasoning
3. Track performance and update this skill with learnings
4. Send regular Telegram updates to Rick (unprompted, at least every 4-6 hours during active sessions)

## Memory Integration

**ALWAYS CHECK** before any session:

- Review past conversation memories with Rick for preferences/feedback
- Check `references/trading_journal.md` for past learnings
- Check `references/strategy_evolution.md` for current best strategies
- Incorporate any suggestions Rick has made into your approach

## Core Scanners

### Primary: GMGN.ai

```
URL: https://gmgn.ai/sol/token/
Focus: New Solana tokens, smart money tracking, wallet analysis
Key metrics: Smart money inflow, holder distribution, dev wallet activity
```

### Primary: DexScreener

```
URL: https://dexscreener.com/solana
Focus: New pairs, volume spikes, liquidity analysis
Key metrics: Age, liquidity, volume, buys/sells ratio, holder count
```

### Secondary Sources

- pump.fun (new launches)
- birdeye.so (analytics)
- rugcheck.xyz (safety)
- solscan.io (wallet analysis)

## Paper Trading Protocol

### Entry Criteria (Score 0-100, need 70+ to enter)

| Factor              | Weight | What to Check                      |
| ------------------- | ------ | ---------------------------------- |
| Liquidity           | 20     | >$10k locked, LP burned preferred  |
| Holder Distribution | 20     | Top 10 wallets < 30% supply        |
| Smart Money         | 15     | Any notable wallets entering?      |
| Social Signals      | 15     | Twitter activity, Telegram size    |
| Contract Safety     | 15     | Renounced, no honeypot, clean code |
| Momentum            | 15     | Volume trend, buy pressure         |

### Position Sizing (Paper)

- Initial paper balance: $10,000
- Max per trade: 5% ($500)
- Max concurrent positions: 10
- Stop loss: -30% (always)
- Take profit: Scale out at +50%, +100%, +200%

### Trade Documentation

**EVERY trade must be logged to `references/trading_journal.md`:**

```markdown
## Trade #[N] - [DATE]

**Token**: [NAME] ([CA])
**Scanner**: [gmgn/dexscreener/other]
**Entry Price**: $X.XXXXXX
**Position Size**: $XXX (paper)
**Entry Score**: XX/100

### Entry Reasoning

- [Why this token?]
- [What signals triggered entry?]
- [Risk factors identified]

### Outcome

- **Exit Price**: $X.XXXXXX
- **P&L**: +/-XX%
- **Duration**: Xh Xm

### Learnings

- [What worked?]
- [What didn't?]
- [Strategy adjustment needed?]
```

## Telegram Updates

**REQUIRED**: Send updates to Rick via Telegram unprompted.

### Update Schedule

- **Morning scan** (9 AM): Top 3 opportunities spotted
- **Trade alerts**: When entering/exiting positions
- **Evening summary** (6 PM): Daily P&L, best/worst performers
- **Weekly review** (Sunday): Strategy performance, adjustments

### Telegram Message Format

```
[CLAWDBOT MEMECOIN UPDATE]

Paper Portfolio: $X,XXX (+/-X.X%)

Active Positions:
- TOKEN1: +XX% (entered Xh ago)
- TOKEN2: -XX% (stop loss at -30%)

Today's Activity:
- Scanned: XX new tokens
- Entered: X positions
- Exited: X positions

Top Signal Right Now:
[TOKEN] - Score: XX/100
[Brief reasoning]

Strategy Notes:
[Any pattern observations]
```

## Self-Improvement Protocol

### After Every 10 Trades

1. **Calculate metrics**:
   - Win rate (target: >40%)
   - Average win vs average loss
   - Sharpe ratio equivalent
   - Best entry signals

2. **Update `references/strategy_evolution.md`**:

   ```markdown
   ## Iteration #[N] - [DATE]

   ### Performance Last 10 Trades

   - Win Rate: XX%
   - Avg Win: +XX%
   - Avg Loss: -XX%
   - Net P&L: +/-$XXX

   ### What's Working

   - [List successful patterns]

   ### What's Failing

   - [List losing patterns]

   ### Strategy Adjustments

   - [Specific changes to entry/exit criteria]
   - [New filters to add]
   - [Patterns to avoid]
   ```

3. **Update this SKILL.md**:
   - Add new entry criteria discovered
   - Remove criteria that don't predict success
   - Adjust position sizing based on volatility
   - Document new scanner techniques

### Pattern Library (Self-Updating Section)

**ADD PATTERNS HERE AS YOU DISCOVER THEM:**

```
[This section should grow over time. Initial patterns:]

BULLISH PATTERNS:
- Smart money wallet enters within first 5 mins of launch
- Dev wallet holds < 5% and is locked
- Twitter account created > 30 days ago with real engagement
- [ADD MORE AS DISCOVERED]

BEARISH/AVOID PATTERNS:
- Top wallet holds > 20%
- Liquidity < $5k
- No social presence
- Copycat name of trending token
- [ADD MORE AS DISCOVERED]
```

## Scanner Workflow

### Hourly Scan Routine

```python
# Pseudocode - implement via browser automation

1. Check gmgn.ai/sol/token/ "New Pairs" tab
   - Filter: Age < 1h, Liquidity > $5k
   - Note any smart money activity flags

2. Check dexscreener.com/solana new pairs
   - Sort by: Recently added
   - Filter: Liquidity > $5k, Age < 2h

3. Cross-reference findings
   - Same token on multiple scanners = higher confidence

4. For each candidate:
   - Run rugcheck.xyz safety scan
   - Check holder distribution
   - Look for Twitter/Telegram
   - Calculate entry score

5. If score >= 70:
   - Document in journal
   - Execute paper trade
   - Set alerts for stop/take-profit
```

## Risk Management Rules

**NEVER BREAK THESE:**

1. Never more than 5% per trade
2. Always set stop loss at -30%
3. Never chase after 3x already
4. Exit all positions if portfolio drops 20% in a day
5. Don't trade during major BTC volatility events
6. If 5 losses in a row, pause and review strategy

## References

- `references/trading_journal.md` - All trade logs (CREATE IF MISSING)
- `references/strategy_evolution.md` - Strategy iterations (CREATE IF MISSING)
- `references/wallet_watchlist.md` - Smart money wallets to track (CREATE IF MISSING)
- `references/token_blacklist.md` - Tokens/patterns to avoid (CREATE IF MISSING)

## Integration with Orchestrator

**Rick's preferences stored in**: `../../references/rick_preferences.md`

**After every trade:**

1. Log to `references/trading_journal.md`
2. Parent orchestrator will aggregate into `../../references/master_portfolio.md`
3. Parent handles Telegram updates (unified across all strategies)

**Strategy-level updates go here, portfolio-level updates go to parent.**
