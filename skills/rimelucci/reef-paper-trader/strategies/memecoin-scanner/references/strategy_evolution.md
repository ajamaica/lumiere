# Strategy Evolution Log

This document tracks the evolution of the memecoin trading strategy based on paper trading results.

**CLAWDBOT INSTRUCTION**: Update this document after every 10 trades with performance analysis and strategy adjustments. This is how you learn and improve.

---

## Current Strategy Version: 1.0

**Last Updated**: [INITIAL]
**Based on**: Initial parameters (pre-trading)

### Active Entry Criteria (Score 70+ required)

| Factor              | Weight | Current Threshold          |
| ------------------- | ------ | -------------------------- |
| Liquidity           | 20     | >$10k, prefer LP burned    |
| Holder Distribution | 20     | Top 10 < 30% supply        |
| Smart Money         | 15     | Any tracked wallet entry   |
| Social Signals      | 15     | Active Twitter OR Telegram |
| Contract Safety     | 15     | Rugcheck green, renounced  |
| Momentum            | 15     | Positive volume trend      |

### Active Exit Rules

- Stop Loss: -30% (mandatory)
- TP1: +50% (sell 33%)
- TP2: +100% (sell 33%)
- TP3: +200% (sell remaining)
- Time stop: Exit if flat after 24h

### Active Filters (tokens to AVOID)

- Liquidity < $5k
- Age > 24h and no volume
- Top wallet > 20%
- No social presence
- Copycat names

---

## Evolution History

### Iteration #0 - Initial Setup

**Strategy**: Starting parameters based on general memecoin trading wisdom

**Hypothesis**:

- Early entry (< 1h) with good fundamentals should yield 40%+ win rate
- Strict stop losses will limit downside
- Scaling out preserves gains

**To Validate**:

- Is 70 score threshold too high/low?
- Are factor weights appropriate?
- Is -30% stop too tight or too loose?

---

<!--
TEMPLATE FOR FUTURE ITERATIONS:

### Iteration #X - [DATE]

**Trades Analyzed**: #XX to #XX

#### Performance Metrics
- Win Rate: XX%
- Average Win: +XX%
- Average Loss: -XX%
- Profit Factor: X.XX
- Net P&L: +/-$XXX
- Largest Win: $XX (+XX%)
- Largest Loss: $XX (-XX%)

#### Pattern Analysis

**What Worked (Keep/Increase Weight)**:
1. [Pattern that predicted wins]
2. [Factor that correlated with success]

**What Failed (Remove/Decrease Weight)**:
1. [Pattern that led to losses]
2. [Factor that didn't predict well]

**New Observations**:
1. [New pattern discovered]
2. [Market condition insight]

#### Strategy Adjustments Made

**Entry Criteria Changes**:
- [Factor X]: Weight changed from Y to Z because [reason]
- [New factor added]: [Description] because [reason]
- [Factor removed]: Because [reason]

**Exit Rules Changes**:
- Stop loss adjusted from -30% to -XX% because [reason]
- TP levels adjusted because [reason]

**New Filters Added**:
- [Filter]: Because [reason]

#### Updated Hypothesis

[What you now believe about the market based on data]

#### Next Iteration Focus

[What to watch for in next 10 trades]

-->

---

## Key Learnings Repository

**ADD INSIGHTS HERE AS DISCOVERED:**

### Market Conditions

- [e.g., "Memecoins perform better during BTC consolidation phases"]

### Timing

- [e.g., "US market hours (9am-4pm EST) have more volume"]

### Token Characteristics

- [e.g., "Tokens with burned LP outperform by X%"]

### Scanner Signals

- [e.g., "GMGN smart money signal has X% accuracy"]

### Risk Management

- [e.g., "Trades held > 24h have negative expected value"]

---

## Failed Strategies Archive

**Document strategies that were tried and abandoned:**

<!--
### [Strategy Name] - Abandoned [DATE]

**What it was**: [Description]
**Why it failed**: [Reason with data]
**Lesson**: [What to remember]
-->
