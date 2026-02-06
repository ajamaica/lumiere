# Abstract DEX Reference

Verified working DEXs on Abstract mainnet (as of Feb 2026).

## Kona Finance ✅

**Twitter:** [@KonaDeFi](https://twitter.com/KonaDeFi)
**Status:** Live and tested

| Contract    | Address                                      |
| ----------- | -------------------------------------------- |
| Router (V2) | `0x441E0627Db5173Da098De86b734d136b27925250` |
| Factory     | `0x7c2e370CA0fCb60D8202b8C5b01f758bcAD41860` |

**Usage:**

```bash
export WALLET_PRIVATE_KEY=0x...
node scripts/swap-kona.js
```

**Features:**

- Uniswap V2 compatible interface
- USDC/WETH pool available
- Standard `swapExactTokensForETH` works

**Test TX:** https://abscan.org/tx/0x81f77296b2ed103acfca10c9b37770ae4ac7b09261260e62ed83884ab957475f

---

## Aborean ⏳

**Twitter:** [@Aborean](https://twitter.com/Aborean)
**Status:** Contracts found, router pending verification

| Contract         | Address                                      |
| ---------------- | -------------------------------------------- |
| Factory          | `0x8cfE21F272FdFDdf42851f6282c0f998756eEf27` |
| Voter            | `0xC0F53703e9f4b79fA2FB09a2aeBC487FA97729c9` |
| Factory Registry | `0x5927E0C4b307Af16260327DE3276CE17d8A4aB49` |
| Minter           | `0x58564Fcfc5a0C57887eFC0beDeC3EB5Ec37f1626` |
| ABX Token        | `0x4C68E4102c0F120cce9F08625bd12079806b7C4D` |

**Architecture:** Velodrome/Aerodrome-style (V2/V3 pools, voter, gauge system)

**Note:** Router address not publicly documented. Check their Discord or use `scripts/swap-aborean.js` once router is obtained.

---

## Uniswap V2 (Generic)

Also deployed on Abstract:

| Contract | Address                                      |
| -------- | -------------------------------------------- |
| Router   | `0xad1eCa41E6F772bE3cb5A48A6141f9bcc1AF9F7c` |

**Usage:**

```bash
export WALLET_PRIVATE_KEY=0x...
node scripts/swap-uniswap-v2.js
```

---

## Common Token Addresses

| Token | Address                                      |
| ----- | -------------------------------------------- |
| USDC  | `0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1` |
| WETH  | `0x3439153EB7AF838Ad19d56E1571FBD09333C2809` |

---

## Swap Pattern (V2 DEXs)

All V2-style DEXs use the same interface:

```javascript
const { ethers } = require('ethers')

// 1. Connect
const provider = new ethers.JsonRpcProvider('https://api.mainnet.abs.xyz')
const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider)

// 2. Get quote
const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut])

// 3. Approve (if needed)
await tokenIn.approve(routerAddress, amountIn)

// 4. Swap
await router.swapExactTokensForETH(
  amountIn,
  minOut, // amounts[1] * 95n / 100n for 5% slippage
  [tokenIn, WETH],
  wallet.address,
  deadline, // Math.floor(Date.now()/1000) + 300
)
```
