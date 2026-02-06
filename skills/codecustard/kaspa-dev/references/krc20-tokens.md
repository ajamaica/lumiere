# KRC20 Token Standard

KRC20 is Kaspa's token standard, similar to ERC20 on Ethereum. It enables the creation and management of fungible tokens on the Kaspa blockchain.

## Overview

KRC20 tokens are implemented as data stored within Kaspa transactions, utilizing the transaction payload field. Unlike Ethereum's smart contract-based tokens, KRC20 tokens leverage Kaspa's UTXO model and DAG structure.

## Token Operations

### Token Deployment

To deploy a KRC20 token, you create a special transaction with deployment data in the payload.

**Token Parameters:**

- `tick`: Token ticker symbol (e.g., "KASPER")
- `max`: Maximum supply
- `lim`: Limit per mint
- `dec`: Decimals (default: 8)
- `pre`: Premine amount
- `to`: Deployer address

**Example Deployment Transaction:**

```json
{
  "version": 0,
  "inputs": [...],
  "outputs": [
    {
      "amount": 0,
      "scriptPublicKey": "..."
    }
  ],
  "lockTime": 0,
  "subnetworkId": "00000000000000000000000000000000",
  "gas": 0,
  "payload": "krc20|deploy|tick=KASPER|max=100000000000000000|lim=10000000000|dec=8"
}
```

### Token Minting

Minting creates new tokens according to the deployment parameters.

**Mint Operation:**

```json
{
  "payload": "krc20|mint|tick=KASPER|amt=10000000000"
}
```

### Token Transfer

Transfer tokens between addresses.

**Transfer Operation:**

```json
{
  "payload": "krc20|transfer|tick=KASPER|amt=5000000000|to=kaspa:recipient_address"
}
```

### Token Burn

Permanently destroy tokens.

**Burn Operation:**

```json
{
  "payload": "krc20|burn|tick=KASPER|amt=1000000000"
}
```

## Token Data Structure

### Token Metadata

```typescript
interface KRC20Token {
  tick: string // Token ticker
  name: string // Token name
  maxSupply: string // Maximum supply (as string for big numbers)
  minted: string // Currently minted amount
  decimals: number // Decimal places
  limitPerMint: string // Maximum per mint operation
  premine: string // Premine amount
  deployer: string // Deployer address
  deployTime: number // Deployment timestamp
  holders: number // Number of holders
  transactions: number // Total token transactions
}
```

### Token Balance

```typescript
interface KRC20Balance {
  address: string
  tick: string
  balance: string
  locked: string
}
```

### Token Transaction

```typescript
interface KRC20Transaction {
  transactionId: string
  operation: 'deploy' | 'mint' | 'transfer' | 'burn'
  tick: string
  from: string
  to: string
  amount: string
  timestamp: number
  blockHash: string
  blockBlueScore: number
}
```

## API Endpoints

### Get Token Metadata

```http
GET /api/v1/tokens/{ticker}/metadata
```

**Response:**

```json
{
  "tick": "KASPER",
  "name": "Kasper Token",
  "maxSupply": "100000000000000000",
  "minted": "50000000000000000",
  "decimals": 8,
  "limitPerMint": "10000000000",
  "premine": "1000000000000000",
  "deployer": "kaspa:qqkqkzjvr7zwxxmjxjkmxx",
  "deployTime": 1704067200,
  "holders": 1234,
  "transactions": 5678
}
```

### Get Token Market Data

```http
GET /api/v1/tokens/market-data?tickers=KASPER,ANOTHER
```

**Response:**

```json
{
  "tokens": [
    {
      "tick": "KASPER",
      "price": "0.00000123",
      "marketCap": "123456789",
      "volume24h": "9876543",
      "priceChange24h": "5.67"
    }
  ]
}
```

### Get Token Chart Data

```http
GET /api/v1/tokens/{ticker}/chart?interval=1d&from=1703980800&to=1704067200
```

**Parameters:**

- `interval`: Time interval (`1h`, `1d`, `1w`, `1m`)
- `from`: Start timestamp
- `to`: End timestamp

**Response:**

```json
{
  "data": [
    {
      "timestamp": 1703980800,
      "price": "0.00000120",
      "volume": "1234567"
    }
  ]
}
```

### Get Token Holders

```http
GET /api/v1/tokens/{ticker}/holders
```

**Response:**

```json
{
  "holders": [
    {
      "address": "kaspa:qqkqkzjvr7zwxxmjxjkmxx",
      "balance": "1000000000000",
      "percentage": "2.00"
    }
  ],
  "totalHolders": 1234
}
```

### Get Address Token Balances

```http
GET /api/v1/addresses/{address}/tokens
```

**Response:**

```json
{
  "balances": [
    {
      "tick": "KASPER",
      "balance": "1000000000000",
      "locked": "0"
    }
  ]
}
```

## JavaScript/TypeScript Implementation

### Deploy Token

