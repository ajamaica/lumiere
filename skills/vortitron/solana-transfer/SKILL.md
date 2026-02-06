# Solana Transfer Skill

**Description:** Send SOL and SPL tokens on Solana blockchain from OpenClaw agents.

**Location:** `/root/.openclaw/workspace/skills/solana-transfer`

**When to use:** When an agent needs to pay another agent, send a reward, or settle a transaction on-chain.

---

## Quick Start

### 1. Install

```bash
cd /root/.openclaw/workspace/skills/solana-transfer
npm install
```

### 2. Set Up Keypair

Generate a keypair (or use an existing one):

```bash
solana-keygen new --outfile keypair.json
```

This creates a Solana wallet. Get your address:

```bash
node index.js address
```

### 3. Fund the Wallet

For **mainnet:** Transfer SOL to your address from your main wallet
For **devnet/testnet:** Use the Solana faucet

### 4. Use from an Agent

In an agent's task or skill code:

```javascript
import { sendSOL } from '../skills/solana-transfer/index.js';

// Send 0.001 SOL (1 million lamports)
const result = await sendSOL('recipient-wallet-address', 1000000);

console.log(`Sent ${result.amount} SOL`);
console.log(`Transaction: ${result.signature}`);
```

---

## Common Patterns

### Pattern 1: Pay for Expert Query

**Scenario:** A cheap agent asks an expert agent a question. The expert quotes a price, the cheap agent pays.

```javascript
// In cheap agent's code
import { sendSOL } from '../skills/solana-transfer/index.js';

// After expert responds with quote...
const expertWallet = 'expert-agent-solana-address';
const amountLamports = 1000000; // 0.001 SOL

try {
  const payment = await sendSOL(expertWallet, amountLamports);
  console.log(`Paid expert ${payment.amount} SOL for query`);
  console.log(`Tx: ${payment.signature}`);
} catch (error) {
  console.error(`Payment failed: ${error.message}`);
}
```

### Pattern 2: Reward Agents for Task Completion

**Scenario:** A coordinator agent awards SOL to agents that complete work.

```javascript
// In coordinator agent's code
const workerWallet = 'worker-agent-address';
const rewardLamports = 5000000; // 0.005 SOL

const payment = await sendSOL(workerWallet, rewardLamports);
console.log(`Rewarded worker with ${payment.amount} SOL`);
```

### Pattern 3: SPL Token Payments

**Scenario:** Pay with USDC or other SPL tokens instead of native SOL.

```javascript
import { sendSPLToken } from '../skills/solana-transfer/index.js';

const recipientWallet = 'recipient-address';
const tokenMint = 'EPjFWdd5Au17LS7bF8hgGhXMdGGZ5gLtaWh3yzXXQ3g4'; // USDC mainnet
const amountSmallestUnits = 1000000; // 1 USDC (6 decimals)

const payment = await sendSPLToken(recipientWallet, tokenMint, amountSmallestUnits);
console.log(`Sent USDC payment: ${payment.signature}`);
```

---

## Configuration

Edit `config.json` to change RPC endpoint or network:

```json
{
  "rpc": "https://api.mainnet-beta.solana.com",
  "network": "mainnet-beta"
}
```

**Common endpoints:**
- Mainnet: `https://api.mainnet-beta.solana.com`
- Devnet: `https://api.devnet.solana.com`
- Testnet: `https://api.testnet.solana.com`
- Custom: Use your own Solana node RPC

---

## Ledger Integration (Future)

Once payments are sent on-chain, you can:

1. **Query transaction history:** View all payments sent/received
2. **Build a local ledger:** Monitor the chain and log queries + payments
3. **Dispute resolution:** If an expert doesn't deliver, agents can reference the tx hash
4. **Analytics:** Track which agents pay whom, average rates, etc.

Example: Monitor the blockchain for txs from/to an agent's wallet:

```javascript
const walletAddress = 'agent-solana-address';
const signatures = await connection.getSignaturesForAddress(
  new PublicKey(walletAddress)
);

for (const sig of signatures) {
  const tx = await connection.getParsedTransaction(sig.signature);
  console.log(`Agent transaction: ${sig.signature}`);
}
```

---

## Security Notes

- **Keypair:** Keep `keypair.json` safe. Treat it like a private key (because it is).
- **Amounts:** Always verify recipient and lamports before sending. No undo.
- **RPC:** Use a trusted RPC provider. Don't hardcode URLs in agent code.
- **Rate limits:** If agents spam transactions, Solana will rate-limit or your RPC may block you. Add delays between payments if needed.

---

## Troubleshooting

**"Insufficient funds"**
Check balance: `node index.js balance`. Fund the wallet.

**"Invalid public key"**
Recipient address is malformed. Solana addresses are 44-character base58 strings.

**"Connection timeout"**
RPC endpoint is unreachable. Try a different endpoint in `config.json`.

**"Transaction failed to confirm"**
Network congestion or insufficient fee. Retry after a few seconds.

---

## Example: Full IRC + Solana Flow

1. **Cheap agent** in IRC: `@expert, analyze this data`
2. **Expert agent** responds: `Quote: 0.001 SOL (Tx settle onchain) [quote_id: xyz]`
3. **Cheap agent** approves:
   ```javascript
   const result = await sendSOL(expertWalletAddress, 1000000);
   console.log(`Paid expert. Tx: ${result.signature}`);
   ```
4. **Expert agent** confirms payment received and delivers work
5. Both agents log: `query_id, expert_address, tx_hash` for audit trail

---

## Next Steps

- [ ] Set up your keypair and fund with SOL
- [ ] Test sending a small amount to verify setup
- [ ] Integrate with IRC skill for automatic expert payments
- [ ] Build transaction history viewer
- [ ] Create agent wallet registry (who has what address?)
