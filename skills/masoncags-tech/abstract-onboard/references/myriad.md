# Myriad Prediction Markets on Abstract

Myriad is the largest prediction market platform on Abstract with 415K+ users and $100M+ volume.

## Contract Addresses

| Contract                   | Address                                                    |
| -------------------------- | ---------------------------------------------------------- |
| **Prediction Market (V3)** | `0x3e0F5F8F5Fb043aBFA475C0308417Bf72c463289`               |
| Querier                    | `0x710F30AbDADB86A33faE984d6678d4Ed31517B18`               |
| PTS Token (Season 2)       | `0x0b07cf011B6e2b7E0803b892d97f751659940F23` (18 decimals) |
| USDC.e Token               | `0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1` (6 decimals)  |
| Fee Treasury               | `0xBc30e9765Dc8c735206c76DE96d369754eBbcc1f`               |

> ⚠️ **The `myriad-sdk` npm package has an outdated contract address** (`0x4f4988a...`, dead since Nov 2025). Use the address above for the live contract.

## API

**Base URL:** `https://api-v2.myriadprotocol.com`

```bash
# List open markets
curl "https://api-v2.myriadprotocol.com/markets?api_key=YOUR_KEY&state=open&limit=10"

# Get market detail by slug
curl "https://api-v2.myriadprotocol.com/markets/SLUG?api_key=YOUR_KEY"
```

Response wraps data in `{ "data": [...] }` for list endpoints.

### Market Types

- **PTS markets** — Free points token (18 decimals). Most popular.
- **USDC.e markets** — Real money (6 decimals). Fewer markets, real stakes.
- **USDT markets** — Tether (available on some markets).

The `token` field in the API response tells you which token a market uses.

## On-Chain Trading ABI

### ⚠️ CRITICAL: Parameter Order

The function signatures have **non-obvious parameter ordering**:

```solidity
// BUY: marketId, outcomeId, minShares, value
function buy(uint256 marketId, uint256 outcomeId, uint256 minOutcomeSharesToBuy, uint256 value)
// Selector: 0x1281311d

// CALC BUY AMOUNT: value FIRST, then marketId, outcomeId
function calcBuyAmount(uint256 value, uint256 marketId, uint256 outcomeId) view returns (uint256)

// SELL: marketId, outcomeId, value, maxShares
function sell(uint256 marketId, uint256 outcomeId, uint256 value, uint256 maxOutcomeSharesToSell)

// CALC SELL AMOUNT: value FIRST
function calcSellAmount(uint256 value, uint256 marketId, uint256 outcomeId) view returns (uint256)

// CLAIM WINNINGS
function claimWinnings(uint256 marketId)

// CLAIM VOIDED
function claimVoidedOutcomeShares(uint256 marketId, uint256 outcomeId)
```

### Buy Flow (viem example)

```javascript
const { createPublicClient, createWalletClient, http, parseAbi, parseUnits } = require('viem')

const PM = '0x3e0F5F8F5Fb043aBFA475C0308417Bf72c463289'
const ABI = parseAbi([
  'function buy(uint256 marketId, uint256 outcomeId, uint256 minOutcomeSharesToBuy, uint256 value) external',
  'function calcBuyAmount(uint256 value, uint256 marketId, uint256 outcomeId) external view returns (uint256)',
])

// 1. Approve token spending on PM contract
// 2. Calculate expected shares (for slippage protection)
const minShares = await publicClient.readContract({
  address: PM,
  abi: ABI,
  functionName: 'calcBuyAmount',
  args: [valueInUnits, marketId, outcomeId], // VALUE FIRST!
})

// 3. Apply slippage (e.g., 3%)
const minSharesSlippage = (minShares * 97n) / 100n

// 4. Execute buy
await walletClient.writeContract({
  address: PM,
  abi: ABI,
  functionName: 'buy',
  args: [marketId, outcomeId, minSharesSlippage, valueInUnits],
})
```

### Value Units

- PTS markets: 18 decimals (1 PTS = `1000000000000000000`)
- USDC.e markets: 6 decimals (1 USDC = `1000000`)
- Market IDs in the API match on-chain IDs

## Using the `myriad-sdk` npm Package

The SDK wraps `polkamarkets-js` and provides API + on-chain access, but:

- ❌ Hardcoded contract address is outdated
- ❌ `buy()` uses wrong function selector (V2 vs V3)
- ❌ `getUserAddress()` is broken (should be `getAddress()`)
- ✅ `calcBuyAmount()` works through polkamarkets-js (different param order internally)
- ✅ API client works for reading market data

**Recommendation:** Use the API for reading markets, call the contract directly via viem for trading.

## Portfolio & Claims

```javascript
// Get portfolio (via polkamarkets-js)
const portfolio = await pm.getMyPortfolio()
// Returns: { [marketId]: { liquidity: {...}, outcomes: {...}, claimStatus: {...} } }

// Claim winnings after market resolves
await walletClient.writeContract({
  address: PM,
  abi: parseAbi(['function claimWinnings(uint256 marketId) external']),
  functionName: 'claimWinnings',
  args: [marketId],
})
```

## Links

- **App:** https://myriad.markets
- **API Docs:** https://help.myriad.markets/developer-docs-v2
- **Explorer:** https://abscan.org/address/0x3e0F5F8F5Fb043aBFA475C0308417Bf72c463289
