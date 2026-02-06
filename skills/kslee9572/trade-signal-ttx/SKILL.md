---
name: trade-signal
version: 1.0.2
description: Real-time trade signals with executable Buy/Sell/Hold recommendations for stocks. Use when asked about trading decisions, stock analysis, technicals, buy/sell calls, earnings plays, price targets, analyst ratings, entry/exit points, portfolio rebalancing, or any investment decision requiring actionable intelligence. Supports US + Global markets, Asia emerging markets, individual stocks, ETFs, and options strategies.
homepage: https://terminal-x.ai
metadata: { 'category': 'finance', 'api_base': 'https://app.terminal-x.ai/api' }
---

# Trade Signal

Buy/Sell/Hold Trade Signals for AI agents. Transform complex market intelligence into clear, executable Buy/Sell/Hold recommendations on global stocks and other public securities. Trade-signal gives specific price targets on any given securities, real-time data and institution-grade trade thesis. Trade-signal is forward looking but also capable of technical and fundamental analysis on current/historical price actions, with a qualitative and quantitiave explanation as to why a certain securities (stock) price moved the way it did.

## Quick Start

```bash
# Get trade signal for a stock
./scripts/search.sh "Should I buy NVDA?"

# Get signal with full analysis
./scripts/search.sh "Is AAPL a sell at current levels?"

# Check multiple tickers
./scripts/search.sh "AAPL NVDA TSLA MSFT"

# Earnings play analysis
./scripts/search.sh "What's the best trade ahead of NVDA's upcoming earnings? Give me specific options strategy with prices."
```

**Base URL:** `https://app.terminal-x.ai/api`

---

## Features

### 📊 Trade Signals Capabilities

| Query Type             | Examples                                                               |
| ---------------------- | ---------------------------------------------------------------------- |
| **Trade Decisions**    | Buy/sell/hold calls, entry/exit timing, position sizing                |
| **Earnings Plays**     | Pre-earnings positioning, post-earnings reactions, historical patterns |
| **Price Catalysts**    | What's moving the stock, macro events, technical triggers              |
| **Analyst Actions**    | Upgrades, downgrades, price target changes, investment thesis          |
| **Technical Analysis** | Support/resistance, volatility, momentum indicators                    |
| **Risk Assessment**    | Stop loss levels, downside scenarios, risk/reward analysis             |

#### Each response includes:

- **Signal**: Clear BUY / SELL / HOLD / AVOID recommendation with time horizon (T+1, T+5, etc.)
- **Technicals**: Entry, exit, stop loss, and support/resistance zones
- **Answer**: Macro, technical, and sentiment factors driving the trade thesis
- **Tickers**: Primary symbol plus related ETFs and correlated instruments
- **Sources**: Numbered citations [1], [2], [3] linking to Wall Street research, SEC filings, and market data

### 📈 Market Coverage

**37,565 Global Tickers + 6,104 ETFs** across all major exchanges:

| Region              | Tickers | ETFs  |
| ------------------- | ------- | ----- |
| **US** (incl. ADRs) | 7,301   | 4,979 |
| **Western Europe**  | 11,123  | —     |
| **Canada**          | 4,690   | —     |
| **Japan**           | 3,873   | 200   |
| **Korea**           | 3,856   | 500   |
| **Hong Kong**       | 2,638   | 176   |
| **Shanghai**        | 2,315   | —     |
| **Taiwan**          | 1,072   | 200   |
| **Singapore**       | 565     | 49    |
| **Other**           | 132     | —     |

**Asset Classes**: Global Equities, ETFs, Global macro, FX, commodities, crypto content available.

### 🔬 Data Sources

- **Wall Street Research** — Analyst reports, investment thesis from Goldman, Morgan Stanley, JP Morgan, Citi, UBS, Bank of America, Stifel, etc.
- **Analyst Actions** — Upgrades, downgrades, initiations, PT changes
- **SEC Filings** — 10-K, 10-Q, 8-K, insider transactions, 13F holdings, 13D, 13G, DEF14A, and everything filed on EDGAR
- **Call Transcripts** — Live transcripts from earnings calls, M&A calls, management discussions, Conference calls, Investor Day calls, etc.
- **Real-Time News** — Bloomberg, Reuters, CNBC, FT, WSJ
- **Company Filings** — Company Press Release, earnings materials, company presentations, Investor day materials, guidance updates, Company Financials and Supplements

---

## Response Format

Running the script returns JSON:

