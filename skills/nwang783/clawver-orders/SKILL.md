---
name: clawver-orders
description: Manage Clawver orders. List orders, track status, process refunds, generate download links. Use when asked about customer orders, fulfillment, refunds, or order history.
version: 1.0.0
homepage: https://clawver.store
metadata:
  {
    'openclaw':
      {
        'emoji': '📦',
        'homepage': 'https://clawver.store',
        'requires': { 'env': ['CLAW_API_KEY'] },
        'primaryEnv': 'CLAW_API_KEY',
      },
  }
---

# Clawver Orders

Manage orders on your Clawver store—view order history, track fulfillment, process refunds, and generate download links.

## Prerequisites

- `CLAW_API_KEY` environment variable
- Active store with orders

## List Orders

### Get All Orders

```bash
curl https://api.clawver.store/v1/orders \
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
        "status": "paid",
        "totalInCents": 2499,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "cursor": "next_page_id",
      "hasMore": true,
      "limit": 20
    }
  }
}
```

### Filter by Status

```bash
# Paid orders
curl "https://api.clawver.store/v1/orders?status=paid" \
  -H "Authorization: Bearer $CLAW_API_KEY"

# In-progress POD orders
curl "https://api.clawver.store/v1/orders?status=processing" \
  -H "Authorization: Bearer $CLAW_API_KEY"

# Shipped orders
curl "https://api.clawver.store/v1/orders?status=shipped" \
  -H "Authorization: Bearer $CLAW_API_KEY"

# Delivered orders
curl "https://api.clawver.store/v1/orders?status=delivered" \
  -H "Authorization: Bearer $CLAW_API_KEY"
```

**Order statuses:**

| Status       | Description                    |
| ------------ | ------------------------------ |
| `pending`    | Order created, payment pending |
| `paid`       | Payment confirmed              |
| `processing` | Being fulfilled                |
| `shipped`    | In transit (POD only)          |
| `delivered`  | Completed                      |
| `cancelled`  | Cancelled                      |
| `refunded`   | Fully refunded                 |

### Pagination

```bash
curl "https://api.clawver.store/v1/orders?limit=20&cursor=abc123" \
  -H "Authorization: Bearer $CLAW_API_KEY"
```

## Get Order Details

```bash
curl https://api.clawver.store/v1/orders/{orderId} \
  -H "Authorization: Bearer $CLAW_API_KEY"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "ord_abc123",
      "status": "paid",
      "subtotalInCents": 2499,
      "platformFeeInCents": 50,
      "totalInCents": 2499,
      "createdAt": "2024-01-15T10:30:00Z",
      "paidAt": "2024-01-15T10:31:00Z",
      "customerEmail": "customer@example.com",
      "items": [
        {
          "id": "item_xyz",
          "productId": "prod_123",
          "productName": "AI Art Pack Vol. 1",
          "productType": "digital",
          "priceInCents": 999,
          "quantity": 1,
          "totalInCents": 999
        }
      ],
      "shippingAddress": null,
      "trackingUrl": null,
      "refunds": []
    }
  }
}
```

## Generate Download Links

For digital products, generate a time-limited download URL:

```bash
curl "https://api.clawver.store/v1/orders/{orderId}/download/{itemId}" \
  -H "Authorization: Bearer $CLAW_API_KEY"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://storage.clawver.store/downloads/signed-url...",
    "expiresInMinutes": 60,
    "fileName": "AI_Art_Pack_Vol_1.zip",
    "fileSizeBytes": 52428800
  }
}
```

Use this when customers report download issues or request a new link.

## Process Refunds

### Full Refund

```bash
curl -X POST https://api.clawver.store/v1/orders/{orderId}/refund \
  -H "Authorization: Bearer $CLAW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amountInCents": 2499,
    "reason": "Customer requested refund"
  }'
```

### Partial Refund

```bash
curl -X POST https://api.clawver.store/v1/orders/{orderId}/refund \
  -H "Authorization: Bearer $CLAW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amountInCents": 500,
    "reason": "Partial refund for missing item"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "ord_abc123",
      "status": "refunded",
      "refunds": [
        {
          "id": "ref_xyz",
          "amountInCents": 500,
          "reason": "Partial refund for missing item",
          "stripeRefundId": "re_xxx",
          "createdAt": "2024-01-15T11:00:00Z"
        }
      ]
    }
  }
}
```

**Notes:**

- `amountInCents` is required and must be a positive integer
- `reason` is required
- `amountInCents` cannot exceed remaining refundable amount
- Refunds process through Stripe (1-5 business days to customer)
- Order must have `status` of `paid` or `processing`

## POD Order Tracking

For print-on-demand orders, tracking info becomes available after shipping:

```bash
curl https://api.clawver.store/v1/orders/{orderId} \
  -H "Authorization: Bearer $CLAW_API_KEY"
```

Check `trackingUrl`, `trackingNumber`, and `carrier` fields in response.

### Webhook for Shipping Updates

```bash
curl -X POST https://api.clawver.store/v1/webhooks \
  -H "Authorization: Bearer $CLAW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhook",
    "events": ["order.shipped", "order.fulfilled"],
    "secret": "your-secret-min-16-chars"
  }'
```

## Order Webhooks

Receive real-time notifications:

```bash
curl -X POST https://api.clawver.store/v1/webhooks \
  -H "Authorization: Bearer $CLAW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhook",
    "events": ["order.created", "order.paid", "order.refunded"],
    "secret": "your-webhook-secret-16chars"
  }'
```

**Webhook payload example:**

```json
{
  "event": "order.paid",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "orderId": "ord_abc123",
    "totalInCents": 2499,
    "items": [...]
  }
}
```

**Signature format:**

```
X-Claw-Signature: sha256=abc123...
```

**Verification (Node.js):**

```javascript
const crypto = require('crypto')

function verifyWebhook(body, signature, secret) {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
```

## Common Workflows

### Daily Order Check

```python
# Get paid orders
response = api.get("/v1/orders?status=paid")
orders = response["data"]["orders"]
print(f"New orders: {len(orders)}")

for order in orders:
    print(f"  - {order['id']}: ${order['totalInCents']/100:.2f}")
```

### Handle Refund Request

```python
def process_refund(order_id, amount_cents, reason):
    # Get order details
    response = api.get(f"/v1/orders/{order_id}")
    order = response["data"]["order"]

    # Check if refundable
    if order["status"] not in ["paid", "processing"]:
        return "Order cannot be refunded"

    # Process refund
    result = api.post(f"/v1/orders/{order_id}/refund", {
        "amountInCents": amount_cents,
        "reason": reason
    })

    return f"Refunded ${amount_cents/100:.2f}"
```

### Resend Download Link

```python
def resend_download(order_id, item_id):
    # Generate new download link
    response = api.get(f"/v1/orders/{order_id}/download/{item_id}")

    return response["data"]["downloadUrl"]
```

## Order Lifecycle

```
pending → paid → processing → shipped → delivered
            ↓
        cancelled / refunded
```

**Digital products:** `paid` → `delivered` (instant fulfillment)
**POD products:** `paid` → `processing` → `shipped` → `delivered`
