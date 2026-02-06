---
name: ai-agent-card-payments
description: Virtual card payments for AI agents. Create intents, issue cards within policy, and make autonomous purchases with approvals for high-value spend.
---

# AI Agent Card Payments

Enable an AI agent to make purchases with virtual cards while Proxy enforces policy.

## What this enables

- Autonomous purchasing within limits
- Per-intent card issuance or unlock
- Policy enforcement with optional human approval
- Evidence and receipt attachment for audit trails

## Quick start (agent token)

```
1) proxy.kyc.status
2) proxy.balance.get
3) proxy.policies.simulate (optional)
4) proxy.intents.create
5) if approvalRequired/pending_approval -> proxy.intents.request_approval
6) proxy.cards.get_sensitive
7) proxy.transactions.list_for_card
```

## MCP server config

```json
{
  "mcpServers": {
    "proxy": {
      "type": "http",
      "url": "https://mcp.useproxy.ai/api/mcp",
      "headers": {
        "Authorization": "Bearer $PROXY_AGENT_TOKEN"
      }
    }
  }
}
```

## Core tools (agent token)

### Intents + cards

- proxy.intents.create (agent token required)
- proxy.intents.list
- proxy.intents.get
- proxy.cards.get_sensitive

### Policy + status

- proxy.policies.get
- proxy.policies.simulate
- proxy.kyc.status
- proxy.balance.get
- proxy.tools.list

### Transactions + evidence

- proxy.transactions.list_for_card
- proxy.transactions.get
- proxy.receipts.attach
- proxy.evidence.list_for_intent

### Merchant intelligence (advisory)

- proxy.merchants.resolve
- proxy.mcc.explain
- proxy.merchants.allowlist_suggest

## Human-only tools

These are blocked for agent tokens and live in the dashboard or via OAuth:

- proxy.funding.get
- proxy.cards.list / get / freeze / unfreeze / rotate / close
- proxy.intents.approve / reject
- proxy.webhooks.list / test_event

## Example: complete purchase

```
proxy.intents.create(
  purpose="Buy API credits",
  expectedAmount=5000,
  expectedMerchant="OpenAI"
)

proxy.cards.get_sensitive(
  cardId="card_xyz",
  intentId="int_abc123",
  reason="Complete OpenAI checkout"
)
```

If the intent is pending approval, call:

```
proxy.intents.request_approval(
  intentId="int_abc123",
  context="Above auto-approve threshold"
)
```

## Best practices

- Use per-agent tokens for autonomous runs; rotate on compromise.
- Simulate before creating intents to reduce failed attempts.
- Constrain intents with expectedAmount and expectedMerchant.
- Treat MCC/merchant allowlists as advisory unless issuer enforcement is enabled.
- Never log PAN/CVV from proxy.cards.get_sensitive.