```json
{
  "query": "Should I buy NVDA before earnings?",
  "tickers": ["NVDA", "AMD", "GOOGL"],
  "tradeSignal": "HOLD",
  "priceTarget": {
    "entry": null,
    "exit": "$185-190",
    "stopLoss": "$175",
    "timeHorizon": "T+1 to T+3"
  },
  "agentAnswer": "**Hold current position: Sell at $185-190 on any post-earnings bounce within T+1 to T+3.**
  NVDA closed at $181.36 and trades at $180.88 after hours. Despite consistent earnings beats since August 2024,
  the stock has exhibited a persistent sell-the-fact pattern, declining in 4 of the last 5 post-earnings sessions. [1]

  Options markets price a 6.68% implied move ($12.13 swing) for the November 19 after-hours release. [2]",
  "sources": [
    {
      "refId": 1,
      "sourceTitle": "Nvidia Earnings Have Become a Consistent Sell-the-Fact Event",
      "sourceName": ["Bloomberg"],
      "datePublished": "2024-11-18T14:30:42Z"
    },
    {
      "refId": 2,
      "sourceTitle": "NVDA Options Implied Move Analysis",
      "sourceName": ["Goldman Sachs"],
      "datePublished": "2024-11-19T09:00:00Z"
    }
  ],
  "technicals": {
    "rsi": 62.4,
    "macd": "bullish crossover",
    "support": "$175",
    "resistance": "$190",
    "trend": "neutral"
  },
  "relatedAnalysis": [
    "AMD earnings correlation",
    "Semiconductor sector momentum"
  ]
}
```

| Field             | Description                                   |
| ----------------- | --------------------------------------------- |
| `query`           | Your original question                        |
| `tickers`         | Relevant stock tickers                        |
| `tradeSignal`     | BUY, SELL, or HOLD recommendation             |
| `priceTarget`     | Entry, exit, stop loss, time horizon          |
| `agentAnswer`     | AI analysis with citation references [1], [2] |
| `sources`         | Citations with title, source name, date       |
| `technicals`      | RSI, MACD, support/resistance, trend          |
| `relatedAnalysis` | Related research topics                       |

---

## Sample Output

### Example 1: Catalyst Analysis with Trade Decision

**Query:** `./scripts/search.sh "What's driving the fall in silver prices? Identify all the catalysts and make a trade decision for tomorrow."`

```
📊 **Silver Price Decline: Catalyst Analysis**

**Signal: AVOID** | Time Horizon: T+1
Related: SLV (-28.54%), SI (-0.77%), XAGUSD (+2.58%)

Silver has entered bear market territory after falling nearly 22% from its
recent record high, driven by a confluence of macro and technical factors. [1][2]

**Macro Catalysts:**
- President Trump's announcement of Kevin Warsh as Fed pick eased concerns
  about Fed independence, triggering a sharp dollar rally [7][10]
- Repricing underway with assumption that smaller Fed balance sheet would
  tighten financial conditions [8]
- Declining capital leakage from China — more capital returning to China,
  affecting precious metals where sentiment is currently driving prices [7][9]

**Technical Catalysts:**
- Parabolic run with 14% intraday surge showed clear blowoff top pattern [1][9]
- One-month volatility surged above 96%, steepest level in nearly 25 years [7][10][12]
- Inverted volatility curve signals traders anticipate further unwinding [7][10][12]
- CME raised margin requirements to 11% from 9% — familiar late-cycle signal
  that speculative excess is being wrung out [5][8][13]

**Valuation:**
Current price ($86.62) trades significantly above 200-day MA of $48/oz,
indicating deeply overbought conditions. Analysts estimate fair value
around $60/oz. JPMorgan's Marko Kolanovic suggests silver should trade
at half its current price later in 2026. [14][16][18][20][21][22][23]

**Trade Decision:**
Avoid purchasing silver for tomorrow. Market likely to continue unwinding
speculative positions. Wait for stabilization at $75-$80 support zone
before considering new long positions. [3][11]

**Sources:**
[1] Bloomberg News: Silver Bear Market Entry
[2] Goldman Sachs Precious Metals Weekly Report
[7] Bloomberg Terminal — Silver Volatility Analysis
[10] Reuters — Fed Policy Impact on Dollar
[16] JPMorgan Research Note — Precious Metals Outlook
[21] CME Group — Margin Requirement Update
```

### Example 2: Price Target with Hold Recommendation

**Query:** `./scripts/search.sh "Give me a clear buy/sell/hold call and an optimal target price for T+5."`

