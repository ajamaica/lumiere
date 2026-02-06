---
name: hustle
description: 'ZeroEx Hustle: Arbitrage Intelligence & Operations Engine. Manage vaults, payouts, and game automation monitoring.'
---

# Hustle Operations

This skill provides access to the **Hustle** engine for game arbitrage and financial operations.

## Capabilities

1.  **Vault Management**: Access secure credentials for arbitrage accounts.
2.  **Market Intelligence**: automation scripts for price checking.
3.  **Payout Pipeline**: Manage GUNZ wallet and Odealo integration.

## Tools

### `hustle_vault`

Access the secure vault to retrieve or store credentials.
**Usage:**

```bash
python3 /Users/lowkey/Desktop/game-compare/hustle/engine/vault.py --action retrieve --key <key_name>
```

### `hustle_status`

Check the status of arbitrage bots and listeners.
**Usage:**

```bash
# Check running processes for hustle engine
ps aux | grep hustle
```

## Workflows

### 1. Initialize Session

Before starting arbitrage tasks:

1. Ensure `.vault/secrets.json` is accessible.
2. Load `ACTIVE_IDENTITY` from vault.
3. Check `gunz_wallet` connectivity.

### 2. Captcha Handling

If a captcha is encountered during web automation:

1. Pause execution.
2. Alert the user or use the `captcha-solver` skill (if available).
3. If manual intervention is needed, use `browser_subagent` to wait for user input.

## Resources

- **Codebase:** `/Users/lowkey/Desktop/game-compare/hustle/`
- **Config:** `/Users/lowkey/Desktop/game-compare/.vault/`
