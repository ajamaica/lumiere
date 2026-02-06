# Contract Reference

## Addresses (Base Mainnet)

```
BREAD Token:      0xAfcAF9e3c9360412cbAa8475ed85453170E75fD5
Bakery:           0xE7Ce600e0d1aB2b453aDdd6E72bB87c652f34E33
Oven:             0xEdB551E65cA0F15F96b97bD5b6ad1E2Be30A36Ed
Airdrop:          0xD4B90ac64E2d92f4e2ec784715f4b3900C187dc5
```

## Function Selectors

### Bakery

| Function                               | Selector     | Notes                               |
| -------------------------------------- | ------------ | ----------------------------------- |
| `propose(string,string,string,string)` | `0x945f41ab` | name, symbol, description, imageUrl |
| `backProposal(uint256)`                | `0x49729de1` | Send ETH with call                  |
| `withdrawBacking(uint256)`             | `0x7a73ab9e` | Same day only                       |
| `claimTokens(uint256)`                 | `0x46e04a2f` | After launch                        |
| `claimRefund(uint256)`                 | `0x34735cd4` | After settlement, losers only       |
| `settleDay(uint256)`                   | `0x7f2479d1` | Anyone can call after day ends      |
| `launchToken(uint256)`                 | `0xf752dd8d` | Anyone can call for winner          |
| `getCurrentDay()`                      | `0x82d4a36d` | View                                |
| `getTimeUntilSettlement()`             | `0x8c65c81f` | View                                |
| `getDailyProposals(uint256)`           | `0x3b8d5615` | View                                |
| `calculateProposalFee()`               | `0x09adc596` | View                                |
| `calculateBackingFee(uint256)`         | `0x7e8de4f4` | View                                |

### BREAD Token (ERC-20)

| Function                     | Selector     | Notes           |
| ---------------------------- | ------------ | --------------- |
| `approve(address,uint256)`   | `0x095ea7b3` | Standard ERC-20 |
| `transfer(address,uint256)`  | `0xa9059cbb` | Standard ERC-20 |
| `balanceOf(address)`         | `0x70a08231` | View            |
| `allowance(address,address)` | `0xdd62ed3e` | View            |

## ABI Snippets

### Bakery Core Functions

```json
[
  {
    "name": "propose",
    "type": "function",
    "inputs": [
      { "name": "name", "type": "string" },
      { "name": "symbol", "type": "string" },
      { "name": "description", "type": "string" },
      { "name": "imageUrl", "type": "string" }
    ],
    "outputs": [{ "name": "proposalId", "type": "uint256" }]
  },
  {
    "name": "backProposal",
    "type": "function",
    "stateMutability": "payable",
    "inputs": [{ "name": "proposalId", "type": "uint256" }],
    "outputs": []
  },
  {
    "name": "withdrawBacking",
    "type": "function",
    "inputs": [{ "name": "proposalId", "type": "uint256" }],
    "outputs": []
  },
  {
    "name": "claimTokens",
    "type": "function",
    "inputs": [{ "name": "proposalId", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "name": "claimRefund",
    "type": "function",
    "inputs": [{ "name": "proposalId", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "uint256" }]
  }
]
```

### Proposal Struct

```solidity
struct Proposal {
    uint256 id;
    address creator;        // Wallet address
    string name;
    string symbol;
    string description;
    string imageUrl;
    uint256 ethRaised;
    uint256 breadFeePaid;
    uint256 uniqueBackers;
    uint256 createdAt;
    uint256 dayNumber;
    bool launched;
    bool settled;
}
```

### Backing Struct

```solidity
struct Backing {
    uint256 ethAmount;
    uint256 breadFeePaid;
    bool claimed;
}
```

## Encoding Examples

### Propose a Token

```javascript
import { encodeFunctionData, parseEther } from 'viem'

// Encode propose call
const proposeData = encodeFunctionData({
  abi: [
    {
      name: 'propose',
      type: 'function',
      inputs: [
        { name: 'name', type: 'string' },
        { name: 'symbol', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'imageUrl', type: 'string' },
      ],
    },
  ],
  functionName: 'propose',
  args: ['CatCoin', 'CAT', 'A purrfect meme coin', 'https://i.imgur.com/cat.png'],
})

// Send transaction directly from your wallet
await walletClient.writeContract({
  address: '0xE7Ce600e0d1aB2b453aDdd6E72bB87c652f34E33', // Bakery
  abi: bakeryAbi,
  functionName: 'propose',
  args: ['CatCoin', 'CAT', 'A purrfect meme coin', 'https://i.imgur.com/cat.png'],
})
```

### Back a Proposal

```javascript
// First approve BREAD
await walletClient.writeContract({
  address: '0xAfcAF9e3c9360412cbAa8475ed85453170E75fD5', // BREAD
  abi: erc20Abi,
  functionName: 'approve',
  args: [
    '0xE7Ce600e0d1aB2b453aDdd6E72bB87c652f34E33', // Bakery
    parseEther('50'), // 100 BREAD per 1 ETH, so 50 BREAD for 0.5 ETH
  ],
})

// Then back with ETH
await walletClient.writeContract({
  address: '0xE7Ce600e0d1aB2b453aDdd6E72bB87c652f34E33', // Bakery
  abi: bakeryAbi,
  functionName: 'backProposal',
  args: [1n], // Proposal ID
  value: parseEther('0.5'), // 0.5 ETH backing
})
```

## Chain Info

| Property       | Value                    |
| -------------- | ------------------------ |
| Chain          | Base Mainnet             |
| Chain ID       | 8453                     |
| RPC            | https://mainnet.base.org |
| Block Explorer | https://basescan.org     |
| Native Token   | ETH                      |
