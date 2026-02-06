---
name: clawver-store-analytics
description: Monitor Clawver store performance. Query revenue, top products, conversion rates, growth trends. Use when asked about sales data, store metrics, performance reports, or business analytics.
version: 1.0.0
homepage: https://clawver.store
metadata:
  {
    'openclaw':
      {
        'emoji': '📊',
        'homepage': 'https://clawver.store',
        'requires': { 'env': ['CLAW_API_KEY'] },
        'primaryEnv': 'CLAW_API_KEY',
      },
  }
---

# Clawver Store Analytics

Track your Clawver store performance with analytics on revenue, products, and customer behavior.

## Prerequisites

- `CLAW_API_KEY` environment variable
- Active store with at least one product

## Store Overview

### Get Store Analytics

```bash
curl https://api.clawver.store/v1/stores/me/analytics \
  -H "Authorization: Bearer $CLAW_API_KEY"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "analytics": {
      "summary": {
        "totalRevenue": 125000,
        "totalOrders": 47,
        "averageOrderValue": 2659,
        "netRevenue": 122500,
        "platformFees": 2500,
        "storeViews": 1500,
        "productViews": 3200,
        "conversionRate": 3.13
      },
      "topProducts": [
        {
          "productId": "prod_abc",
          "productName": "AI Art Pack Vol. 1",
          "revenue": 46953,
          "units": 47,
          "views": 850,
          "conversionRate": 5.53,
          "averageRating": 4.8,
          "reviewsCount": 12
        }
      ],
      "recentOrdersCount": 47
    }
  }
}
```

### Query by Period

Use the `period` query parameter to filter analytics by time range:

```bash
# Last 7 days
curl "https://api.clawver.store/v1/stores/me/analytics?period=7d" \
  -H "Authorization: Bearer $CLAW_API_KEY"

# Last 30 days (default)
curl "https://api.clawver.store/v1/stores/me/analytics?period=30d" \
  -H "Authorization: Bearer $CLAW_API_KEY"

# Last 90 days
curl "https://api.clawver.store/v1/stores/me/analytics?period=90d" \
  -H "Authorization: Bearer $CLAW_API_KEY"

# All time
curl "https://api.clawver.store/v1/stores/me/analytics?period=all" \
  -H "Authorization: Bearer $CLAW_API_KEY"
```

**Allowed values:** `7d`, `30d`, `90d`, `all`

## Product Analytics

### Get Per-Product Stats

```bash
curl "https://api.clawver.store/v1/stores/me/products/{productId}/analytics?period=30d" \
  -H "Authorization: Bearer $CLAW_API_KEY"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "analytics": {
      "productId": "prod_abc123",
      "productName": "AI Art Pack Vol. 1",
      "revenue": 46953,
      "units": 47,
      "views": 1250,
      "conversionRate": 3.76,
      "averageRating": 4.8,
      "reviewsCount": 12
    }
  }
}
```

## Key Metrics

### Summary Fields

| Field               | Description                                 |
| ------------------- | ------------------------------------------- |
| `totalRevenue`      | Gross revenue in cents (after refunds)      |
| `totalOrders`       | Number of paid orders                       |
| `averageOrderValue` | Average order size in cents                 |
| `netRevenue`        | Revenue minus platform fees                 |
| `platformFees`      | Total platform fees (2% of subtotal)        |
| `storeViews`        | Store page views                            |
| `productViews`      | Total product page views                    |
| `conversionRate`    | Orders / store views × 100 (capped at 100%) |

### Top Products Fields

| Field            | Description                  |
| ---------------- | ---------------------------- |
| `productId`      | Product identifier           |
| `productName`    | Product name                 |
| `revenue`        | Net revenue in cents         |
| `units`          | Units sold                   |
| `views`          | Product page views           |
| `conversionRate` | Orders / product views × 100 |
| `averageRating`  | Mean star rating (1-5)       |
| `reviewsCount`   | Number of reviews            |

## Order Analysis

### Orders by Status

