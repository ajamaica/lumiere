# Etherlink MCP Server Setup

The Etherlink MCP server is a fork of `evm-mcp-server` with Etherlink networks pre-configured.

## Installation Options

### Option 1: NPX (Recommended)

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "etherlink": {
      "command": "npx",
      "args": ["-y", "etherlink-mcp-server"],
      "env": {
        "NETWORK": "etherlink",
        "PRIVATE_KEY": "optional-for-write-operations"
      }
    }
  }
}
```

### Option 2: Local Build

```bash
# Clone the repo
git clone https://github.com/yourusername/etherlink-mcp-server.git
cd etherlink-mcp-server

# Install dependencies
bun install

# Build
bun run build

# Run
bun run start
```

Local MCP config:

```json
{
  "mcpServers": {
    "etherlink": {
      "command": "bun",
      "args": ["run", "/path/to/etherlink-mcp-server/src/index.ts"],
      "env": {
        "NETWORK": "etherlink"
      }
    }
  }
}
```

## Environment Variables

| Variable      | Description                      | Default         |
| ------------- | -------------------------------- | --------------- |
| `NETWORK`     | Network name or chain ID         | `ethereum`      |
| `PRIVATE_KEY` | Private key for write operations | none            |
| `RPC_URL`     | Override default RPC URL         | network default |

### Examples

**Etherlink Mainnet (read-only)**:

```bash
NETWORK=etherlink bun run start
```

**Etherlink Shadownet (with write access)**:

```bash
NETWORK=etherlink-shadownet PRIVATE_KEY=0x... bun run start
```

**Custom RPC**:

```bash
NETWORK=etherlink RPC_URL=https://my-custom-rpc.com bun run start
```

## Available Tools

The MCP server exposes these tools:

### Read Operations

- `get_balance` - Get XTZ balance for an address
- `get_block` - Get block by number or hash
- `get_transaction` - Get transaction details
- `get_transaction_receipt` - Get transaction receipt
- `call_contract` - Call a view function
- `get_logs` - Query event logs
- `get_token_balance` - Get ERC20 token balance
- `get_token_info` - Get ERC20 token metadata

### Write Operations (require PRIVATE_KEY)

- `send_transaction` - Send XTZ
- `transfer_token` - Transfer ERC20 tokens
- `deploy_contract` - Deploy a contract
- `write_contract` - Call a state-changing function

### Utility

- `estimate_gas` - Estimate gas for a transaction
- `get_gas_price` - Get current gas price
- `encode_function_data` - Encode contract call data
- `decode_function_result` - Decode contract return data

## Security Notes

1. **Never commit private keys** - Use environment variables
2. **Use read-only mode** when possible - Omit PRIVATE_KEY
3. **Test on Shadownet first** - Get free testnet XTZ from faucet
4. **Rate limits apply** - 1000 req/min on public RPC

## Troubleshooting

### "Network not found"

Ensure you're using a valid network identifier:

- `etherlink`, `etherlink-mainnet`, or `42793`
- `etherlink-shadownet`, `etherlink-testnet`, or `127823`

### "Transaction failed"

Common causes:

- Insufficient XTZ balance
- Using EIP-1559 transaction format (use legacy)
- Contract revert

### "Rate limited"

You've exceeded 1000 req/min. Either:

- Wait a minute
- Use your own RPC node
- Batch requests

### Private key issues

- Ensure key starts with `0x`
- Key must be 64 hex characters (32 bytes)
- Check you have XTZ balance for gas
