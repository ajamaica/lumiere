# Abstract Troubleshooting Guide

## Common Issues

### 1. "Gas estimation failed" with foundry-zksync

**Problem:** foundry-zksync hangs or fails on gas estimation.

**Solution:** Use Hardhat instead. The `@matterlabs/hardhat-zksync` plugin is more stable.

```bash
# Don't use forge for Abstract deployment
# Use the hardhat config in references/hardhat.config.js
npm install --save-dev @matterlabs/hardhat-zksync
```

### 2. "zksolc: command not found"

**Problem:** ZK compiler not installed.

**Solution:** Hardhat plugin handles this automatically. If using manually:

```bash
# Install zksolc
npm install -g @matterlabs/zksolc

# Or download binary from:
# https://github.com/matter-labs/zksolc-bin/releases
```

### 3. "Bytecode length: 0" in deployment

**Problem:** Contract compiled but bytecode is empty.

**Solution:** This can happen with ZK-specific compilation. Check:

- Solidity version matches zksolc compatibility (0.8.x recommended)
- Contract has constructor and functions
- Re-compile with `npx hardhat compile --force`

### 4. Transaction stuck pending

**Problem:** TX submitted but never confirms.

**Solution:**

- Check gas price isn't too low
- Abstract has fast blocks (~1s), so should confirm quickly
- Verify on https://abscan.org using TX hash

### 5. "Invalid chain ID"

**Problem:** Wrong network configuration.

**Solution:** Ensure:

- Mainnet chain ID: `2741`
- Testnet chain ID: `11124`
- RPC URL is correct (see addresses.md)

### 6. Contract verification failed

**Problem:** Can't verify contract on Abscan.

**Solution:**

- Use standard Solidity (no custom imports)
- Flatten contract if using multiple files
- Match compiler version exactly

## Best Practices

1. **Always test on testnet first** (chain ID 11124)
2. **Keep private keys in env vars**, never in code
3. **Use Hardhat over Foundry** for Abstract deployments
4. **Bridge a small amount first** to test the flow
5. **Check gas balance** before deployment (~0.01 ETH minimum recommended)

## Getting Help

- **Abstract Discord:** https://discord.gg/abstract
- **Abstract Docs:** https://docs.abs.xyz
- **ZK Stack Docs:** https://docs.zksync.io
