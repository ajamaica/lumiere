---
name: autonomous-agent
description: CreditNexus x402 agent. Use when the user wants stock predictions, backtests, bank linking, or agent/borrower scores. Payment-protected MCP tools (run_prediction, run_backtest, link_bank_account, get_agent_reputation_score, get_borrower_score, and by-email variants) with x402 flow (Aptos + Base). Agent handles 402 → pay → retry autonomously. Supports wallet attestation (signing) for onboarding.
metadata:
  {
    'openclaw':
      {
        'emoji': '📈',
        'homepage': 'https://github.com/FinTechTonic/autonomous-agent',
        'requires': { 'bins': ['node', 'npm'] },
        'primaryEnv': 'MCP_SERVER_URL',
        'skillKey': 'autonomous-agent',
      },
    'clawdbot':
      {
        'emoji': '📈',
        'homepage': 'https://github.com/FinTechTonic/autonomous-agent',
        'requires': { 'bins': ['node', 'npm'] },
      },
  }
---

# CreditNexus x402 Agent Skill

Autonomous agent that calls x402-protected MCP tools: stock prediction, backtest, bank linking, and agent/borrower scores. Handles payment flow (402 → pay → retry with `payment_payload`) with Aptos (prediction/backtest) and Base (banking). Supports **wallet attestation** (signing) for onboarding (POST /attest/aptos, /attest/evm).

## Installation

Clone or copy the repo. When loaded from OpenClaw/MoltBook, the skill folder is `{baseDir}`; run commands from the **repo root** (parent of `adapters/openclaw` or of `skills/autonomous-agent`).

```bash
# From repository root
git clone https://github.com/FinTechTonic/autonomous-agent.git && cd autonomous-agent
npm install
```

Set `MCP_SERVER_URL` to your MCP server (e.g. `https://borrower.replit.app`). Copy `.env.example` to `.env` and set:

- `MCP_SERVER_URL` – MCP server base URL (MCP protocol at `/mcp`)
- `X402_FACILITATOR_URL` – x402 facilitator (verify/settle)
- `LLM_BASE_URL`, `HUGGINGFACE_API_KEY` or `HF_TOKEN`, `LLM_MODEL` – for inference
- `APTOS_WALLET_PATH`, `EVM_WALLET_PATH` (or `EVM_PRIVATE_KEY`) – for payments

## Run the agent

From the **repository root** (where `package.json` and `src/` live):

```bash
npx cornerstone-agent "Run a 30-day prediction for AAPL"
# Or interactive
npx cornerstone-agent
# Or from repo: npm run agent -- "..." or node src/run-agent.js "..."
```

**x402 flow:** Agent calls tool without `payment_payload` → server returns 402 + `paymentRequirements` → agent signs, facilitator verify/settle → agent retries with `payment_payload` → receives result + `paymentReceipt`.

## Wallet attestation (signing)

To prove wallet ownership during onboarding, run from repo root:

- Aptos: `npm run attest:aptos` or `npx cornerstone-agent-attest-aptos` — output to POST /attest/aptos
- EVM: `npm run attest:evm` or `npx cornerstone-agent-attest-evm` — output to POST /attest/evm

## MCP Tools

All tools are on the MCP server at `/mcp`. See repo [MCP_INTEGRATION_REFERENCE.md](https://github.com/FinTechTonic/autonomous-agent/blob/main/MCP_INTEGRATION_REFERENCE.md) for resources and pricing.

| Tool                                  | Resource                          | Description                                                | Cost         |
| ------------------------------------- | --------------------------------- | ---------------------------------------------------------- | ------------ |
| `run_prediction`                      | `/mcp/prediction/{symbol}`        | Stock prediction (symbol, horizon)                         | ~6¢          |
| `run_backtest`                        | `/mcp/backtest/{symbol}`          | Backtest (symbol, start/end, strategy)                     | ~6¢          |
| `link_bank_account`                   | `/mcp/banking/link`               | CornerStone/Plaid bank link token                          | ~5¢ (config) |
| `get_agent_reputation_score`          | `/mcp/scores/reputation`          | Agent reputation (100 allowlisted); x402 or lender credits | ~6¢          |
| `get_borrower_score`                  | `/mcp/scores/borrower`            | Borrower score (100 or 100+Plaid); x402 or lender credits  | ~6¢          |
| `get_agent_reputation_score_by_email` | `/mcp/scores/reputation-by-email` | Reputation by email; requires SCORE_BY_EMAIL_ENABLED       | base + extra |
| `get_borrower_score_by_email`         | `/mcp/scores/borrower-by-email`   | Borrower score by email; requires SCORE_BY_EMAIL_ENABLED   | base + extra |

Whitelist your agent at the onboarding flow (e.g. `MCP_SERVER_URL/flow.html`) so the server allows your wallet.
