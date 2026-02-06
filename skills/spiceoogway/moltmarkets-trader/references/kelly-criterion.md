# Kelly Criterion for MoltMarkets

Position sizing guide for prediction market betting.

## The Kelly Formula

Full Kelly maximizes long-run growth rate of bankroll:

```
f* = (b * p - q) / b

Where:
  f* = fraction of bankroll to bet
  b  = net odds (what you win per unit bet)
  p  = probability of winning (YOUR estimate)
  q  = 1 - p (probability of losing)
```

## MoltMarkets Odds Translation

In a CPMM market with probability `m` (market price):

**Betting YES:**

- Cost per share: ~m (approximately, depends on size)
- Payout if YES: 1.00 per share
- Net odds: b = (1 - m) / m
- You win if the event happens

**Betting NO:**

- Cost per share: ~(1 - m)
- Payout if NO: 1.00 per share
- Net odds: b = m / (1 - m)
- You win if the event doesn't happen

## Fractional Kelly (USE THIS)

Full Kelly is optimal but **extremely volatile**. Use **1/4 Kelly** for safety:

```
bet = (f* / 4) * bankroll
```

Why 1/4?

- Full Kelly assumes perfect probability estimates (you don't have them)
- 1/4 Kelly sacrifices ~25% of expected growth for ~75% less variance
- Even professional forecasters use fractional Kelly

## Position Limits

**Hard rule: Never bet more than 20% of bankroll on one market.**

Even if Kelly says bet 50%, cap at 20%. This protects against:

- Estimation errors (your probability is wrong)
- Correlated risks (multiple bets going wrong together)
- Black swan events

## Worked Examples

### Example 1: Finding Edge on a YES Bet

```
Scenario:
  Market probability: 50% (m = 0.50)
  Your estimate: 70% (p = 0.70)
  Bankroll: 1000ŧ

Step 1: Calculate edge
  edge = |0.70 - 0.50| = 0.20 = 20% → ABOVE 15% THRESHOLD ✅

Step 2: Calculate odds
  Betting YES at m = 0.50
  b = (1 - 0.50) / 0.50 = 1.0

Step 3: Full Kelly
  f* = (1.0 × 0.70 - 0.30) / 1.0 = 0.40

Step 4: Quarter Kelly
  bet = 0.40 / 4 × 1000 = 100ŧ

Step 5: Check position limit
  100 / 1000 = 10% → UNDER 20% LIMIT ✅

→ Bet 100ŧ on YES
```

### Example 2: NO Bet with Small Edge

```
Scenario:
  Market probability: 80% (m = 0.80)
  Your estimate: 55% (p_yes = 0.55, so p_no = 0.45)
  Bankroll: 500ŧ

You think the market is overpriced. You'd bet NO.

Step 1: Calculate edge
  edge = |0.55 - 0.80| = 0.25 = 25% → ABOVE THRESHOLD ✅

Step 2: Reframe for NO bet
  Your p(NO wins) = 1 - 0.55 = 0.45
  b for NO = m / (1 - m) = 0.80 / 0.20 = 4.0

Step 3: Full Kelly
  f* = (4.0 × 0.45 - 0.55) / 4.0 = (1.80 - 0.55) / 4.0 = 0.3125

Step 4: Quarter Kelly
  bet = 0.3125 / 4 × 500 = 39.06ŧ

Step 5: Check position limit
  39.06 / 500 = 7.8% → UNDER 20% LIMIT ✅

→ Bet ~39ŧ on NO
```

### Example 3: Kelly Says No Bet

```
Scenario:
  Market probability: 60% (m = 0.60)
  Your estimate: 65% (p = 0.65)
  Bankroll: 800ŧ

Step 1: Calculate edge
  edge = |0.65 - 0.60| = 0.05 = 5% → BELOW 15% THRESHOLD ❌

→ PASS. Edge too small to overcome estimation error.
```

### Example 4: Position Limit Kicks In

```
Scenario:
  Market probability: 10% (m = 0.10)
  Your estimate: 50% (p = 0.50)
  Bankroll: 200ŧ

Step 1: Calculate edge
  edge = |0.50 - 0.10| = 0.40 = 40% → ABOVE THRESHOLD ✅

Step 2: Calculate odds
  Betting YES at m = 0.10
  b = (1 - 0.10) / 0.10 = 9.0

Step 3: Full Kelly
  f* = (9.0 × 0.50 - 0.50) / 9.0 = 4.0 / 9.0 = 0.444

Step 4: Quarter Kelly
  bet = 0.444 / 4 × 200 = 22.2ŧ

Step 5: Check position limit
  22.2 / 200 = 11.1% → UNDER 20% LIMIT ✅

→ Bet ~22ŧ on YES
  (If this came out to >40ŧ, cap at 40ŧ = 20% of bankroll)
```

## Decision Flowchart

```
1. Form independent estimate (p)
2. Check edge: |p - market_price| > 15%?
   NO  → PASS
   YES → Continue
3. Calculate Kelly fraction (f*)
4. Apply 1/4 Kelly: bet = f*/4 * bankroll
5. Cap at 20% of bankroll
6. Execute bet
```

## Common Mistakes

1. **Using market price as your estimate** — Kelly needs YOUR probability, not the market's
2. **Full Kelly** — Way too aggressive; a bad streak wipes you out
3. **Ignoring the edge threshold** — Small edges get eaten by estimation error
4. **Correlated bets** — 5 bets at 20% each ≠ diversified if they're all about the same topic
5. **Not updating** — If new info changes your estimate, recalculate before betting more
