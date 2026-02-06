---
name: sharesight
version: 1.0.0
description: Manage Sharesight portfolios, holdings, and custom investments via the API
metadata:
  {
    'openclaw':
      {
        'category': 'finance',
        'requires': { 'env': ['SHARESIGHT_CLIENT_ID', 'SHARESIGHT_CLIENT_SECRET'] },
        'optional_env': ['SHARESIGHT_ALLOW_WRITES'],
      },
  }
---

# Sharesight Skill

Manage Sharesight portfolios, holdings, custom investments, prices, and coupon rates. Supports full CRUD operations.

## Prerequisites

Set these environment variables:

- `SHARESIGHT_CLIENT_ID` - Your Sharesight API client ID
- `SHARESIGHT_CLIENT_SECRET` - Your Sharesight API client secret
- `SHARESIGHT_ALLOW_WRITES` - Set to `true` to enable create, update, and delete operations (disabled by default for safety)

## Commands

### Authentication

```bash
# Authenticate (required before first use)
sharesight auth login

# Check authentication status
sharesight auth status

# Clear saved token
sharesight auth clear
```

### Portfolios

```bash
# List all portfolios
sharesight portfolios list
sharesight portfolios list --consolidated

# Get portfolio details
sharesight portfolios get <portfolio_id>

# List holdings in a portfolio
sharesight portfolios holdings <portfolio_id>

# Get performance report
sharesight portfolios performance <portfolio_id>
sharesight portfolios performance <portfolio_id> --start-date 2024-01-01 --end-date 2024-12-31
sharesight portfolios performance <portfolio_id> --grouping market --include-sales

# Get performance chart data
sharesight portfolios chart <portfolio_id>
sharesight portfolios chart <portfolio_id> --benchmark SPY.NYSE
```

### Holdings

```bash
# List all holdings across portfolios
sharesight holdings list

# Get holding details
sharesight holdings get <holding_id>
sharesight holdings get <holding_id> --avg-price --cost-base
sharesight holdings get <holding_id> --values-over-time true

# Update holding DRP settings
sharesight holdings update <holding_id> --enable-drp true --drp-mode up
# drp-mode options: up, down, half, down_track

# Delete a holding
sharesight holdings delete <holding_id>
```

### Custom Investments

```bash
# List custom investments
sharesight investments list
sharesight investments list --portfolio-id <portfolio_id>

# Get custom investment details
sharesight investments get <investment_id>

# Create a custom investment
sharesight investments create --code TEST --name "Test Investment" --country AU --type ORDINARY
# type options: ORDINARY, TERM_DEPOSIT, FIXED_INTEREST, PROPERTY, ORDINARY_UNLISTED, OTHER

# Update a custom investment
sharesight investments update <investment_id> --name "New Name"

# Delete a custom investment
sharesight investments delete <investment_id>
```

### Prices (Custom Investment Prices)

```bash
# List prices for a custom investment
sharesight prices list <instrument_id>
sharesight prices list <instrument_id> --start-date 2024-01-01 --end-date 2024-12-31

# Create a price
sharesight prices create <instrument_id> --price 100.50 --date 2024-01-15

# Update a price
sharesight prices update <price_id> --price 101.00

# Delete a price
sharesight prices delete <price_id>
```

### Coupon Rates (Fixed Interest)

```bash
# List coupon rates for a fixed interest investment
sharesight coupon-rates list <instrument_id>
sharesight coupon-rates list <instrument_id> --start-date 2024-01-01

# Create a coupon rate
sharesight coupon-rates create <instrument_id> --rate 5.5 --date 2024-01-01

# Update a coupon rate
sharesight coupon-rates update <coupon_rate_id> --rate 5.75

# Delete a coupon rate
sharesight coupon-rates delete <coupon_rate_id>
```

### Reference Data

```bash
# List country codes
sharesight countries
sharesight countries --supported
```

## Output Format

All commands output JSON. Example portfolio list response:

```json
{
  "portfolios": [
    {
      "id": 12345,
      "name": "My Portfolio",
      "currency_code": "AUD",
      "country_code": "AU"
    }
  ]
}
```

## Date Format

All dates use `YYYY-MM-DD` format (e.g., `2024-01-15`).

## Grouping Options

Performance reports support these grouping options:

- `country` - Group by country
- `currency` - Group by currency
- `market` - Group by market (default)
- `portfolio` - Group by portfolio
- `sector_classification` - Group by sector
- `industry_classification` - Group by industry
- `investment_type` - Group by investment type
- `ungrouped` - No grouping

## Write Protection

Write operations (create, update, delete) are **disabled by default** for safety. To enable them:

```bash
export SHARESIGHT_ALLOW_WRITES=true
```

Without this, write commands will fail with:

```json
{
  "error": "Write operations are disabled by default. Set SHARESIGHT_ALLOW_WRITES=true to enable create, update, and delete operations.",
  "hint": "export SHARESIGHT_ALLOW_WRITES=true"
}
```

## Common Workflows

### View Portfolio Performance

```bash
# Get current year performance
sharesight portfolios performance 12345 --start-date 2024-01-01

# Compare against S&P 500
sharesight portfolios chart 12345 --benchmark SPY.NYSE
```

### Analyze Holdings

```bash
# List all holdings with cost information
sharesight holdings get 67890 --avg-price --cost-base
```

### Track Custom Investments

```bash
# Create a custom investment for tracking unlisted assets
sharesight investments create --code REALESTATE --name "Property Investment" --country AU --type PROPERTY

# Add price history for the investment
sharesight prices create 123456 --price 500000.00 --date 2024-01-01
sharesight prices create 123456 --price 520000.00 --date 2024-06-01
```

### Manage Fixed Interest Investments

```bash
# Create a term deposit
sharesight investments create --code TD001 --name "Term Deposit ANZ" --country AU --type TERM_DEPOSIT

# Set the coupon rate
sharesight coupon-rates create 123456 --rate 4.5 --date 2024-01-01

# Update rate when it changes
sharesight coupon-rates update 789 --rate 4.75
```

### Configure Dividend Reinvestment

```bash
# Enable DRP and round up purchases
sharesight holdings update 67890 --enable-drp true --drp-mode up

# Disable DRP
sharesight holdings update 67890 --enable-drp false
```
