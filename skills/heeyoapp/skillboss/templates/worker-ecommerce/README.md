# E-Commerce Worker Template

A full-stack e-commerce template with React frontend and Hono backend, ready to deploy on Cloudflare Workers with Stripe checkout via HeyBoss shopping service.

## Quick Start

```bash
# 1. Copy this template to your project
cp -r ~/.claude/skills/skillboss/templates/worker-ecommerce ./my-store
cd my-store

# 2. Install dependencies
npm install

# 3. Configure your project
# Edit wrangler.toml and set PROJECT_ID and USER_EMAIL

# 4. Create products (see "Managing Products" below)

# 5. Build and deploy
npm run build
node ~/.claude/skills/skillboss/scripts/serve-build.js publish-worker .
```

## Prerequisites

Before deploying, you need:

1. **Stripe Connect account** - Run once:

   ```bash
   node ~/.claude/skills/skillboss/scripts/stripe-connect.js
   ```

2. **Products** - Create at least one product (see below)

## Architecture

This template **does NOT** require `STRIPE_SECRET_KEY`. All payment operations are delegated to the HeyBoss shopping service.

| Aspect         | Value                             |
| -------------- | --------------------------------- |
| Stripe API     | Via shopping service (not direct) |
| Secrets needed | None (only PROJECT_ID)            |
| Products       | Shopping service DB               |
| Webhooks       | Shopping service handles          |

## Managing Products

Use the product-manager CLI:

```bash
# List products
node ~/.claude/skills/skillboss/scripts/product-manager.js list --project-id your-project-id

# Create a product
node ~/.claude/skills/skillboss/scripts/product-manager.js create \
  --project-id your-project-id \
  --name "Premium Plan" \
  --description "Access to all premium features" \
  --price 2999 \
  --currency usd

# Create a subscription
node ~/.claude/skills/skillboss/scripts/product-manager.js create \
  --project-id your-project-id \
  --name "Monthly Subscription" \
  --price 999 \
  --billing-type recurring \
  --billing-period month

# Update a product
node ~/.claude/skills/skillboss/scripts/product-manager.js update <product-id> \
  --project-id your-project-id \
  --price 3999

# Delete a product
node ~/.claude/skills/skillboss/scripts/product-manager.js delete <product-id> \
  --project-id your-project-id
```

## Configuration

Edit `wrangler.toml`:

```toml
[vars]
# Required: Your project ID (auto-created on first deploy)
PROJECT_ID = "my-store"

# Required: Admin email - bypasses purchase checks for testing
USER_EMAIL = "admin@example.com"
```

## Local Development

```bash
# Start frontend dev server (hot reload)
npm run dev

# In another terminal, start worker (API endpoints)
npm run dev:worker
```

The Vite dev server proxies `/api/*` requests to the worker.

## Project Structure

```
├── src/
│   ├── index.ts              # Hono backend (API routes)
│   └── react-app/
│       ├── main.tsx          # React entry
│       ├── App.tsx           # Router setup
│       ├── components/
│       │   ├── Layout.tsx    # Shared layout with nav
│       │   ├── ProductCard.tsx
│       │   └── ProtectedContent.tsx
│       ├── pages/
│       │   ├── HomePage.tsx
│       │   ├── ProductsPage.tsx
│       │   ├── LoginPage.tsx          # Google OAuth + Email OTP
│       │   ├── AuthCallbackPage.tsx   # OAuth popup callback
│       │   ├── CheckoutSuccessPage.tsx
│       │   └── CheckoutCancelPage.tsx
│       └── hooks/
│           └── useAuth.tsx   # Re-exports @hey-boss/users-service/react
├── lib/
│   └── shopping-client.ts    # Shopping service API client
├── wrangler.toml             # Cloudflare Worker config
└── package.json
```

## Authentication

This template uses `@hey-boss/users-service` for authentication:

- **Google OAuth** - Popup-based flow with `/auth/callback` handler
- **Email OTP** - Send verification code to email

The `useAuth` hook provides:

- `user` - Current user (null if not logged in)
- `isPending` - True while checking auth state
- `logout()` - Sign out user
- `sendOTP(email)` - Send email verification code
- `verifyOTP(email, code)` - Verify code and log in
- `refetch()` - Refresh auth state

## Checkout Flow

```
Frontend: User clicks "Buy"
    │
    ▼
POST /api/create-checkout-session
    { products: [{productId, quantity}], successRouter, cancelRouter }
    │
    ▼
Worker: Delegates to shopping.heybossai.com
    │
    ▼
Returns: { checkoutUrl: "https://checkout.stripe.com/..." }
    │
    ▼
Frontend: Redirects to Stripe Checkout
    │
    ▼
User: Completes payment on Stripe
    │
    ▼
Stripe: Redirects to /checkout/success?sessionId=xxx
    │
    ▼
Frontend: Calls GET /api/products/purchase-detail?sessionId=xxx
    │
    ▼
Displays: Purchase confirmation
```

## API Endpoints

| Endpoint                         | Method | Auth | Description                     |
| -------------------------------- | ------ | ---- | ------------------------------- |
| `/api/products`                  | GET    | No   | List all products               |
| `/api/create-checkout-session`   | POST   | Yes  | Create Stripe checkout          |
| `/api/products/purchase-detail`  | GET    | No   | Get purchase by session ID      |
| `/api/purchased-products`        | GET    | Yes  | User's purchase history         |
| `/api/products/:id/check-access` | GET    | Yes  | Check if user has access        |
| `/api/users/me`                  | GET    | Yes  | Get current user                |
| `/api/oauth/google/redirect_url` | GET    | No   | Get Google OAuth URL            |
| `/api/sessions`                  | POST   | No   | Exchange OAuth code for session |
| `/api/logout`                    | GET    | No   | Clear session                   |
| `/api/send-otp`                  | POST   | No   | Send email OTP                  |
| `/api/verify-otp`                | POST   | No   | Verify OTP and create session   |

## Customization

### Adding Protected Content

Use the `ProtectedContent` component to gate content behind purchases:

```tsx
import ProtectedContent from './components/ProtectedContent'

function PremiumPage() {
  return (
    <ProtectedContent productId="your-product-id">
      <div>This content is only visible after purchase!</div>
    </ProtectedContent>
  )
}
```

### Styling

This template uses Tailwind CSS. Edit `tailwind.config.js` to customize:

```js
export default {
  theme: {
    extend: {
      colors: {
        primary: '#your-color',
      },
    },
  },
}
```

### Adding Pages

1. Create a new page in `src/react-app/pages/`
2. Add a route in `src/react-app/App.tsx`

## Deployment

After making changes:

```bash
# Build frontend
npm run build

# Deploy to Cloudflare Workers
node ~/.claude/skills/skillboss/scripts/serve-build.js publish-worker .
```

## Troubleshooting

**Products not loading?**

- Check that PROJECT_ID in wrangler.toml matches your project
- Ensure products are created and have `status: active`

**Checkout fails?**

- Verify Stripe Connect is set up: `node ~/.claude/skills/skillboss/scripts/stripe-connect.js --status`
- Check that you're logged in (checkout requires authentication)

**Admin access not working?**

- Ensure USER_EMAIL matches your login email exactly
- Redeploy after changing wrangler.toml
