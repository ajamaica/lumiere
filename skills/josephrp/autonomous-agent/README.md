# Autonomous Agent – x402 MCP + LangChain.js

Autonomous AI agent for **x402-paid MCP tools**: predict tickers, backtest strategies, open bank accounts. Pays with **Aptos** or **EVM** via the x402 facilitator—no OpenAI key; uses **Hugging Face** for the LLM. Built for Cursor, OpenClaw/Moltbot, and headless runs.

## Why?

Most agent demos need a full backend and separate API keys. This agent talks to an **x402 MCP server**, pays with its own Aptos and EVM wallets (verify → settle), and uses an OpenAI-compatible LLM (e.g. Hugging Face). You get **run_prediction**, **run_backtest**, **link_bank_account**, and score tools with minimal setup—whitelist your agent, fund wallets, run.

## Install

### From npm (recommended)

```bash
npm install cornerstone-autonomous-agent
```

Copy the package’s `.env.example` into your project and set `MCP_SERVER_URL`, `X402_FACILITATOR_URL`, `HUGGINGFACE_API_KEY`, `LLM_MODEL`, and wallet paths. See [Config](#config).

### From source

```bash
git clone https://github.com/FinTechTonic/autonomous-agent.git && cd autonomous-agent
npm install
```

**OpenClaw / MoltBook / Moltbot:** Load the skill from `skills/autonomous-agent/` or [adapters/openclaw/SKILL.md](adapters/openclaw/SKILL.md). See [MoltBook / OpenClaw](#moltbook--openclaw) below. Then point `MCP_SERVER_URL` at your MCP server.

## Quick Start

From the repo root (or with the package installed):

```bash
# Generate Aptos wallet (for prediction/backtest)
npm run setup:aptos

# Generate EVM wallet (for link_bank_account)
npm run setup

# Show addresses for whitelisting at the onboarding flow (e.g. https://borrower.replit.app/flow.html)
npm run addresses

# (Optional) Sign wallet attestations for onboarding (POST /attest/aptos, /attest/evm)
npx cornerstone-agent-attest-aptos
npx cornerstone-agent-attest-evm
# or from repo: npm run attest:aptos && npm run attest:evm

# Run the agent (demo: balance + AAPL prediction)
npx cornerstone-agent "Run a 30-day prediction for AAPL"
# or from repo: npm run agent -- "Run a 30-day prediction for AAPL"
```

## Config

Copy `.env.example` to `.env` and set:

| Variable                            | Description                                                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `MCP_SERVER_URL`                    | x402 MCP server base URL (e.g. https://borrower.replit.app or http://localhost:4023)                                              |
| `X402_FACILITATOR_URL`              | Facilitator base URL for Aptos (verify/settle). Use public (e.g. https://x402-navy.vercel.app/facilitator) for link_bank_account. |
| `X402_EVM_FACILITATOR_URL`          | Optional. EVM facilitator; defaults to X402_FACILITATOR_URL. Set to public when using local Aptos facilitator.                    |
| `LLM_BASE_URL`                      | OpenAI-compatible base URL (default https://router.huggingface.co/v1)                                                             |
| `HUGGINGFACE_API_KEY` or `HF_TOKEN` | Hugging Face API key                                                                                                              |
| `LLM_MODEL`                         | Model ID (e.g. meta-llama/Llama-3.2-3B-Instruct)                                                                                  |
| `APTOS_WALLET_PATH`                 | Aptos wallet JSON path. Multi-wallet: ~/.aptos-agent-wallets.json.                                                                |
| `EVM_WALLET_PATH`                   | EVM wallet path. Multi-wallet: ~/.evm-wallets.json. Or set EVM_PRIVATE_KEY.                                                       |
| `BASE_SEPOLIA_RPC`                  | Optional; Base Sepolia RPC for link_bank_account                                                                                  |

## Commands

Prefer **npx** when the package is installed; from repo root use **npm run** or **node src/...**.

| Command                               | Description                                                                |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `npm run setup`                       | Generate EVM wallet (single; for multi use agent tool `create_evm_wallet`) |
| `npm run setup:aptos`                 | Generate Aptos wallet (single; for multi use `create_aptos_wallet`)        |
| `npm run addresses`                   | Print all Aptos and EVM addresses for whitelisting at flow.html            |
| `npm run credit:aptos`                | Credit Aptos agent (devnet: programmatic; testnet: instructions)           |
| `npm run balance -- <chain>`          | EVM balance (e.g. `baseSepolia`)                                           |
| **`npx cornerstone-agent [message]`** | Run agent (or `npm run agent -- [message]` from repo)                      |
| `npm run attest:aptos`                | Sign Aptos wallet attestation for onboarding POST /attest/aptos            |
| `npm run attest:evm`                  | Sign EVM wallet attestation for onboarding POST /attest/evm                |
| `npx cornerstone-agent-attest-aptos`  | Same as attest:aptos (when package installed)                              |
| `npx cornerstone-agent-attest-evm`    | Same as attest:evm (when package installed)                                |

**Crediting Aptos:** Testnet has no programmatic faucet—use [Aptos testnet faucet](https://aptos.dev/network/faucet). Devnet: `APTOS_FAUCET_NETWORK=devnet npm run credit:aptos`. See [Canteen – Aptos x402](https://canteenapp-aptos-x402.notion.site/).

## MCP Tools

All tools are exposed at the MCP server path `/mcp`. Paid tools follow the x402 flow: call without `payment_payload` → 402 + `paymentRequirements` → sign payment → call again with `payment_payload` → facilitator verify/settle → result + `paymentReceipt`. See [MCP_INTEGRATION_REFERENCE.md](MCP_INTEGRATION_REFERENCE.md).

| Tool                                  | Resource                          | Description                                                                | Cost (USD)           |
| ------------------------------------- | --------------------------------- | -------------------------------------------------------------------------- | -------------------- |
| `run_prediction`                      | `/mcp/prediction/{symbol}`        | Stock prediction (symbol, horizon)                                         | ~0.06 (Aptos/EVM)    |
| `run_backtest`                        | `/mcp/backtest/{symbol}`          | Backtest trading strategy (symbol, start/end, strategy)                    | ~0.06                |
| `link_bank_account`                   | `/mcp/banking/link`               | CornerStone/Plaid bank link token                                          | ~0.05 (configurable) |
| `get_agent_reputation_score`          | `/mcp/scores/reputation`          | Agent reputation (100 when allowlisted); x402 or lender credits            | ~0.06                |
| `get_borrower_score`                  | `/mcp/scores/borrower`            | Borrower score (100 or 100+Plaid when bank linked); x402 or lender credits | ~0.06                |
| `get_agent_reputation_score_by_email` | `/mcp/scores/reputation-by-email` | Reputation by email (requires `SCORE_BY_EMAIL_ENABLED=1`)                  | base + extra         |
| `get_borrower_score_by_email`         | `/mcp/scores/borrower-by-email`   | Borrower score by email (requires `SCORE_BY_EMAIL_ENABLED=1`)              | base + extra         |

## Wallet attestation (signing)

To prove ownership of agent wallets during onboarding, use the **attestation** scripts. They sign an off-chain message; submit the JSON output to the onboarding server (`POST /attest/aptos`, `POST /attest/evm`).

- **Aptos:** `npm run attest:aptos` or `npx cornerstone-agent-attest-aptos` — outputs `address`, `message`, `signature` (hex), `public_key_hex`.
- **EVM:** `npm run attest:evm` or `npx cornerstone-agent-attest-evm` — outputs `address`, `message`, `signature`.

Options: `--address 0x...` to attest a specific address, `--message "Custom message"` for a custom payload.

## Supported Networks

| Network        | Use                            | Cost     |
| -------------- | ------------------------------ | -------- |
| Aptos testnet  | run_prediction, run_backtest   | ~6¢ USDC |
| Base Sepolia   | link_bank_account (testnet)    | ~$3.65   |
| Base (mainnet) | link_bank_account (production) | ~$3.65   |

## x402 Flow

```
Agent calls MCP tool (no payment_payload)
  → Server returns 402 + paymentRequirements (network, amount, asset, payTo, ...)
  → Agent signs payment, calls facilitator /verify then /settle
  → Agent retries tool call with payment_payload
  → Server returns result + paymentReceipt
```

## Architecture

```
autonomous/
├── src/
│   ├── agent/           # ReAct agent, LLM, tool wiring
│   ├── lib/
│   │   ├── mcp/          # MCP client + 402 handle/retry
│   │   ├── aptos/        # Aptos wallet, balance, signPayment
│   │   ├── evm/          # EVM wallet, signPayment (Base)
│   │   └── x402/         # Payment types, verify/settle flow
│   ├── run-agent.js      # Entrypoint (npx cornerstone-agent)
│   ├── setup.js          # EVM wallet generation
│   ├── setup-aptos.js    # Aptos wallet generation
│   ├── show-agent-addresses.js
│   ├── attest-aptos-wallet.js  # Sign attestation for POST /attest/aptos
│   └── attest-evm-wallet.js    # Sign attestation for POST /attest/evm
├── skills/               # MoltBook/OpenClaw (AgentSkills layout)
│   └── autonomous-agent/
│       └── SKILL.md
├── adapters/             # OpenClaw, OpenAI, Anthropic, local
├── .env.example
└── package.json
```

**Core pieces:** `lib/mcp` — MCP client and 402 retry; `lib/aptos` / `lib/evm` — wallets and payment signing; `lib/x402` — verify/settle; `agent/` — LangChain.js ReAct agent and tools.

## Tech Stack

- **Runtime:** Node.js 18+
- **Agent:** LangChain.js (ReAct), OpenAI-compatible LLM (e.g. Hugging Face)
- **MCP:** [Model Context Protocol](https://modelcontextprotocol.io) + x402 payment flow
- **Chains:** Aptos (viem-style + @aptos-labs/ts-sdk), EVM (viem) for Base Sepolia/Base
- **Payments:** x402 facilitator (verify/settle), local wallet storage

## Security

- **Wallets:** Stored locally (e.g. `~/.aptos-agent-wallets.json`, `~/.evm-wallets.json`); private keys not logged or sent except as signed payloads to the facilitator.
- **Payments:** Only verify/settle go to the facilitator; no custody of funds by the MCP server.
- **Whitelist:** Agent addresses must be allowlisted at the onboarding flow before paid tools succeed.

## Capability + adapters

- **Capability:** Core (`src/`) — MCP client, x402 flow, local tools. No OpenAI/Claw/Anthropic logic in code.
- **Adapters:** How each platform uses the capability:
  - **MoltBook / OpenClaw / Moltbot:** `skills/autonomous-agent/SKILL.md` (AgentSkills-compatible; [see below](#moltbook--openclaw)) or [adapters/openclaw/SKILL.md](adapters/openclaw/SKILL.md)
  - **OpenAI:** [adapters/openai/openapi.yaml](adapters/openai/openapi.yaml) — Custom GPTs / Assistants
  - **Claude / Anthropic:** [adapters/anthropic/tools.json](adapters/anthropic/tools.json) — Claude tools
  - **Local / OSS:** [adapters/local/README.md](adapters/local/README.md) — LM Studio, AutoGen, CrewAI

## MoltBook / OpenClaw

This repo is optimized for **easy skill loading** in MoltBook and OpenClaw (Claude, Anthropic, OpenAI, and other providers work via the same agent; the skill tells the assistant how to run it).

- **Skill layout:** The skill lives in `skills/autonomous-agent/SKILL.md` (AgentSkills-compatible, single-line frontmatter, `metadata.openclaw` gating). OpenClaw/MoltBook loads skills from `skills/` subfolders.
- **Load options:**
  1. **extraDirs:** Add this repo path to `~/.openclaw/openclaw.json` under `skills.load.extraDirs`. OpenClaw will scan `skills/` and load `autonomous-agent`.
  2. **Workspace:** Clone the repo and use it as your OpenClaw workspace; workspace skills are loaded from `<workspace>/skills`.
  3. **Managed skills:** Copy `skills/autonomous-agent` to `~/.openclaw/skills/` for all agents on the machine.
  4. **ClawHub:** When published, install with `clawhub install autonomous-agent` (installs into `./skills` by default).
- **Config:** In `skills.entries["autonomous-agent"]` you can set `enabled`, `env`, or `apiKey` (maps to `primaryEnv`). Ensure `MCP_SERVER_URL`, x402 facilitator URLs, and LLM/env are set for the agent run.
- **Run:** From the **repository root** (parent of `skills/`), run `npx cornerstone-agent "your message"` or `npm run agent -- "your message"`.

Example `~/.openclaw/openclaw.json` to load this repo’s skills:

```json
{
  "skills": {
    "load": {
      "extraDirs": ["/path/to/autonomous-agent"]
    },
    "entries": {
      "autonomous-agent": {
        "enabled": true,
        "env": { "MCP_SERVER_URL": "https://borrower.replit.app" }
      }
    }
  }
}
```

## References

- **Source:** [FinTechTonic/autonomous-agent](https://github.com/FinTechTonic/autonomous-agent)
- **MCP integration:** [MCP_INTEGRATION_REFERENCE.md](MCP_INTEGRATION_REFERENCE.md) — endpoints, tools, resources, x402 flow, facilitator
- [Canteen App – Aptos x402](https://canteenapp-aptos-x402.notion.site/) — wallet hydration and crediting
- [LangChain.js MCP](https://js.langchain.com/docs/integrations/toolkits/mcp_toolbox)
- [Hugging Face Inference – OpenAI-compatible](https://huggingface.co/docs/api-inference/en/index)

## License

GPL-2.0-only. Use of this software is also subject to the [Responsible AI License (RAIL)](https://www.licenses.ai/). See [LICENSE.md](LICENSE.md) (GPL-2) and [RAIL](https://www.licenses.ai/).
