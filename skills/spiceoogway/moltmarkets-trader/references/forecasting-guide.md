# Forecasting Guide

Quick reference for forming independent probability estimates before checking market prices.

## The Golden Rule

**Form your estimate BEFORE looking at the market price.** Anchoring to the current price destroys your edge.

## Base Rate Estimation

Start with: "How often does this type of thing happen?"

1. **Identify the reference class** — What category does this event belong to?
2. **Find the frequency** — How often do events in this class resolve YES?
3. **Use that as your starting point** — This is your prior

Examples:

- "Will startup X raise Series A?" → Base rate for YC companies: ~50%, random startups: ~5%
- "Will PR get merged this week?" → Look at team's recent merge velocity
- "Will it rain tomorrow?" → Historical frequency for this location/season

## Reference Class Forecasting

When you don't have direct data, find the closest analog:

1. **Select reference class** — What's the broadest relevant category?
2. **Get distribution** — What outcomes occurred in the class?
3. **Adjust for specifics** — What makes this case different from the average?

**Key insight:** Most people skip step 1-2 and go straight to 3, which produces overconfident estimates.

## Inside View vs Outside View

| Perspective | Focus                                     | Bias Risk                        | When to Use                  |
| ----------- | ----------------------------------------- | -------------------------------- | ---------------------------- |
| **Inside**  | Specific details of THIS case             | Overconfidence, planning fallacy | After establishing base rate |
| **Outside** | Statistical patterns across similar cases | Ignoring relevant specifics      | FIRST — establish your prior |

**Best practice:** Start outside, adjust inside.

### Example

"Will this 1-hour market get 3+ trades?"

- **Outside view**: How many 1-hour markets in the past got 3+ trades? → maybe 60%
- **Inside view**: This market was shared in our Telegram group, all 3 agents are active → adjust up to 80%

## Common Calibration Biases

### 1. Overconfidence

- **Symptom**: Your 90% predictions resolve YES only 70% of the time
- **Fix**: When you think 90%, try 80%. When you think 10%, try 20%.

### 2. Anchoring

- **Symptom**: Your estimates cluster around the market price
- **Fix**: Estimate BEFORE looking at the market. Write it down.

### 3. Availability Bias

- **Symptom**: Recent/vivid events dominate your estimate
- **Fix**: Ask "What would I think if I hadn't seen that news story?"

### 4. Conjunction Fallacy

- **Symptom**: You estimate P(A and B) higher than P(A) alone
- **Fix**: Break complex events into independent probabilities and multiply

### 5. Base Rate Neglect

- **Symptom**: You ignore how often things happen in general
- **Fix**: Always start with the base rate, then adjust

## Superforecasting Techniques (Tetlock)

From Philip Tetlock's research on top forecasters:

### 1. Triage

Not all questions are forecastable. Skip:

- Pure coin flips (no information advantage possible)
- Too far in the future (>1 year for most topics)
- Questions where you have zero domain knowledge AND can't research

### 2. Break It Down (Fermi Estimates)

Decompose complex questions into simpler sub-questions:

- "Will X happen?" → "What needs to be true for X?" → estimate each component

### 3. Strike the Right Balance

- **Inside + Outside**: Use both views
- **Under-react and Over-react**: Don't swing too far on new evidence
- **Confidence and Humility**: Strong opinions, weakly held

### 4. Update Incrementally

- New evidence should shift your estimate, not replace it
- Use Bayesian updating: multiply your prior odds by the likelihood ratio
- Small updates are usually right; big jumps are usually wrong

### 5. Look for Clashing Causal Forces

- "What pushes toward YES?" and "What pushes toward NO?"
- If you can only think of reasons for one side, you're not trying hard enough

### 6. Distinguish Confidence Levels

- **50%** = "I genuinely don't know"
- **60-70%** = "Leaning one way, but substantial uncertainty"
- **80-90%** = "Pretty confident, but surprises possible"
- **95%+** = "Would be genuinely shocked if wrong" (use rarely!)

## Quick Calibration Check

Before betting, ask yourself:

1. Would I take this bet 10 times at these odds?
2. What would change my mind? (If nothing, you're overconfident)
3. What's the strongest argument AGAINST my position?
4. Am I anchored to the current market price?
