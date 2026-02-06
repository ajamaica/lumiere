# paytrigo-openclawbot-skill

A minimal OpenClaw skill that lets OpenClawBots use PayTrigo on **Base/USDC** with no webhooks (polling only).

## Install

Requires Node.js 18+.

```bash
npm install
```

## Quickstart

### 1) Human-in-the-loop (user pays in browser)

```bash
node scripts/moltbot-human-flow.mjs human --amount 0.001 --recipient 0xYourWallet...
```

- Open the printed `payUrl` in a browser and complete payment
- The script polls until `confirmed`

### 2) Bot pays directly (requires private key)

```bash
node scripts/moltbot-bot-flow.mjs bot --amount 0.001 --recipient 0xYourWallet... --pk 0xPRIVATE_KEY
```

- Sends `approve` + `pay` transactions
- Submits txHash to PayTrigo
- Polls until final status

## Local wallet store (recommended)

This is the easiest way for an OpenClawBot to "remember" a wallet locally without external services.

### 1) Create a passphrase file (local only)

```bash
echo "use-a-strong-passphrase" > passphrase.txt
chmod 600 passphrase.txt
```

### 2) Create a wallet (optionally set it as recipient)

```bash
node scripts/moltbot-wallet-setup.mjs create --passphrase-file ./passphrase.txt --set-recipient-from-wallet
```

This creates `.openclawbot/wallet.json`, `.openclawbot/wallet-address.txt`, and `.openclawbot/recipient.txt`.

### If you already have a wallet

You do not need to create a new one.

```bash
# Save an existing recipient address
node scripts/moltbot-wallet-setup.mjs recipient --address 0xYourWallet

# Import an existing private key into the encrypted wallet store
node scripts/moltbot-wallet-setup.mjs import --pk-file ./payer.pk --passphrase-file ./passphrase.txt --set-recipient-from-wallet
```

### 3) Run flows using the stored data

```bash
node scripts/moltbot-human-flow.mjs human --amount 0.001
node scripts/moltbot-bot-flow.mjs bot --amount 0.001 --passphrase-file ./passphrase.txt
```

### Alternative: set a separate recipient address

```bash
node scripts/moltbot-wallet-setup.mjs recipient --address 0xYourWallet
```

## Options

- `--ttl 900` : invoice TTL in seconds
- `--metadata '{"botId":"openclawbot_123"}'` : metadata JSON
- `--poll 5` : polling interval (seconds)
- `--max-minutes 20` : max polling time (minutes)
- `--rpc https://mainnet.base.org` : Base RPC endpoint
- `--skip-approve` : skip approve if already approved
- `--store-dir .openclawbot` : local store dir (default for recipient + wallet files)
- `--recipient-file ./recipient.txt` : read recipient address from a file
- `--wallet-file ./wallet.json` : encrypted wallet file for bot-pay
- `--passphrase-file ./passphrase.txt` : decrypt wallet for bot-pay

## Wallet / PK setup

### Recipient wallet (required)

You must provide a recipient address (platform key requirement). You can pass `--recipient` or store it locally.

```bash
node scripts/moltbot-wallet-setup.mjs recipient --address 0xYourWallet
node scripts/moltbot-human-flow.mjs human --amount 0.001
```

### Payer private key (optional; only for bot-pay)

Store locally and never commit it. Prefer encrypted wallet files instead of raw PKs.

```bash
node scripts/moltbot-bot-flow.mjs bot --amount 0.001 --pk 0xYOUR_PRIVATE_KEY
```

## Success criteria

- Final `status` becomes `confirmed`
- USDC received in the recipient wallet

## Notes

- Platform key requires `recipientAddress`
- Direct token transfers are invalid; always use Router pay (handled by scripts)
- Never expose private keys
