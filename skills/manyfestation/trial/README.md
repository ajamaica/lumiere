# Kaspa Wallet CLI

A standalone command-line wallet for the Kaspa blockchain. Pure Python, no Node.js required.

## Quick Start

```bash
# Install
python3 install.py

# Configure wallet
export KASPA_PRIVATE_KEY="your-64-char-hex-key"

# Check balance
./kaswallet.sh balance

# Send KAS
./kaswallet.sh send kaspa:recipient... 1.0
```

## Requirements

- Python 3.8+
- pip (included with Python)
- Internet connection

## Documentation

See [SKILL.md](SKILL.md) for full documentation including:

- All commands and options
- Error codes and troubleshooting
- Common workflows
- Examples for automated agents

## Commands

| Command                   | Description                         |
| ------------------------- | ----------------------------------- |
| `balance [address]`       | Check wallet or any address balance |
| `send <to> <amount\|max>` | Send KAS to an address              |
| `info`                    | Network status and connectivity     |
| `fees`                    | Current fee estimates               |
| `generate-mnemonic`       | Create new 24-word seed phrase      |
| `uri [address] [amount]`  | Generate payment URI                |

## Environment Variables

```bash
# Required (one of):
KASPA_PRIVATE_KEY="hex"           # 64-char private key
KASPA_MNEMONIC="words..."         # 12/24-word seed phrase

# Optional:
KASPA_NETWORK="mainnet"           # mainnet, testnet-10
KASPA_RPC_CONNECT_TIMEOUT_MS=30000
```

## License

MIT
