# Kelly Criterion — Complete Guide

The Kelly criterion is a formula for optimal bet sizing that maximizes long-term growth while managing risk.

## Core Formula

```
f* = (bp - q) / b

Where:
- f* = fraction of bankroll to bet
- b = odds received (net odds, e.g., 2:1 means b=2)
- p = probability of winning
- q = probability of losing (1 - p)
```

## Simplified for Prediction Markets

In prediction markets with binary outcomes:

```
kelly% = edge / odds

Where:
- edge = your_estimated_probability - market_probability
- odds = payout ratio
```

### For YES Bets

```
edge = your_prob - market_prob
odds = 1 / market_prob
kelly% = edge * market_prob / (1 - market_prob)
```

### For NO Bets

```
edge = (1 - your_prob) - (1 - market_prob) = market_prob - your_prob
odds = 1 / (1 - market_prob)
kelly% = edge * (1 - market_prob) / market_prob
```

## Worked Example

**Market:** "Will BTC hit $80k in 1 hour?"

- Market probability: 40% YES
- Your estimate: 60% YES (you think market is wrong)

**Calculate YES bet:**

```
edge = 0.60 - 0.40 = 0.20 (20% edge)
odds = 1 / 0.40 = 2.5
kelly% = 0.20 / 2.5 = 0.08 (8% of bankroll)
```

**If your bankroll is 1000ŧ:**

```
bet_size = 1000 * 0.08 = 80ŧ
```

## Fractional Kelly

Full Kelly is mathematically optimal but has high variance. In practice, use fractional Kelly:

| Multiplier      | Use Case                              |
| --------------- | ------------------------------------- |
| 1.0x (Full)     | High confidence, well-calibrated      |
| 0.5x (Half)     | Standard trading, reduce variance     |
| 0.25x (Quarter) | Learning phase, uncertain calibration |

**Recommendation:** Start with 0.5x Kelly until you've validated your probability estimates over 20+ trades.

## Position Limits

Even with Kelly, apply hard caps:

1. **Max position:** 30% of bankroll per bet
2. **Min edge:** 10% (don't bet on <10% edge)
3. **Category limits:** If a category is in "reduce" status, apply 0.5x multiplier

## Edge Estimation Tips

### For Crypto Price Markets

- Check current price vs threshold
- Calculate percentage buffer: `(current - threshold) / threshold`
- If buffer > 5%, you have high confidence
- If buffer < 2%, outcome is uncertain

### For HN Point Markets

- Calculate current velocity: `points / hours_since_posted`
- Project to close time: `current_points + (velocity * hours_remaining)`
- Compare projection to threshold
- Account for velocity decay (stories slow down over time)

### For Time-Based Markets

- Check recent activity patterns
- Account for time of day / timezone
- Reduce confidence for events dependent on human response

## Learning Loop Integration

After each resolved trade:

1. Record actual outcome vs your estimate
2. Calculate if you were overconfident or underconfident
3. If loss streak ≥ 2 in a category → apply 0.5x multiplier
4. If loss streak ≥ 3 → skip that category entirely
5. Two consecutive wins → restore full multiplier

## Common Mistakes

1. **Ignoring edge requirement:** Betting on 5% edge wastes capital
2. **Overbetting:** Full Kelly on uncertain estimates leads to ruin
3. **Not tracking:** Without history, you can't calibrate
4. **Emotional sizing:** Stick to formula, don't revenge bet

## Code Implementation

```javascript
function calculateKelly(yourProb, marketProb, position = 'YES') {
  let edge, odds

  if (position === 'YES') {
    edge = yourProb - marketProb
    odds = 1 / marketProb
  } else {
    edge = marketProb - yourProb
    odds = 1 / (1 - marketProb)
  }

  if (edge <= 0.1) return 0 // Min 10% edge

  const kelly = edge / odds
  return Math.min(kelly, 0.3) // Max 30% position
}

function calculateBetSize(bankroll, kelly, categoryMultiplier = 1.0) {
  const adjustedKelly = kelly * categoryMultiplier
  const betSize = Math.floor(bankroll * adjustedKelly)
  return betSize
}

// Example usage:
const bankroll = 1000
const yourProb = 0.6
const marketProb = 0.4
const categoryMultiplier = 0.5 // Category in "reduce" status

const kelly = calculateKelly(yourProb, marketProb, 'YES')
const bet = calculateBetSize(bankroll, kelly, categoryMultiplier)
console.log(`Kelly: ${kelly * 100}%, Bet: ${bet}ŧ`)
```
