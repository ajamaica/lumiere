# Finance Tracker v2.0

Complete personal finance management. Track expenses, recurring subscriptions, savings goals, multi-currency support, and smart insights.

## Installation

```bash
clawdhub install finance-tracker
```

Or add to PATH:

```bash
export PATH="$PATH:/path/to/finance-tracker/bin"
```

## Quick Start

```bash
# Log an expense
finance add 50k "lunch at cafe"

# Log with currency conversion
finance add $20 "online purchase"

# See what you spent
finance report week

# Get smart insights
finance insights
```

---

## Core Commands

### Add Expenses

```bash
finance add <amount> "<description>"
```

**Amount formats:**

- `50000` — plain number
- `50k` — with k suffix (= 50,000)
- `$50` — USD, auto-converts to your currency
- `€100` — EUR
- `100 USD` — explicit currency

**Examples:**

```bash
finance add 50000 "lunch"
finance add 50k "groceries"
finance add $25 "Netflix subscription"
```

### Undo & Edit

```bash
# Remove last transaction
finance undo

# Edit a transaction
finance edit <id> --amount=60000
finance edit <id> --desc="dinner with friends"
finance edit <id> --category=food

# Delete specific transaction
finance delete <id>
```

### View & Search

```bash
finance report [period]    # today, week, month, year, all
finance recent [n]         # last n transactions
finance search "food"      # search by keyword
```

---

## 🔄 Recurring Expenses

Track subscriptions and bills that repeat automatically.

### Add Recurring

```bash
finance recurring add <amount> "<description>" <frequency> [--day=N]
```

**Frequencies:** daily, weekly, biweekly, monthly, quarterly, yearly

**Examples:**

```bash
finance recurring add 110k "mobile provider" monthly --day=1
finance recurring add 50k "Netflix" monthly
finance recurring add 200k "gym membership" monthly --day=15
```

### Manage Recurring

```bash
finance recurring              # List all
finance recurring list         # Same as above
finance recurring due          # Show what's due today
finance recurring process      # Auto-log all due expenses
finance recurring remove <id>  # Deactivate
```

### How It Works

- Recurring expenses track their next due date
- Run `finance recurring process` daily (or in heartbeat) to auto-log
- Each logged expense appears in your regular transactions
- Monthly totals shown in the recurring report

---

## 🎯 Savings Goals

Set targets and track progress towards financial goals.

### Add Goals

```bash
finance goal add "<name>" <target> [--by=DATE] [--current=X]
```

**Examples:**

```bash
finance goal add "New Laptop" 5000000 --by=2026-06-01
finance goal add "Emergency Fund" 10000000
finance goal add "Vacation" 3000000 --by=2026-08-01 --current=500000
```

### Track Progress

```bash
# Add to goal (increment)
finance goal update "Laptop" 500k

# Set exact amount
finance goal set "Laptop" 2000000

# View all goals
finance goal
finance goal list
```

### Goal Features

- **Deadline tracking** — shows days remaining
- **Daily/weekly/monthly targets** — how much to save to hit deadline
- **Priority levels** — high, medium, low
- **Completion tracking** — celebrate when you hit targets!

---

## 💱 Multi-Currency

Automatic currency conversion with live exchange rates.

### View Rates

```bash
finance rates              # Show all common rates
finance rates USD          # Specific currency rate
finance rates EUR
```

### Convert

```bash
finance convert 100 USD UZS
finance convert 50 EUR USD
```

### Auto-Conversion in Expenses

```bash
# These auto-convert to your default currency (UZS)
finance add $50 "Amazon purchase"
finance add €30 "App subscription"
finance add 100 USD "Online course"
```

### Set Default Currency

```bash
finance currency         # Show current
finance currency USD     # Change default
```

**Rate caching:** Rates refresh every 6 hours automatically.

---

## 💡 Smart Insights

AI-powered spending analysis and alerts.

```bash
finance insights    # Full insights report
finance summary     # Quick daily summary
finance digest      # Weekly digest
```

### What Insights Shows

- **Spending velocity** — daily/weekly/monthly averages
- **Period comparison** — this week vs last week
- **Category changes** — which categories went up/down
- **Anomaly detection** — unusually large expenses flagged
- **Goal progress** — how much to save daily
- **Recurring due** — subscriptions due today

### Example Output

```
💡 Smart Insights
━━━━━━━━━━━━━━━━━━━━━

📈 Spending Velocity
   Daily avg: 85,000 UZS
   This month so far: 1,200,000 UZS
   Projected month total: 2,550,000 UZS

📊 This Week vs Last Week
   📈 Spending UP 23%
   This week: 595,000 UZS
   Last week: 484,000 UZS

🏷️ Notable Category Changes
   🍔 food: ↑ 45%
   🚗 transport: ↓ 20%

⚠️ Alerts
   • Unusually large expense: 350,000 on electronics

🎯 Savings Goals
   Need to save: 50,000 UZS/day
   Next deadline: Laptop in 45 days
```

