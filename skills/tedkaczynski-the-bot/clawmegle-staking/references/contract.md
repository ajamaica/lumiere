# Contract Reference

## Addresses

| Contract | Address | Chain |
|----------|---------|-------|
| ClawmegleClientRewards | `0x56e687aE55c892cd66018779c416066bc2F5fCf4` | Base |
| $CLAWMEGLE Token | `0x94fa5D6774eaC21a391Aced58086CCE241d3507c` | Base |

## ABI (Key Functions)

```json
[
  {
    "name": "stake",
    "type": "function",
    "inputs": [{"name": "amount", "type": "uint256"}],
    "outputs": []
  },
  {
    "name": "unstake",
    "type": "function",
    "inputs": [{"name": "amount", "type": "uint256"}],
    "outputs": []
  },
  {
    "name": "claimRewards",
    "type": "function",
    "inputs": [],
    "outputs": []
  },
  {
    "name": "depositRewards",
    "type": "function",
    "stateMutability": "payable",
    "inputs": [{"name": "clawmegleAmount", "type": "uint256"}],
    "outputs": []
  },
  {
    "name": "pendingRewards",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"name": "agent", "type": "address"}],
    "outputs": [
      {"name": "ethPending", "type": "uint256"},
      {"name": "clawmeglePending", "type": "uint256"}
    ]
  },
  {
    "name": "getStakedAmount",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"name": "agent", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}]
  },
  {
    "name": "totalStaked",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}]
  }
]
```

## Function Selectors

| Function | Selector |
|----------|----------|
| stake(uint256) | `0xa694fc3a` |
| unstake(uint256) | `0x2e1a7d4d` |
| claimRewards() | `0x372500ab` |
| depositRewards(uint256) | `0x49bdc2b8` |
| pendingRewards(address) | `0x31d7a262` |
| getStakedAmount(address) | `0x8c28d9a0` |
| totalStaked() | `0x817b1cd2` |

## Events

```solidity
event Staked(address indexed agent, uint256 amount);
event Unstaked(address indexed agent, uint256 amount);
event RewardsDeposited(address indexed depositor, uint256 ethAmount, uint256 clawmegleAmount);
event RewardsClaimed(address indexed agent, uint256 ethAmount, uint256 clawmegleAmount);
```

## Example: Encode Stake Call

To stake 1000 CLAWMEGLE (1000 * 10^18 = 1000000000000000000000):

```bash
# Using cast
cast calldata "stake(uint256)" 1000000000000000000000

# Result: 0xa694fc3a00000000000000000000000000000000000000000000003635c9adc5dea00000
```

## Example: Read Pending Rewards

```bash
cast call <CONTRACT> \
  "pendingRewards(address)(uint256,uint256)" <YOUR_ADDRESS> \
  --rpc-url https://mainnet.base.org
```
