---
name: polymarket-research
description: |
  Polymarket research and directional trading sub-strategy. Part of paper-trader skill.
  Research-based probability assessment for directional prediction market trades.
  SUB-STRATEGY: Managed by parent paper-trader orchestrator.
---

# Polymarket Research Strategy

**PARENT**: This is a sub-strategy of `paper-trader`. Portfolio-level rules in `../../SKILL.md` take precedence.

**ROLE**: Research-based directional trading on Polymarket to maximize PnL through information edge.

## Orchestrator Integration

**Report to parent orchestrator:**

- Log all trades to `references/research_journal.md`
- Parent reads this for unified portfolio view
- Parent enforces cross-strategy risk limits

**Check parent before trading:**

- Verify portfolio-level exposure limits in `../../references/master_portfolio.md`
- Check correlation with PM Arb positions (same markets)
- Check correlation with Memecoin (crypto price markets)
- Respect parent's risk level (🟢/🟡/🟠/🔴)

**Your job within the system:**

1. Research markets deeply to find informational edge
2. Develop probability estimates better than market consensus
3. Paper trade directional positions with documented thesis
4. Track calibration and refine research methodology
5. Strategy-level Telegram updates flow through parent orchestrator

## Reference Files

- `references/research_journal.md` - Trade logs
- `references/strategy_evolution.md` - Methodology improvements
- `references/thesis_library.md` - Active and past theses
- `references/calibration_log.md` - Probability calibration
- `references/source_quality.md` - Rated sources
- `../../references/rick_preferences.md` - Rick's preferences (parent level)

## Core Research Framework

### The Edge Equation

```
Expected Value = (Your Probability × Payout) - (Your Probability of Loss × Stake)

You profit when: Your probability estimate > Market probability + fees
```

### Research Categories

#### Category 1: Information Aggregation

Synthesize public information better than the market.

**Sources**:

- News sites (Reuters, AP, Bloomberg, NYT, WSJ)
- Primary sources (government docs, court filings, official statements)
- Domain expert Twitter/X accounts
- Academic papers and polls
- Historical data and base rates

**Edge**: Markets are slow to process dispersed information

#### Category 2: Base Rate Analysis

Use historical patterns to estimate probabilities.

**Method**:

1. Find reference class of similar events
2. Calculate base rate from history
3. Adjust for specific factors
4. Compare to market price

**Edge**: Markets often anchor on recent events, ignore base rates

#### Category 3: Incentive Analysis

Understand what actors will do based on incentives.

**Questions**:

- What do key actors want?
- What are their constraints?
- What would a rational actor do?
- What's the political economy?

**Edge**: Markets underweight game theory

#### Category 4: Technical/Domain Expertise

Apply specialized knowledge to niche markets.

**Areas**:

- Crypto/blockchain events
- Specific sports analytics
- Political science models
- Legal procedure knowledge
- Weather/climate patterns

**Edge**: Retail traders lack domain expertise

#### Category 5: Sentiment Divergence

Identify when market sentiment diverges from fundamentals.

**Signals**:

- Social media volume vs actual probability
- News narrative vs data
- Emotional reactions vs base rates

**Edge**: Markets overreact to narratives

## Research Protocol

### For Each Market You Consider

1. **Initial Screen** (5 mins)
   - What's the question exactly?
   - When does it resolve?
   - What's the current price?
   - Is there enough volume/liquidity?

2. **Research Phase** (30-60 mins)
   - Gather all relevant public information
   - Search news from multiple sources
   - Find primary sources if possible
   - Check what experts say
   - Look for base rate data

3. **Probability Estimation**
   - Start with base rate if available
   - List factors that adjust probability up
   - List factors that adjust probability down
   - Arrive at your probability estimate
   - Calculate confidence interval

4. **Edge Calculation**

   ```
   Your estimate: X%
   Market price: Y%
   Fee-adjusted breakeven: Y% + 2%
   Edge = X% - (Y% + 2%)

   If Edge > 5%: Strong opportunity
   If Edge 2-5%: Moderate opportunity
   If Edge < 2%: Skip
   ```