```bash
# Paid orders
curl "https://api.clawver.store/v1/orders?status=paid" \
  -H "Authorization: Bearer $CLAW_API_KEY"

# Completed orders
curl "https://api.clawver.store/v1/orders?status=delivered" \
  -H "Authorization: Bearer $CLAW_API_KEY"
```

### Calculate Refund Impact

Refund amounts are subtracted from revenue in analytics. Check individual orders for refund details:

```python
response = api.get("/v1/orders")
orders = response["data"]["orders"]

total_refunded = sum(
    sum(r["amountInCents"] for r in order.get("refunds", []))
    for order in orders
)
print(f"Total refunded: ${total_refunded/100:.2f}")
```

## Review Analysis

### Get All Reviews

```bash
curl https://api.clawver.store/v1/stores/me/reviews \
  -H "Authorization: Bearer $CLAW_API_KEY"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "rev_123",
        "orderId": "ord_456",
        "productId": "prod_789",
        "rating": 5,
        "body": "Amazing quality, exactly as described!",
        "createdAt": "2024-01-15T10:30:00Z",
        "response": null
      }
    ]
  }
}
```

### Rating Distribution

Calculate star distribution from reviews:

```python
response = api.get("/v1/stores/me/reviews")
reviews = response["data"]["reviews"]

distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
for review in reviews:
    distribution[review["rating"]] += 1

total = len(reviews)
for rating, count in distribution.items():
    pct = (count / total * 100) if total > 0 else 0
    print(f"{rating} stars: {count} ({pct:.1f}%)")
```

## Reporting Patterns

### Revenue Summary

```python
response = api.get("/v1/stores/me/analytics?period=30d")
analytics = response["data"]["analytics"]
summary = analytics["summary"]

print(f"Revenue (30d): ${summary['totalRevenue']/100:.2f}")
print(f"Platform fees: ${summary['platformFees']/100:.2f}")
print(f"Net revenue: ${summary['netRevenue']/100:.2f}")
print(f"Orders: {summary['totalOrders']}")
print(f"Avg order: ${summary['averageOrderValue']/100:.2f}")
print(f"Conversion rate: {summary['conversionRate']:.2f}%")
```

### Weekly Performance Report

```python
# Get analytics for different periods
week = api.get("/v1/stores/me/analytics?period=7d")
month = api.get("/v1/stores/me/analytics?period=30d")

week_revenue = week["data"]["analytics"]["summary"]["totalRevenue"]
month_revenue = month["data"]["analytics"]["summary"]["totalRevenue"]

# Week's share of month
week_share = (week_revenue / month_revenue * 100) if month_revenue > 0 else 0
print(f"This week: ${week_revenue/100:.2f} ({week_share:.1f}% of month)")
```

### Top Product Analysis

```python
response = api.get("/v1/stores/me/analytics?period=30d")
top_products = response["data"]["analytics"]["topProducts"]

for i, product in enumerate(top_products, 1):
    print(f"{i}. {product['productName']}")
    print(f"   Revenue: ${product['revenue']/100:.2f}")
    print(f"   Units: {product['units']}")
    print(f"   Views: {product['views']}")
    print(f"   Conversion: {product['conversionRate']:.2f}%")
    if product.get("averageRating"):
        print(f"   Rating: {product['averageRating']:.1f} ({product['reviewsCount']} reviews)")
```

## Actionable Insights

### Low Conversion Products

If `conversionRate < 2`:

- Improve product images
- Rewrite description
- Adjust pricing
- Check competitor offerings

### High Views, Low Sales

If `views > 100` and `units < 5`:

- Price may be too high
- Description unclear
- Missing social proof (reviews)

### Declining Revenue

Compare periods:

```python
week = api.get("/v1/stores/me/analytics?period=7d")["data"]["analytics"]["summary"]
month = api.get("/v1/stores/me/analytics?period=30d")["data"]["analytics"]["summary"]

expected_week_share = 7 / 30  # ~23%
actual_week_share = week["totalRevenue"] / month["totalRevenue"] if month["totalRevenue"] > 0 else 0

if actual_week_share < expected_week_share * 0.8:
    print("Warning: This week's revenue is below average")
```
