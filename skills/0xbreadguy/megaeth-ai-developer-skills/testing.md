# Debugging Guide

## mega-evme CLI

The official debugging tool for MegaETH transactions.

### Installation

```bash
git clone https://github.com/megaeth-labs/mega-evm
cd mega-evm/bin/mega-evme
cargo build --release
```

### Replay Transactions

```bash
# Basic replay
mega-evme replay <txhash> --rpc https://mainnet.megaeth.com/rpc

# With execution trace
mega-evme replay <txhash> --trace --trace.output trace.json --rpc <endpoint>

# With call tracer
mega-evme replay <txhash> --trace --tracer call --trace.output calls.json
```

**Docs:** https://github.com/megaeth-labs/mega-evm/tree/main/bin/mega-evme

## Gas Profiling

### Opcode-Level Analysis

```bash
# 1. Get debug trace
cast run <txhash> --rpc-url <vip-endpoint> > trace.json

# 2. Profile opcodes
python scripts/trace_opcode_gas.py trace.json
```

**Script:** https://github.com/megaeth-labs/mega-evm/blob/main/scripts/trace_opcode_gas.py

### Example Output

```
op              count      total         avg      min      max
SSTORE             29      85400      2944.8      100    22100
SLOAD             473     121300       256.4      100     2100
LOG2               25     598601     23944.0    14257    25521
KECCAK256         288      12108        42.0       36       60
```

## Common Issues

### "Intrinsic Gas Too Low"

Local gas estimation uses standard EVM costs. MegaEVM differs.

**Fix:**

```bash
# Foundry: skip local simulation
forge script Deploy.s.sol --gas-limit 5000000 --skip-simulation

# Or use higher hardcoded limit
```

### "Nonce Too Low"

With `eth_sendRawTransactionSync`, this can mean:

1. Tx already executed (check receipt)
2. Race condition with pending tx

**Debug:**

```bash
# Check current nonce
cast call --rpc-url <endpoint> \
  --method eth_getTransactionCount \
  <address> pending
```

### "Block Pruned" on eth_call

Public endpoint only keeps ~15 days of state.

**Solutions:**

- Use Alchemy/QuickNode for historical calls
- Run archive node
- Use VIP endpoint with longer retention

### WebSocket Disconnections

Connection drops after idle period.

**Fix:** Send keepalive every 30s:

```javascript
setInterval(() => {
  ws.send(
    JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_chainId',
      params: [],
      id: Date.now(),
    }),
  )
}, 30000)
```

### Volatile Data Access Limit

Error after using `block.timestamp` + heavy computation.

**Cause:** 20M gas limit after accessing block metadata.

**Fix:** Restructure contract to access metadata late, or use oracle.

## Cast Commands

```bash
# Estimate gas
cast estimate --from <addr> --to <addr> --value 0.001ether \
  --rpc-url https://mainnet.megaeth.com/rpc

# Call at specific block
cast call --block <number> <contract> "method(args)" \
  --rpc-url https://mainnet.megaeth.com/rpc

# Get transaction details
cast tx <txhash> --rpc-url https://mainnet.megaeth.com/rpc

# Decode calldata
cast 4byte-decode <calldata>
```

## HAR Analysis

For debugging frontend RPC patterns:

```bash
# Export HAR from browser devtools, then:
python parse_eth_rpc_har.py export.har > calls.csv
python method_activity_timeline.py calls.csv
```

Identifies:

- Unnecessary RPC calls
- Batching opportunities
- Slow methods blocking UX

## Monitoring Latency

```bash
# Detailed timing breakdown
curl -i -X POST https://mainnet.megaeth.com/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' \
  -w "dns: %{time_namelookup} | connect: %{time_connect} | total: %{time_total}\n"
```

## Block Explorers

| Network | Explorer                                  |
| ------- | ----------------------------------------- |
| Mainnet | https://mega.etherscan.io                 |
| Testnet | https://megaeth-testnet-v2.blockscout.com |

Etherscan may lag a few blocks behind real-time.

## Getting Help

1. Check transaction on explorer
2. Replay with mega-evme locally
3. Profile gas by opcode
4. Contact MegaETH team with:
   - Transaction hash
   - Error message
   - Reproduction steps
