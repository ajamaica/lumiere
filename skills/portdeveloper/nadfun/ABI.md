# NadFun ABIs - Smart Contract Interfaces

Comprehensive ABI reference for interacting with NadFun contracts using viem. All ABIs are exported as TypeScript const declarations for maximum type safety and performance.

## Table of Contents

1. [Lens ABI](#lens-abi) - Quote and progress queries
2. [Bonding Curve ABI](#bonding-curve-abi) - Curve pool management
3. [Router ABI](#router-abi) - Bonding curve trading
4. [Bonding Curve Router ABI](#bonding-curve-router-abi) - Token creation and curve trading
5. [DEX Router ABI](#dex-router-abi) - DEX trading
6. [ERC20 Token ABI](#erc20-token-abi) - ERC20 with permit support
7. [Creator Treasury ABI](#creator-treasury-abi) - Creator reward claims
8. [Uniswap V3 Pool ABI](#uniswap-v3-pool-abi) - Uniswap V3 Pool interfaces
9. [Uniswap V3 Factory ABI](#uniswap-v3-factory-abi) - Uniswap V3 Factory interfaces

---

## Lens ABI

**Purpose**: Read-only queries for price calculations and token progress.

```typescript
export const lensAbi = [
  {
    type: 'function',
    name: 'getAmountOut',
    inputs: [
      { name: '_token', type: 'address', internalType: 'address' },
      { name: '_amountIn', type: 'uint256', internalType: 'uint256' },
      { name: '_isBuy', type: 'bool', internalType: 'bool' },
    ],
    outputs: [
      { name: 'router', type: 'address', internalType: 'address' },
      { name: 'amountOut', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAmountIn',
    inputs: [
      { name: '_token', type: 'address', internalType: 'address' },
      { name: '_amountOut', type: 'uint256', internalType: 'uint256' },
      { name: '_isBuy', type: 'bool', internalType: 'bool' },
    ],
    outputs: [
      { name: 'router', type: 'address', internalType: 'address' },
      { name: 'amountIn', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getProgress',
    inputs: [{ name: '_token', type: 'address', internalType: 'address' }],
    outputs: [{ name: 'progress', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getInitialBuyAmountOut',
    inputs: [{ name: 'amountIn', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isGraduated',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isLocked',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'availableBuyTokens',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
    outputs: [
      { name: 'availableBuyToken', type: 'uint256', internalType: 'uint256' },
      { name: 'requiredMonAmount', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const
```

---

## Bonding Curve ABI

**Purpose**: Core bonding curve pool management and operations.

```typescript
export const curveAbi = [
  {
    type: 'function',
    name: 'curves',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
    outputs: [
      { name: 'realMonReserve', type: 'uint256', internalType: 'uint256' },
      { name: 'realTokenReserve', type: 'uint256', internalType: 'uint256' },
      { name: 'virtualMonReserve', type: 'uint256', internalType: 'uint256' },
      { name: 'virtualTokenReserve', type: 'uint256', internalType: 'uint256' },
      { name: 'k', type: 'uint256', internalType: 'uint256' },
      { name: 'targetTokenAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'initVirtualMonReserve', type: 'uint256', internalType: 'uint256' },
      { name: 'initVirtualTokenReserve', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'feeConfig',
    inputs: [],
    outputs: [
      { name: 'deployFeeAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'graduateFeeAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'protocolFee', type: 'uint24', internalType: 'uint24' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isGraduated',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isLocked',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'buy',
    inputs: [
      { name: 'to', type: 'address', internalType: 'address' },
      { name: 'token', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable', // This was missing in the original ABI.md
  },
  {
    type: 'function',
    name: 'sell',
    inputs: [
      { name: 'to', type: 'address', internalType: 'address' },
      { name: 'token', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable', // This was missing in the original ABI.md
  },
  {
    type: 'function',
    name: 'graduate',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable', // This was missing in the original ABI.md
  },
  {
    type: 'function',
    name: 'create', // Internal, use BondingCurveRouter instead
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct ICurve.TokenCreationParams',
        components: [
          { name: 'creator', type: 'address', internalType: 'address' },
          { name: 'name', type: 'string', internalType: 'string' },
          { name: 'symbol', type: 'string', internalType: 'string' },
          { name: 'tokenURI', type: 'string', internalType: 'string' },
          { name: 'salt', type: 'bytes32', internalType: 'bytes32' },
          { name: 'actionId', type: 'uint8', internalType: 'uint8' },
        ],
      },
    ],
    outputs: [
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'pool', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'nonpayable', // This was missing in the original ABI.md
  },
  {
    type: 'function',
    name: 'setConfig',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct ICurve.SetConfigParams',
        components: [
          {
            name: 'config',
            type: 'tuple',
            internalType: 'struct ICurve.Config',
            components: [
              { name: 'virtualMonReserve', type: 'uint256', internalType: 'uint256' },
              { name: 'virtualTokenReserve', type: 'uint256', internalType: 'uint256' },
              { name: 'targetTokenAmount', type: 'uint256', internalType: 'uint256' },
            ],
          },
          {
            name: 'feeConfig',
            type: 'tuple',
            internalType: 'struct ICurve.FeeConfig',
            components: [
              { name: 'deployFeeAmount', type: 'uint256', internalType: 'uint256' },
              { name: 'graduateFeeAmount', type: 'uint256', internalType: 'uint256' },
              { name: 'protocolFee', type: 'uint24', internalType: 'uint24' },
            ],
          },
          {
            name: 'antiSnipingConfig',
            type: 'tuple',
            internalType: 'struct ICurve.AntiSnipingConfig',
            components: [
              { name: 'maxPenaltyBlocks', type: 'uint256', internalType: 'uint256' },
              { name: 'penaltyBlocks', type: 'uint256[]', internalType: 'uint256[]' },
              { name: 'penaltyRates', type: 'uint256[]', internalType: 'uint256[]' },
            ],
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable', // This was missing in the original ABI.md
  },
  {
    type: 'function',
    name: 'config',
    inputs: [],
    outputs: [
      { name: 'virtualMonReserve', type: 'uint256', internalType: 'uint256' },
      { name: 'virtualTokenReserve', type: 'uint256', internalType: 'uint256' },
      { name: 'targetTokenAmount', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'wMon',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'wMonReserve',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'foundationTreasury',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'createdAt',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'CurveCreate',
    inputs: [
      { name: 'creator', type: 'address', indexed: true, internalType: 'address' },
      { name: 'token', type: 'address', indexed: true, internalType: 'address' },
      { name: 'pool', type: 'address', indexed: true, internalType: 'address' },
      { name: 'name', type: 'string', indexed: false, internalType: 'string' },
      { name: 'symbol', type: 'string', indexed: false, internalType: 'string' },
      { name: 'tokenURI', type: 'string', indexed: false, internalType: 'string' },
      { name: 'virtualMon', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'virtualToken', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'targetTokenAmount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'CurveBuy',
    inputs: [
      { name: 'sender', type: 'address', indexed: true, internalType: 'address' },
      { name: 'token', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amountIn', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'amountOut', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'CurveSell',
    inputs: [
      { name: 'sender', type: 'address', indexed: true, internalType: 'address' },
      { name: 'token', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amountIn', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'amountOut', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'CurveSync',
    inputs: [
      { name: 'token', type: 'address', indexed: true, internalType: 'address' },
      { name: 'realMonReserve', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'realTokenReserve', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'virtualMonReserve', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'virtualTokenReserve', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'CurveGraduate',
    inputs: [
      { name: 'token', type: 'address', indexed: true, internalType: 'address' },
      { name: 'pool', type: 'address', indexed: true, internalType: 'address' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'CurveTokenLocked',
    inputs: [{ name: 'token', type: 'address', indexed: true, internalType: 'address' }],
    anonymous: false,
  },
] as const
```

---

## Router ABI

**Purpose**: Low-level DEX router for swaps without token creation.

```typescript
export const routerAbi = [
  {
    type: 'function',
    name: 'buy',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct IRouter.BuyParams', // Added internalType
        components: [
          { name: 'amountOutMin', type: 'uint256', internalType: 'uint256' },
          { name: 'token', type: 'address', internalType: 'address' },
          { name: 'to', type: 'address', internalType: 'address' },
          { name: 'deadline', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'sell',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct IRouter.SellParams', // Added internalType
        components: [
          { name: 'amountIn', type: 'uint256', internalType: 'uint256' },
          { name: 'amountOutMin', type: 'uint256', internalType: 'uint256' },
          { name: 'token', type: 'address', internalType: 'address' },
          { name: 'to', type: 'address', internalType: 'address' },
          { name: 'deadline', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'sellPermit',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct IRouter.SellPermitParams', // Added internalType
        components: [
          { name: 'amountIn', type: 'uint256', internalType: 'uint256' },
          { name: 'amountOutMin', type: 'uint256', internalType: 'uint256' },
          { name: 'amountAllowance', type: 'uint256', internalType: 'uint256' },
          { name: 'token', type: 'address', internalType: 'address' },
          { name: 'to', type: 'address', internalType: 'address' },
          { name: 'deadline', type: 'uint256', internalType: 'uint256' },
          { name: 'v', type: 'uint8', internalType: 'uint8' },
          { name: 'r', type: 'bytes32', internalType: 'bytes32' },
          { name: 's', type: 'bytes32', internalType: 'bytes32' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable',
  },
] as const
```

---

## Bonding Curve Router ABI

**Purpose**: Complete bonding curve operations including token creation and trading.

```typescript
export const bondingCurveRouterAbi = [
  {
    type: 'function',
    name: 'create',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct IBondingCurveRouter.TokenCreationParams', // Added internalType
        components: [
          { name: 'name', type: 'string', internalType: 'string' },
          { name: 'symbol', type: 'string', internalType: 'string' },
          { name: 'tokenURI', type: 'string', internalType: 'string' },
          { name: 'amountOut', type: 'uint256', internalType: 'uint256' },
          { name: 'salt', type: 'bytes32', internalType: 'bytes32' },
          { name: 'actionId', type: 'uint8', internalType: 'uint8' },
        ],
      },
    ],
    outputs: [
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'pool', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'buy',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct IBondingCurveRouter.BuyParams', // Added internalType
        components: [
          { name: 'amountOutMin', type: 'uint256', internalType: 'uint256' },
          { name: 'token', type: 'address', internalType: 'address' },
          { name: 'to', type: 'address', internalType: 'address' },
          { name: 'deadline', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    outputs: [], // Original ABI had amountOut, but this is the bonding curve router's buy
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'sell',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct IBondingCurveRouter.SellParams', // Added internalType
        components: [
          { name: 'amountIn', type: 'uint256', internalType: 'uint256' },
          { name: 'amountOutMin', type: 'uint256', internalType: 'uint256' },
          { name: 'token', type: 'address', internalType: 'address' },
          { name: 'to', type: 'address', internalType: 'address' },
          { name: 'deadline', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    outputs: [], // Original ABI had amountOut, but this is the bonding curve router's sell
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'sellPermit',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct IBondingCurveRouter.SellPermitParams', // Added internalType
        components: [
          { name: 'amountIn', type: 'uint256', internalType: 'uint256' },
          { name: 'amountOutMin', type: 'uint256', internalType: 'uint256' },
          { name: 'amountAllowance', type: 'uint256', internalType: 'uint256' },
          { name: 'token', type: 'address', internalType: 'address' },
          { name: 'to', type: 'address', internalType: 'address' },
          { name: 'deadline', type: 'uint256', internalType: 'uint256' },
          { name: 'v', type: 'uint8', internalType: 'uint8' },
          { name: 'r', type: 'bytes32', internalType: 'bytes32' },
          { name: 's', type: 'bytes32', internalType: 'bytes32' },
        ],
      },
    ],
    outputs: [], // Original ABI had amountOut, but this is the bonding curve router's sellPermit
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getAmountOutWithFee',
    inputs: [
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'amountIn', type: 'uint256', internalType: 'uint256' },
      { name: 'isBuy', type: 'bool', internalType: 'bool' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAmountInWithFee',
    inputs: [
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'amountOut', type: 'uint256', internalType: 'uint256' },
      { name: 'isBuy', type: 'bool', internalType: 'bool' },
    ],
    outputs: [{ name: 'amountIn', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'availableBuyTokens',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
    outputs: [
      { name: 'availableBuyToken', type: 'uint256', internalType: 'uint256' },
      { name: 'requiredMonAmount', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'curve',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'wMon',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
] as const
```

---

## DEX Router ABI

**Purpose**: Uniswap V3-style DEX trading after token graduation.

```typescript
export const dexRouterAbi = [
  {
    type: 'function',
    name: 'buy',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct IDexRouter.BuyParams', // Added internalType
        components: [
          { name: 'amountOutMin', type: 'uint256', internalType: 'uint256' },
          { name: 'token', type: 'address', internalType: 'address' },
          { name: 'to', type: 'address', internalType: 'address' },
          { name: 'deadline', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'sell',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct IDexRouter.SellParams', // Added internalType
        components: [
          { name: 'amountIn', type: 'uint256', internalType: 'uint256' },
          { name: 'amountOutMin', type: 'uint256', internalType: 'uint256' },
          { name: 'token', type: 'address', internalType: 'address' },
          { name: 'to', type: 'address', internalType: 'address' },
          { name: 'deadline', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'sellPermit',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct IDexRouter.SellPermitParams', // Added internalType
        components: [
          { name: 'amountIn', type: 'uint256', internalType: 'uint256' },
          { name: 'amountOutMin', type: 'uint256', internalType: 'uint256' },
          { name: 'amountAllowance', type: 'uint256', internalType: 'uint256' },
          { name: 'token', type: 'address', internalType: 'address' },
          { name: 'to', type: 'address', internalType: 'address' },
          { name: 'deadline', type: 'uint256', internalType: 'uint256' },
          { name: 'v', type: 'uint8', internalType: 'uint8' },
          { name: 'r', type: 'bytes32', internalType: 'bytes32' },
          { name: 's', type: 'bytes32', internalType: 'bytes32' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'exactOutBuy',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct IDexRouter.ExactOutBuyParams', // Added internalType
        components: [
          { name: 'amountInMax', type: 'uint256', internalType: 'uint256' },
          { name: 'amountOut', type: 'uint256', internalType: 'uint256' },
          { name: 'token', type: 'address', internalType: 'address' },
          { name: 'to', type: 'address', internalType: 'address' },
          { name: 'deadline', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    outputs: [{ name: 'amountIn', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'exactOutSell',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct IDexRouter.ExactOutSellParams', // Added internalType
        components: [
          { name: 'amountInMax', type: 'uint256', internalType: 'uint256' },
          { name: 'amountOut', type: 'uint256', internalType: 'uint256' },
          { name: 'token', type: 'address', internalType: 'address' },
          { name: 'to', type: 'address', internalType: 'address' },
          { name: 'deadline', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    outputs: [{ name: 'amountIn', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'exactOutSellPermit',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct IDexRouter.ExactOutSellPermitParams', // Added internalType
        components: [
          { name: 'amountInMax', type: 'uint256', internalType: 'uint256' },
          { name: 'amountOut', type: 'uint256', internalType: 'uint256' },
          { name: 'amountAllowance', type: 'uint256', internalType: 'uint256' },
          { name: 'token', type: 'address', internalType: 'address' },
          { name: 'to', type: 'address', internalType: 'address' },
          { name: 'deadline', type: 'uint256', internalType: 'uint256' },
          { name: 'v', type: 'uint8', internalType: 'uint8' },
          { name: 'r', type: 'bytes32', internalType: 'bytes32' },
          { name: 's', type: 'bytes32', internalType: 'bytes32' },
        ],
      },
    ],
    outputs: [{ name: 'amountIn', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'splitAmountAndFee',
    inputs: [
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
      { name: 'isBuy', type: 'bool', internalType: 'bool' },
    ],
    outputs: [
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
      { name: 'fee', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAmountOut',
    inputs: [
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'amountIn', type: 'uint256', internalType: 'uint256' },
      { name: 'isBuy', type: 'bool', internalType: 'bool' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAmountIn',
    inputs: [
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'amountOut', type: 'uint256', internalType: 'uint256' },
      { name: 'isBuy', type: 'bool', internalType: 'bool' },
    ],
    outputs: [{ name: 'amountIn', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'calculateFeeAmount',
    inputs: [{ name: 'amount', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: 'feeAmount', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'DexRouterBuy',
    inputs: [
      { name: 'sender', type: 'address', indexed: true, internalType: 'address' },
      { name: 'token', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amountIn', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'amountOut', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'DexRouterSell',
    inputs: [
      { name: 'sender', type: 'address', indexed: true, internalType: 'address' },
      { name: 'token', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amountIn', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'amountOut', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
] as const
```

---

## ERC20 Token ABI

**Purpose**: ERC20 token with ERC-2612 permit support for gasless approvals.

```typescript
export const erc20Abi = [
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'transferFrom',
    inputs: [
      { name: 'from', type: 'address', internalType: 'address' },
      { name: 'to', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'permit',
    inputs: [
      { name: 'owner', type: 'address', internalType: 'address' },
      { name: 'spender', type: 'address', internalType: 'address' },
      { name: 'value', type: 'uint256', internalType: 'uint256' },
      { name: 'deadline', type: 'uint256', internalType: 'uint256' },
      { name: 'v', type: 'uint8', internalType: 'uint8' },
      { name: 'r', type: 'bytes32', internalType: 'bytes32' },
      { name: 's', type: 'bytes32', internalType: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'burn',
    inputs: [{ name: 'amount', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'burnFrom',
    inputs: [
      { name: 'account', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setIsListed',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address', internalType: 'address' },
      { name: 'spender', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nonces',
    inputs: [{ name: 'owner', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'tokenURI',
    inputs: [],
    outputs: [{ name: '', type: 'string', internalType: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'DOMAIN_SEPARATOR',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true, internalType: 'address' },
      { name: 'to', type: 'address', indexed: true, internalType: 'address' },
      { name: 'value', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Approval',
    inputs: [
      { name: 'owner', type: 'address', indexed: true, internalType: 'address' },
      { name: 'spender', type: 'address', indexed: true, internalType: 'address' },
      { name: 'value', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
] as const
```

---

## Creator Treasury ABI

**Purpose**: Creator reward claims.

```typescript
export const creatorTreasuryAbi = [
  {
    type: 'function',
    name: 'claim',
    inputs: [
      { name: 'tokens', type: 'address[]', internalType: 'address[]' },
      { name: 'amounts', type: 'uint256[]', internalType: 'uint256[]' },
      { name: 'merkleProofs', type: 'bytes32[][]', internalType: 'bytes32[][]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'Claim',
    inputs: [
      { name: 'token', type: 'address', indexed: true, internalType: 'address' },
      { name: 'creator', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
] as const
```

---

## Uniswap V3 Pool ABI

**Purpose**: Uniswap V3 Pool interfaces for DEX event indexing and state queries.

```typescript
export const uniswapV3PoolAbi = [
  {
    type: 'event',
    name: 'Swap',
    inputs: [
      { name: 'sender', type: 'address', indexed: true, internalType: 'address' },
      { name: 'recipient', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount0', type: 'int256', indexed: false, internalType: 'int256' },
      { name: 'amount1', type: 'int256', indexed: false, internalType: 'int256' },
      { name: 'sqrtPriceX96', type: 'uint160', indexed: false, internalType: 'uint160' },
      { name: 'liquidity', type: 'uint128', indexed: false, internalType: 'uint128' },
      { name: 'tick', type: 'int24', indexed: false, internalType: 'int24' },
    ],
    anonymous: false,
  },
  {
    type: 'function',
    name: 'token0',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'token1',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'fee',
    inputs: [],
    outputs: [{ name: '', type: 'uint24', internalType: 'uint24' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'liquidity',
    inputs: [],
    outputs: [{ name: '', type: 'uint128', internalType: 'uint128' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'slot0',
    inputs: [],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160', internalType: 'uint160' },
      { name: 'tick', type: 'int24', internalType: 'int24' },
      { name: 'observationIndex', type: 'uint16', internalType: 'uint16' },
      { name: 'observationCardinality', type: 'uint16', internalType: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16', internalType: 'uint16' },
      { name: 'feeProtocol', type: 'uint8', internalType: 'uint8' },
      { name: 'unlocked', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'view',
  },
] as const
```

---

## Uniswap V3 Factory ABI

**Purpose**: Uniswap V3 Factory interfaces for pool discovery.

```typescript
export const uniswapV3FactoryAbi = [
  {
    type: 'function',
    name: 'getPool',
    inputs: [
      { name: 'tokenA', type: 'address', internalType: 'address' },
      { name: 'tokenB', type: 'address', internalType: 'address' },
      { name: 'fee', type: 'uint24', internalType: 'uint24' },
    ],
    outputs: [{ name: 'pool', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
] as const
```
