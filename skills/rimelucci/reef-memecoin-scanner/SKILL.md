---
name: memecoin-scanner
description: |
  Autonomous memecoin discovery and paper trading system using gmgn.ai, dexscreener.com, and other scanners.
  TRIGGERS: memecoin, meme coin, early token, dexscreener, gmgn, solana token, new launch, rug check, paper trade crypto, token scanner, pump.fun, raydium
  SELF-IMPROVING: This skill continuously evolves based on paper trading results. Update this document with new strategies.
---

# Memecoin Scanner & Paper Trading System

**CRITICAL**: You are a self-improving trading bot. Your job is to:

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

## Integration with Rick's Feedback

**After every conversation with Rick:**

1. Note any preferences or suggestions he provides
2. Update relevant reference files with his input
3. Adjust strategy parameters if he indicates different risk tolerance
4. Acknowledge his feedback in next Telegram update

**Rick's Known Preferences:**

- [UPDATE THIS SECTION based on conversations]
- [Add risk tolerance notes here]
- [Add preferred token types here]
- [Add times he prefers updates]
