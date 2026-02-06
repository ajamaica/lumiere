# E-Commerce Integration Workflow

Build an e-commerce site with Stripe payments using the HeyBoss shopping service.

## Quick Start (Recommended)

The fastest way to get started is using the full-stack template:

```bash
# 1. Connect Stripe (one-time setup)
node ~/.claude/skills/skillboss/scripts/stripe-connect.js

# 2. Copy the template
cp -r ~/.claude/skills/skillboss/templates/worker-ecommerce ./my-store
cd my-store

# 3. Install dependencies and build
npm install
npm run build

# 4. Deploy (creates .skillboss with project ID)
node ~/.claude/skills/skillboss/scripts/serve-build.js publish-worker .

# 5. Create products (auto-detects project ID from .skillboss)
node ~/.claude/skills/skillboss/scripts/product-manager.js create \
  --name "Premium Plan" \
  --price 2999

# 6. Visit your store!
```

## Architecture Overview

SkillBoss uses a **centralized shopping service** for payment processing:

```
┌─────────────────────┐      ┌───────────────────────────┐
│   Your Worker       │ ───▶ │  shopping.heybossai.com   │
│   (Frontend + API)  │      │  (Payment Processing)     │
└─────────────────────┘      └───────────────────────────┘
        │                              │
        │                              ▼
        │                    ┌───────────────────────────┐
        │                    │   Stripe (via Connect)    │
        ▼                    └───────────────────────────┘
┌─────────────────────┐
│  product-manager.js │
│  (Product CRUD)     │
└─────────────────────┘
```

**Why this pattern?**

- Stripe secret keys never leave HeyBoss infrastructure
- No Stripe SDK needed in your worker code
- Centralized product management via CLI
- Automatic webhook handling

## Step-by-Step Guide

### Step 1: Connect Stripe (One-Time Setup)

```bash
node ~/.claude/skills/skillboss/scripts/stripe-connect.js
```

This:

1. Opens your browser to Stripe's onboarding flow
2. Creates a Stripe Express account linked to your SkillBoss profile
3. Enables `charges_enabled` and `payouts_enabled`

Check status anytime:

```bash
node ~/.claude/skills/skillboss/scripts/stripe-connect.js --status
```

### Step 2: Create Products

Products are managed via the `product-manager.js` CLI:

```bash
# List all products
node ~/.claude/skills/skillboss/scripts/product-manager.js list \
  --project-id your-project-id

# Create a one-time purchase product
node ~/.claude/skills/skillboss/scripts/product-manager.js create \
  --project-id your-project-id \
  --name "Premium Plan" \
  --description "Lifetime access to premium features" \
  --price 4999 \
  --currency usd

# Create a subscription product
node ~/.claude/skills/skillboss/scripts/product-manager.js create \
  --project-id your-project-id \
  --name "Monthly Membership" \
  --price 999 \
  --billing-type recurring \
  --billing-period month

# Update a product
node ~/.claude/skills/skillboss/scripts/product-manager.js update <product-id> \
  --project-id your-project-id \
  --price 5999

# Delete a product
node ~/.claude/skills/skillboss/scripts/product-manager.js delete <product-id> \
  --project-id your-project-id
```

**Product fields:**

| Field           | Type   | Required | Description                                   |
| --------------- | ------ | -------- | --------------------------------------------- |
| `name`          | string | Yes      | Product name                                  |
| `description`   | string | No       | Product description                           |
| `price`         | number | Yes      | Price in cents (e.g., 2999 = $29.99)          |
| `currency`      | string | No       | Currency code (default: usd)                  |
| `billingType`   | string | No       | `one_time` or `recurring`                     |
| `billingPeriod` | string | No       | For recurring: `day`, `week`, `month`, `year` |
| `status`        | string | No       | `active` or `inactive`                        |

### Step 3: Create Your Worker

#### Option A: Use the Full-Stack Template (Recommended)

```bash
cp -r ~/.claude/skills/skillboss/templates/worker-ecommerce ./my-store
cd my-store
npm install
```

This includes:

- React frontend with product listing, checkout, success pages
- Hono backend with all required API routes
- Tailwind CSS styling
- Authentication (Google OAuth + Email OTP)

#### Option B: Add E-Commerce to Existing Project

Add these API routes to your Hono worker:

```typescript
import { createCheckoutSession, getProducts, getPurchaseDetail } from './lib/shopping-client'

// GET /api/products - List products
app.get('/api/products', async (c) => {
  const products = await getProducts(c.env.PROJECT_ID)
  return c.json(products)
})

// POST /api/create-checkout-session - Start checkout
app.post('/api/create-checkout-session', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Login required' }, 401)

  const { products, successRouter, cancelRouter } = await c.req.json()
  const origin = new URL(c.req.url).origin

  const result = await createCheckoutSession(c.env.PROJECT_ID, user.email, {
    products,
    successUrl: `${origin}${successRouter}`,
    cancelUrl: `${origin}${cancelRouter}`,
  })

  return c.json(result)
})

// GET /api/products/purchase-detail - Verify purchase
app.get('/api/products/purchase-detail', async (c) => {
  const sessionId = c.req.query('sessionId')
  const result = await getPurchaseDetail(c.env.PROJECT_ID, sessionId)
  return c.json(result)
})
```

### Step 4: Configure wrangler.toml

```toml
name = "my-store"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "./dist"
not_found_handling = "single-page-application"

[vars]
PROJECT_ID = "my-store"
USER_EMAIL = "admin@example.com"
```

### Step 5: Deploy

```bash
npm run build
node ~/.claude/skills/skillboss/scripts/serve-build.js publish-worker .
```

## API Reference

| Endpoint                         | Method | Auth | Description                |
| -------------------------------- | ------ | ---- | -------------------------- |
| `/api/products`                  | GET    | No   | List all products          |
| `/api/create-checkout-session`   | POST   | Yes  | Create Stripe checkout     |
| `/api/products/purchase-detail`  | GET    | No   | Get purchase by session ID |
| `/api/purchased-products`        | GET    | Yes  | User's purchase history    |
| `/api/products/:id/check-access` | GET    | Yes  | Check product access       |

## Checkout Flow

```
User clicks "Buy"
    │
    ▼
POST /api/create-checkout-session
    │
    ▼
Returns checkoutUrl → Redirect to Stripe Checkout
    │
    ▼
User completes payment on Stripe
    │
    ▼
Stripe redirects to /checkout/success?sessionId=xxx
    │
    ▼
Frontend calls /api/products/purchase-detail?sessionId=xxx
    │
    ▼
Show purchase confirmation
```

## Troubleshooting

| Issue                 | Cause                  | Solution                                 |
| --------------------- | ---------------------- | ---------------------------------------- |
| Products empty        | No products created    | Use `product-manager.js create`          |
| Stripe not configured | Missing Stripe Connect | Run `stripe-connect.js`                  |
| Checkout fails        | Invalid PROJECT_ID     | Check wrangler.toml matches your project |
| Invalid API key       | Wrong environment      | Check config.json apiKey                 |
| Access denied         | Not purchased          | User needs to complete purchase          |

## Security Notes

1. **Stripe keys are NEVER in your worker code** - the shopping service handles all Stripe API calls
2. **Products are server-side** - users cannot modify prices or product data
3. **Session validation** - purchases are verified via Stripe session ID
4. **Admin bypass** - use `USER_EMAIL` carefully, only for testing/admin access
