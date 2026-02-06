| name      | description                                                                                                                                          | homepage            | metadata                           |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------- |
| proxy-mcp | AI agent payments via Proxy. Create payment intents, provision virtual cards, check balances, and track transactions. OAuth authentication required. | https://useproxy.ai | clawdbot: requires: bins: mcporter |

# Proxy Pay MCP

Give your OpenClaw agent a credit card. Proxy lets AI agents autonomously request and use virtual payment cards within policy-defined spending limits.

## Features

- **Intent-Based Payments** — Agents declare what they want to buy, cards are auto-provisioned within policy
- **Spending Policies** — Set per-transaction limits, daily/monthly caps, merchant restrictions, and approval thresholds
- **Virtual Cards** — Single-use or limited cards issued instantly when policy allows
- **Human-in-the-Loop** — High-value intents require human approval before card issuance
- **Balance & Funding** — Check spending power, get ACH/wire/crypto deposit details
- **Transaction Tracking** — Monitor charges, attach receipts, reconcile against intents
- **KYC/KYB Verification** — Onboarding status and completion links

## Setup

### 1. Create a Proxy Account

1. Go to [useproxy.ai](https://useproxy.ai) and sign up
2. Complete KYC/KYB verification
3. Create a **Spend Policy** with your desired limits
4. Create an **Agent** and assign the policy
5. Fund your balance (ACH, wire, or USDC on Solana)

### 2. Authenticate via OAuth

Proxy uses OAuth for MCP authentication. Use Claude Code to authorize, then extract the token for mcporter.

**Step 1: Add Proxy MCP to Claude Code**

```bash
claude mcp add proxy --transport http https://mcp.useproxy.ai/api/mcp
```

**Step 2: Authorize in Claude Code**

```bash
claude
# In session, run: /mcp
# Complete OAuth in browser
```

**Step 3: Extract token**

```bash
jq -r '.mcpOAuth | to_entries | .[] | select(.key | startswith("proxy")) | .value.accessToken' ~/.claude/.credentials.json
```

**Step 4: Add to environment**

```bash
# Add to ~/.clawdbot/.env
PROXY_TOKEN=eyJhbGciOiJ...
```

**Step 5: Configure mcporter**

Add to `config/mcporter.json`:

```json
{
  "mcpServers": {
    "proxy": {
      "baseUrl": "https://mcp.useproxy.ai/api/mcp",
      "description": "Proxy Pay — AI agent payments",
      "headers": {
        "Authorization": "Bearer ${PROXY_TOKEN}"
      }
    }
  }
}
```

**Step 6: Test**

```bash
mcporter list proxy
mcporter call 'proxy.proxy.tools.list()'
```

### Alternative: Agent Token (Autonomous)

For fully autonomous agents, use an agent token instead of OAuth:

1. In the Proxy dashboard, go to **Agents** and create an MCP token
2. Add to `~/.clawdbot/.env`:
   ```
   PROXY_AGENT_TOKEN=proxy_agent_...
   ```
3. Configure mcporter with the agent token header:
   ```json
   {
     "mcpServers": {
       "proxy": {
         "baseUrl": "https://mcp.useproxy.ai/api/mcp",
         "headers": {
           "Authorization": "Bearer ${PROXY_AGENT_TOKEN}"
         }
       }
     }
   }
   ```

Agent tokens are scoped to a single agent and its assigned policy.

## Available Tools (25)

### Onboarding & Profile

| Tool               | Description                    |
| ------------------ | ------------------------------ |
| `proxy.user.get`   | Get authenticated user profile |
| `proxy.kyc.status` | Check KYC verification status  |
| `proxy.kyc.link`   | Get KYC completion link        |

### Balance & Funding

| Tool                | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `proxy.balance.get` | Get available spending power and charge summaries      |
| `proxy.funding.get` | Get ACH, wire, and crypto deposit details with QR code |

### Policies

| Tool                      | Description                                                 |
| ------------------------- | ----------------------------------------------------------- |
| `proxy.policies.get`      | Get the policy attached to the current agent                |
| `proxy.policies.simulate` | Dry-run an intent against policy rules (returns allow/deny) |

### Payment Intents (Core Flow)

| Tool                             | Description                                                 |
| -------------------------------- | ----------------------------------------------------------- |
| `proxy.intents.create`           | Create a payment intent (auto-issues card if within policy) |
| `proxy.intents.list`             | List payment intents                                        |
| `proxy.intents.get`              | Get intent details including card info                      |
| `proxy.intents.request_approval` | Request human approval for an intent                        |
| `proxy.intents.approval_status`  | Check approval status                                       |
| `proxy.intents.approve`          | Approve a pending intent (human only)                       |
| `proxy.intents.reject`           | Reject a pending intent (human only)                        |

### Cards

| Tool                        | Description                               |
| --------------------------- | ----------------------------------------- |
| `proxy.cards.list`          | List cards (filter by agent or status)    |
| `proxy.cards.get`           | Get card details                          |
| `proxy.cards.get_sensitive` | Get full PAN, CVV, expiration for payment |
| `proxy.cards.freeze`        | Freeze a card                             |
| `proxy.cards.unfreeze`      | Unfreeze a card                           |
| `proxy.cards.rotate`        | Rotate card credentials                   |
| `proxy.cards.close`         | Close a card permanently                  |

### Transactions & Receipts

| Tool                               | Description                               |
| ---------------------------------- | ----------------------------------------- |
| `proxy.transactions.list_for_card` | List transactions for a card              |
| `proxy.transactions.get`           | Get transaction details                   |
| `proxy.receipts.attach`            | Attach a receipt or evidence to an intent |
| `proxy.evidence.list_for_intent`   | List receipts attached to an intent       |

### Merchant Lookup

| Tool                                | Description                                         |
| ----------------------------------- | --------------------------------------------------- |
| `proxy.merchants.resolve`           | Resolve a merchant name/domain to a canonical label |
| `proxy.mcc.explain`                 | Explain a merchant category code (MCC)              |
| `proxy.merchants.allowlist_suggest` | Suggest allowlist matches for a merchant name       |

### Utilities

| Tool               | Description                        |
| ------------------ | ---------------------------------- |
| `proxy.tools.list` | List all available Proxy MCP tools |

## Usage Examples

### Check Balance

```bash
mcporter call 'proxy.proxy.balance.get()'
```

### Create a Payment Intent

```bash
mcporter call 'proxy.proxy.intents.create(
  description: "AWS monthly bill",
  merchantName: "Amazon Web Services",
  amount: 14999,
  currency: "USD"
)'
```

Amount is in cents (14999 = $149.99). If within policy limits, a virtual card is auto-issued.

### Get Card Details for Payment

```bash
# Get intent with card info
mcporter call 'proxy.proxy.intents.get(intentId: "int_abc123")'

# Get sensitive card data (PAN, CVV) for checkout
mcporter call 'proxy.proxy.cards.get_sensitive(
  cardId: "card-uuid-here",
  intentId: "int_abc123",
  reason: "Paying AWS invoice"
)'
```

### Simulate Before Spending

```bash
mcporter call 'proxy.proxy.policies.simulate(
  amount: 50000,
  currency: "USD",
  merchantName: "OpenAI",
  description: "API credits"
)'
```

Returns whether the intent would be auto-approved, need approval, or be denied.

### Attach a Receipt

```bash
mcporter call 'proxy.proxy.receipts.attach(
  intentId: "int_abc123",
  url: "https://example.com/invoice-2026-01.pdf",
  description: "January invoice"
)'
```

## Intent Flow

1. **Agent calls `proxy.intents.create`** with amount, merchant, and description
2. **Policy evaluated** — checks limits, merchant restrictions, approval thresholds
3. **If auto-approved** → virtual card issued instantly, returned in response
4. **If needs approval** → status = `pending_approval`, agent polls `approval_status`
5. **Human approves/rejects** via dashboard or `intents.approve`/`intents.reject`
6. **Agent uses card** — calls `cards.get_sensitive` for PAN/CVV to complete purchase
7. **Transaction matched** — webhook reconciles charge against intent
8. **Receipt attached** — agent uploads evidence for audit trail

## Error Codes

| Code                    | Meaning                                                    |
| ----------------------- | ---------------------------------------------------------- |
| `POLICY_REQUIRED`       | Agent has no policy assigned — attach one in the dashboard |
| `ONBOARDING_INCOMPLETE` | KYC not completed — use `kyc.link` to finish               |
| `AGENT_NOT_FOUND`       | Agent token invalid or agent deleted                       |
| `FORBIDDEN`             | Action not allowed for this auth type                      |
| `INTENT_NOT_FOUND`      | Intent ID doesn't exist or not owned by user               |
| `CARD_NOT_FOUND`        | Card ID doesn't exist or not accessible                    |

## Notes

- **OAuth tokens** give full account access (balance, funding, all agents' cards)
- **Agent tokens** are scoped to one agent and its policy — cannot see other agents' data
- **Card-sensitive data** requires both a `cardId` and `intentId` for compliance
- **Amounts are in cents** — $10.00 = 1000, $149.99 = 14999
- **Policies are enforced server-side** — agents cannot bypass limits
- Human approval tools (`approve`, `reject`) require OAuth (human) tokens

## Resources

- [Proxy Dashboard](https://useproxy.ai)
- [Proxy Documentation](https://docs.useproxy.ai)
- [MCP Endpoint](https://mcp.useproxy.ai/api/mcp)
- [GitHub](https://github.com/anthropics/proxymcp)
