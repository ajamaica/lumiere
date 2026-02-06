# Memory File Templates

These files should be created in your `memory/` directory before running the agents.

## moltmarkets-shared-state.json

Central coordination file for all agents.

```json
{
  "balance": 1000.0,
  "lastUpdated": "2026-01-01T00:00:00Z",
  "lastAction": {
    "agent": "trader",
    "action": "Initial setup",
    "cost": 0,
    "marketIds": []
  },
  "notifications": {
    "dmDylan": {
      "onResolution": false,
      "onTrade": false,
      "onCreation": false,
      "onSpawn": false,
      "notes": "Set to true to receive DMs for each event type"
    },
    "logToMemory": true
  },
  "config": {
    "trader": {
      "edgeThreshold": 0.1,
      "kellyMultiplier": 1.0,
      "maxPositionPct": 0.3,
      "mode": "aggressive",
      "notes": "Full Kelly, 10% edge minimum, 30% position cap"
    },
    "creator": {
      "maxOpenMarkets": 8,
      "cooldownMinutes": 20,
      "minBalance": 50,
      "mode": "loose-cannon",
      "allowSpeculative": true,
      "creativeTopics": true,
      "notes": "Create markets that generate volume, not just any market"
    }
  },
  "recentTrades": [],
  "recentCreations": [],
  "notes": "Central state file. Updated by all agents."
}
```

## trader-history.json

Tracks all trades and category performance.

```json
{
  "trades": [],
  "categoryStats": {
    "crypto_price": {
      "totalTrades": 0,
      "wins": 0,
      "losses": 0,
      "pending": 0,
      "winRate": 0,
      "totalPnL": 0,
      "recentLossStreak": 0,
      "recentWinStreak": 0
    },
    "news_events": {
      "totalTrades": 0,
      "wins": 0,
      "losses": 0,
      "pending": 0,
      "winRate": 0,
      "totalPnL": 0,
      "recentLossStreak": 0,
      "recentWinStreak": 0
    },
    "pr_merge": {
      "totalTrades": 0,
      "wins": 0,
      "losses": 0,
      "pending": 0,
      "winRate": 0,
      "totalPnL": 0,
      "recentLossStreak": 0,
      "recentWinStreak": 0
    },
    "github_activity": {
      "totalTrades": 0,
      "wins": 0,
      "losses": 0,
      "pending": 0,
      "winRate": 0,
      "totalPnL": 0,
      "recentLossStreak": 0,
      "recentWinStreak": 0
    },
    "cabal_response": {
      "totalTrades": 0,
      "wins": 0,
      "losses": 0,
      "pending": 0,
      "winRate": 0,
      "totalPnL": 0,
      "recentLossStreak": 0,
      "recentWinStreak": 0
    },
    "platform_meta": {
      "totalTrades": 0,
      "wins": 0,
      "losses": 0,
      "pending": 0,
      "winRate": 0,
      "totalPnL": 0,
      "recentLossStreak": 0,
      "recentWinStreak": 0
    }
  },
  "lastTradeId": 0,
  "netPnL": 0
}
```

## trader-learnings.md

Pattern recognition and strategy adjustments.

```markdown
# Trader Learnings — MoltMarkets

## Purpose

Track patterns from wins/losses, categories to reduce exposure to, and accumulated trading wisdom.

---

## ⚠️ Categories Needing Improvement

_None yet — collecting data_

---

## 📊 Category Performance Summary

| Category        | Trades | Win Rate | Total PnL | Streak | Status |
| --------------- | ------ | -------- | --------- | ------ | ------ |
| crypto_price    | 0      | -        | 0ŧ        | -      | ✅ OK  |
| news_events     | 0      | -        | 0ŧ        | -      | ✅ OK  |
| pr_merge        | 0      | -        | 0ŧ        | -      | ✅ OK  |
| github_activity | 0      | -        | 0ŧ        | -      | ✅ OK  |
| cabal_response  | 0      | -        | 0ŧ        | -      | ✅ OK  |
| platform_meta   | 0      | -        | 0ŧ        | -      | ✅ OK  |

---

## 📝 Lessons Learned

_Document specific lessons after each loss_

---

## 🎯 Category Guidelines

### crypto_price

- **Strategy:** Clear price thresholds (round numbers: $75k, $80k, $100k)
- **What works:** Volatile moments, clear up/down bets
- **What fails:** Tight margins, obscure altcoins
- **Rule:** Require >3% buffer from current price

### news_events

- **Strategy:** HN stories with clear point targets, breaking news
- **What works:** Trending stories, clear milestones
- **What fails:** Peaked stories, niche topics
- **Rule:** Check velocity — stories past peak don't accelerate

### pr_merge

- **Strategy:** High-visibility PRs, major milestones
- **Risk:** High variance — reviewer availability unpredictable
- **Rule:** Check time of day and recent activity

### github_activity

- **Strategy:** Commit activity correlates with working hours
- **Rule:** Weight time-of-day heavily

### cabal_response

- **Strategy:** Response time varies by person
- **Rule:** Check recent activity patterns

### platform_meta

- **Strategy:** API uptime, feature launches
- **Rule:** Conservative unless high confidence

---

## 🔄 Learning Loop

After each resolution:

1. Update trade outcome in trader-history.json
2. Recalculate category stats
3. If loss: document specific lesson here
4. If loss streak ≥2: category goes to REDUCE (50% kelly)
5. If loss streak ≥3: category goes to AVOID
6. Two consecutive wins: recover from REDUCE/AVOID

---

_Last updated: [timestamp]_
```

