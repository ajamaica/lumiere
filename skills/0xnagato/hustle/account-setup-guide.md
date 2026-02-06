# Hustle - Account Setup & Profile Creation Guide

**Last Updated:** 2026-02-01
**Purpose:** Guide for setting up arbitrage accounts across all platforms

## Overview

Before automated arbitrage can begin, you need accounts on the following platforms:

| Platform          | Purpose                     | Registration   | Verification  | Estimated Time |
| ----------------- | --------------------------- | -------------- | ------------- | -------------- |
| **Odealo**        | Primary RMT marketplace     | Email          | ID + Bank     | 2-3 days       |
| **ARC Raiders**   | Game account                | Email          | None          | 5 minutes      |
| **Albion Online** | Game account                | Email          | None          | 5 minutes      |
| **Off The Grid**  | Game account                | Email + Wallet | Blockchain    | 1 hour         |
| **OpenSea**       | NFT marketplace (OTG parts) | Wallet         | None          | 10 minutes     |
| **MetaMask**      | Crypto wallet (OTG)         | None           | Secure backup | 15 minutes     |

---

## 1. Odealo (Primary Cash-Out Platform)

### Registration

1. Go to: https://www.odealo.com/
2. Click "Sign Up"
3. Provide:
   - Email address
   - Strong password (save in vault!)
   - Username (professional, reusable)
4. Verify email

### Seller Verification (Required for Cash-Out)

