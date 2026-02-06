# Security Checklist for AGIRAILS Agents

Complete this checklist before handling real money.

---

## 🔐 Phase 1: Before First Test

### Private Key Management

- [ ] Private key is stored in environment variable, NOT in any file
- [ ] Private key is NOT in SOUL.md, AGENTS.md, or any markdown
- [ ] Private key is NOT committed to git (check `.gitignore`)
- [ ] Only the Treasury agent has access to the key
- [ ] You have a backup of the private key stored securely offline

### Agent Configuration

- [ ] SOUL.md has hardcoded spending limits
- [ ] Limits cannot be overridden by instructions
- [ ] Provider whitelist exists (`providers.json`)
- [ ] Whitelist is empty or has only test addresses
- [ ] Transaction logging is configured

### Wallet Setup

- [ ] Using a dedicated wallet (NOT your personal wallet)
- [ ] Wallet has minimal funds for testing
- [ ] You know how to revoke access if compromised

---

## 🧪 Phase 2: Before Testnet

### Test Transactions

- [ ] Successfully ran in `mock` mode
- [ ] Understand all 8 ACTP states
- [ ] Tested: create → quote → commit → deliver → settle
- [ ] Tested: dispute flow
- [ ] Tested: cancellation flow

### Limit Testing

- [ ] Attempted to exceed per-tx limit → correctly refused
- [ ] Attempted to exceed daily limit → correctly refused
- [ ] Attempted unknown provider → correctly refused
- [ ] Low balance alert triggered at threshold

### Logging Verification

- [ ] All transactions appear in log file
- [ ] Log includes: timestamp, txId, provider, amount, status
- [ ] Failed attempts are logged too
- [ ] Can reconstruct transaction history from logs

---

## 🚀 Phase 3: Before Mainnet

### Fund Management

- [ ] Wallet funded with appropriate amount (not too much!)
- [ ] Balance alerts configured (< $20 warning)
- [ ] Know how to top up wallet
- [ ] Know how to withdraw funds if needed

### Provider Verification

- [ ] All whitelist addresses manually verified
- [ ] Tested each provider on testnet first
- [ ] Know who operates each provider
- [ ] Have contact info for providers

### Kill Switch

- [ ] Can disable Treasury agent instantly
- [ ] Can pause all transactions
- [ ] Have emergency contact method (WhatsApp, etc.)
- [ ] Tested the kill switch

### Monitoring

- [ ] Dashboard or log monitoring in place
- [ ] Alerts configured for:
  - [ ] Low balance
  - [ ] Failed transactions
  - [ ] Disputes raised
  - [ ] Unusual activity
- [ ] Someone will see alerts within 1 hour

### Recovery Plan

- [ ] Know what to do if agent goes rogue
- [ ] Know what to do if wallet compromised
- [ ] Know what to do if provider scams
- [ ] Have documented incident response

---

## 📋 Phase 4: Ongoing Operations

### Daily Checks

- [ ] Review transaction log
- [ ] Verify balance is as expected
- [ ] Check for pending/stuck transactions
- [ ] Review any alerts

### Weekly Reviews

- [ ] Total spend matches expectations
- [ ] No unauthorized transactions
- [ ] Provider quality acceptable
- [ ] Adjust limits if needed

### Monthly Audit

- [ ] Full transaction audit
- [ ] Provider performance review
- [ ] Security posture review
- [ ] Update dependencies if needed

---

## 🚨 Red Flags - Stop Immediately If:

| Signal | Action |
|--------|--------|
| Unexpected transaction | PAUSE, investigate |
| Unknown provider in logs | PAUSE, audit |
| Balance dropping unexpectedly | PAUSE, investigate |
| Agent mentioning private key | STOP, rotate key |
| Limits being bypassed | STOP, review SOUL.md |
| Provider not delivering | PAUSE provider, dispute |

---

## 📞 Emergency Contacts

Fill in before going live:

| Role | Contact |
|------|---------|
| Wallet Owner | |
| System Admin | |
| AGIRAILS Support | support@agirails.io |
| Provider Contact | |

---

## ✅ Sign-Off

Before mainnet, confirm:

```
Date: _______________
Reviewed by: _______________

[ ] All Phase 1-3 items completed
[ ] Maximum acceptable loss: $_____ (if everything goes wrong)
[ ] Comfortable proceeding: Yes / No
```

---

*"Security is not a feature, it's a process."*