---

## Income & Assets

### Log Income

```bash
finance income 5000000 "salary"
finance income 500k "freelance project"
```

Income types auto-detected: salary, freelance, business, investment, gift

### Manage Assets

```bash
finance asset add "Bank Account" 10000000 cash
finance asset add "Stocks" 5000000 stocks
finance asset add "Bitcoin" 2000000 crypto
finance asset remove "Old Account"
finance asset list
finance portfolio          # Net worth summary
```

Asset types: cash, stocks, crypto, realestate, savings, investments

---

## Analysis

```bash
finance trends [days]      # Spending patterns over time
finance compare [days]     # Compare current vs previous period
finance budget <daily>     # Check against daily budget
```

### Budget Check

```bash
finance budget 100k
```

Shows:

- Today's spending vs budget
- Week's spending vs weekly budget (7x daily)
- Remaining amounts
- Over-budget warnings

---

## Categories

Auto-detected from description:

| Category         | Keywords                                 |
| ---------------- | ---------------------------------------- |
| 🍔 Food          | lunch, dinner, cafe, restaurant, grocery |
| 🚗 Transport     | taxi, uber, bus, metro, fuel             |
| 🛍️ Shopping      | clothes, shoes, shopping                 |
| 📱 Tech          | phone, laptop, headphones                |
| 🎮 Entertainment | movie, game, netflix, spotify            |
| 📚 Education     | book, course, school                     |
| 💊 Health        | medicine, pharmacy, doctor, gym          |
| 🏠 Home          | rent, utility, furniture, internet       |
| 💇 Personal      | haircut, barber, salon                   |
| 🎁 Gifts         | gift, present                            |
| ✈️ Travel        | travel, flight, hotel                    |
| 🔄 Subscriptions | subscription, monthly, plan              |

---

## Data Storage

All data stored locally in `~/.finance-tracker/`:

```
~/.finance-tracker/
├── transactions.json     # All expenses
├── FINANCE_LOG.md        # Human-readable log
├── portfolio.json        # Assets
├── income.json           # Income records
├── recurring.json        # Recurring expenses
├── goals.json            # Savings goals
└── exchange_rates.json   # Cached rates
```

## Export

```bash
finance export csv
finance export json
```

---

## Telegram Integration

For quick logging in chat, common patterns:

```
"spent 50k lunch" → finance add 50000 "lunch"
"taxi 15k"        → finance add 15000 "taxi"
"coffee 8k"       → finance add 8000 "coffee"
```

### Heartbeat Integration

Add to your HEARTBEAT.md for automated processing:

```markdown
## Finance (daily)

- Run: finance recurring process
- Run: finance summary
```

---

## Complete Command Reference

```
EXPENSES:
  finance add <amt> "<desc>"        Log expense
  finance undo                      Remove last
  finance edit <id> [--amount=X]    Edit transaction
  finance delete <id>               Delete transaction
  finance report [period]           Spending report
  finance recent [n]                Recent transactions
  finance search "<query>"          Search

RECURRING:
  finance recurring                 List all
  finance recurring add ...         Add subscription
  finance recurring remove <id>     Remove
  finance recurring process         Log due items
  finance recurring due             Show due today

GOALS:
  finance goal                      List goals
  finance goal add "<name>" <target> [--by=DATE]
  finance goal update "<name>" <amt>
  finance goal set "<name>" <amt>
  finance goal remove "<name>"

CURRENCY:
  finance rates [currency]          Exchange rates
  finance convert <amt> <from> <to>
  finance currency [code]           Get/set currency

INCOME & ASSETS:
  finance income <amt> "<desc>"
  finance asset add/remove/list
  finance portfolio

ANALYSIS:
  finance insights                  Smart analysis
  finance summary                   Daily summary
  finance digest                    Weekly digest
  finance trends [days]
  finance compare [days]
  finance budget <daily>

OTHER:
  finance categories
  finance export [csv|json]
  finance help
```

---

## Tips

1. **Use 'k' for thousands** — `50k` is faster than `50000`
2. **Currency prefix** — `$50` auto-converts
3. **Daily recurring check** — run `finance recurring process` in heartbeat
4. **Weekly insights** — run `finance digest` for summaries
5. **Goal tracking** — update goals when you save money
6. **Budget alerts** — run `finance budget 100k` to stay on track

---

Made with 🦞 by Salen
