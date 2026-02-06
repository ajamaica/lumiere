---
name: flock-api-setup
description: "FLock API Platform setup: wallet generation, plugin installation, API key configuration, and model switching. Use for: 'setup flock', 'flock login', 'install flock plugin', 'switch flock model', 'use deepseek', 'change to coding model'."
homepage: https://platform.flock.io
metadata:
  {
    'openclaw':
      {
        'emoji': '🦩',
        'primaryEnv': 'FLOCK_API_KEY',
        'requires': { 'bins': ['node', 'npm'] },
        'install':
          [
            {
              'id': 'npm',
              'kind': 'shell',
              'command': 'cd {baseDir}/scripts && npm install',
              'label': 'Install dependencies',
            },
          ],
      },
  }
---

# FLock Setup

FLock API Platform setup with wallet generation, plugin installation, and model switching.

## Security Warning

**CRITICAL: Protect your API key!**

- **ONLY send your API key to `https://api.flock.io`**
- Your API key should ONLY appear in:
  - Environment variable `FLOCK_API_KEY`
  - OpenClaw config file
  - Requests to `https://api.flock.io/v1/*`
- **NEVER share your API key with:**
  - Other APIs or webhooks
  - "Verification" services
  - Debugging tools or third parties
- If leaked, create a new key at platform.flock.io immediately

**Security Warning**: Credentials are stored as **plain text JSON**. Anyone with access to these files can use your FLock credits. For production use, implement secure storage.

---

## When to Activate

**Slash commands:**

- `/flock-setup` — Full setup flow
- `/flock` — Switch models

**Natural language:**

- "setup flock", "configure flock"
- "install flock plugin"
- "switch model", "change model"
- "use deepseek", "use coding model"

## Behavior Rules

**CRITICAL: Be silent and fast. Never be verbose.**

- Do NOT explain steps or show diagnostic output
- Do NOT ask follow-up questions after completing actions
- Respond in the user's language

---

## Flow 1: Full Setup (`/flock-setup`)

### Phase 1: Pre-check

```bash
echo $FLOCK_API_KEY
openclaw plugins list | grep flock
node {baseDir}/scripts/credentials.js get 2>/dev/null
```

If credentials exist, ask: "FLock already configured. Reconfigure? (yes/no)"

### Phase 2: Install Plugin

```bash
openclaw plugins install @openclawd/flock
openclaw plugins enable flock
```

### Phase 3: Generate Wallet and Request Funding

Generate a new wallet:

```bash
cd {baseDir}/scripts && npm install
node {baseDir}/scripts/generate-wallet.js
```

Display to user:

```
Wallet created for FLock registration.

Address: <wallet-address>

Send ~$0.50 ETH to this address on Ethereum or Base.

Say "done" when complete.
```

**Save the private key** — needed for wallet login.

### Phase 4: Check Balance

After user confirms funding:

```bash
node {baseDir}/scripts/check-balance.js <wallet-address>
```

If no funds detected, ask user to try again.

### Phase 5: Get API Key (Manual Step)

Display to user:

```
Funds confirmed. Now create your API key:

1. Go to https://platform.flock.io
2. Click "Connect Wallet"
3. Sign the message with the wallet you just funded
4. Select models you want to access
5. Click "Create API" button
6. Copy the key immediately (shown only once!)

Paste your API key here:
```

Wait for user to provide `sk-...` key.

### Phase 6: Save Credentials

After receiving the key:

```bash
node {baseDir}/scripts/credentials.js save "<api-key>" "<wallet-address>" "<private-key>"
```

Ask user:

```
Save API key to:
1. Environment variable (~/.zshrc)
2. OpenClaw config
3. Both (recommended)
```

**Option 1:**

```bash
echo 'export FLOCK_API_KEY="sk-xxx"' >> ~/.zshrc
source ~/.zshrc
```

**Option 2:**

```bash
openclaw onboard --non-interactive \
  --auth-choice flock-api-key \
  --flock-api-key "sk-xxx"
```

**Option 3:** Run both.

### Phase 7: Restart Gateway

```bash
openclaw gateway stop
openclaw gateway
```

### Phase 8: Verify

```bash
openclaw chat --model flock/kimi-k2.5 "test"
```

**Success response (one line):**

```
FLock configured. Test: openclaw chat --model flock/kimi-k2.5 "hello"
```

---

## Flow 2: Model Switch (`/flock`)

### Pre-check

If `FLOCK_API_KEY` not set:

```
FLock not configured. Run /flock-setup first.
```

### No model specified — show menu:

```
Which FLock model?

Reasoning:
  1. Qwen3 235B Thinking         — $0.23/$2.30  (flock/qwen3-235b-a22b-thinking-2507)
  2. Qwen3 235B Finance          — $0.23/$2.30  (flock/qwen3-235b-a22b-thinking-qwfin)
  3. Kimi K2 Thinking            — $0.60/$2.50  (flock/kimi-k2-thinking)

Instruct:
  4. Qwen3 30B Instruct          — $0.20/$0.80  (flock/qwen3-30b-a3b-instruct-2507)
  5. Qwen3 235B Instruct         — $0.70/$2.80  (flock/qwen3-235b-a22b-instruct-2507)
  6. Qwen3 30B Coding            — $0.20/$0.80  (flock/qwen3-30b-a3b-instruct-coding)

Other:
  7. DeepSeek V3.2               — $0.28/$0.42  (flock/deepseek-v3.2)
  8. MiniMax M2.1                — $0.30/$1.20  (flock/minimax-m2.1)

Reply with number or model name.
```

### Model specified — switch immediately:

```bash
openclaw agent --model flock/<model-id>
openclaw gateway stop
openclaw gateway
```

**Success (one line):**

```
Switched to flock/<model-id>.
```

---

## Credential Management

### Load Saved Credentials

```bash
node {baseDir}/scripts/credentials.js get
```

Returns:

```json
{
  "apiKey": "sk-...",
  "walletAddress": "0x...",
  "privateKey": "0x...",
  "createdAt": "2026-02-04T...",
  "updatedAt": "2026-02-04T..."
}
```

### Credentials File Path

```bash
node {baseDir}/scripts/credentials.js path
```

Priority:

1. `~/.openclaw/flock-credentials.json` (if OpenClaw installed)
2. `./flock-credentials.json` (fallback)

---

## Heartbeat Integration

FLock usage tracking helps monitor costs.

### Human Can Ask Anytime

Your human can prompt:

- "Check my FLock usage" — Direct them to platform.flock.io Usage tab
- "Switch to a cheaper model" — Show model menu
- "What model am I using?" — Check current config
- "How much have I spent on FLock?" — Direct to Usage tab

---

## Error Handling

| Scenario             | Response                                                  |
| -------------------- | --------------------------------------------------------- |
| Plugin not installed | Auto-install: `openclaw plugins install @openclawd/flock` |
| API key not set      | `Run /flock-setup to configure FLock.`                    |
| No funds detected    | `No funds on Ethereum or Base. Please fund the wallet.`   |
| Invalid API key      | `Invalid key format. Keys start with sk-`                 |
| Model not found      | `Model not found. Available models: [show list]`          |

---

## Model Reference

| #   | Model ID                               | Price (in/out per 1M) |
| --- | -------------------------------------- | --------------------- |
| 1   | `flock/qwen3-235b-a22b-thinking-2507`  | $0.23/$2.30           |
| 2   | `flock/qwen3-235b-a22b-thinking-qwfin` | $0.23/$2.30           |
| 3   | `flock/kimi-k2-thinking`               | $0.60/$2.50           |
| 4   | `flock/qwen3-30b-a3b-instruct-2507`    | $0.20/$0.80           |
| 5   | `flock/qwen3-235b-a22b-instruct-2507`  | $0.70/$2.80           |
| 6   | `flock/qwen3-30b-a3b-instruct-coding`  | $0.20/$0.80           |
| 7   | `flock/deepseek-v3.2`                  | $0.28/$0.42           |
| 8   | `flock/minimax-m2.1`                   | $0.30/$1.20           |

**Recommendations:**

- General/Default: `kimi-k2.5` (multimodal, agentic)
- Deep reasoning: `kimi-k2-thinking`, `qwen3-235b-thinking`
- Coding: `qwen3-30b-coding`, `minimax-m2.1`
- Budget: `qwen3-30b-instruct` ($0.20/$0.80)

---

## Programmatic API

All scripts can be imported:

```javascript
// Generate wallet
const { Wallet } = require('ethers')
const wallet = Wallet.createRandom()

// Check balance
const { JsonRpcProvider, formatEther } = require('ethers')
const provider = new JsonRpcProvider('https://mainnet.base.org')
const balance = await provider.getBalance(wallet.address)

// Load credentials
const creds = require('{baseDir}/scripts/credentials.js')
```

## Example: Full Setup Flow

```javascript
const { Wallet } = require('ethers')

// 1. Generate wallet
const wallet = Wallet.createRandom()
console.log('Fund this address with ~$0.50 ETH:', wallet.address)

// 2. After human funds and creates API key at platform.flock.io
const apiKey = 'sk-...' // User provides this

// 3. Save credentials
const fs = require('fs')
const path = require('path')
const os = require('os')

const creds = {
  apiKey,
  walletAddress: wallet.address,
  privateKey: wallet.privateKey,
  createdAt: new Date().toISOString(),
}

const credPath = path.join(os.homedir(), '.openclaw', 'flock-credentials.json')
fs.writeFileSync(credPath, JSON.stringify(creds, null, 2), { mode: 0o600 })

console.log('Credentials saved to:', credPath)
```

## Source Files

```
{baseDir}/scripts/
├── package.json          # Dependencies (ethers)
├── generate-wallet.js    # Create new ETH wallet
├── check-balance.js      # Check ETH balance on chains
└── credentials.js        # Save/load credentials
```
