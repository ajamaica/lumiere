# Abstract/zkSync Troubleshooting Guide

## ⚠️ Contract Deployment Issues

### Problem: Deploy transaction succeeds but no bytecode at address

**Symptoms:**

- Transaction returns success
- Contract address is returned
- But `eth_getCode(address)` returns `0x`
- Tokens sent to the address are LOST

**Cause:**
Abstract uses zkSync's ZK Stack. Standard EVM deployment doesn't work because:

- zkSync requires EIP-712 transactions with `factory_deps`
- The `ContractDeployer` system contract handles deploys
- Standard tools (viem, ethers.js) don't include required fields

**Solution:**

```javascript
// ✅ CORRECT: Use zksync-ethers
const { Wallet, Provider, ContractFactory } = require('zksync-ethers')

const provider = new Provider('https://api.mainnet.abs.xyz')
const wallet = new Wallet(privateKey, provider)

// Load zksolc-compiled artifact
const artifact = require('./zkout/MyContract.json')

const factory = new ContractFactory(artifact.abi, artifact.bytecode.object, wallet)
const contract = await factory.deploy(constructorArgs)
await contract.waitForDeployment()

// ALWAYS VERIFY
const address = await contract.getAddress()
const code = await provider.getCode(address)
if (code === '0x' || code.length <= 2) {
  throw new Error('Deployment failed - no bytecode!')
}
```

**What NOT to do:**

```javascript
// ❌ WRONG: viem's deployContract doesn't work on zkSync
const hash = await walletClient.deployContract({
  abi,
  bytecode,
  args,
})
// Returns success but stores no bytecode!
```

### Problem: Gas estimation fails

**Symptoms:**

- Error during deploy or transaction
- "gas estimation failed" or similar

**Solutions:**

1. Use Hardhat with `@matterlabs/hardhat-zksync` plugin
2. Manually set gas limit higher
3. Check contract for infinite loops or high complexity

### Problem: Compiler errors with zksolc

**Solutions:**

1. Use Solidity 0.8.x (0.8.20 or 0.8.24 recommended)
2. Install zksolc: `npm install @matterlabs/hardhat-zksync-solc`
3. Or compile with foundry: `forge build --zksync`

### Problem: Transaction stuck/pending

**Solutions:**

1. Check gas price on abscan.org
2. Use higher gas price
3. Wait for network congestion to clear
4. Cancel with same nonce + higher gas

---

## Balance & Transfer Issues

### Problem: Token balance shows 0 but tokens were sent

**Check:**

1. Correct token contract address?
2. Correct wallet address?
3. Transaction actually confirmed?
4. Token uses different decimals?

### Problem: Transfer fails

**Check:**

1. Sufficient balance (including gas)?
2. Token approval if using transferFrom?
3. Contract not paused?

---

## Bridge Issues

### Problem: Bridge transaction stuck

**Solutions:**

1. Check source chain transaction confirmed
2. Wait 10-30 minutes for relay
3. Check relay.link for status
4. Contact Relay support if >1 hour

---

## Verification Checklist

Before ANY operation involving value:

- [ ] Contract bytecode exists (`eth_getCode`)
- [ ] Test with small amount first
- [ ] Verify addresses are correct
- [ ] Check on explorer before proceeding

---

_Last updated: 2026-02-05_
_Lesson learned: Lost 200M tokens to empty address. Always verify._
