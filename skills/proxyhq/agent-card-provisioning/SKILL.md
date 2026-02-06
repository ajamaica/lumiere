---
name: agent-card-provisioning
description: Provision virtual payment cards for AI agents on-demand. Create single-use or limited cards with spending controls, merchant restrictions, and automatic expiration. Cards are issued instantly when policy allows.
---

# Agent Card Provisioning

Provision virtual payment cards for AI agents with built-in spending controls.

## How It Works

1. **Agent requests card** via payment intent
2. **Policy evaluates** the request (amount, merchant, limits)
3. **Card issued** if within policy OR **approval required** if over threshold
4. **Agent uses card** for the specific purchase
5. **Transaction tracked** and matched to intent

## Creating a Card (Intent-Based)

Cards are provisioned through payment intents, not created directly:

```
proxy.intents.create
├── merchant: "Amazon"
├── amount: 49.99
├── description: "Office supplies"
└── category: "office_supplies" (optional)
```

If approved (auto or manual), a card is issued:

```
Response:
├── id: "int_abc123"
├── status: "pending" or "card_issued"
├── cardId: "card_xyz789"
└── message: "Card issued successfully"
```

## Getting Card Details

### Masked (for display)

```
proxy.cards.get { cardId: "card_xyz789" }
→ { last4: "4242", brand: "Visa", status: "active" }
```

### Full Details (for payment)

```
proxy.cards.get_sensitive { cardId: "card_xyz789" }
→ {
    pan: "4532015112830366",
    cvv: "847",
    expiryMonth: "03",
    expiryYear: "2027",
    billingAddress: {
      line1: "123 Main St",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      country: "US"
    }
  }
```

## Card Controls (via Policy)

Policies define what cards can be used for:

| Control                    | Description                             |
| -------------------------- | --------------------------------------- |
| **Spending limit**         | Max per transaction                     |
| **Daily/monthly limits**   | Cumulative caps                         |
| **Merchant categories**    | Allowed/blocked MCCs                    |
| **Auto-approve threshold** | Below = instant, above = human approval |
| **Expiration**             | Card validity period                    |

## Card Lifecycle

```
Intent Created
      │
      ▼
┌─────────────┐
│   Policy    │
│  Evaluation │
└──────┬──────┘
       │
  ┌────┴────┐
  ▼         ▼
Auto     Needs
Approve  Approval
  │         │
  ▼         ▼
Card     [Human]
Issued      │
  │         │
  ◀─────────┘
  │
  ▼
Card Used
  │
  ▼
Transaction
 Matched
  │
  ▼
Card
Expired
```

## Best Practices

1. **One intent per purchase** - Creates audit trail
2. **Descriptive intent names** - Helps reconciliation
3. **Set reasonable policies** - Balance autonomy vs control
4. **Monitor transactions** - Use `proxy.transactions.list_for_card`

## Security

- Cards are single-purpose (one intent = one card)
- Unused cards auto-expire
- Full PAN only via `get_sensitive` (requires auth)
- All transactions logged and reconciled
