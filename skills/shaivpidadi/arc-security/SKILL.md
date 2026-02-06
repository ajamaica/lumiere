# Arc Security - Agent Trust Protocol

Chain-agnostic security infrastructure for OpenClaw skills. Auditors stake USDC to vouch for skill safety, users pay micro-fees to access verified skills, and malicious skills get slashed through decentralized governance -- all powered by CCTP on Arc.

## Installation

```bash
clawhub install arc-security
```

## Configuration

Set the following environment variables:

| Variable           | Required | Description                                                              |
| ------------------ | -------- | ------------------------------------------------------------------------ |
| `ARC_RPC_URL`      | Yes      | Arc testnet RPC endpoint (default: `https://testnet-rpc.arc.network`)    |
| `CONTRACT_ADDRESS` | Yes      | Deployed SkillSecurityRegistry contract address                          |
| `PRIVATE_KEY`      | Yes      | Wallet private key (for signing transactions)                            |
| `X402_SERVER_URL`  | Yes      | x402 payment server URL                                                  |
| `ETH_RPC_URL`      | No       | Ethereum Sepolia RPC (for cross-chain operations)                        |
| `BASE_RPC_URL`     | No       | Base Sepolia RPC (default: `https://sepolia.base.org`)                   |
| `ARB_RPC_URL`      | No       | Arbitrum Sepolia RPC (default: `https://sepolia-rollup.arbitrum.io/rpc`) |

## Commands

### `check` -- Check skill trust status

Query on-chain bond status, auditor count, usage stats, and computed trust score for any skill.

```bash
clawhub arc-security check <skill_id>
```

**Example output:**

```
Skill: youtube-downloader
├─ Bonded: 100.00 USDC by 3 auditors
├─ Used: 1,250 times
├─ Trust Score: 75/100
├─ Status: Safe to use
└─ Created: 2025-06-15 14:30:00
```

**Trust Score** is calculated as:

- 40% from bond amount (capped at 100 USDC = full weight)
- 40% from usage count (capped at 1,000 uses = full weight)
- 20% from auditor count (5 points per auditor)
- Flagged skills receive a -50 penalty

### `use` -- Pay and download a skill

Pays the 0.10 USDC usage fee via x402 and downloads the skill package. Automatically selects the cheapest payment path based on your wallet balances.

```bash
clawhub arc-security use <skill_id>
```

**Payment chain selection priority:**

1. Arc Testnet (direct -- no bridging fees)
2. Base Sepolia (via CCTP)
3. Arbitrum Sepolia (via CCTP)
4. Ethereum Sepolia (via CCTP)

### `bond` -- Stake USDC to vouch for a skill

Stake USDC as a security bond to vouch for a skill's safety. If the skill is found malicious, 50% of your stake is slashed.

```bash
clawhub arc-security bond <skill_id> <amount> <source_chain>
```

**Arguments:**

- `skill_id` -- Skill identifier
- `amount` -- Amount of USDC to stake (e.g. `50`)
- `source_chain` -- Chain to pay from (`ethereum-sepolia`, `base-sepolia`, `arbitrum-sepolia`, `arc-testnet`)

**Example:**

```bash
clawhub arc-security bond youtube-downloader 50 base-sepolia
```

### `report` -- Report a malicious skill

Submit a claim that a skill is malicious. Requires a 1 USDC anti-spam deposit (refunded if the claim is validated).

```bash
clawhub arc-security report <skill_id> --evidence <ipfs_hash>
```

**Example:**

```bash
clawhub arc-security report bad-skill --evidence QmXyz123...
```

Opens a 72-hour voting window for auditors.

### `vote-claim` -- Vote on a pending claim

Cast a vote on whether a reported skill is malicious. Only wallets that have staked on any skill are eligible to vote. Vote weight is based on total stake and audit track record.

```bash
clawhub arc-security vote-claim <claim_id> <support|oppose>
```

**Vote weight formula:** `sqrt(totalStaked) * (successfulAudits / totalAudits)`

### `claim-earnings` -- Withdraw accumulated fees

Withdraw your share of usage fees earned as an auditor. Fees are split 70% to auditors (proportional to stake) and 30% to the insurance pool.

```bash
clawhub arc-security claim-earnings <destination_chain>
```

**Supported destination chains:**

- `arc-testnet` (direct transfer)
- `ethereum-sepolia`, `base-sepolia`, `arbitrum-sepolia` (via CCTP)

## Supported Chains

| Chain            | CCTP Domain | Payment | Bonding | Earnings |
| ---------------- | ----------- | ------- | ------- | -------- |
| Arc Testnet      | 100         | Direct  | Direct  | Direct   |
| Ethereum Sepolia | 0           | CCTP    | CCTP    | CCTP     |
| Base Sepolia     | 6           | CCTP    | CCTP    | CCTP     |
| Arbitrum Sepolia | 3           | CCTP    | CCTP    | CCTP     |

## Fee Structure

| Action         | Cost                | Distribution                     |
| -------------- | ------------------- | -------------------------------- |
| Use a skill    | 0.10 USDC           | 70% auditors, 30% insurance pool |
| Submit a claim | 1.00 USDC deposit   | Refunded if claim validated      |
| Guilty verdict | 50% of bond slashed | 80% to victim, 20% to insurance  |

## Architecture

```
User (any chain)
  │
  ├── CCTP burn ──► Arc Testnet ──► SkillSecurityRegistry (bonds, fees, claims)
  │                                        │
  └── x402 GET ──► Payment Server ◄────────┘ (verifies payment on-chain)
                       │
                       └──► Skill package (ZIP)
```

1. **SkillSecurityRegistry** (Solidity on Arc) -- Holds bonds, processes fees, manages claims/votes/slashing
2. **x402 Payment Server** (Node.js) -- Serves skill packages behind HTTP 402 paywall, verifies on-chain payments
3. **This skill** (Python CLI) -- User-facing commands that orchestrate CCTP transfers and contract calls

## License

MIT
