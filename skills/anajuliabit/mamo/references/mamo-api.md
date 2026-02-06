# Mamo API Reference

## Base URLs

| Service     | URL                                         |
| ----------- | ------------------------------------------- |
| Account API | `https://mamo-queues.moonwell.workers.dev`  |
| Indexer API | `https://mamo-indexer.moonwell.workers.dev` |

## Authentication

SIWE (Sign-In With Ethereum) — EIP-4361 message signed by wallet, submitted to API.

### Flow

1. Create SIWE message with wallet address, domain `mamo.xyz`, chainId `8453`
2. Sign message with wallet private key
3. POST signed message + signature to `/onboard-account`
4. Receive auth token / account confirmation

## Endpoints

### Account Management

#### `POST /onboard-account`

Onboard a new user / authenticate.

```json
{
  "message": "<SIWE message string>",
  "signature": "<hex signature>",
  "account": "0x..."
}
```

#### `POST /create-strategy`

Create a new yield strategy for the user.

```json
{
  "account": "0xWalletAddress",
  "strategyType": "usdc_stablecoin",
  "channel": "xmtp",
  "userId": "0xWalletAddress",
  "createOnlyIfMissing": true,
  "version": "v2",
  "metadata": {}
}
```

**Strategy types:** `usdc_stablecoin`, `cbbtc_lending`, `mamo_staking`, `eth_lending`

**Channels:** `web`, `telegram`, `xmtp`, `acp`

#### `GET /account/{address}`

Get account data and strategy balances.

#### `POST /set-user-reward-compound-mode`

Set reward handling mode (REINVEST or COMPOUND).

#### `POST /migrate-mamo-staking/{address}`

Migrate v1 → v2 MAMO staking.

### APY

#### `GET /apy/usdc_stablecoin`

#### `GET /apy/cbbtc_lending`

#### `GET /apy/mamo_staking`

#### `GET /apy/eth_lending`

Returns current APY data for the specified strategy.

## Notes

- The Account API handles mutations (create, onboard, settings)
- The Indexer API handles reads (account data, APY)
- Auth may require Bearer token for some endpoints
- Strategy creation deploys a per-user proxy contract on Base