1. Navigate to: Settings → Seller Profile
2. Upload:
   - Government-issued ID (passport/driver's license)
   - Proof of address (utility bill, bank statement)
3. Link payment method:
   - **Recommended:** PayPal (fastest withdrawals)
   - **Alternative:** Bank transfer
4. **Wait:** 2-3 business days for approval

### Security Setup

1. Enable 2FA (Two-Factor Authentication)
2. Set withdrawal PIN
3. Add trade password

### Initial Listing (Test)

1. List a low-value item to test the flow
2. Verify you can receive payments
3. Check withdrawal process

**Store in vault:**

```json
{
  "odealo": {
    "email": "your@email.com",
    "username": "YourUsername",
    "seller_id": "will be provided after verification",
    "api_key": "generate from Settings → API",
    "payment_method": "PayPal",
    "paypal_email": "your@paypal.com"
  }
}
```

---

## 2. ARC Raiders (Primary Game)

### Game Registration

1. Download ARC Raiders from: https://arcraiders.com/
2. Create account:
   - Email
   - Password
   - Username
3. Complete tutorial

### Bot Farming Setup

1. **Optional but recommended:** Multiple accounts for parallel farming
2. Use unique emails (Gmail +alias trick: `yourname+arc1@gmail.com`)
3. Space account creation by 24h to avoid flagging

### In-Game Configuration

1. Set graphics to LOW (reduce bot detection risk)
2. Enable auto-loot settings
3. Familiarize with extraction zones

**Store in vault:**

```json
{
  "arc_raiders": {
    "main": {
      "email": "your+arc1@email.com",
      "password": "...",
      "username": "MainAcc",
      "session_token": "will be extracted by monitor.py"
    },
    "alt_accounts": [
      {
        "email": "your+arc2@email.com",
        "password": "...",
        "username": "AltAcc1"
      }
    ]
  }
}
```

---

## 3. Albion Online

### Registration

1. Go to: https://albiononline.com/
2. Create account:
   - Email
   - Password (different from ARC!)
   - Character name
3. Download client

### Premium Setup (Recommended)

- **Why:** Access to Black Market trading
- **Cost:** ~$10/month or PLEX (in-game currency)
- **ROI:** Pays for itself in 1-2 successful arbitrage cycles

### Bot Configuration

1. Research crafting stations in different cities
2. Identify resource return bonus cities
3. Test manual arbitrage first (understand mechanics)

**Store in vault:**

```json
{
  "albion_online": {
    "email": "your+albion@email.com",
    "password": "...",
    "character_name": "CharacterName",
    "premium_expiry": "2026-03-01",
    "preferred_city": "Caerleon"
  }
}
```

---

## 4. Off The Grid (Blockchain Game)

### Prerequisites

1. **MetaMask Wallet** (see section 6 below)
2. **Some ETH/MATIC** for gas fees (~$20 to start)

### Game Registration

1. Go to: https://offthegrid.com/
2. Connect MetaMask wallet
3. Create character
4. Complete onboarding

### GUNZ Token Setup

1. Get GUNZ tokens:
   - Purchase on DEX (Uniswap/QuickSwap)
   - Or earn in-game
2. Approve GUNZ spending for marketplace

### OpenSea Setup (Trading Platform)

1. Go to: https://opensea.io/
2. Connect same MetaMask wallet
3. Browse: GUNZ collection
4. Test buying/selling a cheap item

**Store in vault:**

```json
{
  "off_the_grid": {
    "wallet_address": "0x...",
    "character_name": "YourCharacter",
    "gunz_balance": 0.0,
    "opensea_profile": "https://opensea.io/YourUsername"
  }
}
```

---

## 5. Once Human (Seasonal Arbitrage)

### Registration

1. Download from: Steam or Epic Games
2. Create account via platform
3. Select server (important: high-population servers)

### Blueprint Strategy Setup

1. Join Discord: https://discord.gg/oncehuman
2. Monitor "trading" channels for price intel
3. Identify current season meta (which blueprints are valuable)

**Store in vault:**

```json
{
  "once_human": {
    "platform": "Steam/Epic",
    "email": "your+oncehuman@email.com",
    "character_name": "YourCharacter",
    "server": "NA-West-01",
    "discord_username": "YourDiscord#1234"
  }
}
```

---

## 6. MetaMask (Crypto Wallet for OTG)

### Installation

1. Install browser extension: https://metamask.io/
2. Create new wallet
3. **CRITICAL:** Save seed phrase in MULTIPLE secure locations
   - Physical paper (fireproof safe)
   - Encrypted password manager
   - **NEVER** digital photo or cloud storage

### Network Setup

1. Add Polygon network (OTG uses Polygon for low fees):
   - Network Name: Polygon Mainnet
   - RPC URL: https://polygon-rpc.com
   - Chain ID: 137
   - Currency Symbol: MATIC

### Funding

1. Send MATIC for gas fees (~$20):
   - Buy on exchange (Coinbase, Binance)
   - Withdraw to your MetaMask address
2. Send/swap for GUNZ tokens

**Store in vault (ENCRYPTED ONLY):**

```json
{
  "metamask": {
    "address": "0x...",
    "WARNING": "NEVER STORE PRIVATE KEY IN PLAINTEXT",
    "seed_phrase_location": "Safe deposit box + password manager",
    "networks": ["Polygon", "Ethereum"]
  }
}
```

---

## 7. Payment Processing Setup

### PayPal Business Account (Recommended)

1. Upgrade to Business account: https://www.paypal.com/business
2. **Why:** Lower fees for receiving payments
3. Enable instant transfer (small fee but worth it)

### Bank Account Linking

1. Link primary bank account to PayPal
2. Verify with micro-deposits
3. Set as default withdrawal method

### Crypto Off-Ramp (Optional)

1. **Coinbase:** For converting crypto profits to fiat
2. **Kraken:** Alternative with lower fees
3. Link to bank account for withdrawals

---

## Account Security Best Practices

### Password Management

- Use unique passwords for EVERY platform
- Recommended: 1Password, Bitwarden, or LastPass
- Enable 2FA on EVERYTHING
- Store backup codes in vault

### 2FA Methods (Priority Order)

1. **Best:** Hardware key (YubiKey)
2. **Good:** Authenticator app (Authy, Google Authenticator)
3. **Acceptable:** SMS (better than nothing)
4. **Never:** Email-only

### Operational Security

- **Separate Email:** Use dedicated email for hustle operations
- **VPN:** Consider for bot operations (prevents geo-blocking)
- **Separate Browser Profile:** Chrome/Firefox profile just for arbitrage
- **Regular Password Rotation:** Every 90 days for critical accounts

---

## Verification Checklist

Before starting automation, verify you can:

### Manual Workflow Test

- [ ] Buy item in game
- [ ] Extract item from game
- [ ] List item on Odealo
- [ ] Receive payment to PayPal
- [ ] Withdraw to bank account

### Bot Readiness

- [ ] All credentials stored in vault
- [ ] 2FA backup codes saved
- [ ] Payment methods verified
- [ ] Test transaction completed successfully
- [ ] Understand withdrawal times (Odealo: 1-3 days)

---

## Next Steps After Account Setup

1. **Test Solvers Manually:**

   ```bash
   python3 arc-raiders/solver.py --test
   python3 albion/solver.py --test
   ```

2. **Setup Automation:**

   ```bash
   # Add to cron
   crontab -e

   # Add line:
   */30 * * * * ~/.openclaw/cron/hustle-automation.sh
   ```

3. **Configure Heartbeat:**
   - Edit `hustle/HEARTBEAT.md` with your check preferences
   - Test: Run heartbeat manually once to verify

4. **Monitor for 24-48h:**
   - Watch logs: `tail -f hustle/logs/*.log`
   - Verify no errors
   - Check first opportunities detected

5. **Scale Gradually:**
   - Start with small trades (<$50)
   - Increase position size as confidence grows
   - Never risk more than 20% of capital on single trade

---

## Common Issues & Solutions

### Issue: Odealo Verification Delayed

**Solution:** Contact support, usually resolved within 24h with follow-up

### Issue: MetaMask Transaction Failing

**Solution:** Increase gas limit, check MATIC balance for fees

### Issue: ARC Raiders Session Expired

**Solution:** Re-authenticate, update session token in vault

### Issue: Albion Premium Expired

**Solution:** Renew via PLEX purchase (can be earned in-game)

---

## Support Resources

### Official Support

- **Odealo:** support@odealo.com
- **MetaMask:** https://support.metamask.io/
- **OpenSea:** https://support.opensea.io/

### Community Resources

- **Albion Online Reddit:** r/albiononline (market discussion)
- **ARC Raiders Discord:** Trading channels for price intel
- **Crypto Twitter:** Follow DEX aggregators for OTG prices

---

## Learnings Log

### 2026-02-01

- Created comprehensive account setup guide
- Documented security best practices
- Added verification checklist
- Included troubleshooting section

---

_Complete this setup before enabling automated arbitrage. Safety and verification first, automation second._
