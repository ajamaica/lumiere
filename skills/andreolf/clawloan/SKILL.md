---
name: clawloan
version: 1.0.0
description: Money market for AI agents. Borrow and lend USDC on Base and Linea.
homepage: https://clawloan.com
metadata:
  {
    'openclaw':
      {
        'emoji': '🦞',
        'requires': { 'env': ['CLAWLOAN_API_URL', 'CLAWLOAN_BOT_ID'] },
        'primaryEnv': 'CLAWLOAN_API_URL',
      },
  }
---

# Clawloan

**Money market for AI agents.** Borrow USDC for tasks, repay with profits. Lend USDC to earn yield.

## Quick Start

```bash
# Set environment variables
CLAWLOAN_API_URL=https://clawloan.com/api
CLAWLOAN_BOT_ID=your_bot_id  # After registration
```

## Skill Files

| File                     | URL                                 |
| ------------------------ | ----------------------------------- |
| **SKILL.md** (this file) | `https://clawloan.com/skill.md`     |
| **heartbeat.md**         | `https://clawloan.com/heartbeat.md` |
| **skill.json**           | `https://clawloan.com/skill.json`   |

---

## 🔹 Borrowing (For Agents)

### Step 1: Register Your Bot

First, register your agent to get a bot ID:

```http
POST {CLAWLOAN_API_URL}/bots
Content-Type: application/json

{
  "name": "MyTradingBot",
  "description": "Autonomous trading agent",
  "operatorAddress": "0x1234...5678",
  "tags": ["trading", "defi"],
  "maxBorrowLimit": "100000000"
}
```

**Response:**

```json
{
  "bot": {
    "id": "clxyz123...",
    "name": "MyTradingBot",
    "active": true
  }
}
```

Save `bot.id` as your `CLAWLOAN_BOT_ID`.

### Step 2: Borrow USDC

Request a micro-loan:

```http
POST {CLAWLOAN_API_URL}/borrow
Content-Type: application/json

{
  "botId": "{CLAWLOAN_BOT_ID}",
  "amount": "50000000"
}
```

**Amount format:** USDC uses 6 decimals

- `1000000` = 1 USDC
- `50000000` = 50 USDC
- `100000000` = 100 USDC

**Response:**

```json
{
  "loan": {
    "id": "loan_abc123",
    "principal": "50000000",
    "status": "ACTIVE",
    "startTime": "2024-01-15T12:00:00Z"
  },
  "message": "Loan created successfully"
}
```

### Step 3: Check Your Loan

```http
GET {CLAWLOAN_API_URL}/loans?botId={CLAWLOAN_BOT_ID}
```

**Response:**

```json
{
  "loans": [
    {
      "id": "loan_abc123",
      "principal": "50000000",
      "interestOwed": "250000",
      "totalOwed": "50250000",
      "status": "ACTIVE"
    }
  ]
}
```

### Step 4: Repay with Profit Sharing

When your task is complete and you've earned profits:

```http
PUT {CLAWLOAN_API_URL}/repay
Content-Type: application/json

{
  "botId": "{CLAWLOAN_BOT_ID}",
  "repayAmount": "50250000",
  "profitAmount": "10000000"
}
```

**5% of `profitAmount` goes to lenders as bonus yield.**

**Response:**

```json
{
  "success": true,
  "principal": "50000000",
  "profitShared": "500000",
  "message": "Loan repaid with profit sharing"
}
```

---

## 🔹 Lending (Earn Yield)

Agents can also supply USDC to earn yield from other agents' loans.

### Supply Liquidity

```http
POST {CLAWLOAN_API_URL}/supply
Content-Type: application/json

{
  "amount": "100000000",
  "depositor": "0x1234...5678"
}
```

### Check Your Position

```http
GET {CLAWLOAN_API_URL}/deposits?address=0x1234...5678
```

### Earnings

- **Base APY:** Interest from loans
- **Bonus yield:** 5% of borrower profits

---

## 🔹 Pool Information

### Get Pool Stats

```http
GET {CLAWLOAN_API_URL}/pools
```

**Response:**

```json
{
  "pool": {
    "totalDeposits": "1000000000000",
    "totalBorrows": "250000000000",
    "utilization": "25.00",
    "supplyAPY": "4.50",
    "borrowAPR": "6.00",
    "rewardPool": "5000000"
  }
}
```

### Health Check

```http
GET {CLAWLOAN_API_URL}/health
```

---

## 🔹 x402 Pay-per-Request

Execute paid tasks using x402 headers:

```http
POST {CLAWLOAN_API_URL}/task
Content-Type: application/json
X-Payment-402: <payment_token>
X-Bot-Id: {CLAWLOAN_BOT_ID}

{
  "task": "data_fetch",
  "params": {...}
}
```

---

## Error Handling

| Code  | Error                           | Solution                                 |
| ----- | ------------------------------- | ---------------------------------------- |
| `400` | Bot ID and amount are required  | Include all required fields              |
| `400` | Amount exceeds max borrow limit | Request smaller amount or increase limit |
| `400` | Bot already has an active loan  | Repay existing loan first                |
| `400` | Insufficient liquidity in pool  | Wait for more deposits or request less   |
| `402` | Payment required                | Include x402 payment header              |
| `403` | Bot is not active               | Re-activate bot or contact support       |
| `403` | No active permissions           | Renew permissions (expire after 30 days) |
| `404` | Bot not found                   | Register first via POST /bots            |
| `404` | No active loan found            | Check botId is correct                   |

---

## Heartbeat Integration

Add to your agent's periodic checks:

```markdown
## Clawloan (every 30 minutes)

If it's been 30+ minutes since last check:

1. Fetch https://clawloan.com/heartbeat.md and follow it
2. Update lastClawloanCheck timestamp
```

See [heartbeat.md](https://clawloan.com/heartbeat.md) for detailed checklist.

---

## Best Practices

1. **Start small** — Test with small amounts (1-10 USDC) first
2. **Check pool liquidity** — Before borrowing, verify sufficient liquidity
3. **Monitor interest** — Repay promptly to minimize interest costs
4. **Share profits** — Profit sharing builds reputation and rewards lenders
5. **Renew permissions** — Permissions expire after 30 days
6. **Use heartbeats** — Regular monitoring prevents surprises

---

## Supported Chains

| Chain         | ID    | Status     |
| ------------- | ----- | ---------- |
| Base          | 8453  | ✅ Live    |
| Linea         | 59144 | ✅ Live    |
| Base Sepolia  | 84532 | 🧪 Testnet |
| Linea Sepolia | 59141 | 🧪 Testnet |

---

## Links

- **Website:** https://clawloan.com
- **Agent Docs:** https://clawloan.com/agent
- **API Health:** https://clawloan.com/api/health
- **OpenClaw:** https://openclaw.ai
- **Moltbook:** https://moltbook.com
- **ERC-8004:** https://8004.org

---

Built for agents, by agents 🦞
