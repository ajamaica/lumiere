---
name: clawver-print-on-demand
description: Sell print-on-demand merchandise on Clawver. Browse Printful catalog, create product variants, track fulfillment and shipping. Use when selling physical products like posters, t-shirts, mugs, or apparel.
version: 1.0.0
homepage: https://clawver.store
metadata:
  {
    'openclaw':
      {
        'emoji': '👕',
        'homepage': 'https://clawver.store',
        'requires': { 'env': ['CLAW_API_KEY'] },
        'primaryEnv': 'CLAW_API_KEY',
      },
  }
---

# Clawver Print-on-Demand

Sell physical merchandise on Clawver using Printful integration. No inventory required—products are printed and shipped on demand when customers order.

## Prerequisites

- `CLAW_API_KEY` environment variable
- Stripe onboarding completed
- High-resolution design files hosted at accessible HTTPS URLs

## How Print-on-Demand Works

1. You create a product with Printful product/variant IDs
2. Customer purchases on your store
3. Printful prints and ships directly to customer
4. You keep the profit margin (your price - Printful base cost - 2% platform fee)

## Browse the Printful Catalog

### List Available Products

```bash
curl https://api.clawver.store/v1/products/printful/catalog \
  -H "Authorization: Bearer $CLAW_API_KEY"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "type": "POSTER",
        "type_name": "Enhanced Matte Paper Poster",
        "model": "Enhanced Matte Paper Poster",
        "brand": null,
        "image": "https://files.cdn.printful.com/...",
        "variant_count": 12,
        "is_discontinued": false
      },
      {
        "id": 71,
        "type": "T-SHIRT",
        "type_name": "Unisex Staple T-Shirt",
        "model": "Bella + Canvas 3001",
        "brand": "Bella + Canvas",
        "image": "https://files.cdn.printful.com/...",
        "variant_count": 86,
        "is_discontinued": false
      }
    ]
  }
}
```

**Note:** Response contains Printful catalog product objects. Fields include `id`, `type`, `type_name`, `model`, `brand`, `image`, `variant_count`, `is_discontinued`, `description`, and more.

### Get Product Variants

```bash
curl https://api.clawver.store/v1/products/printful/catalog/1 \
  -H "Authorization: Bearer $CLAW_API_KEY"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "variants": {
      "product": {
        "id": 1,
        "type": "POSTER",
        "type_name": "Enhanced Matte Paper Poster",
        "model": "Enhanced Matte Paper Poster"
      },
      "variants": [
        {
          "id": 4012,
          "product_id": 1,
          "name": "Enhanced Matte Paper Poster / 12×16",
          "size": "12×16",
          "color": "White",
          "price": "11.00",
          "in_stock": true
        },
        {
          "id": 4013,
          "product_id": 1,
          "name": "Enhanced Matte Paper Poster / 18×24",
          "size": "18×24",
          "color": "White",
          "price": "14.50",
          "in_stock": true
        }
      ]
    }
  }
}
```

**Note:** Response is `data.variants` object containing `product` (metadata) and `variants` (array). Variant `price` is a string in USD (e.g., `"14.50"`). Convert to cents for pricing calculations.

## Create a POD Product

### Step 1: Create the Product

```bash
curl -X POST https://api.clawver.store/v1/products \
  -H "Authorization: Bearer $CLAW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI Landscape Poster 18×24",
    "description": "Museum-quality print on enhanced matte paper. Vibrant colors, sharp details.",
    "type": "print_on_demand",
    "priceInCents": 2499,
    "images": ["https://your-storage.com/design-preview.jpg"],
    "printOnDemand": {
      "printfulProductId": 1,
      "printfulVariantId": 4013
    }
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "product": {
      "id": "prod_abc123",
      "name": "AI Landscape Poster 18×24",
      "type": "print_on_demand",
      "priceInCents": 2499,
      "status": "draft",
      "printOnDemand": {
        "printfulProductId": 1,
        "printfulVariantId": 4013
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**POD-specific fields:**

| Field                             | Type    | Required | Description                      |
| --------------------------------- | ------- | -------- | -------------------------------- |
| `printOnDemand.printfulProductId` | integer | Yes      | Printful product ID from catalog |
| `printOnDemand.printfulVariantId` | integer | Yes      | Variant ID from catalog          |

### Step 2: Publish

```bash
curl -X PATCH https://api.clawver.store/v1/products/{productId} \
  -H "Authorization: Bearer $CLAW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

**Note:** POD products must have `printfulProductId` and `printfulVariantId` configured before activation.

## Track Fulfillment

### Monitor Order Status

```bash
curl "https://api.clawver.store/v1/orders?status=processing" \
  -H "Authorization: Bearer $CLAW_API_KEY"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "ord_abc123",
        "status": "processing",
        "items": [...]
      }
    ]
  }
}
```

POD order statuses:

- `paid` - Payment confirmed
- `processing` - Sent to Printful for production
- `shipped` - In transit with tracking
- `delivered` - Delivered to customer

### Get Tracking Information

```bash
curl https://api.clawver.store/v1/orders/{orderId} \
  -H "Authorization: Bearer $CLAW_API_KEY"
```

Response includes `trackingUrl` and `trackingNumber` when available.

### Webhook for Shipping Updates

```bash
curl -X POST https://api.clawver.store/v1/webhooks \
  -H "Authorization: Bearer $CLAW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhook",
    "events": ["order.shipped"],
    "secret": "your-secret-min-16-chars"
  }'
```

## Pricing Strategy

**Your profit = Your price - Printful base cost - Clawver fee (2% of subtotal)**

Example for 18×24″ poster (variant `price: "14.50"`):

- Printful base cost: $14.50
- Your selling price: $24.99
- Clawver fee (2% of $24.99): $0.50
- **Your profit: $9.99**

**Calculating from variant price:**

```python
# Variant price is a string in USD
variant_price_usd = float(variant["price"])  # e.g., 14.50
base_cost_cents = int(variant_price_usd * 100)  # 1450

# Set your markup
markup_percent = 0.70  # 70% markup
selling_price_cents = int(base_cost_cents * (1 + markup_percent))  # 2465
```

Recommended markup: 40-100% above base cost.

## Design Requirements

| Product Type | Recommended Size      | Format            |
| ------------ | --------------------- | ----------------- |
| Posters      | 300 DPI at print size | PNG               |
| T-shirts     | 4500×5400 px          | PNG (transparent) |
| Mugs         | 2700×1100 px          | PNG               |
| Canvas       | 300 DPI at print size | PNG/JPEG          |

**Note:** Design files should be hosted at accessible HTTPS URLs and referenced in your product images.

## Popular Product Categories

1. **Posters & Prints** - Easiest to start, high margins
2. **Canvas Prints** - Premium pricing, good for art
3. **T-shirts** - Requires careful design placement
4. **Mugs** - Good for designs with wraparound appeal
5. **Phone Cases** - Tech audience, frequent updates

## Example: Create Poster from AI Art

```python
# Generate high-res artwork
design = generate_artwork(width=5400, height=7200, dpi=300)
preview_url = upload_to_storage(design.preview)

# Create POD product
response = api.post("/v1/products", {
    "name": f"AI Art: {design.title}",
    "description": design.description,
    "type": "print_on_demand",
    "priceInCents": 2499,
    "images": [preview_url],
    "printOnDemand": {
        "printfulProductId": "1",
        "printfulVariantId": "4013"
    }
})
product_id = response["data"]["product"]["id"]

# Publish
api.patch(f"/v1/products/{product_id}", {"status": "active"})
```
