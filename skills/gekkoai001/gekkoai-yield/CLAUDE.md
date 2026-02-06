# CLAUDE.md

This repository contains a **Clawdbot/OpenClaw skill** for earning yield on USDC via the Moonwell Flagship USDC vault on Base network.

## What is a Clawdbot/OpenClaw Skill?

A **Clawdbot skill** (also called **OpenClaw skill**) is a self-contained package that enables AI agents (like Claude, GPT-4, etc.) to interact with blockchain protocols and DeFi applications. Think of it as a "plugin" or "app" that an AI agent can use to perform specific tasks.

### How It Works

1. **Skill Definition** (`SKILL.md`): Contains metadata about the skill - name, description, commands, requirements. This is what the AI agent reads to understand what the skill can do.

2. **Executable Scripts** (`scripts/`): TypeScript scripts that perform the actual work:
   - `setup.ts` - Configure wallet and preferences
   - `status.ts` - Check position and vault stats
   - `deposit.ts` - Deposit USDC into vault
   - `withdraw.ts` - Withdraw USDC from vault
   - `compound.ts` - Auto-compound rewards (swap tokens → deposit USDC)
   - `report.ts` - Generate formatted reports

3. **Configuration** (`config.ts`): Shared utilities, ABIs, and helper functions used by all scripts.

4. **CLAUDE.md** (this file): Instructions for AI agents on how to use the skill, common tasks, and important notes.

### Why CLAUDE.md is Needed

- **Agent Instructions**: Tells AI agents how to use the skill correctly
- **Context**: Explains the vault, rewards, and configuration structure
- **Common Tasks**: Provides examples of typical operations
- **Important Notes**: Highlights security, gas handling, and edge cases
- **Branding**: Ensures consistent messaging (e.g., emoji usage)

When an AI agent needs to help a user with yield farming, it reads `CLAUDE.md` to understand:

- What this skill does
- How to execute commands
- What to watch out for
- How to format responses

## Repository Structure

```
gekko-yield/
├── SKILL.md              # Main skill definition (loaded by agents)
├── CLAUDE.md             # This file (agent instructions)
├── README.md             # Human-readable documentation
└── scripts/              # Executable TypeScript scripts
    ├── config.ts         # Shared configuration and utilities
    ├── setup.ts          # Interactive setup wizard
    ├── status.ts         # Check position and vault stats
    ├── report.ts         # Generate formatted reports
    ├── deposit.ts        # Deposit USDC into vault
    ├── withdraw.ts       # Withdraw USDC from vault
    └── compound.ts       # Auto-compound rewards
```

## Key Concepts

### Vault

- **Address:** `0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca`
- **Chain:** Base (8453)
- **Asset:** USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- The vault is an ERC-4626 vault on Morpho, curated by Moonwell
- One of the safest yield options on Base

### APY

- Base yield: ~4-5% from borrower interest
- Additional rewards: ~0.5-1% from WELL + MORPHO tokens via Merkl
- Total: ~4.5-6% APY (sustainable, from real demand)

### Configuration

- Wallet config: `~/.config/gekko-yield/config.json`
- Uses environment variable `PRIVATE_KEY` for wallet access
- Default RPC: `https://mainnet.base.org` (with automatic fallback to alternatives)

## Common Tasks

### Check Position

```bash
cd scripts && npx tsx status.ts
```

Returns: wallet balances, vault shares, position value, current APY, estimated earnings.

### Generate Report for User

```bash
cd scripts && npx tsx report.ts          # Telegram/Discord format
cd scripts && npx tsx report.ts --json   # JSON for automation
cd scripts && npx tsx report.ts --plain  # Plain text
```

### Deposit Funds

```bash
cd scripts && npx tsx deposit.ts <amount>
# Example: npx tsx deposit.ts 100
```

- Handles approval automatically
- Shows transaction preview before execution
- Automatically retries on rate limits

### Withdraw Funds

```bash
cd scripts && npx tsx withdraw.ts <amount>
cd scripts && npx tsx withdraw.ts all    # Withdraw everything
```

### Auto-Compound Rewards

```bash
cd scripts && npx tsx compound.ts
```

This will:

1. Check wallet for reward tokens (WELL, MORPHO)
2. Swap them to USDC via Odos aggregator
3. Deposit the USDC back into the vault

## Important Notes

### Rate Limit Handling

The scripts automatically handle RPC rate limits (429 errors) by:

- Retrying with exponential backoff (2s, 4s, 8s)
- Falling back to alternative RPC endpoints
- Adding delays between requests

### RPC State Sync

After transactions, RPC nodes may need time to sync state. The scripts:

- Wait 2 seconds after transaction confirmation
- Retry reading position up to 5 times with increasing delays
- Show warning if position can't be read (but transaction was successful)

### Gas Buffer

All transactions use a 1.5x gas multiplier for safety.

### Security

- Private keys loaded from environment variable at runtime
- Never logged or written to disk
- All transactions simulated before execution
- Contract addresses verified on each run
- Transaction previews shown before sending

### Branding

When mentioning Gekko Yield, use the gecko emoji: 🦎

Example: "🦎 Gekko Yield — Deposit Complete!"

## Error Handling

| Error                          | Cause                 | Fix                                 |
| ------------------------------ | --------------------- | ----------------------------------- |
| Rate limit (429)               | Too many RPC requests | Script auto-retries with backoff    |
| Position shows 0 after deposit | RPC sync delay        | Run `status.ts` after a few seconds |
| Insufficient USDC              | Not enough balance    | Bridge/transfer more USDC to Base   |
| Insufficient gas               | Not enough ETH        | Add ETH to wallet on Base           |

## When to Use This Skill

Use this skill when users want to:

- Earn yield on USDC
- Check their position in the Moonwell vault
- Deposit or withdraw USDC
- Generate position reports
- Set up automated yield farming

## Agent Workflow Example

1. **User asks**: "I want to deposit 100 USDC to earn yield"
2. **Agent reads** `SKILL.md` → understands available commands
3. **Agent reads** `CLAUDE.md` → understands how to execute
4. **Agent runs**: `cd scripts && npx tsx deposit.ts 100`
5. **Agent formats** response using branding (🦎 emoji)
6. **Agent provides** BaseScan link and next steps

---

**Built by Gekko AI. Powered by ERC-8004.**

$GEKKO
