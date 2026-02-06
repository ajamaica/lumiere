# Mamo Contract Addresses & ABIs

## Chain: Base (8453)

## Token Contracts

| Token  | Address                                      | Decimals |
| ------ | -------------------------------------------- | -------- |
| USDC   | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6        |
| cbBTC  | `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf` | 8        |
| MAMO   | `0x7300B37DfdfAb110d83290A29DfB31B1740219fE` | 18       |
| WELL   | `0xA88594D404727625A9437C3f886C7643872296AE` | 18       |
| MORPHO | `0xBAa5CC21fd487B8Fcc2F632f3F4E8D37262a0842` | 18       |

## Mamo Infrastructure

| Contract                           | Address                                      |
| ---------------------------------- | -------------------------------------------- |
| Mamo Strategy Registry             | `0x46a5624C2ba92c08aBA4B206297052EDf14baa92` |
| USDC+cbBTC Strategy Implementation | `0x4007EFfCE837701Fdd90017Ab747fefD58aAD98B` |
| ETH Strategy Implementation        | `0x6C8577fa9B10807f7485f6476C2AFE0B8d61D1e7` |
| USDC Strategy Factory              | `0x5967ea71cC65d610dc6999d7dF62bfa512e62D07` |
| cbBTC Strategy Factory             | `0xE23c8E37F256Ba5783351CBb7B6673FE68248712` |
| ETH Strategy Factory               | `0x14bA47Ef0286B345E2B74d26243767268290eE28` |
| Mamo Backend                       | `0x2Ab03887829EA8632D972cf3816b825Fe7FC5e73` |
| Mamo Multisig                      | `0x26c158A4CD56d148c554190A95A921...`        |

## Moonwell Markets

| Market                         | Address                                      |
| ------------------------------ | -------------------------------------------- |
| Moonwell USDC (mUSDC)          | `0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22` |
| Moonwell USDC Vault (mwUSDC)   | `0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca` |
| Moonwell ETH (mWETH)           | `0x628ff693426583D9a7FB391E54366292F509D457` |
| Moonwell ETH Vault (mwETH)     | `0xa0E430870c4604CcfC7B38Ca7845B1FF653D0ff1` |
| Moonwell cbBTC (mCBBTC)        | `0xF877ACaFA28c19b96727966690b2f44d35aD5976` |
| Moonwell cbBTC Vault (mwCBBTC) | `0x543257ef2161176d7c8cd90ba65c2d4caef5a796` |

## Strategy Contract ABI (Key Functions)

Source: [moonwell-fi/mamo-contracts](https://github.com/moonwell-fi/mamo-contracts)

### ERC20MoonwellMorphoStrategy

```solidity
// Permissionless — anyone can deposit (transfers tokens via safeTransferFrom)
function deposit(uint256 amount) external;

// Owner only — withdraw specific amount
function withdraw(uint256 amount) external;

// Owner only — withdraw everything
function withdrawAll() external;

// View — get the underlying token
function token() external view returns (IERC20);

// View — get the strategy type
function strategyTypeId() external view returns (uint256);

// View — get the owner
function owner() external view returns (address);
```

### MamoStrategyRegistry

```solidity
// Get all strategy addresses for a user
function getUserStrategies(address user) external view returns (address[] memory);

// Check if a strategy belongs to a user
function isUserStrategy(address user, address strategy) external view returns (bool);
```

## Architecture Notes

- Each user gets **per-user proxy contracts** deployed by the Mamo backend
- The implementation addresses above are shared; each user's proxy delegates to them
- `deposit()` is permissionless — it does `token.safeTransferFrom(msg.sender, ...)` so you must approve first
- `withdraw()` and `withdrawAll()` are `onlyOwner` — only the wallet that owns the strategy can withdraw
- Strategies split funds between Moonwell core markets and Morpho vaults based on configurable split ratios
- Rewards (WELL, MORPHO) are auto-compounded via CowSwap with Chainlink price verification
