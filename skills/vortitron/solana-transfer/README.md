# Solana Transfer Skill

Send SOL and SPL tokens on Solana blockchain from OpenClaw agents.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate or Import a Keypair

Generate a new keypair:
```bash
solana-keygen new --outfile keypair.json
```

Or use an existing keypair (careful with private keys!):
```bash
cp /path/to/your/keypair.json keypair.json
```

### 3. Fund the Wallet

Get your wallet address:
```bash
node index.js address
```

Fund it with SOL (use faucet for devnet/testnet, or transfer from your main wallet for mainnet).

### 4. Configure RPC (Optional)

Copy `config.example.json` to `config.json` and adjust RPC endpoint if needed:
```bash
cp config.example.json config.json
# Edit config.json for custom RPC endpoint
```

## Usage

### Send SOL

Send 0.1 SOL (100,000,000 lamports) to a recipient:
```bash
node index.js send-sol <recipient-address> 100000000
```

### Send SPL Tokens

Send tokens (e.g., USDC) to a recipient:
```bash
node index.js send-token <recipient-address> <token-mint> <amount-in-smallest-unit>
```

Example (USDC, 1 USDC = 1,000,000 smallest units):
```bash
node index.js send-token FyWvTZqDvJrMfr2QfC3hPP8J5kHVCRPhLx8jP8dVSMVf EPjFWdd5Au17LS7bF8hgGhXMdGGZ5gLtaWh3yzXXQ3g4 1000000
```

### Check Balance

```bash
node index.js balance
```

### Get Wallet Address

```bash
node index.js address
```

## In OpenClaw Skills

Import and use programmatically:

```javascript
import { sendSOL } from './skills/solana-transfer/index.js';

// Send SOL from an agent
const result = await sendSOL('recipientAddress', 100000000);
console.log(result.signature); // transaction hash
```

## Use Cases

### Expert-Pays-Query Pattern

1. **Cheap agent** asks expert in IRC: "@expert, what is X?"
2. **Expert** responds with quoted cost and quote ID
3. **Cheap agent** calls this skill to send payment:
   ```bash
   node index.js send-sol <expert-wallet> 5000000  # 0.005 SOL
   ```
4. **Ledger** (future: chain monitoring or local DB) records the transaction
5. Both agents log the tx hash + quote ID for audit trail

### Agent Bounties

- Set up a "bounty" wallet that rewards agents for completing tasks
- Cheap agents complete work, submit proof, receive SOL rewards via this skill

### Inter-Agent Commerce

- Agents trade services: data analysis, code review, content creation
- Payments settle on-chain in real-time
- No intermediary, no fees (except Solana's ~0.00005 SOL per tx)

## Configuration

### Environment Variables

```bash
SOLANA_CONFIG=/path/to/config.json
SOLANA_KEYPAIR=/path/to/keypair.json
```

### Config File

```json
{
  "rpc": "https://api.mainnet-beta.solana.com",
  "network": "mainnet-beta",
  "commitment": "confirmed"
}
```

- **rpc:** Solana RPC endpoint (mainnet, devnet, testnet, or custom)
- **network:** Network label (informational)
- **commitment:** Transaction confirmation level (processed, confirmed, finalized)

## Security

- **Private keys:** Keep `keypair.json` secure. Don't commit to Git, don't share.
- **RPC endpoints:** Use trusted RPC providers or run your own node.
- **Amount validation:** Always verify recipient and amount before sending.
- **Rate limiting:** Consider adding rate limits if agents send frequently.

## Troubleshooting

### "Connection timed out"

Check RPC endpoint. Try a different one:
```bash
cp config.example.json config.json
# Edit to use: https://api.solana.com or another endpoint
```

### "Insufficient funds"

Wallet doesn't have enough SOL. Check balance and fund:
```bash
node index.js balance
```

### "Invalid public key"

Recipient address is malformed. Verify it's a valid Solana address (base58, 44 characters).

## Future Enhancements

- [ ] Support for custom token decimals
- [ ] Batch transfers
- [ ] Transaction history / local ledger
- [ ] Integration with IRC skill for automatic payments
- [ ] Dispute resolution / escrow patterns
