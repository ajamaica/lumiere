# CloverCLI Skill

CLI for Clover POS API — inventory, orders, payments, customers, employees, discounts, and analytics.

**Version**: 1.2.0 (90-day chunking, retry logic, period shortcuts, discounts, taxes, tenders)

## Setup

```bash
# Install from npm
npm i -g @versatly/clovercli

# Or clone and build
cd ~/Projects
git clone https://github.com/Versatly/clovercli.git
cd clovercli && npm install && npm run build

# Set credentials (add to ~/.bashrc)
export CLOVER_ACCESS_TOKEN="your-token"
export CLOVER_MERCHANT_ID="your-merchant-id"

# Optional alias
alias clover='clovercli'
```

## Quick Reference

```bash
# Check connection
clovercli auth status
clovercli merchant get

# Business dashboard
clovercli reports summary
```

## Reports with Period Shortcuts ✨

```bash
# Using --period (new in v1.2.0!)
clovercli reports sales --period today
clovercli reports sales --period yesterday
clovercli reports sales --period this-week
clovercli reports sales --period last-week
clovercli reports sales --period this-month
clovercli reports sales --period last-month
clovercli reports sales --period mtd          # Month to date
clovercli reports sales --period ytd          # Year to date

# Or use explicit dates
clovercli reports sales --from 2026-01-01 --to 2026-01-31
clovercli reports daily --period this-month
clovercli reports hourly --date 2026-02-03
clovercli reports top-items --limit 20
clovercli reports payments
clovercli reports refunds
clovercli reports taxes
clovercli reports categories
clovercli reports employees
clovercli reports compare --period1-from ... --period2-from ...

# Export data
clovercli reports export orders --output orders.csv --format csv
clovercli reports export items --output items.json
```

## Merchant Settings

```bash
# Merchant info
clovercli merchant get

# Tax rates
clovercli merchant taxes list

# Payment tenders
clovercli merchant tenders list
```

## Discounts (v1.2.0+)

```bash
clovercli discounts list
clovercli discounts get <id>
clovercli discounts create --name "10% Off" --percentage 10
clovercli discounts create --name "$5 Off" --amount 500
clovercli discounts delete <id>
```

## Inventory

```bash
clovercli inventory items list
clovercli inventory items get <id>
clovercli inventory categories list
clovercli inventory stock list
```

## Orders & Payments

```bash
clovercli orders list --limit 50
clovercli orders get <id>

clovercli payments list --limit 50
clovercli payments get <id>
```

## Customers & Employees

```bash
clovercli customers list
clovercli customers get <id>

clovercli employees list
clovercli employees get <id>
```

## Raw API Access

```bash
clovercli api get '/v3/merchants/{mId}/tax_rates'
clovercli api get '/v3/merchants/{mId}/modifiers'
```

## Output Formats

All list commands support:

- `--output table` (default) — formatted table
- `--output json` — raw JSON
- `--quiet` — IDs only

## Reliability Features (v1.2.0+)

- **90-day auto-chunking**: Long date ranges automatically split into chunks
- **Exponential backoff**: Auto-retry on rate limits with backoff
- **Retry-after support**: Respects Clover's retry-after header

## Regions

| Region    | Use                    |
| --------- | ---------------------- |
| `us`      | US merchants (default) |
| `eu`      | Europe                 |
| `la`      | Latin America          |
| `sandbox` | Development/testing    |

Set via: `export CLOVER_REGION=eu`

## Known Clients

| Client  | Merchant ID   | Notes                                         |
| ------- | ------------- | --------------------------------------------- |
| REMEMBR | 6KF70H0B6E041 | Mauricio's Brazilian restaurant (Pedro's dad) |

## Source

- npm: https://www.npmjs.com/package/@versatly/clovercli
- GitHub: https://github.com/Versatly/clovercli
