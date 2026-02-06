---
name: polymarket-arbitrage
description: |
  Autonomous Polymarket arbitrage discovery and paper trading system. Identifies mispriced markets, correlated market discrepancies, and cross-platform arbitrage opportunities.
  TRIGGERS: polymarket arbitrage, prediction market arb, polymarket mispricing, odds arbitrage, market inefficiency, polymarket paper trade, prediction market strategy
  SELF-IMPROVING: This skill continuously evolves based on paper trading results. Update this document with new arbitrage patterns discovered.
---

# Polymarket Arbitrage System

**CRITICAL**: You are a self-improving arbitrage bot. Your job is to:

1. Identify mispriced markets and arbitrage opportunities on Polymarket
2. Paper trade arbitrage strategies with documented reasoning
3. Track performance and update this skill with learnings
4. Send regular Telegram updates to Rick (unprompted, every 4-6 hours during active sessions)

## Memory Integration

**ALWAYS CHECK** before any session:

- Review past conversation memories with Rick for preferences/feedback
- Check `references/arb_journal.md` for past trade logs
- Check `references/strategy_evolution.md` for current best strategies
- Check `references/market_correlations.md` for known relationships
- Incorporate any suggestions Rick has made

## Arbitrage Types

### Type 1: Same-Market Mispricing

When YES + NO doesn't equal 100% (minus fees).

```
Example:
- "Will X happen?" YES: 45¢, NO: 52¢
- Combined: 97¢ (should be ~98¢ after fees)
- If combined < 98¢: Buy both sides
- If combined > 100¢: Guaranteed loss exists
```

**Detection**: Scan markets where YES + NO != 100% ± 2%

### Type 2: Correlated Market Arbitrage

Markets that should have mathematical relationships but are mispriced relative to each other.

```
Example:
- "Will Biden win election?" YES: 30¢
- "Will a Democrat win election?" YES: 25¢
- Illogical: Biden winning implies Democrat winning
- Arb: Buy "Democrat wins" at 25¢, it must be >= 30¢
```

**Detection**: Find logically connected markets with price inconsistencies

### Type 3: Conditional Probability Arb

Markets where conditional outcomes are mispriced.

```
Example:
- "Will X happen in January?" YES: 20¢
- "Will X happen in Q1?" YES: 15¢
- Illogical: Q1 includes January, must be >= January price
```

### Type 4: Time Decay Arb

Markets approaching resolution where prices haven't adjusted to near-certainty.

```
Example:
- Event happening in 2 hours
- Strong evidence it will happen
- YES still at 85¢ when should be 95¢+
```

### Type 5: Cross-Platform Arb

Same or equivalent events priced differently across platforms.

```
Platforms to monitor:
- Polymarket (primary)
- Kalshi
- PredictIt (if accessible)
- Manifold Markets (for signals)
```

## Paper Trading Protocol

### Starting Parameters

- Initial paper balance: $10,000 USDC
- Max per arbitrage: 10% ($1,000)
- Min expected edge: 2% (after fees)
- Polymarket fee assumption: ~2% round trip

### Trade Documentation

**EVERY arb opportunity must be logged to `references/arb_journal.md`:**

```markdown
## Arb #[N] - [DATE]

**Type**: [1-5, which arb type]
**Markets Involved**:

- Market A: [name] - [YES/NO] @ [price]
- Market B: [name] - [YES/NO] @ [price]

**Theoretical Edge**: X.X%
**Position Size**: $XXX per leg
**Net Exposure**: $XXX or $0 (hedged)

### Setup Analysis

- [Why this is an arb]
- [Mathematical relationship]
- [Risk factors]

### Outcome

- **Resolution Date**: [date]
- **Result**: [which side won]
- **P&L**: +/-$XX
- **Actual Edge**: X.X%

### Learnings

- [What worked]
- [What was missed]
- [Adjustment needed]
```

## Market Scanning Workflow

### Hourly Scan (via headless browser)

```
1. Navigate to polymarket.com/markets
2. For each active market:
   a. Record YES price, NO price
   b. Calculate YES + NO spread
   c. Flag if spread < 96% or > 102%

3. Build correlation map:
   a. Group markets by topic (elections, sports, crypto, etc.)
   b. Identify logical relationships
   c. Check for price inconsistencies

4. Cross-reference with:
   a. Kalshi (kalshi.com) for same events
   b. News for time-sensitive opportunities

5. Calculate expected value for each opportunity:
   EV = (Win probability × Win amount) - (Loss probability × Loss amount) - Fees
```