5. **Thesis Documentation**
   Document in `references/thesis_library.md`

## Paper Trading Protocol

### Starting Parameters

- Initial paper balance: $10,000 USDC
- Max per position: 10% ($1,000)
- Min edge required: 5%
- Position sizing: Kelly criterion (quarter Kelly)

### Kelly Criterion Calculator

```
f* = (p × (b + 1) - 1) / b

Where:
- f* = fraction of bankroll to bet
- p = your probability estimate
- b = odds (payout / stake - 1)

Use quarter Kelly (f* / 4) to be conservative
```

### Trade Documentation

**EVERY trade must be logged to `references/research_journal.md`:**

```markdown
## Trade #[N] - [DATE]

**Market**: [Name/URL]
**Direction**: YES/NO
**Entry Price**: $0.XX
**Position Size**: $XXX
**Thesis ID**: [Link to thesis]

### Probability Analysis

- **Base Rate**: X% (from [source])
- **Market Price**: X%
- **My Estimate**: X%
- **Confidence**: High/Medium/Low
- **Edge**: X%

### Key Research Points

1. [Point 1]
2. [Point 2]
3. [Point 3]

### What Would Change My Mind

- [Falsification criterion 1]
- [Falsification criterion 2]

### Outcome

- **Resolution**: YES/NO won
- **P&L**: +/-$XX
- **My estimate was**: Correct/Wrong by X%

### Post-Mortem

- [What I got right]
- [What I got wrong]
- [What I'd do differently]
```

## Market Categories & Strategies

### Politics (High Edge Potential)

**US Elections**:

- Research: Polls, fundamentals models, early voting data
- Edge: Aggregating multiple data sources, understanding methodology
- Risk: Tail events, late-breaking news

**International**:

- Research: Local news, expert Twitter, political analysis
- Edge: English-speaking market underweights non-English sources
- Risk: Information access, translation quality

**Policy Decisions**:

- Research: Official statements, incentive analysis, procedural understanding
- Edge: Understanding bureaucratic process
- Risk: Political shocks

### Crypto (Medium Edge Potential)

**Price Targets**:

- Research: On-chain data, macro factors, technical analysis
- Edge: Real-time data aggregation
- Risk: High volatility, manipulation

**Protocol Events**:

- Research: GitHub, governance forums, developer calls
- Edge: Technical understanding
- Risk: Delays, unexpected changes

**Regulatory**:

- Research: SEC filings, court documents, legal analysis
- Edge: Legal/regulatory expertise
- Risk: Unpredictable regulators

### Sports (Specialized Edge)

**Game Outcomes**:

- Research: Advanced stats, injury reports, weather
- Edge: Proprietary models
- Risk: Sharp money competition

**Awards/Achievements**:

- Research: Historical patterns, voter behavior
- Edge: Understanding selection process
- Risk: Human judgment unpredictable

### Entertainment (Narrative Edge)

**Awards**:

- Research: Critic reviews, industry buzz, historical patterns
- Edge: Understanding academy/guild politics
- Risk: Subjective voting

**Cultural Events**:

- Research: Social trends, industry insider information
- Edge: Understanding audience sentiment
- Risk: High variance

## Telegram Updates

**REQUIRED**: Send updates to Rick via Telegram unprompted.

### Update Schedule

- **Morning briefing** (9 AM): Market opportunities, overnight developments
- **Trade alerts**: When entering/exiting positions
- **News alerts**: Breaking news affecting positions
- **Evening summary** (6 PM): Daily P&L, portfolio review

### Message Format

```
[CLAWDBOT POLYMARKET RESEARCH UPDATE]

Paper Portfolio: $X,XXX (+/-X.X%)

Active Positions (X total):
- [Market]: [YES/NO] @ $0.XX
  Thesis: [1-line summary]
  Current: $0.XX (+/-X%)
  Edge remaining: X%

Today's Research:
- Markets analyzed: X
- New positions: X
- Positions closed: X

Top Opportunity:
[Market name]
- My probability: X%
- Market price: X%
- Edge: X%
- Thesis: [Summary]

Key Developments:
[News affecting positions]

Strategy Notes:
[Research methodology observations]
```

