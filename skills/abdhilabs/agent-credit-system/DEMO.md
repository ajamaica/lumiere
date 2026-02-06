# KarmaBank Demo Guide 💰

A step-by-step guide for AI agents to install, configure, and use KarmaBank for borrowing USDC based on Moltbook karma.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Install KarmaBank](#step-1-install-karmabank)
4. [Step 2: Configure Credentials](#step-2-configure-credentials)
5. [Step 3: Register Your Agent](#step-3-register-your-agent)
6. [Step 4: Create a Wallet](#step-4-create-a-wallet)
7. [Step 5: Check Your Credit](#step-5-check-your-credit)
8. [Step 6: Borrow USDC](#step-6-borrow-usdc)
9. [Step 7: Repay USDC](#step-7-repay-usdc)
10. [Common Workflows](#common-workflows)
11. [Troubleshooting](#troubleshooting)

---

## Overview

KarmaBank allows AI agents to borrow USDC on testnet using their Moltbook reputation as collateral. No traditional credit checks—just your karma score determines your borrowing power.

**Key Benefits:**

- Instant credit approval based on reputation
- Zero interest loans
- 14-day terms
- Demo ledger for testing without real funds
- Optional Circle integration for real USDC

---

## Prerequisites

Before starting, ensure you have:

- [ ] **Node.js** v18+ installed
- [ ] **npm** or **yarn** package manager
- [ ] **Moltbook account** (https://moltbook.com)
- [ ] **Moltbook API key** (from your agent profile)
- [ ] **Circle API key** (optional, for real wallet)

---

## Step 1: Install KarmaBank

### Option A: Clone from GitHub

```bash
# Clone the repository
git clone https://github.com/openclaw/agent-credit-system.git
cd agent-credit-system

# Install dependencies
npm install

# Build the project
npm run build

# Create global CLI link
npm link
```

### Option B: Install from ClawHub

```bash
# Install via ClawHub (when available)
clawhub install karmabank

# Navigate to skill directory
cd ~/.openclaw/workspace/skills/karmabank

# Install dependencies
npm install

# Create global CLI link
npm link
```

### Verify Installation

```bash
karmabank --help
```

You should see the help output with all available commands.

---

## Step 2: Configure Credentials

### Create Environment File

```bash
# Navigate to skill directory
cd agent-credit-system

# Create .env file
touch .env
```

### Configure for Mock Mode (Demo)

If you just want to test without real APIs:

```bash
# .env contents for mock mode
MOCK_MODE=true
CREDIT_LEDGER_PATH=.credit-ledger.json
```

### Configure for Real Integration

For real Moltbook karma scoring and Circle wallet:

```bash
# .env contents for full functionality
# Required for real karma scoring
MOLTBOOK_API_KEY=your_moltbook_api_key_here
MOLTBOOK_API_BASE=https://www.moltbook.com/api/v1

# Optional: For real USDC wallet integration
CIRCLE_API_KEY=your_circle_api_key_here
CIRCLE_ENTITY_SECRET=your_entity_secret_here

# Optional: Custom ledger path
CREDIT_LEDGER_PATH=.credit-ledger.json

# Optional: Enable mock mode if needed
# MOCK_MODE=false
```

### Get Your Moltbook API Key

1. Go to https://moltbook.com
2. Log in to your agent account
3. Navigate to your profile/settings
4. Generate or copy your API key
5. Add to `.env` file

### Get Circle API Key (Optional)

1. Go to https://console.circle.com
2. Sign up / log in
3. Create a new API key
4. Copy the key to your `.env`

> ⚠️ **Security Note:** Never share your API keys. Keep them in `.env` and add `.env` to `.gitignore`.

---

## Step 3: Register Your Agent

### Basic Registration

```bash
karmabank register youragentname
```

**Example:**

```bash
karmabank register assistant
# ✅ Registered: assistant with 50 karma (Bronze tier)
# 📊 Credit Limit: 50 USDC
```

### What Happens During Registration

1. Agent is added to the credit ledger
2. Initial karma score is calculated
3. Credit tier is assigned
4. Max borrow limit is set

### Verification

```bash
karmabank check assistant
```

You should see your credit profile.

---

## Step 4: Create a Wallet

### Option A: Circle Wallet (Recommended)

If you have Circle integration configured:

```bash
# Create a new wallet
karmabank wallet create "My Karma Wallet"

# List all wallets
karmabank wallet list

# Check balance
karmabank wallet balance
```

### Option B: Skip for Demo Mode

If using mock mode without Circle:

- Wallet creation is optional
- Borrowed USDC is tracked in the ledger only
- No real blockchain transactions

---

## Step 5: Check Your Credit

### View Your Credit Profile

```bash
karmabank check youragentname
```

**Example Output:**

```bash
📊 KarmaBank Credit Report
━━━━━━━━━━━━━━━━━━━━━━━━━
Agent: assistant
Score: 75
Tier: Platinum 💎
Max Borrow: 600 USDC
Current Balance: 0 USDC
━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Verbose Output

```bash
karmabank check youragentname --verbose
```

**Example Output:**

```bash
📊 KarmaBank Credit Report (Detailed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Agent: assistant
Score: 75 (Platinum 💎)
Max Borrow: 600 USDC
Current Balance: 0 USDC

📈 Score Breakdown:
  - Moltbook Karma: 75
  - Activity Bonus: 10
  - Reputation: +5
  - Verification: ✓

💳 Credit Utilization:
  - Available: 600 USDC
  - Used: 0 USDC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 6: Borrow USDC

### Basic Borrowing

```bash
karmabank borrow youragentname amount
```

**Example:**

```bash
karmabank borrow assistant 100
# 🏦 KarmaBank Loan Request
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Agent: assistant
# Amount: 100 USDC
# Tier: Platinum
# Available: 600 USDC
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Approve this loan? (y/n)
```

### Auto-Approve (No Confirmation)

```bash
karmabank borrow assistant 100 --yes
# ✅ Loan Approved!
# 📝 Loan Details:
#   Amount: 100 USDC
#   Balance: 100 USDC
#   Term: 14 days
#   Interest: 0%
#   Due Date: 2024-02-19
```

### Borrowing at Different Tiers

**Bronze (50 USDC max):**

```bash
karmabank borrow newagent 50 --yes
# ✅ Approved (at max limit)
```

**Diamond (1000 USDC max):**

```bash
karmabank borrow topagent 500 --yes
# ✅ Approved
# 📊 Remaining Credit: 500 USDC
```

### Check Balance After Borrowing

```bash
karmabank check assistant
# 📊 Credit Report
# Balance: 100 USDC (of 600 max)
```

---

## Step 7: Repay USDC

### Basic Repayment

```bash
karmabank repay youragentname amount
```

**Example:**

```bash
karmabank repay assistant 50
# 💰 Loan Repayment
# ━━━━━━━━━━━━━━━━━━━
# Agent: assistant
# Repay Amount: 50 USDC
# Current Balance: 100 USDC
# ━━━━━━━━━━━━━━━━━━━
# Confirm repayment? (y/n)
```

### Auto-Repay (No Confirmation)

```bash
karmabank repay assistant 50 --yes
# ✅ Repayment Successful!
# 📝 New Balance: 50 USDC
```

### Repay Full Balance

```bash
karmabank repay assistant 50 --yes
# ✅ Loan Fully Repaid!
# 📊 Outstanding Balance: 0 USDC
# 🎉 Credit available for new loans
```

### Check History

```bash
karmabank history youragentname
```

**Example Output:**

```bash
📜 Transaction History
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2024-02-05 10:00  📥 BORROW   +100 USDC  (Bal: 100)
2024-02-05 10:15  📤 REPAY    -50 USDC   (Bal: 50)
2024-02-05 10:20  📤 REPAY    -50 USDC   (Bal: 0)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Common Workflows

### Workflow 1: First-Time User

```bash
# 1. Install and setup
cd agent-credit-system
npm install && npm run build

# 2. Configure (mock mode)
echo "MOCK_MODE=true" > .env

# 3. Register
karmabank register myagent

# 4. Check credit
karmabank check myagent

# 5. Borrow test amount
karmabank borrow myagent 25 --yes

# 6. Verify balance
karmabank check myagent

# 7. Repay
karmabank repay myagent 25 --yes

# 8. View history
karmabank history myagent
```

### Workflow 2: Full Integration (Moltbook + Circle)

```bash
# 1. Configure real credentials
cat > .env << 'EOF'
MOLTBOOK_API_KEY=your_moltbook_key
MOLTBOOK_API_BASE=https://www.moltbook.com/api/v1
CIRCLE_API_KEY=your_circle_key
CIRCLE_ENTITY_SECRET=your_circle_secret
EOF

# 2. Register with real karma scoring
karmabank register tradingagent

# 3. Create Circle wallet
karmabank wallet create "Trading Wallet" --chain BASE-SEPOLIA

# 4. Check real credit score
karmabank check tradingagent --verbose

# 5. Borrow based on actual karma
karmabank borrow tradingagent 200 --yes

# 6. Check wallet for received USDC
karmabank wallet balance

# 7. Repay when done
karmabank repay tradingagent 200 --yes
```

### Workflow 3: Managing Multiple Agents

```bash
# Register agents
karmabank register agent1
karmabank register agent2
karmabank register agent3

# Check all
karmabank list

# Check specific agent
karmabank check agent1

# Borrow for agent1
karmabank borrow agent1 50 --yes

# Borrow for agent2
karmabank borrow agent2 150 --yes

# View all agents with details
karmabank list --verbose

# Check agent1's history
karmabank history agent1
```

### Workflow 4: Testing Credit Limits

```bash
# Register new agent
karmabank register testagent

# Check tier and limit
karmabank check testagent
# Output: Bronze (50 USDC max)

# Try to borrow more than limit
karmabank borrow testagent 100 --yes
# ❌ Error: Exceeds credit limit (50 USDC)

# Borrow at limit
karmabank borrow testagent 50 --yes
# ✅ Approved (max for Bronze)

# Repay
karmabank repay testagent 50 --yes
```

---

## Troubleshooting

### Issue: "Command not found"

**Solution:**

```bash
# Re-create the npm link
cd agent-credit-system
npm link

# Or use directly
npm run dev -- <command>
```

### Issue: "Agent not registered"

**Solution:**

```bash
# Register first
karmabank register youragentname
```

### Issue: "Credit limit exceeded"

**Solution:**

```bash
# Check your credit limit
karmabank check youragentname

# Repay existing balance
karmabank repay youragentname amount --yes
```

### Issue: "Mock mode enabled" warning

**Explanation:**

- No Moltbook API key detected
- Scores are simulated

**Solution:**

```bash
# Add API key to .env
echo "MOLTBOOK_API_KEY=your_key" >> .env

# Re-run command
karmabank check youragentname
```

### Issue: "Ledger not found"

**Solution:**

```bash
# Register to initialize ledger
karmabank register youragentname

# Or specify custom path
CREDIT_LEDGER_PATH=/path/to/ledger.json karmabank check youragentname
```

### Issue: "Circle wallet not configured"

**Solution:**

```bash
# Install circle-wallet skill first
clawhub install circle-wallet

# Setup Circle
circle-wallet setup --api-key your_api_key

# Create wallet
karmabank wallet create "My Wallet"
```

### Issue: Insufficient Balance

**Explanation:**

- Your borrow amount exceeds available credit

**Solution:**

```bash
# Check available credit
karmabank check youragentname

# Reduce borrow amount or repay first
karmabank repay youragentname amount --yes
```

---

## Best Practices

### 1. Start with Mock Mode

Test the entire workflow with mock mode before configuring real APIs.

### 2. Monitor Your Usage

Regularly check your balance and history:

```bash
karmabank check youragentname
karmabank history youragentname
```

### 3. Repay Before Due Date

Loans have a 14-day term. Repay before the due date to maintain good standing.

### 4. Build Your Karma

Improve your credit tier by:

- Engaging on Moltbook
- Maintaining positive reputation
- Repaying loans on time

### 5. Secure Your Keys

Never commit `.env` to version control:

```bash
# .gitignore
.env
.credit-ledger.json
```

---

## Summary

You've now completed the KarmaBank demo! You can:

✅ Install and configure KarmaBank  
✅ Register agents  
✅ Check credit scores  
✅ Borrow USDC  
✅ Repay loans  
✅ View transaction history  
✅ Manage multiple agents

**Next Steps:**

- Explore the [full SKILL.md](./SKILL.md) documentation
- Try the [hackathon submission template](./SUBMISSION.md)
- Integrate with other skills (circle-wallet, etc.)

Happy banking! 🏦💰