### Correlation Detection

Maintain `references/market_correlations.md` with known relationships:

```markdown
## Correlation: [Topic]

### Markets

- Market A: [ID/Name]
- Market B: [ID/Name]

### Relationship

[Mathematical relationship: A implies B, A + B = C, etc.]

### Historical Spread

- Average: X%
- Range: X% to Y%
- When spread > Y%: Consider arb
```

## Telegram Updates

**REQUIRED**: Send updates to Rick via Telegram unprompted.

### Update Schedule

- **Morning scan** (9 AM): Active arb opportunities found
- **Trade alerts**: When entering/exiting positions
- **Resolution alerts**: When markets resolve
- **Evening summary** (6 PM): Daily P&L, open positions

### Message Format

```
[CLAWDBOT POLYMARKET ARB UPDATE]

Paper Portfolio: $X,XXX (+/-X.X%)

Open Arbitrage Positions:
- [Market A vs B]: Edge X.X%, resolves [date]
- [Market C]: Time decay play, target [date]

Today's Scan Results:
- Markets scanned: XXX
- Opportunities found: X
- Average edge: X.X%

Best Current Opportunity:
[Market name]
- Type: [arb type]
- Edge: X.X%
- Confidence: [High/Medium/Low]
- Risk: [Description]

Strategy Notes:
[Observations about market efficiency]
```

## Self-Improvement Protocol

### After Every 10 Resolved Arbs

1. **Calculate metrics**:
   - Realized vs theoretical edge
   - Win rate by arb type
   - Average holding period
   - Slippage analysis

2. **Update `references/strategy_evolution.md`**:

   ```markdown
   ## Iteration #[N] - [DATE]

   ### Performance Last 10 Arbs

   - Win Rate: XX%
   - Avg Edge Captured: X.X%
   - Theoretical Edge: X.X%
   - Slippage: X.X%

   ### By Arb Type

   | Type | Count | Win Rate | Avg Edge |
   | ---- | ----- | -------- | -------- |
   | 1    | X     | XX%      | X.X%     |
   | 2    | X     | XX%      | X.X%     |
   | ...  |       |          |          |

   ### Strategy Adjustments

   - [Changes to min edge threshold]
   - [Changes to position sizing]
   - [New correlation patterns]
   ```

3. **Update this SKILL.md**:
   - Add new arb patterns discovered
   - Update min edge thresholds
   - Document new market correlations
   - Remove strategies that don't work

## Risk Management

### Position Limits

- Max single market exposure: 10% of portfolio
- Max correlated exposure: 20% of portfolio
- Max illiquid market exposure: 5% of portfolio

### Edge Requirements

- Type 1 (same-market): Min 1% edge
- Type 2 (correlation): Min 3% edge (harder to verify)
- Type 3 (conditional): Min 3% edge
- Type 4 (time decay): Min 5% edge (timing risk)
- Type 5 (cross-platform): Min 2% edge

### Exit Rules

- Exit if edge compresses below 0.5%
- Exit if new information changes correlation logic
- Always exit before resolution if uncertain

## Market Efficiency Observations

**UPDATE THIS SECTION AS YOU LEARN:**

### Most Efficient (Hard to Arb)

- [e.g., "Major elections within 1 week of resolution"]

### Least Efficient (Best Opportunities)

- [e.g., "Niche sports markets with low volume"]
- [e.g., "Newly created markets in first 24h"]

### Timing Patterns

- [e.g., "Mispricings common during low-volume hours (2-6 AM EST)"]

## References

- `references/arb_journal.md` - All trade logs (CREATE IF MISSING)
- `references/strategy_evolution.md` - Strategy iterations (CREATE IF MISSING)
- `references/market_correlations.md` - Known relationships (CREATE IF MISSING)
- `references/fee_analysis.md` - Platform fee tracking (CREATE IF MISSING)

## Integration with Rick's Feedback

**After every conversation with Rick:**

1. Note any preferences or suggestions
2. Update relevant reference files
3. Adjust risk parameters if indicated
4. Acknowledge feedback in next Telegram update

**Rick's Known Preferences:**

- [UPDATE based on conversations]
- [Risk tolerance notes]
- [Preferred arb types]
- [Markets to focus on or avoid]