## Self-Improvement Protocol

### After Every 10 Resolved Trades

1. **Calculate metrics**:
   - Win rate
   - Brier score (probability calibration)
   - Average edge captured
   - P&L by category
   - Research time vs edge found

2. **Calibration Analysis**:

   ```
   For each probability bucket (e.g., 70-80%):
   - How many trades were in this bucket?
   - What was the actual win rate?
   - Am I overconfident or underconfident?
   ```

3. **Update `references/strategy_evolution.md`**:

   ```markdown
   ## Iteration #[N] - [DATE]

   ### Performance Last 10 Trades

   - Win Rate: XX%
   - Brier Score: X.XX
   - Net P&L: +/-$XXX

   ### Calibration

   | Estimate Range | Trades | Actual Win% | Calibration |
   | -------------- | ------ | ----------- | ----------- |
   | 50-60%         | X      | XX%         | Over/Under  |
   | 60-70%         | X      | XX%         | Over/Under  |
   | 70-80%         | X      | XX%         | Over/Under  |
   | 80-90%         | X      | XX%         | Over/Under  |
   | 90%+           | X      | XX%         | Over/Under  |

   ### By Category

   | Category | Trades | Win% | Avg Edge | P&L |
   | -------- | ------ | ---- | -------- | --- |
   | Politics | X      | XX%  | X%       | $XX |
   | Crypto   | X      | XX%  | X%       | $XX |
   | ...      |        |      |          |     |

   ### Research Method Effectiveness

   - [Which research approaches found edge]
   - [Which were waste of time]

   ### Adjustments

   - [Changes to research process]
   - [Changes to edge threshold]
   - [Categories to focus/avoid]
   ```

4. **Update this SKILL.md**:
   - Add effective research methods
   - Remove ineffective methods
   - Adjust position sizing
   - Update category strategies

## Research Sources Checklist

### For Every Trade, Check:

**Primary Sources**:

- [ ] Official statements/announcements
- [ ] Legal filings (PACER, SEC)
- [ ] Government documents

**News**:

- [ ] Major wire services (Reuters, AP)
- [ ] Quality newspapers (NYT, WSJ, FT)
- [ ] Domain-specific outlets
- [ ] Local sources (for regional events)

**Data**:

- [ ] Polls (with methodology check)
- [ ] Historical data
- [ ] Prediction market history
- [ ] Relevant statistics

**Expert Opinion**:

- [ ] Academic experts on Twitter/X
- [ ] Industry analysts
- [ ] Domain newsletters
- [ ] Podcasts/interviews

**Contrarian Check**:

- [ ] What's the bull case?
- [ ] What's the bear case?
- [ ] What am I missing?

## Risk Management

### Position Rules

- Max 10% per position
- Max 30% in correlated positions
- Reduce size for low-confidence trades
- Scale in if thesis strengthens

### Exit Rules

- Exit if thesis is falsified
- Exit if better opportunity arises
- Take profit if edge < 2% (market caught up)
- Never average down without new information

### Portfolio Rules

- Maintain diversification across categories
- Track correlation between positions
- Keep 30% as dry powder for opportunities

## References

- `references/research_journal.md` - All trade logs
- `references/strategy_evolution.md` - Methodology improvements
- `references/thesis_library.md` - Active and past theses
- `references/source_quality.md` - Rated information sources
- `references/calibration_log.md` - Probability calibration tracking

## Integration with Rick's Feedback

**After every conversation with Rick:**

1. Note research preferences or areas of interest
2. Incorporate domain knowledge he shares
3. Adjust focus areas based on feedback
4. Acknowledge feedback in next Telegram update

**Rick's Known Preferences:**

- [UPDATE based on conversations]
- [Preferred market categories]
- [Risk tolerance]
- [Time preference for positions]
