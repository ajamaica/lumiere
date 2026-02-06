---
name: rba-rate-intelligence
description: RBA cash rate monitor, meeting schedule, CPI tracker, and mortgage impact calculator for Australia.
homepage: https://oneyco.com.au
metadata: {"clawdbot":{"emoji":"📊","category":"Finance"}}
---

# RBA Rate Intelligence

Real-time Reserve Bank of Australia cash rate monitoring, meeting schedules, and mortgage impact analysis.

## Current Rates (February 2026)

| Metric | Value | Last Change |
|--------|-------|-------------|
| **RBA Cash Rate** | 4.10% | Dec 2024 (-25bp) |
| **CPI (Annual)** | 2.8% | Q4 2024 |
| **RBA Target** | 2-3% | Inflation target band |

> ⚠️ Rates change. Always verify at [rba.gov.au](https://www.rba.gov.au/statistics/cash-rate/)

---

## RBA Meeting Schedule 2026

The RBA Board meets **8 times per year** to decide the cash rate.

| # | Date | Day |
|---|------|-----|
| 1 | 18 February 2026 | Tuesday |
| 2 | 1 April 2026 | Wednesday |
| 3 | 20 May 2026 | Wednesday |
| 4 | 1 July 2026 | Wednesday |
| 5 | 12 August 2026 | Wednesday |
| 6 | 23 September 2026 | Wednesday |
| 7 | 4 November 2026 | Wednesday |
| 8 | 9 December 2026 | Wednesday |

**Decision announcement**: 2:30 PM AEDT/AEST on meeting day

Official calendar: [RBA Monetary Policy Meetings](https://www.rba.gov.au/monetary-policy/rba-board-meetings/)

---

## Rate Impact Calculator

### Monthly Repayment Formula (P&I)
```
M = P × [r(1+r)^n] / [(1+r)^n – 1]

Where:
- P = Principal (loan amount)
- r = Monthly rate (annual rate ÷ 12 ÷ 100)
- n = Total months (years × 12)
```

### Quick Impact Table ($500,000 loan, 30 years)

| Rate | Monthly P&I | vs 4.10% |
|------|-------------|----------|
| 3.60% | $2,272 | -$160/mo |
| 3.85% | $2,343 | -$89/mo |
| **4.10%** | **$2,416** | — |
| 4.35% | $2,490 | +$74/mo |
| 4.60% | $2,565 | +$149/mo |
| 5.00% | $2,684 | +$268/mo |
| 6.00% | $2,998 | +$582/mo |

### Per 0.25% Rate Change
```
$500,000 loan → ~$75/month difference
$750,000 loan → ~$112/month difference
$1,000,000 loan → ~$150/month difference
```

---

## CPI & Inflation

### What is CPI?
Consumer Price Index measures the average change in prices paid by households for goods and services.

### Latest CPI Data
| Quarter | Annual % | Trend |
|---------|----------|-------|
| Q4 2024 | 2.8% | ↓ |
| Q3 2024 | 2.9% | ↓ |
| Q2 2024 | 3.4% | ↓ |
| Q1 2024 | 3.8% | ↓ |

### RBA's Inflation Target
- **Target band**: 2-3% annual inflation
- **Above 3%**: RBA may raise rates to cool economy
- **Below 2%**: RBA may cut rates to stimulate growth

Data source: [ABS CPI](https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia)

---

## Historical Cash Rate

### Recent Rate Movements
| Date | Rate | Change |
|------|------|--------|
| Dec 2024 | 4.10% | -0.25% |
| Nov 2023 | 4.35% | +0.25% |
| Jun 2023 | 4.10% | +0.25% |
| May 2023 | 3.85% | +0.25% |
| Mar 2023 | 3.60% | +0.25% |
| Nov 2020 | 0.10% | -0.15% (COVID low) |

### Key Milestones
- **COVID Low**: 0.10% (Nov 2020 – Apr 2022)
- **Fastest Hike Cycle**: +4.25% in 18 months (May 2022 – Nov 2023)
- **Current Easing Cycle**: Started Dec 2024

Full history: [RBA Cash Rate Target](https://www.rba.gov.au/statistics/cash-rate/)

---

## Variable vs Fixed Rates

| Type | Pros | Cons |
|------|------|------|
| **Variable** | Benefits from rate cuts; Flexible (extra repayments, offset) | Exposed to rate rises |
| **Fixed** | Certainty; Protection from rises | Misses out on cuts; Break costs; Limited flexibility |

### Current Market Rates (Indicative)
| Product | Range |
|---------|-------|
| Variable (owner-occupied, P&I) | 5.80% – 6.50% |
| 2-year Fixed | 5.50% – 6.20% |
| 3-year Fixed | 5.40% – 6.00% |

> Rates vary by lender, LVR, and loan features. Compare at [canstar.com.au](https://www.canstar.com.au/home-loans/)

---

## Proactive Alerts (For Clawdbot Users)

Set up reminders for RBA meetings:
```
"Remind me the day before each RBA meeting"
"Alert me when RBA changes the cash rate"
"Notify me when CPI data is released"
```

CPI release schedule: Quarterly (late Jan, Apr, Jul, Oct)

---

## Key Resources

- **RBA Official**: [rba.gov.au](https://www.rba.gov.au)
- **ABS Statistics**: [abs.gov.au](https://www.abs.gov.au)
- **Rate Comparison**: [canstar.com.au](https://www.canstar.com.au)
- **Economic Calendar**: [tradingeconomics.com/australia/calendar](https://tradingeconomics.com/australia/calendar)

---

## Disclaimer

This skill provides general information only. Interest rates, economic data, and policies change frequently. Always verify current rates with official sources (RBA, ABS) and consult a qualified mortgage broker or financial advisor before making financial decisions.

**Built by [Oney & Co](https://oneyco.com.au)** — Australian lending insights, simplified.
