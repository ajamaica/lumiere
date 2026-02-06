# Polymarket Arbitrage Strategy Evolution

Track strategy improvements based on paper trading results.

**CLAWDBOT INSTRUCTION**: Update after every 10 resolved arbs with performance analysis and adjustments.

---

## Current Strategy Version: 1.0

**Last Updated**: [INITIAL]

### Active Parameters

| Arb Type           | Min Edge | Max Size | Notes          |
| ------------------ | -------- | -------- | -------------- |
| 1 - Same Market    | 1%       | 10%      | Low risk, rare |
| 2 - Correlation    | 3%       | 8%       | Model risk     |
| 3 - Conditional    | 3%       | 8%       | Logic risk     |
| 4 - Time Decay     | 5%       | 5%       | Timing risk    |
| 5 - Cross-Platform | 2%       | 10%      | Execution risk |

### Active Filters

- Min market volume: $10k lifetime
- Min liquidity: $1k on order book
- Max time to resolution: 30 days
- Skip markets with ambiguous resolution criteria

---

## Evolution History

### Iteration #0 - Initial Setup

**Strategy**: Starting parameters based on prediction market theory

**Hypotheses to Test**:

1. Same-market mispricings are rare but profitable
2. Correlation arbs exist due to market segmentation
3. Time decay arbs require precise timing
4. Cross-platform arbs have execution risk

**Key Questions**:

- What's the average edge available?
- How often do arbs appear?
- What's the average resolution time?
- What's typical slippage?

---

<!--
TEMPLATE FOR FUTURE ITERATIONS:

### Iteration #X - [DATE]

**Arbs Analyzed**: #XX to #XX

#### Performance Metrics

| Metric | Value |
|--------|-------|
| Win Rate | XX% |
| Avg Theoretical Edge | X.X% |
| Avg Realized Edge | X.X% |
| Edge Capture Rate | XX% |
| Avg Hold Time | X days |
| Total P&L | +/-$XXX |

#### By Arb Type Performance

| Type | Count | Win% | Avg Edge | Slippage |
|------|-------|------|----------|----------|
| 1 | X | XX% | X.X% | X.X% |
| 2 | X | XX% | X.X% | X.X% |
| 3 | X | XX% | X.X% | X.X% |
| 4 | X | XX% | X.X% | X.X% |
| 5 | X | XX% | X.X% | X.X% |

#### Analysis

**Best Performing Type**: [Type X]
- Why: [Analysis]

**Worst Performing Type**: [Type X]
- Why: [Analysis]

**Slippage Patterns**:
- [When slippage is high]
- [When slippage is low]

**Market Efficiency Observations**:
- [Which markets are efficient]
- [Which markets have opportunities]

#### Strategy Adjustments

**Parameter Changes**:
| Parameter | Old | New | Reason |
|-----------|-----|-----|--------|
| [param] | X | Y | [reason] |

**New Filters**:
- [Filter]: Added because [reason]

**Removed Filters**:
- [Filter]: Removed because [reason]

#### Updated Hypotheses

[What you now believe based on data]

#### Next Iteration Focus

[What to watch in next 10 arbs]

-->

---

## Key Learnings Repository

### Market Behavior

- [e.g., "Markets reprice quickly after major news"]

### Timing

- [e.g., "Best edges found during Asian market hours"]

### Execution

- [e.g., "Large orders have X% slippage on average"]

### Risk Management

- [e.g., "Correlation arbs have higher variance than expected"]

---

## Failed Strategies Archive

<!--
### [Strategy Name] - Abandoned [DATE]

**What it was**: [Description]
**Why it failed**: [Reason with data]
**Lesson**: [What to remember]
-->
