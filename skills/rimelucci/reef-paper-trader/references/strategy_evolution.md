# Cross-Strategy Evolution Log

**Purpose**: Track portfolio-level learnings and how strategies evolve relative to each other.

---

## Current Strategy Configuration

### Active Parameters (Portfolio Level)

| Parameter           | Value   | Rationale            |
| ------------------- | ------- | -------------------- |
| Total Capital       | $30,000 | Paper trading start  |
| Max Exposure        | 80%     | Conservative start   |
| Max Single Position | 5%      | Risk management      |
| Max Correlation     | 20%     | Diversification      |
| Daily Loss Limit    | -5%     | Capital preservation |
| Weekly Loss Limit   | -10%    | Capital preservation |

### Strategy Allocations

| Strategy    | Allocation | Rationale                          |
| ----------- | ---------- | ---------------------------------- |
| Memecoin    | 33.3%      | High risk/reward, crypto expertise |
| PM Arb      | 33.3%      | Market-neutral, lower variance     |
| PM Research | 33.3%      | Directional, research-based        |

---

## Evolution History

### Iteration #0 - Initial Configuration

**Date**: [INITIAL]
**Trades Analyzed**: 0

**Starting Hypotheses**:

1. **Equal allocation is appropriate**
   - Rationale: No data yet on which strategy performs best
   - Test: After 30 trades, compare risk-adjusted returns

2. **Strategies are uncorrelated**
   - Rationale: Different markets, different mechanics
   - Test: Track correlation of daily P&L

3. **5% max position is appropriate**
   - Rationale: Standard risk management
   - Test: Analyze if winners would benefit from larger size

4. **Risk limits are appropriate**
   - Rationale: Conservative capital preservation
   - Test: Track how often limits are approached

**Questions to Answer**:

- Which strategy has best Sharpe ratio?
- Are there times to overweight one strategy?
- What's the actual correlation between strategies?
- Should position sizing differ by strategy?

---

<!--
TEMPLATE FOR FUTURE ITERATIONS:

### Iteration #X - [Theme/Title]

**Date**: [DATE]
**Trades Since Last Iteration**: X
**Total Trades**: X

---

#### Portfolio Performance Since Last Iteration

| Metric | Previous | Current | Change |
|--------|----------|---------|--------|
| Total P&L | $X | $X | +/-$X |
| Total P&L % | X% | X% | +/-X% |
| Drawdown | X% | X% | +/-X% |

#### Strategy Comparison

| Strategy | P&L | Win Rate | Sharpe | Grade |
|----------|-----|----------|--------|-------|
| Memecoin | +/-$X | XX% | X.XX | A/B/C/D |
| PM Arb | +/-$X | XX% | X.XX | A/B/C/D |
| PM Research | +/-$X | XX% | X.XX | A/B/C/D |

**Best Performing**: [Strategy] because [reason]
**Worst Performing**: [Strategy] because [reason]

---

#### Correlation Analysis

| | Memecoin | PM Arb | PM Research |
|---|----------|--------|-------------|
| Memecoin | 1.00 | X.XX | X.XX |
| PM Arb | X.XX | 1.00 | X.XX |
| PM Research | X.XX | X.XX | 1.00 |

**Diversification Status**: [Good/Moderate/Poor]
**Concern**: [Any correlation concerns]

---

#### Hypothesis Testing

**Hypothesis 1**: [Statement]
- Status: Confirmed / Rejected / Inconclusive
- Evidence: [Data]
- New hypothesis: [If rejected/inconclusive]

**Hypothesis 2**: [Statement]
- Status: Confirmed / Rejected / Inconclusive
- Evidence: [Data]

---

#### Key Learnings

1. **[Learning category]**: [Insight]
   - Evidence: [What data supports this]
   - Action: [How to apply]

2. **[Learning category]**: [Insight]
   - Evidence: [What data supports this]
   - Action: [How to apply]

---

#### Parameter Adjustments

| Parameter | Old Value | New Value | Reason |
|-----------|-----------|-----------|--------|
| [Param] | X | Y | [Reason] |

#### Allocation Adjustments

| Strategy | Old | New | Reason |
|----------|-----|-----|--------|
| [Strategy] | X% | Y% | [Reason] |

---

#### SKILL.md Updates Made

| File | Change | Reason |
|------|--------|--------|
| [Path] | [Change] | [Reason] |

---

#### New Hypotheses

1. [New hypothesis to test]
2. [New hypothesis to test]

#### Focus for Next Iteration

1. [Priority]
2. [Priority]

-->

---

## Key Insights Repository

### Strategy Selection

When to favor each strategy:

| Condition   | Favor Strategy | Reduce Strategy | Reason   |
| ----------- | -------------- | --------------- | -------- |
| [Condition] | [Strategy]     | [Strategy]      | [Reason] |

### Market Regime Insights

| Regime   | Best Strategy | Worst Strategy | Evidence |
| -------- | ------------- | -------------- | -------- |
| [Regime] | [Strategy]    | [Strategy]     | [Data]   |

### Timing Insights

| Pattern   | Observation    | Application  |
| --------- | -------------- | ------------ |
| [Pattern] | [What happens] | [How to use] |

---

## Failed Experiments

Document things that were tried and didn't work:

<!--
### [Experiment Name] - Abandoned [DATE]

**What it was**: [Description]
**Why tried**: [Rationale]
**Result**: [Outcome]
**Why it failed**: [Analysis]
**Lesson**: [Takeaway]
-->

---

## Improvement Backlog

Track improvements to implement:

| Priority | Improvement   | Strategy       | Status  |
| -------- | ------------- | -------------- | ------- |
| 1        | [Improvement] | [All/Specific] | Pending |
| 2        | [Improvement] | [All/Specific] | Pending |

---

## Monthly Summaries

### [MONTH YEAR] - [Theme]

**Performance**:

- Total P&L: $X
- Best Strategy: [Name] +$X
- Worst Strategy: [Name] -$X

**Key Learnings**:

1. [Learning]
2. [Learning]

**Major Changes Made**:

1. [Change]
2. [Change]

**Next Month Focus**:

1. [Focus]
2. [Focus]
