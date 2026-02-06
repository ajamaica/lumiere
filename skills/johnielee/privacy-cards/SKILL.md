---
name: privacy-cards
description: 'Create and manage Privacy.com virtual cards. Use for generating single-use cards, merchant-locked cards, listing cards, setting spending limits, pausing/closing cards, and viewing transactions via the Privacy.com API.'
---

# Privacy Cards

Manage virtual cards via the Privacy.com API.

## Setup

### Getting API Access

1. Sign up for a [Privacy.com](https://privacy.com) account
2. Email **support@privacy.com** to request API access
3. Once approved, you'll receive your API key

### Configuration

```bash
export PRIVACY_API_KEY="your-api-key"
```

**Environments:**

- Production: `https://api.privacy.com/v1`
- Sandbox: `https://sandbox.privacy.com/v1`

All requests: `Authorization: api-key $PRIVACY_API_KEY`

---

## Create a Card

```bash
curl -s -X POST "https://api.privacy.com/v1/cards" \
  -H "Authorization: api-key $PRIVACY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "SINGLE_USE",
    "memo": "One-time purchase",
    "spend_limit": 5000,
    "spend_limit_duration": "TRANSACTION"
  }' | jq
```

### Card Types

| Type              | Behavior                                 |
| ----------------- | ---------------------------------------- |
| `SINGLE_USE`      | Closes after first transaction           |
| `MERCHANT_LOCKED` | Locks to first merchant, reusable there  |
| `UNLOCKED`        | Works anywhere (requires issuing access) |

### Create Parameters

| Parameter              | Required | Description                             |
| ---------------------- | -------- | --------------------------------------- |
| `type`                 | Yes      | SINGLE_USE, MERCHANT_LOCKED, UNLOCKED   |
| `memo`                 | No       | Label/description                       |
| `spend_limit`          | No       | Limit in cents                          |
| `spend_limit_duration` | No       | TRANSACTION, MONTHLY, ANNUALLY, FOREVER |
| `state`                | No       | OPEN (default) or PAUSED                |
| `funding_token`        | No       | Specific funding source UUID            |

### Response

```json
{
  "token": "card-uuid",
  "type": "SINGLE_USE",
  "state": "OPEN",
  "memo": "One-time purchase",
  "last_four": "1234",
  "pan": "4111111111111234",
  "cvv": "123",
  "exp_month": "12",
  "exp_year": "2027",
  "spend_limit": 5000,
  "spend_limit_duration": "TRANSACTION",
  "created": "2024-01-15T10:30:00Z"
}
```

> **Note:** `pan`, `cvv`, `exp_month`, `exp_year` require enterprise access in production. Always available in sandbox.

---

## Lookup Transactions

### All transactions for a card

```bash
curl -s "https://api.privacy.com/v1/transactions?card_token={card_token}" \
  -H "Authorization: api-key $PRIVACY_API_KEY" | jq
```

### Filter by date range

```bash
curl -s "https://api.privacy.com/v1/transactions?card_token={card_token}&begin=2024-01-01&end=2024-01-31" \
  -H "Authorization: api-key $PRIVACY_API_KEY" | jq
```

### Filter by result

```bash
# Only approved
curl -s "https://api.privacy.com/v1/transactions?result=APPROVED" \
  -H "Authorization: api-key $PRIVACY_API_KEY" | jq

# Only declined
curl -s "https://api.privacy.com/v1/transactions?result=DECLINED" \
  -H "Authorization: api-key $PRIVACY_API_KEY" | jq
```

### Query Parameters

| Parameter    | Description                            |
| ------------ | -------------------------------------- |
| `card_token` | Filter by card UUID                    |
| `result`     | APPROVED or DECLINED                   |
| `begin`      | On or after date (YYYY-MM-DD)          |
| `end`        | Before date (YYYY-MM-DD)               |
| `page`       | Page number (default: 1)               |
| `page_size`  | Results per page (1-1000, default: 50) |

### Transaction Response

```json
{
  "token": "txn-uuid",
  "card_token": "card-uuid",
  "amount": -2500,
  "status": "SETTLED",
  "result": "APPROVED",
  "merchant": {
    "descriptor": "NETFLIX.COM",
    "mcc": "4899",
    "city": "LOS GATOS",
    "state": "CA",
    "country": "USA"
  },
  "created": "2024-01-15T14:22:00Z"
}
```

### Transaction Statuses

`PENDING` → `SETTLING` → `SETTLED`

Also: `VOIDED`, `BOUNCED`, `DECLINED`

---

## Quick Reference

### List all cards

```bash
curl -s "https://api.privacy.com/v1/cards" \
  -H "Authorization: api-key $PRIVACY_API_KEY" | jq
```

### Get single card

```bash
curl -s "https://api.privacy.com/v1/cards/{card_token}" \
  -H "Authorization: api-key $PRIVACY_API_KEY" | jq
```

### Pause a card

```bash
curl -s -X PATCH "https://api.privacy.com/v1/cards/{card_token}" \
  -H "Authorization: api-key $PRIVACY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"state": "PAUSED"}' | jq
```

### Close a card (permanent)

```bash
curl -s -X PATCH "https://api.privacy.com/v1/cards/{card_token}" \
  -H "Authorization: api-key $PRIVACY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"state": "CLOSED"}' | jq
```

### Update spend limit

```bash
curl -s -X PATCH "https://api.privacy.com/v1/cards/{card_token}" \
  -H "Authorization: api-key $PRIVACY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"spend_limit": 10000, "spend_limit_duration": "MONTHLY"}' | jq
```

---

## Common Decline Reasons

| Code                     | Meaning                        |
| ------------------------ | ------------------------------ |
| `CARD_PAUSED`            | Card is paused                 |
| `CARD_CLOSED`            | Card is closed                 |
| `SINGLE_USE_RECHARGED`   | Single-use already used        |
| `UNAUTHORIZED_MERCHANT`  | Wrong merchant for locked card |
| `USER_TRANSACTION_LIMIT` | Spend limit exceeded           |
| `INSUFFICIENT_FUNDS`     | Funding source issue           |

See [references/api.md](references/api.md) for complete field documentation.
