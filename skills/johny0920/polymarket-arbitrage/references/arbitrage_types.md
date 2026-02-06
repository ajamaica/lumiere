# Arbitrage Types on Polymarket

## Overview

Three main types of arbitrage opportunities exist on prediction markets:

1. **Math Arbitrage** - Probabilities in multi-outcome markets don't sum to 100%
2. **Cross-Market Arbitrage** - Same event priced differently across markets
3. **Orderbook Arbitrage** - Bid/ask spread inefficiencies

---

## 1. Math Arbitrage

### How It Works

In a properly priced market, the sum of all outcome probabilities should equal 100%. When it doesn't, there's an arbitrage opportunity.

### Type A: Probabilities Sum < 100% (Buy All)

**Example:**

- Outcome A: 45%
- Outcome B: 48%
- Total: 93%

**Strategy:** Buy all outcomes

- Cost: $0.93 (45¢ + 48¢)
- Payout: $1.00 (one outcome must win)
- Gross Profit: $0.07 (7%)
- Fees: ~$0.02 (2% × 2 legs = 4%)
- Net Profit: $0.05 (5%)

**Risk:** Very low - guaranteed profit if you can execute at displayed prices

### Type B: Probabilities Sum > 100% (Sell All)

**Example:**

- Outcome A: 58%
- Outcome B: 47%
- Total: 105%

**Strategy:** Sell all outcomes (be the market maker)

- Premium Received: $1.05 (58¢ + 47¢)
- Max Loss: $1.00 (you pay out the winner)
- Gross Profit: $0.05 (5%)
- Fees: ~$0.04 (2% × 2 legs)
- Net Profit: $0.01 (1%)

**Risk:** High - requires liquidity on both sides, and you need collateral

**Why it's riskier:**

- Selling requires finding buyers at your price
- You need capital upfront to collateralize the potential payout
- Slippage can eat the edge quickly

---

## 2. Cross-Market Arbitrage

### How It Works

The same event is priced differently in separate markets.

**Example:**

- Market 1: "Will Bitcoin hit $90k in February?" → Yes: 25%
- Market 2: "Bitcoin price in February" → Hits $90k: 18%

**Strategy:**

- Buy "Yes" at 18% in Market 2
- Sell "Yes" at 25% in Market 1 (or buy "No" at 75%)
- Lock in 7% profit

**Challenges:**

- Hard to detect automatically (requires semantic matching)
- Markets may have different resolution criteria
- Edge often too small after fees

---

## 3. Orderbook Arbitrage

### How It Works

Exploit bid/ask spread inefficiencies in the live orderbook.

**Example:**

- Bid for Outcome A: 48%
- Ask for Outcome B: 51%
- If A and B are the only outcomes, total = 99%

**Strategy:**

- Buy A at 48%, Buy B at 51%
- Total cost: 99¢
- Payout: $1.00
- Profit: 1% (minus fees)

**Challenges:**

- Requires real-time orderbook data (not just homepage probabilities)
- Opportunities disappear in milliseconds
- Need fast execution (bots compete here)
- Homepage percentages are often midpoints, not executable prices

---

## Fee Considerations

Polymarket charges approximately:

- **Maker fee:** 0% (no fee for limit orders)
- **Taker fee:** 2% (market orders)

**Conservative assumption:** 2% total fees per round-trip

**Breakeven threshold:**

- For 2-outcome markets: Need >4% gross edge (2% fee × 2 legs)
- For 3-outcome markets: Need >6% gross edge
- For 4-outcome markets: Need >8% gross edge

**Recommended minimum edge:** 3-5% net (after fees) to account for slippage

---

## Risk Factors

1. **Stale Data** - Homepage prices may lag orderbook
2. **Liquidity** - Can you actually fill the order at displayed price?
3. **Slippage** - Price moves when you place large orders
4. **Smart Money** - You're competing against professional arb bots
5. **Resolution Risk** - Markets may resolve differently than expected
6. **Withdrawal Friction** - Getting money on/off Polymarket takes time

---

## Best Practices

1. **Start with paper trading** - Track opportunities without real money
2. **Focus on high-volume markets** - Better liquidity, less slippage
3. **Require significant edge** - 3%+ net profit minimum
4. **Avoid sell-side arbs initially** - Stick to buying all outcomes
5. **Monitor execution** - Homepage odds ≠ executable prices
6. **Factor in gas fees** - Blockchain transactions cost money
