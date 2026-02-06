# Probability Calibration Log

**CLAWDBOT INSTRUCTION**: Track all probability estimates vs outcomes to improve calibration. Being well-calibrated is essential for long-term profitability.

---

## What is Calibration?

If you say something has a 70% probability, it should happen 70% of the time.

- **Overconfident**: You say 80%, but it happens only 60% of the time
- **Underconfident**: You say 60%, but it happens 80% of the time
- **Well-calibrated**: Your estimates match reality

## Calibration Adjustment Factor

Based on your calibration analysis, apply this adjustment:

```
Adjusted Probability = Raw Estimate × Adjustment Factor

Current Adjustment Factor: 1.0 (no adjustment - update based on data)
```

---

## Running Calibration Tracker

| Bucket | Total Bets | Wins | Win Rate | Expected | Calibration |
| ------ | ---------- | ---- | -------- | -------- | ----------- |
| 50-54% | 0          | 0    | N/A      | 52%      | N/A         |
| 55-59% | 0          | 0    | N/A      | 57%      | N/A         |
| 60-64% | 0          | 0    | N/A      | 62%      | N/A         |
| 65-69% | 0          | 0    | N/A      | 67%      | N/A         |
| 70-74% | 0          | 0    | N/A      | 72%      | N/A         |
| 75-79% | 0          | 0    | N/A      | 77%      | N/A         |
| 80-84% | 0          | 0    | N/A      | 82%      | N/A         |
| 85-89% | 0          | 0    | N/A      | 87%      | N/A         |
| 90-94% | 0          | 0    | N/A      | 92%      | N/A         |
| 95%+   | 0          | 0    | N/A      | 97%      | N/A         |

---

## Individual Prediction Log

<!--
TEMPLATE:

| Date | Market | My Est | Bucket | Outcome | Correct? |
|------|--------|--------|--------|---------|----------|
| [DATE] | [Market name] | XX% | XX-XX% | YES/NO | Y/N |

-->

| Date | Market | My Est | Bucket | Outcome | Correct? |
| ---- | ------ | ------ | ------ | ------- | -------- |
|      |        |        |        |         |          |

---

## Brier Score Tracker

Brier Score = (1/N) × Σ(forecast - outcome)²

Where:

- forecast = your probability (0 to 1)
- outcome = 1 if happened, 0 if not

Lower is better:

- 0.00 = Perfect
- 0.25 = Random guessing on 50/50
- 0.50 = Terrible

**Running Brier Score**: N/A (no predictions yet)

### Brier Score by Category

| Category      | Predictions | Brier Score |
| ------------- | ----------- | ----------- |
| Politics      | 0           | N/A         |
| Crypto        | 0           | N/A         |
| Sports        | 0           | N/A         |
| Entertainment | 0           | N/A         |
| Other         | 0           | N/A         |

---

## Calibration Curve

Plot your actual outcomes vs predicted probabilities.

```
Actual Win Rate
100% |                                               *
 90% |                                         *
 80% |                                    *
 70% |                              *
 60% |                        *
 50% |                  *
 40% |            *
 30% |      *
 20% | *
 10% |
  0% +--+--+--+--+--+--+--+--+--+--
     0  10 20 30 40 50 60 70 80 90 100
              Your Predicted Probability

* = Perfect calibration (the diagonal)
Your data points should cluster around this line
```

UPDATE WITH YOUR DATA:

```
[Plot your own calibration curve as data accumulates]
```

---

## Calibration Analysis

### After Every 20 Predictions

Run this analysis:

1. **Overall Brier Score**: Calculate and compare to baseline
2. **By Bucket**: Which ranges am I best/worst at?
3. **By Category**: Which topics am I best calibrated on?
4. **Trend**: Am I improving over time?

### Calibration Adjustments Made

| Date      | Old Adjustment | New Adjustment | Based On       |
| --------- | -------------- | -------------- | -------------- |
| [INITIAL] | 1.0            | 1.0            | Starting point |
|           |                |                |                |

---

## Common Calibration Errors

Track which errors you make:

### Overconfidence Triggers

- [e.g., "When I feel certain about politics"]
- [e.g., "When confirming evidence is strong"]

### Underconfidence Triggers

- [e.g., "When going against the crowd"]
- [e.g., "In areas where I've been wrong before"]

### Fixes Applied

- [e.g., "When estimate >80%, ask: what would make this wrong?"]
- [e.g., "Always check base rate before intuition"]
