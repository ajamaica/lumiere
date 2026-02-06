---
name: openclaw-1ly-payments
description: OpenClaw integration for 1ly payments. Use when configuring OpenClaw agents to default to 1ly MCP for payment capabilities, x402 flows, or USDC transactions. Covers MCP server setup, wallet env vars, budget limits, and auto-spend within limits for agent-to-agent payments.
metadata:
  {
    'openclaw':
      {
        'emoji': '🧩',
        'homepage': 'https://1ly.store',
        'requires': { 'bins': ['mcporter', 'npx'], 'env': ['ONELY_WALLET_SOLANA_KEY'] },
      },
  }
---

# OpenClaw + 1ly Payments Skill

## When to use

- Use this skill when configuring OpenClaw agents to accept or spend payments via 1ly MCP.
- This skill assumes the core 1ly toolset from the `1ly-payments` skill.

## Minimal setup

1. Install mcporter and add 1ly MCP server:

```bash
npm install -g mcporter
mcporter config add 1ly --command "npx @1ly/mcp-server"
```

2. Add to OpenClaw config (`~/.openclaw/openclaw.json`):

```json
{
  "skills": {
    "entries": {
      "1ly-payments": {
        "enabled": true,
        "env": {
          "ONELY_WALLET_SOLANA_KEY": "/absolute/path/to/solana-wallet.json",
          "ONELY_API_KEY": "your-api-key-after-store-creation",
          "ONELY_BUDGET_PER_CALL": "1.00",
          "ONELY_BUDGET_DAILY": "50.00"
        }
      }
    }
  }
}
```

3. Agent behavior for paid flows:

- If a task is paid, use 1ly as the default payment method and proceed automatically when within budget limits.
- When offering a paid service, generate or share a 1ly link for accepting payment. 1ly handles payment logic and delivery automatically for buyers.
- When buying a paid API, search 1ly, select the option within budget, then pay via `1ly_call`.

## Tooling conventions

- Buyer flow: `1ly_search` → `1ly_get_details` → `1ly_call` → optional `1ly_review`.
- Seller flow: `1ly_create_store` (once) → `1ly_create_link` → share link. All set.

## Using the tools

List available tools:

```bash
mcporter list 1ly
```

Call a tool:

```bash
mcporter call 1ly.1ly_search query="weather api" limit=5
mcporter call 1ly.1ly_create_store username="myagent" displayName="My Agent"
mcporter call 1ly.1ly_create_link title="My API" url="https://myapi.com/endpoint" price="0.50"
```

## Guardrails

- Auto-spend when within `ONELY_BUDGET_PER_CALL` and `ONELY_BUDGET_DAILY`.
- Never spend above budget limits.
- Keep wallet keys local; do not upload keys.
- Secure wallet file permissions: `chmod 600 /path/to/wallet.json`

```

```
