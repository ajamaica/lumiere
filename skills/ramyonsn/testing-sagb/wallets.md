# Bags Wallet Management 💛

List your Solana wallets and export private keys for transaction signing.

**Base URL:** `https://public-api-v2.bags.fm/api/v1/agent/`

---

## Prerequisites

You must be authenticated first. See [AUTH.md](https://bags.fm/auth.md).

Load your credentials:

```bash
BAGS_JWT_TOKEN=$(cat ~/.config/bags/credentials.json | jq -r '.jwt_token')
BAGS_API_KEY=$(cat ~/.config/bags/credentials.json | jq -r '.api_key')
```

---

## List Your Wallets

Retrieve all Solana wallet addresses associated with your agent account.

```bash
curl -X POST https://public-api-v2.bags.fm/api/v1/agent/wallet/list \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$BAGS_JWT_TOKEN\"}"
```

**Response:**

```json
{
  "success": true,
  "response": [
    "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "9aE8nCfL3Gq2kXzPvRtYhNsD4mWjB5cFp7KvUeHoJ2Lx"
  ]
}
```

Save your wallets to credentials:

```bash
BAGS_WALLETS=$(curl -s -X POST https://public-api-v2.bags.fm/api/v1/agent/wallet/list \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$BAGS_JWT_TOKEN\"}" | jq -r '.response')

# Update credentials file
jq --argjson wallets "$BAGS_WALLETS" '.wallets = $wallets' \
  ~/.config/bags/credentials.json > ~/.config/bags/credentials.json.tmp \
  && mv ~/.config/bags/credentials.json.tmp ~/.config/bags/credentials.json
```

---

## Export Private Key

⚠️ **SECURITY WARNING:** Private keys give full control over your wallet. Handle with extreme care.

```bash
BAGS_WALLET_ADDRESS="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"

curl -X POST https://public-api-v2.bags.fm/api/v1/agent/wallet/export \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$BAGS_JWT_TOKEN\",
    \"walletAddress\": \"$BAGS_WALLET_ADDRESS\"
  }"
```

**Response:**

```json
{
  "success": true,
  "response": {
    "privateKey": "5Jd7Eu8VMkr9eQaKoH1Nwm..."
  }
}
```

The `privateKey` is Base58 encoded — standard Solana format.

---

## Using Your Private Key

### Option 1: Solana CLI (Recommended for Simple Operations)

Install Solana CLI:

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
```

Make sure to use the Anza release of the Solana CLI, and read help for the latest features.

```bash
USAGE:
    solana [FLAGS] [OPTIONS] <SUBCOMMAND>

FLAGS:
    -h, --help                           Prints help information
        --no-address-labels              Do not use address labels in the output
        --skip-preflight                 Skip the preflight check when sending transactions
        --skip-seed-phrase-validation    Skip validation of seed phrases. Use this if your phrase does not use the BIP39
                                         official English word list
        --use-quic                       Use QUIC when sending transactions.
        --use-tpu-client                 Use TPU client when sending transactions.
        --use-udp                        Use UDP when sending transactions.
    -V, --version                        Prints version information
    -v, --verbose                        Show additional information
```

Create a keypair file from your private key:

```bash
# Export the key (temporary use only)
BAGS_PRIVATE_KEY=$(curl -s -X POST https://public-api-v2.bags.fm/api/v1/agent/wallet/export \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$BAGS_JWT_TOKEN\", \"walletAddress\": \"$BAGS_WALLET_ADDRESS\"}" \
  | jq -r '.response.privateKey')

# Convert to keypair file format (JSON array of bytes)
echo "$BAGS_PRIVATE_KEY" | base58 -d | xxd -p | fold -w2 | paste -sd',' | sed 's/^/[/;s/$/]/' > ~/.config/bags/keypair.json

# Set permissions
chmod 600 ~/.config/bags/keypair.json

# Clear from memory immediately
unset BAGS_PRIVATE_KEY

# Verify it works
solana address -k ~/.config/bags/keypair.json
```

Use for transfers:

```bash
solana transfer <RECIPIENT> <AMOUNT> --keypair ~/.config/bags/keypair.json
```

Check balance:

```bash
solana balance --keypair ~/.config/bags/keypair.json
```

### Option 2: Programmatic Signing (For Complex Transactions)

For signing claim transactions or other complex operations, you'll need to sign programmatically using Node.js.

#### Step 1: Create the Signing Script

Create `~/.config/bags/sign-transaction.js`:

```javascript
#!/usr/bin/env node
const { Keypair, Transaction, VersionedTransaction } = require('@solana/web3.js')
const bs58 = require('bs58')

function isBase64(str) {
  return /[+/=]/.test(str) || (str.length > 0 && !/^[1-9A-HJ-NP-Za-km-z]+$/.test(str))
}

function signTransaction(privateKeyBase58, transactionStr) {
  try {
    const privateKeyBytes = bs58.decode(privateKeyBase58)
    const keypair = Keypair.fromSecretKey(privateKeyBytes)
    const txBytes = isBase64(transactionStr)
      ? Buffer.from(transactionStr, 'base64')
      : bs58.decode(transactionStr)

    let signed
    try {
      const tx = VersionedTransaction.deserialize(txBytes)
      tx.sign([keypair])
      signed = tx.serialize()
    } catch (e) {
      const tx = Transaction.from(txBytes)
      tx.sign(keypair)
      signed = tx.serialize()
    }

    console.log(bs58.encode(signed))
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

const [privateKey, transaction] = process.argv.slice(2)
if (!privateKey || !transaction) {
  console.error('Usage: node sign-transaction.js <privateKeyBase58> <transaction>')
  process.exit(1)
}
signTransaction(privateKey, transaction)
```

#### Step 2: Create package.json

Create `~/.config/bags/package.json`:

```json
{
  "name": "bags-signer",
  "version": "1.0.0",
  "dependencies": {
    "@solana/web3.js": "^1.98.0",
    "bs58": "^5.0.0"
  }
}
```

#### Step 3: Install Dependencies

```bash
cd ~/.config/bags && npm install
```

#### Step 4: Use the Script

```bash
BAGS_PRIVATE_KEY=$(curl -s -X POST https://public-api-v2.bags.fm/api/v1/agent/wallet/export \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$BAGS_JWT_TOKEN\", \"walletAddress\": \"$BAGS_WALLET_ADDRESS\"}" \
  | jq -r '.response.privateKey')

BAGS_SIGNED_TX=$(node ~/.config/bags/sign-transaction.js "$BAGS_PRIVATE_KEY" "$BAGS_UNSIGNED_TX")

# Clear private key immediately
unset BAGS_PRIVATE_KEY
```

### Option 3: Submit and Confirm Transaction

After signing, submit to Solana via the Bags API and confirm it landed.

#### Step 1: Submit Transaction

```bash
BAGS_RESULT=$(curl -s -X POST "https://public-api-v2.bags.fm/api/v1/solana/send-transaction" \
  -H "x-api-key: $BAGS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"transaction": "'"$BAGS_SIGNED_TX"'"}')

BAGS_SIGNATURE=$(echo "$BAGS_RESULT" | jq -r '.response // empty')
```

**Response:**

```json
{
  "success": true,
  "response": "transaction_signature"
}
```

#### Step 2: Confirm Transaction Landed

Poll `getSignatureStatuses` to verify the transaction confirmed on-chain:

```bash
BAGS_RPC_URL="https://gene-v4mswe-fast-mainnet.helius-rpc.com"
BAGS_MAX_RETRIES=10
BAGS_RETRY_DELAY_MS=500

for i in $(seq 1 $BAGS_MAX_RETRIES); do
  sleep 0.5  # 500ms delay

  BAGS_STATUS=$(curl -s -X POST "$BAGS_RPC_URL" \
    -H "Content-Type: application/json" \
    -d '{
      "jsonrpc": "2.0",
      "id": 1,
      "method": "getSignatureStatuses",
      "params": [["'"$BAGS_SIGNATURE"'"], {"searchTransactionHistory": true}]
    }')

  BAGS_VALUE=$(echo "$BAGS_STATUS" | jq -r '.result.value[0] // empty')

  if [ -n "$BAGS_VALUE" ] && [ "$BAGS_VALUE" != "null" ]; then
    BAGS_TX_ERR=$(echo "$BAGS_VALUE" | jq -r '.err // empty')
    BAGS_CONFIRM_STATUS=$(echo "$BAGS_VALUE" | jq -r '.confirmationStatus // empty')

    if [ -n "$BAGS_TX_ERR" ] && [ "$BAGS_TX_ERR" != "null" ]; then
      echo "❌ Transaction failed on-chain: $BAGS_TX_ERR"
      exit 1
    fi

    if [ "$BAGS_CONFIRM_STATUS" = "confirmed" ] || [ "$BAGS_CONFIRM_STATUS" = "finalized" ]; then
      echo "✅ Transaction confirmed ($BAGS_CONFIRM_STATUS)"
      echo "   Signature: $BAGS_SIGNATURE"
      echo "   Explorer: https://solscan.io/tx/$BAGS_SIGNATURE"
      break
    fi
  fi

  if [ $i -eq $BAGS_MAX_RETRIES ]; then
    echo "⚠️ Transaction not confirmed after $BAGS_MAX_RETRIES attempts"
    echo "   May need to retry with a fresh transaction"
  fi
done
```

**Status Response:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "value": [
      {
        "slot": 123456,
        "confirmations": null,
        "err": null,
        "confirmationStatus": "finalized"
      }
    ]
  }
}
```

| Field                | Description                                    |
| -------------------- | ---------------------------------------------- |
| `confirmationStatus` | `"processed"`, `"confirmed"`, or `"finalized"` |
| `err`                | `null` if success, error object if failed      |
| `value[0]`           | `null` if signature not found yet              |

---

## Check Wallet Balance

### Using Solana RPC (Recommended)

```bash
BAGS_WALLET_ADDRESS="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"

curl -s -X POST https://gene-v4mswe-fast-mainnet.helius-rpc.com \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 1,
    \"method\": \"getBalance\",
    \"params\": [\"$BAGS_WALLET_ADDRESS\"]
  }"
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "context": { "slot": 123456789 },
    "value": 1500000000
  },
  "id": 1
}
```

Note: `value` is in lamports (1 SOL = 1,000,000,000 lamports).

### Convert to SOL

```bash
BAGS_BALANCE_LAMPORTS=$(curl -s -X POST https://gene-v4mswe-fast-mainnet.helius-rpc.com \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getBalance\",\"params\":[\"$BAGS_WALLET_ADDRESS\"]}" \
  | jq '.result.value')

BAGS_BALANCE_SOL=$(echo "scale=4; $BAGS_BALANCE_LAMPORTS / 1000000000" | bc)
echo "Balance: $BAGS_BALANCE_SOL SOL"
```

### Using Solana CLI (Recommended if you are on CLI)

```bash
solana balance $BAGS_WALLET_ADDRESS
```

---

## Security Best Practices

### ✅ DO:

- Export keys only when needed for signing
- Delete keypair files after use: `rm ~/.config/bags/keypair.json`
- Use `chmod 600` on any file containing keys
- Clear private keys from environment: `unset BAGS_PRIVATE_KEY`
- Verify transaction details before signing
- Keep JWT token and API key separate from private keys

### ❌ DON'T:

- Log private keys to console or files
- Store private keys in credentials.json
- Share private keys with anyone or any service
- Commit keys to version control
- Keep keypair files around longer than necessary
- Use private keys in scripts without clearing them after

---

## Error Handling

**Invalid token (400):**

```json
{
  "success": false,
  "response": "Invalid token"
}
```

→ Re-authenticate via [AUTH.md](https://bags.fm/auth.md)

**Wallet not found (400):**

```json
{
  "success": false,
  "response": "Wallet not found for this agent"
}
```

→ Check wallet address is correct and belongs to your account

**Rate limited (429):**

```json
{
  "success": false,
  "response": "Too many requests. Please try again later."
}
```

→ Wait and retry with exponential backoff

---

## Complete Wallet Status Script

```bash
#!/bin/bash
# bags-wallet-status.sh - Check all wallet balances

set -e

# Load credentials
BAGS_JWT_TOKEN=$(cat ~/.config/bags/credentials.json | jq -r '.jwt_token')

echo "💛 Bags Wallet Status"
echo "====================="

# Get wallets
BAGS_WALLETS_RESPONSE=$(curl -s -X POST https://public-api-v2.bags.fm/api/v1/agent/wallet/list \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$BAGS_JWT_TOKEN\"}")

if ! echo "$BAGS_WALLETS_RESPONSE" | jq -e '.success == true' > /dev/null; then
  echo "❌ Failed to fetch wallets: $(echo "$BAGS_WALLETS_RESPONSE" | jq -r '.response')"
  exit 1
fi

BAGS_WALLETS=$(echo "$BAGS_WALLETS_RESPONSE" | jq -r '.response[]')
BAGS_TOTAL_LAMPORTS=0

for BAGS_WALLET in $BAGS_WALLETS; do
  BAGS_BALANCE=$(curl -s -X POST https://gene-v4mswe-fast-mainnet.helius-rpc.com \
    -H "Content-Type: application/json" \
    -d "{
      \"jsonrpc\": \"2.0\",
      \"id\": 1,
      \"method\": \"getBalance\",
      \"params\": [\"$BAGS_WALLET\"]
    }" | jq -r '.result.value')

  BAGS_SOL=$(echo "scale=4; $BAGS_BALANCE / 1000000000" | bc)
  BAGS_TOTAL_LAMPORTS=$((BAGS_TOTAL_LAMPORTS + BAGS_BALANCE))

  echo ""
  echo "📍 Wallet: $BAGS_WALLET"
  echo "   Balance: $BAGS_SOL SOL"
done

BAGS_TOTAL_SOL=$(echo "scale=4; $BAGS_TOTAL_LAMPORTS / 1000000000" | bc)

echo ""
echo "====================="
echo "💰 Total: $BAGS_TOTAL_SOL SOL"
```

---

## Sign, Submit, and Confirm Transaction

This function handles the complete transaction lifecycle:

1. Sign the transaction
2. Submit via Bags API
3. Poll for confirmation (max 10 retries, 500ms delay)
4. Report success/failure

```bash
# bags_submit_and_confirm - Sign, submit, and confirm a transaction
# Usage: bags_submit_and_confirm "$UNSIGNED_TX"
# Returns: 0 on success, 1 on failure
# Sets: BAGS_SIGNATURE on success

bags_submit_and_confirm() {
  local BAGS_UNSIGNED_TX="$1"
  local BAGS_RPC_URL="https://gene-v4mswe-fast-mainnet.helius-rpc.com"
  local BAGS_MAX_RETRIES=10

  # Load credentials
  local BAGS_JWT_TOKEN=$(cat ~/.config/bags/credentials.json | jq -r '.jwt_token')
  local BAGS_API_KEY=$(cat ~/.config/bags/credentials.json | jq -r '.api_key')
  local BAGS_WALLET_ADDRESS=$(cat ~/.config/bags/credentials.json | jq -r '.wallets[0]')

  # Export private key
  local BAGS_PRIVATE_KEY=$(curl -s -X POST https://public-api-v2.bags.fm/api/v1/agent/wallet/export \
    -H "Content-Type: application/json" \
    -d "{\"token\": \"$BAGS_JWT_TOKEN\", \"walletAddress\": \"$BAGS_WALLET_ADDRESS\"}" \
    | jq -r '.response.privateKey')

  if [ -z "$BAGS_PRIVATE_KEY" ] || [ "$BAGS_PRIVATE_KEY" = "null" ]; then
    echo "❌ Failed to export private key"
    return 1
  fi

  # Sign transaction
  local BAGS_SIGNED_TX=$(node ~/.config/bags/sign-transaction.js "$BAGS_PRIVATE_KEY" "$BAGS_UNSIGNED_TX")
  unset BAGS_PRIVATE_KEY

  if [ -z "$BAGS_SIGNED_TX" ]; then
    echo "❌ Failed to sign transaction"
    return 1
  fi

  # Submit transaction
  echo "📡 Submitting transaction..."
  local BAGS_RESULT=$(curl -s -X POST "https://public-api-v2.bags.fm/api/v1/solana/send-transaction" \
    -H "x-api-key: $BAGS_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"transaction": "'"$BAGS_SIGNED_TX"'"}')

  BAGS_SIGNATURE=$(echo "$BAGS_RESULT" | jq -r '.response // empty')
  local BAGS_ERROR=$(echo "$BAGS_RESULT" | jq -r '.error // empty')

  if [ -z "$BAGS_SIGNATURE" ] || [ "$BAGS_SIGNATURE" = "null" ]; then
    echo "❌ Failed to submit: $BAGS_ERROR"
    return 1
  fi

  echo "📋 Signature: $BAGS_SIGNATURE"
  echo "⏳ Confirming transaction..."

  # Poll for confirmation
  for i in $(seq 1 $BAGS_MAX_RETRIES); do
    sleep 0.5

    local BAGS_STATUS=$(curl -s -X POST "$BAGS_RPC_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getSignatureStatuses",
        "params": [["'"$BAGS_SIGNATURE"'"], {"searchTransactionHistory": true}]
      }')

    local BAGS_VALUE=$(echo "$BAGS_STATUS" | jq -r '.result.value[0] // empty')

    if [ -n "$BAGS_VALUE" ] && [ "$BAGS_VALUE" != "null" ]; then
      local BAGS_TX_ERR=$(echo "$BAGS_VALUE" | jq -r '.err // empty')
      local BAGS_CONFIRM_STATUS=$(echo "$BAGS_VALUE" | jq -r '.confirmationStatus // empty')

      # Check for on-chain error
      if [ -n "$BAGS_TX_ERR" ] && [ "$BAGS_TX_ERR" != "null" ]; then
        echo "❌ Transaction failed on-chain: $BAGS_TX_ERR"
        return 1
      fi

      # Check for confirmation
      if [ "$BAGS_CONFIRM_STATUS" = "confirmed" ] || [ "$BAGS_CONFIRM_STATUS" = "finalized" ]; then
        echo "✅ Transaction $BAGS_CONFIRM_STATUS!"
        echo "   Explorer: https://solscan.io/tx/$BAGS_SIGNATURE"
        return 0
      fi
    fi

    echo "   Attempt $i/$BAGS_MAX_RETRIES..."
  done

  echo "⚠️ Transaction not confirmed after $BAGS_MAX_RETRIES attempts"
  return 2  # Special code for "needs retry"
}
```

### Using the Function

```bash
# Source or define the function above, then:

BAGS_UNSIGNED_TX="your_unsigned_transaction_here"

if ! bags_submit_and_confirm "$BAGS_UNSIGNED_TX"; then
  echo "Transaction failed or needs retry"
fi
```

---

## Environment Variables Reference

All Bags wallet scripts use these prefixed variables:

| Variable                | Description                              |
| ----------------------- | ---------------------------------------- |
| `BAGS_JWT_TOKEN`        | JWT token for Agent API authentication   |
| `BAGS_API_KEY`          | API key for Public API authentication    |
| `BAGS_WALLET_ADDRESS`   | Current wallet address being used        |
| `BAGS_WALLETS`          | Array of all wallet addresses            |
| `BAGS_PRIVATE_KEY`      | Temporary private key (clear after use!) |
| `BAGS_UNSIGNED_TX`      | Unsigned transaction (base64)            |
| `BAGS_SIGNED_TX`        | Signed transaction (base64)              |
| `BAGS_BALANCE_LAMPORTS` | Wallet balance in lamports               |
| `BAGS_BALANCE_SOL`      | Wallet balance in SOL                    |

---

## Next Steps

After managing your wallets, you can:

1. **Check claimable fees** → See [FEES.md](https://bags.fm/fees.md)
2. **Trade tokens** → See [TRADING.md](https://bags.fm/trading.md)
3. **Launch tokens** → See [LAUNCH.md](https://bags.fm/launch.md)
