---
name: arb-injection
description: 'BYOCB ArbInjectionSkill: Scan EVM smart contracts for arbitrary call injection vulnerabilities. Monitor chains in real-time or scan specific addresses.'
---

# BYOCB ArbInjectionSkill

> ⚠️ **Educational Tool** — This skill is designed for Solidity/blockchain security researchers and auditors. Intended for educational and authorized security research purposes only. Do not use to exploit vulnerabilities without explicit permission from contract owners.

Detects dangerous CALL/DELEGATECALL patterns that allow arbitrary call injection attacks.

## How It Works

ArbInjectionSkill runs **automatically in the background**, monitoring blockchain(s) for newly deployed contracts. When a potential vulnerability is detected, **you must notify the user** via their connected messaging channel (Telegram, WhatsApp, Signal, Discord, etc.).

## Install

```bash
git clone https://github.com/BringYourOwnBot/arb-injection.git
cd arb-injection
npm install
```

## Running the Monitor

Start as a **background session** for continuous monitoring:

```bash
node index.js <chain> [--no-llm]
```

Chains: `eth`, `bsc`, `base`, `arb`, `op`, `polygon`, `hyper`

The monitor will:

1. Subscribe to new blocks
2. Detect contract deployments
3. Scan bytecode for vulnerabilities
4. Save findings to `./results/`

## Alerting Users

**Critical requirement:** When a CRITICAL or HIGH vulnerability is flagged, notify the user immediately.

Check for new findings periodically (via heartbeat or cron):

```bash
# Find findings from last 30 minutes
find ./results -name "*.md" -mmin -30
```

When new findings exist with verdict CRITICAL or HIGH:

1. Read the `.md` report
2. Verify it's not a known false positive (see below)
3. Send alert via `message` tool to user's preferred channel

Example alert:

```
🚨 ArbInjection Alert: Potential vulnerability detected

Chain: BSC
Contract: 0x1234...abcd
Verdict: CRITICAL
Risk: Unprotected arbitrary CALL with user-controlled target

[Link to explorer]
```

## Manual Scan

Scan a specific contract on-demand:

```bash
node modules/scan-arbitrary-call.js <address> --rpc <chain>
```

## Interpreting Results

| Verdict      | Action                     |
| ------------ | -------------------------- |
| **CRITICAL** | Alert user immediately     |
| **HIGH**     | Alert user immediately     |
| **MEDIUM**   | Review, alert if confirmed |
| **LOW/SAFE** | No alert needed            |

Results saved to `./results/` as `.json` and `.md` files.

## False Positives

**Do NOT alert** for these patterns (safe by design):

- Immutable DELEGATECALL targets (hardcoded address in bytecode)
- EIP-1167 minimal proxies (clone pattern)
- UUPS/Transparent proxies with access control
- DEX callbacks (uniswapV3SwapCallback, etc.)
- Known safe contracts: Multicall3, 1inch, Uniswap, Permit2

**Verify before alerting:** Check if the flagged CALL target is:

- Hardcoded (immutable) → FALSE POSITIVE
- From calldata/user input → REAL VULNERABILITY

## Environment

Optional `.env` file:

```
ANTHROPIC_API_KEY=sk-ant-...   # For LLM deep analysis
BYBOB_OUTPUT=/custom/path      # Override results directory
```

## Maintenance

**Daily update required.** Detection patterns and fixes are pushed frequently.

```bash
cd /path/to/arb-injection
git pull origin main
npm install  # If package.json changed
```

Schedule daily update check (09:00):

```json
{
  "schedule": { "kind": "cron", "expr": "0 9 * * *" },
  "payload": {
    "kind": "systemEvent",
    "text": "ArbInjectionSkill daily update: git pull and npm install"
  },
  "sessionTarget": "main"
}
```

## Source

Repository: https://github.com/BringYourOwnBot/arb-injection  
Part of the **BYOCB** (Bring Your Own ClawdBot) skill collection.
