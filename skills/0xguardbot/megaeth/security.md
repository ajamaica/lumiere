# Security Considerations

## MegaETH-Specific Risks

### 1. Storage Cost Attacks

**Risk**: Attacker triggers expensive SSTORE operations to drain gas budgets.

**Attack pattern**:

```solidity
// If contract allows arbitrary key writes:
function store(uint256 key, uint256 value) external {
    data[key] = value; // 2M+ gas per new slot
}
// Attacker calls with 1000 unique keys = 2B gas
```

**Prevention**:

- Validate keys against whitelist
- Limit operations per transaction
- Charge users for storage costs

### 2. Volatile Data Timing Attacks

**Risk**: Contract logic depends on block.timestamp precision.

**Attack pattern**:

```solidity
// Auction ends at timestamp
if (block.timestamp >= auctionEnd) {
    // MegaETH block.timestamp has 1s granularity
    // But mini-blocks happen every 10ms
    // Attacker can exploit timing window
}
```

**Prevention**:

- Use high-precision oracle for time-sensitive logic
- Add grace periods for timing-dependent operations
- Consider mini-block timing in design

### 3. Reorg Considerations

MegaETH has fast finality (<10ms) but reorgs are theoretically possible until L1 finalization.

**Prevention**:

- For high-value operations, wait for confirmation count
- Use `eth_sendRawTransactionSync` receipt as soft-finality
- Consider L1 finalization for irreversible actions

## Standard EVM Vulnerabilities

These apply equally to MegaETH:

### Reentrancy

```solidity
// ❌ Vulnerable
function withdraw() external {
    uint256 amount = balances[msg.sender];
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);
    balances[msg.sender] = 0;
}

// ✅ Checks-Effects-Interactions
function withdraw() external {
    uint256 amount = balances[msg.sender];
    balances[msg.sender] = 0; // Effect before interaction
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);
}
```

### Access Control

```solidity
// ✅ Always validate
modifier onlyOwner() {
    require(msg.sender == owner, "Not owner");
    _;
}

modifier onlyValidSigner(bytes memory signature) {
    require(verifySignature(signature), "Invalid signature");
    _;
}
```

### Integer Overflow

Solidity 0.8+ has built-in overflow checks. For older code:

```solidity
// Use OpenZeppelin SafeMath or upgrade to 0.8+
```

## Client-Side Security

### RPC Endpoint Trust

```typescript
// ❌ Don't trust random RPCs
const client = createClient({ rpc: userProvidedUrl })

// ✅ Use known endpoints, verify responses
const TRUSTED_RPCS = ['https://mainnet.megaeth.com/rpc', 'https://rpc.alchemy.com/megaeth']
```

### Transaction Simulation

```typescript
// Always simulate before signing
const simulation = await client.simulateTransaction(tx)
if (simulation.error) {
  throw new Error(`Simulation failed: ${simulation.error}`)
}
```

### Blockhash Expiry

```typescript
// MegaETH blocks are fast - blockhash expires quickly
// Retry with fresh blockhash on failure
async function submitWithRetry(tx: Transaction, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const blockhash = await client.getLatestBlockhash()
      tx.blockhash = blockhash
      return await client.sendTransaction(tx)
    } catch (e) {
      if (!e.message.includes('blockhash')) throw e
    }
  }
  throw new Error('Transaction expired')
}
```

## Audit Recommendations

1. **Use mega-evme** for transaction replay and gas profiling
2. **Test with realistic gas costs** — fork testnet, don't simulate locally
3. **Review SSTORE patterns** — each new slot is expensive
4. **Check volatile data usage** — 20M gas limit after block metadata access
5. **Verify CPI targets** — don't allow arbitrary external calls

## Security Review Questions

1. Can an attacker trigger expensive storage operations?
2. Does the contract rely on block.timestamp precision?
3. Are there timing windows between mini-blocks that can be exploited?
4. Is the contract vulnerable to reorgs before L1 finalization?
5. Are external calls validated and limited?
6. Is gas estimation done remotely (not locally)?

## Monitoring

```typescript
// Set up transaction monitoring
const monitor = new TransactionMonitor({
  rpc: 'https://mainnet.megaeth.com/rpc',
  contracts: ['0x...'],
  onSuspicious: (tx) => {
    // Alert on unusual patterns
    // - High gas usage
    // - Repeated failures
    // - Unusual call patterns
  },
})
```

## Resources

- **MegaEVM Spec**: https://github.com/megaeth-labs/mega-evm/blob/main/specs/MiniRex.md
- **Security auditors**: Cantina, Spearbit (recommended by MegaETH team)
