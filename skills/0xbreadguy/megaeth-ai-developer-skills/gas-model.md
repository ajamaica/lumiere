# Gas Model

## Base Parameters

| Parameter       | Value                | Notes                         |
| --------------- | -------------------- | ----------------------------- |
| Base fee        | 0.001 gwei (10⁶ wei) | Fixed, no EIP-1559 adjustment |
| Priority fee    | 0                    | Ignored unless congested      |
| Block gas limit | None                 | Decoupled from tx limit       |
| Max tx gas      | 5+ ggas              | Much higher than other chains |

## Setting Gas Price

### Correct Approach

```javascript
// MegaETH: use base fee directly
const gasPrice = 1000000n // 0.001 gwei in wei

// Or fetch from RPC (always returns 0.001 gwei)
const baseFee = await client.request({ method: 'eth_gasPrice' })
```

### Common Mistakes

```javascript
// ❌ Wrong: viem adds 20% buffer
const gasPrice = await publicClient.getGasPrice() // Returns 1.2M wei

// ❌ Wrong: using maxPriorityFeePerGas
const priority = await client.request({
  method: 'eth_maxPriorityFeePerGas',
}) // Returns 0 (hardcoded)
```

## Gas Estimation

### MegaEVM Intrinsic Gas

> ⚠️ **Important:** MegaEVM has different intrinsic gas costs than standard EVM. A simple ETH transfer costs **60,000 gas** on MegaETH, not 21,000.

If you hardcode gas limits, use MegaETH-specific values:

```javascript
// Common operations - MegaETH gas limits
const gasLimits = {
  transfer: 60000n, // NOT 21000 like standard EVM
  erc20Transfer: 100000n, // Higher than standard EVM
  erc20Approve: 80000n,
  swap: 350000n,
}

// Send with correct gas limit
await wallet.sendTransaction({
  to: recipient,
  value: amount,
  gasLimit: 60000n, // MegaETH intrinsic gas
  maxFeePerGas: 1000000n,
})
```

### When to Use Remote Estimation

For any non-trivial operation, use `eth_estimateGas` — MegaEVM opcode costs differ from standard EVM:

```javascript
// ✅ Correct: remote estimation
const gas = await client.request({
  method: 'eth_estimateGas',
  params: [{ from, to, data }],
})

// ❌ Wrong: local simulation (Hardhat/Foundry)
// These use standard EVM costs, not MegaEVM
```

For Foundry:

```bash
# Skip local simulation, use remote
forge script Deploy.s.sol --gas-limit 5000000 --skip-simulation
```

## Volatile Data Access Limit

After accessing block metadata, tx is limited to 20M additional compute gas:

```solidity
// Operations that trigger the limit:
block.timestamp
block.number
blockhash(n)

// After any of these, only 20M gas remaining for:
// - Complex computations
// - Multiple external calls
// - Large loops
```

**Workaround:** Access block metadata late in execution, or use the high-precision timestamp oracle which has separate accounting.

## Fee History

Get historical gas prices:

```javascript
const history = await client.request({
  method: 'eth_feeHistory',
  params: ['0x10', 'latest', [25, 50, 75]],
})
// Returns base fees and priority fee percentiles
```

## Priority Fees in Practice

Priority fees only matter during congestion:

```javascript
// During normal operation: any priority fee works
// During congestion: higher priority = faster inclusion

const tx = {
  maxFeePerGas: 1000000n, // 0.001 gwei
  maxPriorityFeePerGas: 0n, // Usually sufficient
}
```

## Gas Refunds

Standard EVM refunds apply (SSTORE clear, SELFDESTRUCT), but:

- Refund capped at 50% of gas used
- Future: State rent refund mechanism planned

## LOG Opcode Costs

After a DoS attack, LOG opcodes have quadratic cost above 4KB data:

```solidity
// Gas cost for log data:
// < 4KB: linear
// > 4KB: quadratic growth
```

This affects contracts emitting large events.

## Contract Deployment

| Resource       | Limit                 |
| -------------- | --------------------- |
| Contract code  | 512 KB                |
| Calldata       | 128 KB                |
| Deployment gas | Effectively unlimited |

For large contracts, may need VIP endpoint (higher gas limit on `eth_estimateGas`).
