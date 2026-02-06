---
name: masumi-payments
description: Enable AI agents to accept Cardano blockchain payments through the decentralized Masumi network by deploying their own payment service
homepage: https://docs.masumi.network
user-invocable: true
metadata:
  {
    'openclaw':
      {
        'requires': { 'bins': ['node', 'npm', 'git'], 'env': ['MASUMI_PAYMENT_SERVICE_URL'] },
        'primaryEnv': 'MASUMI_PAYMENT_SERVICE_URL',
        'emoji': '💰',
      },
  }
---

# Masumi Payments Skill for OpenClaw

**Enable your AI agent to accept blockchain payments and join the decentralized agent economy**

## Important: What AI Agents CAN vs CANNOT Do

**AI Agents CAN:**

- Install masumi-payment-service locally using `masumi_install_payment_service`
- Start the payment service using `masumi_start_payment_service`
- Generate admin API keys using `masumi_generate_api_key`
- Generate Cardano wallets automatically
- Configure environment variables (.env file)
- Register agents on the blockchain
- Make API calls to payment service
- Test payment flows

**AI Agents CANNOT (human must do):**

- Deploy to Railway (requires browser OAuth login - human must use Railway dashboard)
- Sign up for Blockfrost account → Human must go to https://blockfrost.io
- Request test ADA from faucet → Human must go to https://docs.cardano.org/cardano-testnet/tools/faucet/
- Backup wallet mnemonic → Human must save it securely

**AI Agent: Ask TWO questions upfront:**

1. **"Do you already have masumi-payment-service running? If yes, what's YOUR service URL?"**
   - User should provide: `http://localhost:3000/api/v1` (local) or `https://their-service.railway.app/api/v1` (Railway)
   - **CRITICAL**: There is NO centralized `payment.masumi.network` - they run their own service
2. **"If not, do you want me to help you set it up locally?"**

---

## What is Masumi?

Masumi is a **decentralized protocol** for AI agent payments and identity. It lets agents collaborate seamlessly and monetize their services efficiently on the Cardano blockchain.

**CRITICAL: Masumi is NOT a centralized service.**

- **YOU run your own payment service node** (locally or on Railway)
- **YOU control your own wallets** (self-custodied)
- **YOU are your own admin** (no centralized authority)
- There is NO `payment.masumi.network` service - that's just documentation examples

## Architecture

**IMPORTANT: You run your OWN Masumi Node. There is NO centralized service.**

The Masumi Node consists of two primary services that **YOU deploy and run**:

1. **Payment Service** (Required) - **YOU run this yourself**
   - Deploy locally (`http://localhost:3000`) or on Railway (`https://your-service.railway.app`)
   - Wallet management (YOUR wallets)
   - Transaction processing (A2A and H2A)
   - Token swapping (stablecoins ↔ ADA)
   - Admin interface + REST APIs (YOUR admin API key)

2. **Registry Service** (Optional) - For blockchain querying
   - Usually runs alongside payment service
   - Agent discovery
   - Node lookup
   - No transactions, read-only

## Quick Start

### Option 1: Install Payment Service Automatically

Use the built-in installer tools:

```typescript
// Step 1: Install payment service
const installResult = await masumi_install_payment_service({
  network: 'Preprod',
})

// Step 2: Start service
await masumi_start_payment_service({
  installPath: installResult.installPath,
  serviceUrl: installResult.serviceUrl,
})

// Step 3: Generate API key
const apiKeyResult = await masumi_generate_api_key({
  serviceUrl: installResult.serviceUrl,
})

// Step 4: Enable Masumi (auto-provisions wallet and registers agent)
await masumi_enable({
  installService: true, // Automatically installs if not configured
  agentName: 'My Agent',
  pricingTier: 'free',
})
```

### Option 2: Manual Setup

1. **Deploy YOUR Payment Service:**
   - Local: Clone https://github.com/masumi-network/masumi-payment-service and run locally
   - Railway: Deploy via Railway dashboard (human must do this)

2. **Set Environment Variables:**

   ```bash
   export MASUMI_PAYMENT_SERVICE_URL=http://localhost:3000/api/v1
   export MASUMI_PAYMENT_API_KEY=your-admin-api-key
   export MASUMI_NETWORK=Preprod
   ```

3. **Enable Masumi:**
   ```typescript
   await masumi_enable({
     agentName: 'My Agent',
     pricingTier: 'free',
   })
   ```

## Tools

### Installation Tools

- **`masumi_install_payment_service`**: Clone and install masumi-payment-service locally
- **`masumi_start_payment_service`**: Start the payment service and check status
- **`masumi_generate_api_key`**: Generate admin API key via payment service API

### Payment Tools

- **`masumi_enable`**: Full setup - install service, generate API key, register agent
- **`masumi_create_payment`**: Create payment request
- **`masumi_check_payment`**: Check payment status
- **`masumi_complete_payment`**: Submit result and complete payment
- **`masumi_wallet_balance`**: Get wallet balance
- **`masumi_list_payments`**: List payment history

### Registry Tools

- **`masumi_register_agent`**: Register agent in Masumi registry
- **`masumi_search_agents`**: Search for other agents
- **`masumi_get_agent`**: Get agent details

## API Reference (Quick Reference)

### Payment Endpoints

| Method | Endpoint                                 | Purpose                | Notes                                     |
| ------ | ---------------------------------------- | ---------------------- | ----------------------------------------- |
| POST   | `/payment`                               | Create payment request | Returns `blockchainIdentifier`            |
| POST   | `/payment/resolve-blockchain-identifier` | Check payment status   | Use `blockchainIdentifier` as body param  |
| POST   | `/payment/submit-result`                 | Submit result          | Use `submitResultHash` (not `resultHash`) |
| GET    | `/payment`                               | List payments          | Returns `data.Payments` array             |
| POST   | `/payment/authorize-refund`              | Authorize refund       | Admin only                                |

### Registry Endpoints

| Method | Endpoint     | Purpose            | Notes                                   |
| ------ | ------------ | ------------------ | --------------------------------------- |
| POST   | `/registry`  | Register agent     | Returns `data` object                   |
| GET    | `/registry/` | List/search agents | Returns `data.Assets` array             |
| GET    | `/registry/` | Get agent          | Filter by `agentIdentifier` query param |

**Important Notes:**

- All endpoints require `/api/v1` prefix if service URL includes it
- Response format: `{ status: string, data: T }` - extract `data` property
- Use `submitResultHash` parameter (not `resultHash`) for submit-result endpoint

## Configuration

**Required:**

- `MASUMI_PAYMENT_SERVICE_URL`: YOUR self-hosted payment service URL

**Optional:**

- `MASUMI_PAYMENT_API_KEY`: Admin API key
- `MASUMI_NETWORK`: "Preprod" or "Mainnet" (default: "Preprod")
- `MASUMI_REGISTRY_SERVICE_URL`: Registry service URL (defaults to payment service URL)

## Examples

See `examples/payment-manager.ts` for complete examples.

## Resources

- Payment Service: https://github.com/masumi-network/masumi-payment-service
- Registry Service: https://github.com/masumi-network/masumi-registry-service
- Documentation: https://docs.masumi.network
- MIP-004 Specification: Masumi Improvement Proposal #004
