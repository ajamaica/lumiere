---
name: price-tracker
description: Monitor product prices across Amazon, eBay, Walmart, and Best Buy to identify arbitrage opportunities and profit margins. Use when finding products to flip, monitoring competitor pricing, tracking price history, identifying arbitrage opportunities, or setting automated price alerts.
---

# Price Tracker

## Overview

Track product prices across multiple e-commerce platforms to identify arbitrage opportunities, profit margins, and optimal buying/selling windows. This skill enables automated price monitoring, historical tracking, and revenue-focused decision making.

## Core Capabilities

### 1. Product Discovery & Monitoring

**Search and Track Products:**

- Search products by keyword across Amazon, eBay, Walmart, Best Buy
- Add products to monitoring lists
- Set target price thresholds
- Configure alert frequency (hourly, daily, weekly)

**Example Request:**
"Monitor iPhone 15 Pro prices across Amazon and eBay. Alert me if the price drops below $800 or if eBay listing is $150+ cheaper than Amazon."

### 2. Arbitrage Analysis

**Cross-Platform Comparison:**

- Compare identical product prices across platforms
- Calculate profit margins after fees and shipping
- Identify flip-worthy opportunities (20%+ margin after costs)
- Factor in platform fees, shipping costs, and taxes

**Fee Structure Reference:**

- Amazon: ~15% referral fee
- eBay: ~13% final value fee + listing fees
- Walmart: ~8-15% referral fee

**Example Request:**
"Find Nintendo Switch bundles where eBay price is 20%+ higher than Amazon, accounting for all fees and shipping costs."

### 3. Historical Price Tracking

**Price History:**

- Track price changes over time (30, 60, 90 days)
- Identify seasonal pricing patterns
- Detect price manipulation or flash sales
- Export historical data for analysis

**Example Request:**
"Show me the price history for AirPods Pro 2 over the last 60 days. Identify the best buying window."

### 4. Automated Alerts

**Alert Configuration:**

- Price drop alerts (below threshold)
- Arbitrage opportunity alerts (margin threshold)
- Competitor price alerts (when competitor lowers price)
- Bulk product monitoring

**Example Request:**
"Set up alerts for all Sony TV models. Alert me if any model drops below $400 or has 25%+ arbitrage margin."

## Quick Start

### Track a Single Product

```python
# Use scripts/track_product.py
python3 scripts/track_product.py \
  --product "Apple iPhone 15 Pro 256GB" \
  --platforms amazon,ebay \
  --alert-below 800 \
  --alert-margin 0.20
```

### Bulk Monitor Products from CSV

```python
# Use scripts/bulk_monitor.py
python3 scripts/bulk_monitor.py \
  --csv products.csv \
  --margin-threshold 0.25 \
  --alert-frequency daily
```

### Price Comparison Report

```python
# Use scripts/compare_prices.py
python3 scripts/compare_prices.py \
  --keyword "Sony WH-1000XM5" \
  --platforms amazon,ebay,walmart,bestbuy \
  --report markdown
```

## Workflow

### Arbitrage Opportunity Discovery

1. **Search** for products in high-demand categories (electronics, gaming, home goods)
2. **Compare** prices across all platforms using `compare_prices.py`
3. **Calculate** net profit after fees/shipping/taxes
4. **Filter** opportunities with 20%+ margin
5. **Verify** product condition and seller reliability
6. **Execute** or set monitoring for price drops

### Price Drop Monitoring

1. **Identify** target products (wishlist, seasonally discounted items)
2. **Set** alert thresholds using `track_product.py`
3. **Monitor** historical patterns to predict optimal buy windows
4. **Act** when price drops below threshold
5. **Repeat** for seasonal shopping events (Prime Day, Black Friday)

## Scripts

### `track_product.py`

Track a single product across platforms with configurable alerts.

**Parameters:**

- `--product`: Product name/keyword
- `--platforms`: Comma-separated platforms (amazon,ebay,walmart,bestbuy)
- `--alert-below`: Alert when price drops below this amount
- `--alert-margin`: Alert when arbitrage margin exceeds this fraction (e.g., 0.20 = 20%)
- `--frequency`: Check frequency (hourly,daily,weekly)
- `--output`: Output format (json,csv,markdown)