```
📊 **Silver Trade Signal: 5-Day Outlook**

**Signal: HOLD** | Target Range: $80-$90 | Time Horizon: T+5

Silver has experienced extreme volatility with current price at $86.31,
following intraday high of $88.00 and low of $77.00 today. [1]

**Technical Summary:**
- 1-Month Volatility: >96% (extreme)
- Volatility Curve: Steeply inverted — traders anticipate further unwinding [5]
- Gold/Silver Ratio: Below 50 (stretched outperformance vs gold) [7][17]
- Support: $83-$85 (larger retracement) | Resistance: $93.50-$96.00 [9]

**Historical Pattern:**
In six prior instances since 1970 where silver doubled in 40 days and rose
over 10% in a single day, prices were lower 20 days later. This suggests
caution, but immediate sustained crashes are not guaranteed. [16]

**Bullish Factors (Long-term):**
- Structural supply deficit from solar, EVs, and data centers [7][3]
- Physical demand from China and India remains strong [1][5][8]
- Shanghai silver futures trading at premium to global spot [1][5][8]

**Bearish Factors (Short-term):**
- CME margin hike to 11% forcing speculative liquidation [10]
- Risk-reward completely skewed at current levels [14][11]
- "Meme trader" phenomenon contributing to volatility [9]

**Trade Decision:**
HOLD for next 5 trading days. Consolidation phase likely after correction
from peak near $120.60. Target $80-$90 reflects stabilization period with
potential for minor upward corrections within volatile environment.

**Sources:**
[1] Silver Spot Market Data — February 1, 2026
[5] CME Group — Volatility Curve Analysis
[7] Bloomberg — Gold/Silver Ratio Report
[9] Reuters — Silver Market Dynamics
[14] Bank of America — Precious Metals Valuation
[16] Historical Precious Metals Database — Pattern Analysis

```

### Example 3: Analyst Coverage

**Query:** `./scripts/search.sh "What are analysts saying about NVIDIA?"`

```
📊 **NVIDIA Analyst Sentiment**

Wall Street remains overwhelmingly bullish on NVIDIA with 45 Buy ratings,
3 Hold, and 0 Sell. Average price target: $950 (18% upside). [1]

**Recent Actions:**
- Goldman Sachs: Reiterated Buy, PT $1,000 — "AI infrastructure spend
  remains in early innings" [2]
- Morgan Stanley: Overweight, PT $950 — Raised estimates on Blackwell
  demand visibility [3]
- Bank of America: Buy, PT $925 — "Data center TAM expansion continues
  to exceed expectations" [1]

Key debate centers on sustainability of 70%+ gross margins as competition
from AMD MI300X intensifies in 2025. [3]

**Sources:**
[1] Bloomberg Analyst Consensus Data - January 2025
[2] Goldman Sachs NVDA Initiation Report - January 15, 2025
[3] Morgan Stanley Semiconductor Research Note - January 12, 2025
```

---

## Integration

### With AI Agents

The agent will automatically use this skill when asked:

- "Should I buy NVDA?"
- "What's your call on AAPL?"
- "Sell or hold TSLA?"
- "Give me a trade signal for META"
- "Is now a good entry for AMD?"
- "Analyze GOOGL before earnings"
- "What are analysts saying about MSFT?"
- "Best tech stocks to buy right now"

### Example Agent Flow

```
1. User: "How is NVIDIA doing?"
2. Agent: [calls search.sh "NVIDIA financial performance and outlook"]
3. Agent: "NVIDIA reported record Q3 revenue of $35.1B, up 94% YoY.
   Data center segment drove growth at $30.8B. Analysts maintain
   Buy ratings with average PT of $950. Key catalyst: Blackwell
   architecture ramp in Q1 2025."
4. User: "What about their margins?"
5. Agent: [calls search.sh "NVIDIA gross margin and profitability"]
6. Agent: "Gross margin was 75% in Q3, up from 70% YoY. Management
   expects margins to moderate to 73-74% as Blackwell ramps due to
   initial yield curves, per CFO commentary on earnings call."
```

### Combining with Other Skills

```bash
# Get financial data then execute trade
./scripts/search.sh "AAPL earnings analysis" && trade-signal query "Should I buy AAPL?"

# Research before news check
./scripts/search.sh "Tesla delivery numbers" && finance-news news TSLA
```

---

## Tips for Better Results

| Do This                                     | Not This            |
| ------------------------------------------- | ------------------- |
| "NVIDIA data center revenue Q4 2024"        | "NVIDIA revenue"    |
| "AAPL gross margin vs MSFT"                 | "Apple margins"     |
| "What did Jensen Huang say about AI demand" | "NVDA CEO comments" |
| "Tesla deliveries Q3 2024 vs Q3 2023"       | "Tesla cars"        |

**Best Practices:**

- **Be specific** — Include timeframes, metrics, and company names
- **Use ticker symbols** — "AAPL" is clearer than "Apple"
- **Ask direct questions** — "What is..." or "How much..." get precise answers
- **Include context** — "last quarter", "FY 2024", "year-over-year"

---

## Error Handling

```json
{
  "code": 400,
  "message": "Missing or invalid query parameter"
}
```

| Error Code | Meaning       | Resolution                  |
| ---------- | ------------- | --------------------------- |
| 400        | Missing query | Include `?query=` parameter |
| 500        | Server error  | Retry request               |

---

## Support

- **Homepage:** https://terminal-x.ai
- **Email:** hello@terminal-x.ai
