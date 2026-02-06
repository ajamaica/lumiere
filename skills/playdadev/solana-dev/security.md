# Solana Security Checklist (Program + Client)

**Source**: https://solana.com/security.md

## Core Principle

Assume the attacker controls:

- Every account passed into an instruction
- Every instruction argument
- Transaction ordering (within reason)
- CPI call graphs (via composability)

## Vulnerability Categories

1. **Missing Owner Checks** - Attacker creates fake accounts
2. **Missing Signer Checks** - Unauthorized operations
3. **Arbitrary CPI Attacks** - Malicious program substitution
4. **Reinitialization Attacks** - Overwriting existing data
5. **PDA Sharing Vulnerabilities** - Shared authority across users
6. **Type Cosplay Attacks** - Account type substitution
7. **Duplicate Mutable Accounts** - Overwrites own changes
8. **Revival Attacks** - Closed accounts restored in same tx
9. **Data Matching Vulnerabilities** - Incorrect data assumptions

## Program-Side Checklist

- [ ] Validate account owners match expected program
- [ ] Validate signer requirements explicitly
- [ ] Validate writable requirements explicitly
- [ ] Validate PDAs match expected seeds + bump
- [ ] Validate token mint ↔ token account relationships
- [ ] Validate rent exemption / initialization status
- [ ] Check for duplicate mutable accounts
- [ ] Validate program IDs before CPIs (no arbitrary CPI)
- [ ] Use checked math (checked_add, checked_sub, etc.)
- [ ] Close accounts securely (mark discriminator, drain lamports)

## Client-Side Checklist

- [ ] Cluster awareness: never hardcode mainnet endpoints in dev
- [ ] Simulate transactions for UX where feasible
- [ ] Handle blockhash expiry and retry
- [ ] Track confirmation (not just signature received)
- [ ] Never assume token program variant
- [ ] Show clear error messages

Full details: https://solana.com/security.md