```typescript
import { Transaction, RpcClient, NetworkType } from 'kaspa-wasm'

async function deployKRC20Token(
  rpc: RpcClient,
  deployerKey: PrivateKey,
  params: {
    tick: string
    max: string
    lim: string
    dec?: number
    pre?: string
  },
): Promise<string> {
  const deployerAddress = deployerKey.toPublicKey().toAddress(NetworkType.Mainnet).toString()

  // Build payload
  const payload =
    `krc20|deploy|tick=${params.tick}|max=${params.max}|lim=${params.lim}` +
    (params.dec ? `|dec=${params.dec}` : '') +
    (params.pre ? `|pre=${params.pre}` : '')

  // Create transaction
  const tx = new Transaction({
    version: 0,
    inputs: [], // Fill with UTXOs
    outputs: [
      {
        amount: 0n,
        scriptPublicKey: deployerKey
          .toPublicKey()
          .toAddress(NetworkType.Mainnet)
          .toScriptPublicKey(),
      },
    ],
    lockTime: 0,
    subnetworkId: '00000000000000000000000000000000',
    gas: 0,
    payload: Buffer.from(payload).toString('hex'),
  })

  // Sign and submit
  const signedTx = tx.sign([deployerKey])
  const result = await rpc.submitTransaction({ transaction: signedTx })

  return result.transactionId
}
```

### Mint Tokens

```typescript
async function mintKRC20Tokens(
  rpc: RpcClient,
  minterKey: PrivateKey,
  tick: string,
  amount: string,
): Promise<string> {
  const minterAddress = minterKey.toPublicKey().toAddress(NetworkType.Mainnet).toString()

  const payload = `krc20|mint|tick=${tick}|amt=${amount}`

  const tx = new Transaction({
    version: 0,
    inputs: [], // Fill with UTXOs
    outputs: [
      {
        amount: 0n,
        scriptPublicKey: minterKey.toPublicKey().toAddress(NetworkType.Mainnet).toScriptPublicKey(),
      },
    ],
    lockTime: 0,
    subnetworkId: '00000000000000000000000000000000',
    gas: 0,
    payload: Buffer.from(payload).toString('hex'),
  })

  const signedTx = tx.sign([minterKey])
  const result = await rpc.submitTransaction({ transaction: signedTx })

  return result.transactionId
}
```

### Transfer Tokens

```typescript
async function transferKRC20Tokens(
  rpc: RpcClient,
  senderKey: PrivateKey,
  recipientAddress: string,
  tick: string,
  amount: string,
): Promise<string> {
  const senderAddress = senderKey.toPublicKey().toAddress(NetworkType.Mainnet).toString()

  const payload = `krc20|transfer|tick=${tick}|amt=${amount}|to=${recipientAddress}`

  const tx = new Transaction({
    version: 0,
    inputs: [], // Fill with UTXOs
    outputs: [
      {
        amount: 0n,
        scriptPublicKey: senderKey.toPublicKey().toAddress(NetworkType.Mainnet).toScriptPublicKey(),
      },
    ],
    lockTime: 0,
    subnetworkId: '00000000000000000000000000000000',
    gas: 0,
    payload: Buffer.from(payload).toString('hex'),
  })

  const signedTx = tx.sign([senderKey])
  const result = await rpc.submitTransaction({ transaction: signedTx })

  return result.transactionId
}
```

## Python Implementation

### Deploy Token

```python
import requests

def deploy_krc20_token(
    api_key: str,
    deployer_address: str,
    tick: str,
    max_supply: str,
    limit_per_mint: str,
    decimals: int = 8,
    premine: str = "0"
):
    """Deploy a new KRC20 token."""

    payload = f"krc20|deploy|tick={tick}|max={max_supply}|lim={limit_per_mint}"
    if decimals != 8:
        payload += f"|dec={decimals}"
    if premine != "0":
        payload += f"|pre={premine}"

    # Build and submit transaction
    # ... transaction building logic ...

    return transaction_id
```

### Query Token Balance

```python
def get_token_balance(
    api_key: str,
    address: str,
    tick: str
) -> str:
    """Get KRC20 token balance for an address."""

    response = requests.get(
        f"https://api.kaspa.org/api/v1/addresses/{address}/tokens",
        headers={"Authorization": f"Bearer {api_key}"}
    )

    data = response.json()
    for balance in data["balances"]:
        if balance["tick"] == tick:
            return balance["balance"]

    return "0"
```

## Best Practices

### Token Deployment

1. **Choose ticker carefully**: Must be unique, 4-6 characters recommended
2. **Set reasonable limits**: Consider `lim` parameter to prevent rapid minting
3. **Plan decimals**: 8 decimals is standard (like KAS)
4. **Consider premine**: Only if necessary for project needs

### Token Operations

1. **Verify token exists**: Check metadata before operations
2. **Check balances**: Ensure sufficient balance before transfers
3. **Monitor transactions**: Track operation status
4. **Handle errors**: Implement proper error handling

### Security

1. **Validate payloads**: Ensure proper format before submission
2. **Secure keys**: Never expose private keys
3. **Test on testnet**: Always test tokens on testnet first
4. **Monitor supply**: Track minted vs max supply

## Common Issues

### Invalid Ticker

- Must be 1-6 characters
- Must be unique (check existing tokens)
- Case-insensitive

### Insufficient Balance

- Check token balance before transfers
- Account for locked tokens
- Verify UTXOs for gas fees

### Transaction Failures

- Ensure proper payload format
- Check network connectivity
- Verify transaction fees

## Resources

- **API Documentation**: https://docs.kas.fyi/
- **Token Explorer**: https://kas.fyi/tokens
- **GitHub**: https://github.com/kaspanet
- **Community**: Kaspa Discord and Telegram

## Example Tokens

Popular KRC20 tokens on Kaspa:

- **KASPER**: Example community token
- **NACHO**: First major KRC20 token
- **KASB**: Kaspa-based token

Check https://kas.fyi/tokens for current list.
