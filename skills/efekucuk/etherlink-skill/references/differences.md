# Etherlink vs Standard Ethereum

Etherlink is EVM-compatible but has some differences from Ethereum mainnet.

## Key Differences

### 1. Native Currency

- **Etherlink**: XTZ (Tez)
- **Ethereum**: ETH

Same 18 decimals, but different symbol and economics.

### 2. Gas & Fees

- **No EIP-1559**: Etherlink doesn't have the EIP-1559 fee market yet
- Use legacy `gasPrice` transactions, not `maxFeePerGas`/`maxPriorityFeePerGas`
- Gas prices are typically very low compared to Ethereum mainnet

### 3. Block Hashes

Block hashes are computed differently on Etherlink. You cannot verify block hashes solely from the block header. This affects:

- Light client implementations
- Block hash verification tools

### 4. Finality

Etherlink inherits finality from Tezos L1. Transactions are final once:

1. Included in an Etherlink block
2. That block's commitment is finalized on Tezos

Practical finality: ~30 seconds for Etherlink block, ~30 minutes for L1 finality.

## Supported RPC Methods

### Fully Supported ✅

- `eth_blockNumber`
- `eth_chainId`
- `eth_getBalance`
- `eth_getBlockByHash`
- `eth_getBlockByNumber`
- `eth_getTransactionByHash`
- `eth_getTransactionReceipt`
- `eth_call`
- `eth_estimateGas`
- `eth_gasPrice`
- `eth_sendRawTransaction`
- `eth_getLogs`
- `eth_getCode`
- `eth_getStorageAt`
- `eth_getTransactionCount`
- `debug_traceTransaction`

### Not Supported ❌

- `eth_subscribe` (experimental only, limited)
- `eth_syncing`
- `eth_newFilter`
- `eth_newBlockFilter`
- `eth_newPendingTransactionFilter`
- `eth_getFilterChanges`
- `eth_getFilterLogs`
- `eth_uninstallFilter`
- `engine_*` endpoints

## Bridging to Tezos L1

Etherlink connects to Tezos via a native bridge. This is NOT an EVM operation.

### Deposits (Tezos → Etherlink)

- Initiated on Tezos L1
- Requires Tezos wallet/tooling
- Takes ~10-15 minutes

### Withdrawals (Etherlink → Tezos)

- Initiated on Etherlink (EVM transaction)
- Finalized on Tezos after challenge period
- Takes ~2 weeks (optimistic rollup challenge period)

For bridge operations, use the official bridge UI or Tezos SDKs.

## Smart Contract Compatibility

Most Solidity/EVM contracts work unchanged. Watch for:

- Contracts relying on `PREVRANDAO` (may behave differently)
- Contracts hardcoding gas prices with EIP-1559 assumptions
- Contracts verifying block hashes

## Best Practices

1. **Use legacy transactions** until EIP-1559 is supported
2. **Don't rely on block hashes** for verification
3. **Account for bridge delays** in UX
4. **Test on Shadownet first** - it mirrors mainnet behavior
