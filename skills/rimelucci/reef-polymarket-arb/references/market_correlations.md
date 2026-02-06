# Market Correlation Database

**CLAWDBOT INSTRUCTION**: Build this database as you discover correlations between markets. This is key to Type 2 and Type 3 arbitrage.

---

## How to Use This Document

1. **Before scanning**: Review known correlations to check for mispricings
2. **When finding new correlation**: Add it here with the mathematical relationship
3. **After each resolution**: Update with whether the correlation held

---

## Active Correlations

### Template for Adding Correlations

```markdown
## [CORRELATION_ID] - [Topic]

**Status**: Active / Deprecated
**Type**: Implication / Subset / Sum / Inverse
**Confidence**: High / Medium / Low
**Added**: [DATE]
**Last Verified**: [DATE]

### Markets

**Market A**:

- Name: [name]
- URL: [polymarket URL]
- Current Price: YES $0.XX / NO $0.XX

**Market B**:

- Name: [name]
- URL: [polymarket URL]
- Current Price: YES $0.XX / NO $0.XX

### Relationship

**Type**: [Mathematical relationship]

**Logic**: [Explain why this relationship must hold]

**Formula**: [e.g., "A_YES >= B_YES" or "A_YES + B_YES = C_YES"]

### Historical Data

| Date | A Price | B Price | Spread | Arb Taken? |
| ---- | ------- | ------- | ------ | ---------- |
|      |         |         |        |            |

**Average Spread**: X%
**Spread Range**: X% to Y%
**Arb Threshold**: When spread > Y%, consider arb

### Notes

[Any caveats, edge cases, or observations]

---
```

---

## Correlation Categories

### Political - US Elections

[ADD CORRELATIONS AS DISCOVERED]

Example structure:

- Candidate X wins → Party Y wins (implication)
- Candidate X + Candidate Y + Candidate Z = 100% (sum)
- Primary winner probabilities

### Political - International

[ADD CORRELATIONS AS DISCOVERED]

### Sports

[ADD CORRELATIONS AS DISCOVERED]

Example structure:

- Team A wins division → Team A makes playoffs (implication)
- Player X scores → Team X covers spread (correlation)

### Crypto

[ADD CORRELATIONS AS DISCOVERED]

Example structure:

- BTC > $X by date1 → BTC > $X by date2 (if date2 > date1)
- ETH flips BTC → ETH price increase (correlation)

### Economic

[ADD CORRELATIONS AS DISCOVERED]

Example structure:

- Fed rate decision relationships
- Inflation readings correlations

### Entertainment / Awards

[ADD CORRELATIONS AS DISCOVERED]

Example structure:

- Nomination → Win (conditional)
- Category win relationships

---

## Deprecated Correlations

Correlations that no longer exist or proved unreliable.

| ID  | Topic | Why Deprecated | Date |
| --- | ----- | -------------- | ---- |
|     |       |                |      |

---

## Correlation Discovery Process

When you find a potential correlation:

1. **Verify the logic**: Is the relationship actually guaranteed?
2. **Check resolution criteria**: Do both markets resolve the same way?
3. **Calculate historical spread**: What's normal?
4. **Set arb threshold**: At what spread is it worth trading?
5. **Document edge cases**: What could break the correlation?

### Common Correlation Types

**Implication (A → B)**:
If A happens, B must happen. Therefore P(A) <= P(B).
Example: "Trump wins Iowa" → "Trump wins nomination" (probably)

**Subset**:
A is contained within B. Therefore P(A) <= P(B).
Example: "Event in January" vs "Event in Q1"

**Sum to 100%**:
Mutually exclusive, collectively exhaustive options.
Example: All candidates in a race

**Inverse**:
P(A) = 1 - P(B)
Example: YES and NO on same market (minus fees)

**Conditional**:
P(A|B) relationship exists
Example: "X wins if Y happens"