## creator-learnings.md

Tracks what types of markets generate volume.

```markdown
# Creator Learnings — MoltMarkets

## Purpose

Track market creation performance to optimize for VOLUME. Markets that get traded = good. Zero volume = wasted liquidity.

---

## 📊 Category Performance Summary

| Category      | Created | Avg Volume | Zero Vol % | Status |
| ------------- | ------- | ---------- | ---------- | ------ |
| crypto_price  | 0       | -          | -          | 🆕 NEW |
| news_events   | 0       | -          | -          | 🆕 NEW |
| meta_cabal    | 0       | -          | -          | 🆕 NEW |
| meta_platform | 0       | -          | -          | 🆕 NEW |

---

## 🎯 What Makes Markets Tradeable

| Factor          | High Volume                    | Low Volume               |
| --------------- | ------------------------------ | ------------------------ |
| **Stakes**      | Real outcome matters           | Nobody cares             |
| **Edge**        | Traders think they know better | No information asymmetry |
| **Clarity**     | Obviously resolvable           | Ambiguous criteria       |
| **Humor**       | Fun to participate             | Boring/clinical          |
| **Controversy** | Genuine disagreement           | Obvious answer           |
| **Relevance**   | Affects traders directly       | Abstract/niche           |

---

## 📝 Lessons Learned

_Document after each resolved market_

---

## 🔄 Learning Loop

After each market resolves:

1. Log final volume, trades, unique traders
2. Categorize market
3. Update category stats
4. If zero volume → analyze why, document lesson
5. If high volume → document what worked
6. Adjust creation strategy

---

_Last updated: [timestamp]_
```

## creator-roi.json

Tracks market creation ROI.

```json
{
  "markets": [],
  "totalLiquiditySeeded": 0,
  "totalFeesEarned": 0,
  "netROI": 0,
  "avgVolumePerMarket": 0,
  "zeroVolumeCount": 0
}
```

## trader-kelly.md

Kelly criterion implementation guide.

```markdown
# Kelly Criterion for MoltMarkets

## Formula

kelly% = edge / odds

Where:

- edge = your_probability - market_probability
- odds = 1 / market_probability (for YES bets)
- odds = 1 / (1 - market_probability) (for NO bets)

## Example

Market: BTC above $75k in 1 hour

- Market probability: 40% YES
- Your estimate: 60% YES
- Edge: 0.60 - 0.40 = 0.20 (20%)
- Odds: 1 / 0.40 = 2.5
- Kelly: 0.20 / 2.5 = 0.08 (8% of bankroll)

## Risk Adjustments

| Condition               | Kelly Multiplier      |
| ----------------------- | --------------------- |
| Normal                  | 1.0x (full kelly)     |
| Category loss streak 2  | 0.5x (half kelly)     |
| Category loss streak 3+ | 0x (skip)             |
| Low confidence          | 0.25x (quarter kelly) |
| High conviction         | 1.0x max              |

## Position Limits

- Never bet more than 30% of balance on single market
- Never bet if edge < 10%
- Always round down bet sizes

## Implementation

1. Fetch current balance from API
2. Calculate edge (your estimate - market prob)
3. If edge < 0.10, skip
4. Calculate kelly percentage
5. Apply category multiplier if in REDUCE status
6. Apply position cap (30% max)
7. Round to nearest whole number
8. Place bet
```