**Example:**

```bash
python3 scripts/track_product.py \
  --product "Samsung Galaxy S24 Ultra 256GB" \
  --platforms amazon,ebay,walmart \
  --alert-below 900 \
  --alert-margin 0.25 \
  --frequency daily \
  --output markdown
```

### `compare_prices.py`

Compare prices for a product across all platforms.

**Parameters:**

- `--keyword`: Product search keyword
- `--platforms`: Comma-separated platforms (default: all)
- `--report`: Report format (markdown,json,csv)
- `--sort-by`: Sort by price, margin, or rating
- `--min-rating`: Minimum seller rating

**Example:**

```bash
python3 scripts/compare_prices.py \
  --keyword "PlayStation 5 Slim" \
  --platforms amazon,ebay,walmart,bestbuy \
  --report markdown \
  --sort-by margin \
  --min-rating 4.5
```

### `bulk_monitor.py`

Monitor multiple products from a CSV file.

**CSV Format:**

```csv
product,platforms,alert_below,alert_margin
"Apple MacBook Air M3 256GB",amazon,ebay,walmart,899,0.20
"Sony PlayStation 5",amazon,ebay,399,0.25
"Dyson V15 Detect",amazon,walmart,bestbuy,500,0.18
```

**Parameters:**

- `--csv`: Path to CSV file
- `--margin-threshold`: Minimum margin to report
- `--alert-frequency`: Frequency of alerts
- `--output`: Output file for alerts

**Example:**

```bash
python3 scripts/bulk_monitor.py \
  --csv products.csv \
  --margin-threshold 0.20 \
  --alert-frequency daily \
  --output alerts.txt
```

### `price_history.py`

Retrieve and analyze historical price data.

**Parameters:**

- `--product`: Product name/keyword
- `--days`: Number of days of history (default: 30)
- `--platform`: Specific platform (optional)
- `--output`: Output format (markdown,json,csv)
- `--trend-analysis`: Include trend analysis and predictions

**Example:**

```bash
python3 scripts/price_history.py \
  --product "AirPods Pro 2" \
  --days 60 \
  --trend-analysis \
  --output markdown
```

## Best Practices

### Arbitrage Profit Calculation

Always calculate net profit:

```
Net Profit = (Sell Price - Buy Price)
            - Platform Fees
            - Shipping Costs
            - Payment Processing Fees
            - Taxes
```

**Recommended minimum margin:** 20-25% to account for:

- Unexpected shipping delays
- Returns/refunds
- Market price fluctuations
- Time value of money

### Risk Mitigation

1. **Verify seller reliability** - Check ratings and reviews
2. **Check product condition** - New, refurbished, or used
3. **Factor in return windows** - Platforms have different policies
4. **Monitor price stability** - Volatile prices increase risk
5. **Stay within limits** - Don't over-leverage on single opportunities

### Seasonal Patterns

- **Q4 (Oct-Dec):** Holiday sales, best for electronics
- **January:** Post-holiday clearance
- **Prime Day (July):** Amazon-specific deals
- **Black Friday/Cyber Monday:** Cross-platform discounts
- **Back-to-School (Aug-Sep):** Laptops, tablets, accessories

## Automation Integration

### Set Up Cron Jobs for Automated Monitoring

```bash
# Check prices every 6 hours
0 */6 * * * /path/to/price-tracker/scripts/bulk_monitor.py --csv products.csv --output alerts.txt

# Daily arbitrage scan
0 9 * * * /path/to/price-tracker/scripts/compare_prices.py --keyword "high-demand-products" --report markdown >> /path/to/reports.txt
```

### Integration with Notifications

Combine with notification systems (email, Discord, Telegram) to receive real-time alerts when opportunities are detected.

## Limitations

- Platform API rate limits may affect search frequency
- Real-time prices may have slight delays
- Some platforms restrict scraping (comply with ToS)
- Seller inventory changes rapidly

---

**Revenue first. Track smart. Flip fast.**
