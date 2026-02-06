# Kaspa Developer Platform API Reference

Base URL: `https://api.kaspa.org`

## Authentication

API requests require an API key passed in the header:

```
Authorization: Bearer YOUR_API_KEY
```

Get an API key at: https://kas.fyi/

## Rate Limits

- Standard tier: 100 requests/minute
- Pro tier: 1000 requests/minute
- Enterprise: Custom limits

## Core RPC Endpoints

### Get Balance by Address

Retrieve the balance for a specific Kaspa address.

**Endpoint:** `POST /api/v1/rpc/get-balance-by-address`

**Request Body:**

```json
{
  "address": "kaspa:qqkqkzjvr7zwxxmjxjkmxx"
}
```

**Response:**

```json
{
  "balance": 1000000000,
  "address": "kaspa:qqkqkzjvr7zwxxmjxjkmxx"
}
```

### Get Balances by Addresses

Retrieve balances for multiple addresses (batch request).

**Endpoint:** `POST /api/v1/rpc/get-balances-by-addresses`

**Request Body:**

```json
{
  "addresses": ["kaspa:qqkqkzjvr7zwxxmjxjkmxx", "kaspa:qqkqkzjvr7zwxxmjxjkmxy"]
}
```

**Response:**

```json
{
  "entries": [
    {
      "address": "kaspa:qqkqkzjvr7zwxxmjxjkmxx",
      "balance": 1000000000
    },
    {
      "address": "kaspa:qqkqkzjvr7zwxxmjxjkmxy",
      "balance": 500000000
    }
  ]
}
```

### Get UTXOs by Addresses

Retrieve UTXOs associated with specific addresses.

**Endpoint:** `POST /api/v1/rpc/get-utxos-by-addresses`

**Request Body:**

```json
{
  "addresses": ["kaspa:qqkqkzjvr7zwxxmjxjkmxx"]
}
```

**Response:**

```json
{
  "entries": [
    {
      "address": "kaspa:qqkqkzjvr7zwxxmjxjkmxx",
      "outpoint": {
        "transactionId": "abcd1234...",
        "index": 0
      },
      "utxoEntry": {
        "amount": 1000000000,
        "scriptPublicKey": "...",
        "blockDaaScore": 12345678,
        "isCoinbase": false
      }
    }
  ]
}
```

### Submit Transaction

Submit a signed transaction to the network.

**Endpoint:** `POST /api/v1/rpc/submit-transaction`

**Request Body:**

```json
{
  "transaction": {
    "version": 0,
    "inputs": [
      {
        "previousOutpoint": {
          "transactionId": "abcd1234...",
          "index": 0
        },
        "signatureScript": "483045022100...",
        "sequence": 0,
        "sigOpCount": 1
      }
    ],
    "outputs": [
      {
        "amount": 900000000,
        "scriptPublicKey": "76a914..."
      }
    ],
    "lockTime": 0,
    "subnetworkId": "00000000000000000000000000000000"
  }
}
```

**Response:**

```json
{
  "transactionId": "efgh5678..."
}
```

### Get Fee Estimate

Retrieve fee estimation data from the node.

**Endpoint:** `POST /api/v1/rpc/get-fee-estimate`

**Response:**

```json
{
  "priorityBucket": {
    "feeRate": 1000,
    "estimatedSeconds": 1
  },
  "normalBucket": {
    "feeRate": 100,
    "estimatedSeconds": 10
  },
  "lowBucket": {
    "feeRate": 10,
    "estimatedSeconds": 60
  }
}
```

### Get Block DAG Info

Provides information about the DAG structure.

**Endpoint:** `POST /api/v1/rpc/get-block-dag-info`

**Response:**

```json
{
  "networkName": "mainnet",
  "blockCount": 12345678,
  "headerCount": 12345678,
  "tipHashes": ["abcd1234..."],
  "difficulty": 123456789012345,
  "pastMedianTime": 1704067200000,
  "virtualParentHashes": ["efgh5678..."],
  "virtualDaaScore": 12345678,
  "sink": "ijkl9012...",
  "sinkBlueScore": 12345678
}
```

### Get Block

Retrieve a specific block by hash.

**Endpoint:** `POST /api/v1/rpc/get-block`

**Request Body:**

```json
{
  "hash": "abcd1234...",
  "includeTransactions": true
}
```

**Response:**

```json
{
  "block": {
    "header": {
      "version": 0,
      "hash": "abcd1234...",
      "hashMerkleRoot": "efgh5678...",
      "acceptedIdMerkleRoot": "ijkl9012...",
      "utxoCommitment": "mnop3456...",
      "timestamp": 1704067200000,
      "bits": 486604799,
      "nonce": 1234567890,
      "daaScore": 12345678,
      "blueScore": 12345678,
      "blueWork": "1234567890abcdef",
      "pruningPoint": "qrst7890..."
    },
    "transactions": [...]
  }
}
```

### Get Blocks

Retrieve multiple blocks by criteria.

**Endpoint:** `POST /api/v1/rpc/get-blocks`

**Request Body:**

```json
{
  "lowHash": "0000000000000000000000000000000000000000000000000000000000000000",
  "includeBlocks": true,
  "includeTransactions": false
}
```

### Get Sink

Retrieve the hash of the sink block (tip of the virtual chain).

**Endpoint:** `POST /api/v1/rpc/get-sink`

**Response:**

```json
{
  "sink": "abcd1234..."
}
```

### Get Sink Blue Score

Retrieve the blue score of the sink block.

**Endpoint:** `POST /api/v1/rpc/get-sink-blue-score`

**Response:**

```json
{
  "blueScore": 12345678
}
```

### Get Coin Supply

Returns the total current coin supply.

**Endpoint:** `POST /api/v1/rpc/get-coin-supply`

**Response:**

```json
{
  "circulatingSupply": 23000000000000000,
  "totalSupply": 28700000000000000,
  "maxSupply": 28700000000000000
}
```

### Get Current Network

Retrieve the current network identifier.

**Endpoint:** `POST /api/v1/rpc/get-current-network`

**Response:**

```json
{
  "network": "mainnet"
}
```

### Get Mempool Entries

Retrieve all mempool entries.

**Endpoint:** `POST /api/v1/rpc/get-mempool-entries`

**Request Body:**

```json
{
  "includeOrphanPool": false,
  "filterTransactionPool": false
}
```

### Get Mempool Entry

Retrieve a specific mempool entry by transaction ID.

**Endpoint:** `POST /api/v1/rpc/get-mempool-entry`

**Request Body:**

```json
{
  "transactionId": "abcd1234...",
  "includeOrphanPool": false
}
```

### Get Mempool Entries by Addresses

Retrieve mempool entries for specific addresses.

**Endpoint:** `POST /api/v1/rpc/get-mempool-entries-by-addresses`

**Request Body:**

```json
{
  "addresses": ["kaspa:qqkqkzjvr7zwxxmjxjkmxx"],
  "includeOrphanPool": false,
  "filterTransactionPool": false
}
```

### Estimate Network Hashes Per Second

Estimate the network hash rate.

**Endpoint:** `POST /api/v1/rpc/estimate-network-hashes-per-second`

**Request Body:**

```json
{
  "windowSize": 1000
}
```

**Response:**

```json
{
  "networkHashesPerSecond": "12345678901234567890"
}
```

## Block Endpoints

### Get Block Details

Retrieve details for a specific block.

**Endpoint:** `GET /api/v1/blocks/{hash}`

**Response:**

```json
{
  "hash": "abcd1234...",
  "version": 0,
  "hashMerkleRoot": "efgh5678...",
  "acceptedIdMerkleRoot": "ijkl9012...",
  "utxoCommitment": "mnop3456...",
  "timestamp": 1704067200000,
  "bits": 486604799,
  "nonce": 1234567890,
  "daaScore": 12345678,
  "blueScore": 12345678,
  "blueWork": "1234567890abcdef",
  "pruningPoint": "qrst7890...",
  "transactionCount": 5,
  "transactions": [...]
}
```

### Get Blocks by Blue Score Range

Retrieve blocks within a blue score range.

**Endpoint:** `GET /api/v1/blocks?startBlueScore={start}&endBlueScore={end}`

**Parameters:**

- `startBlueScore`: Starting blue score (inclusive)
- `endBlueScore`: Ending blue score (inclusive)
- Max range: 100 blocks per request

### Get Blocks by DAA Score Range

Retrieve blocks within a DAA score range.

**Endpoint:** `GET /api/v1/blocks/daa?startDaaScore={start}&endDaaScore={end}`

**Parameters:**

- `startDaaScore`: Starting DAA score (inclusive)
- `endDaaScore`: Ending DAA score (inclusive)
- Max range: 100 blocks per request

## Address Endpoints

### Get Address Tag

Retrieve address tag and metadata.

**Endpoint:** `GET /api/v1/addresses/{address}/tag`

**Response:**

```json
{
  "address": "kaspa:qqkqkzjvr7zwxxmjxjkmxx",
  "tag": "Exchange Name",
  "type": "exchange"
}
```

### Get Address Transactions

Retrieve paginated transactions for an address.

**Endpoint:** `GET /api/v1/addresses/{address}/transactions`

**Query Parameters:**

- `limit`: Number of results (default: 50, max: 500)
- `cursor`: Pagination cursor
- `acceptedOnly`: Filter to accepted transactions only
- `includePayload`: Include transaction payload

**Response:**

```json
{
  "transactions": [...],
  "cursor": "next_cursor",
  "hasMore": true
}
```

## Transaction Endpoints

### Get Transaction

Retrieve a transaction by ID.

**Endpoint:** `GET /api/v1/transactions/{transactionId}`

**Response:**

```json
{
  "transactionId": "abcd1234...",
  "version": 0,
  "inputs": [...],
  "outputs": [...],
  "lockTime": 0,
  "subnetworkId": "00000000000000000000000000000000",
  "gas": 0,
  "payload": "",
  "blockHash": "efgh5678...",
  "blockTime": 1704067200000,
  "isAccepted": true,
  "acceptingBlockHash": "ijkl9012...",
  "acceptingBlockBlueScore": 12345678
}
```

### Get Multiple Transactions

Retrieve multiple transactions in a single request.

**Endpoint:** `POST /api/v1/transactions`

**Request Body:**

```json
{
  "transactionIds": ["abcd1234...", "efgh5678..."]
}
```

**Max:** 500 transactions per request

### Get Transaction Outputs

Retrieve specific transaction outputs.

**Endpoint:** `GET /api/v1/transactions/{transactionId}/outputs/{index}`

**Response:**

```json
{
  "transactionId": "abcd1234...",
  "index": 0,
  "amount": 1000000000,
  "scriptPublicKey": "76a914...",
  "address": "kaspa:qqkqkzjvr7zwxxmjxjkmxx",
  "isSpent": false,
  "acceptingBlockHash": "efgh5678..."
}
```

### Create Transaction Acceptance

Retrieve acceptance data for multiple transactions.

**Endpoint:** `POST /api/v1/transactions/acceptance`

**Request Body:**

```json
{
  "transactionIds": ["abcd1234...", "efgh5678..."]
}
```

**Max:** 500 transactions per request

## Token Endpoints (KRC20)

### Get Token Metadata

Retrieve metadata for a KRC20 token.

**Endpoint:** `GET /api/v1/tokens/{ticker}/metadata`

**Response:**

```json
{
  "ticker": "KASPER",
  "name": "Kasper Token",
  "decimals": 8,
  "maxSupply": "100000000000000000",
  "minted": "50000000000000000",
  "holders": 1234,
  "transactions": 5678
}
```

### Get Token Market Data

Retrieve market data for KRC20 tokens.

**Endpoint:** `GET /api/v1/tokens/market-data`

**Query Parameters:**

- `tickers`: Comma-separated list of token tickers

### Get Token Chart Data

Retrieve chart data for a KRC20 token.

**Endpoint:** `GET /api/v1/tokens/{ticker}/chart`

**Query Parameters:**

- `interval`: Time interval (1h, 1d, 1w, 1m)
- `from`: Start timestamp
- `to`: End timestamp

## Data Types

### Address

Kaspa addresses use Bech32 encoding:

- Mainnet: `kaspa:qqkqkzjvr7zwxxmjxjkmxx`
- Testnet: `kaspatest:qqkqkzjvr7zwxxmjxjkmxx`
- Devnet: `kaspadev:qqkqkzjvr7zwxxmjxjkmxx`

### Transaction ID

32-byte hex string representing a transaction hash.

### Block Hash

32-byte hex string representing a block hash.

### Amount

Amounts are represented in sompi (1 KAS = 100,000,000 sompi).

### Blue Score

Kaspa's metric for measuring block depth in the DAG. Higher blue score = more confirmations.

### DAA Score

Difficulty Adjustment Algorithm score, used for difficulty calculations.

## Error Handling

### HTTP Status Codes

- `200`: Success
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Invalid API key
- `404`: Not Found - Resource doesn't exist
- `429`: Rate Limited - Too many requests
- `500`: Internal Server Error

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_ADDRESS",
    "message": "The provided address is invalid"
  }
}
```

### Common Error Codes

- `INVALID_ADDRESS`: Address format is incorrect
- `INVALID_TRANSACTION_ID`: Transaction ID format is incorrect
- `INVALID_BLOCK_HASH`: Block hash format is incorrect
- `TRANSACTION_NOT_FOUND`: Transaction not found
- `BLOCK_NOT_FOUND`: Block not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INVALID_PARAMETERS`: Request parameters are invalid

## Pagination

Cursor-based pagination is used for list endpoints.

**Request:**

```
GET /api/v1/addresses/{address}/transactions?limit=50&cursor=abc123
```

**Response:**

```json
{
  "transactions": [...],
  "cursor": "next_cursor",
  "hasMore": true
}
```

Use the `cursor` from the response to fetch the next page. When `hasMore` is false, you've reached the end.

## Code Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios'

const client = axios.create({
  baseURL: 'https://api.kaspa.org',
  headers: {
    Authorization: 'Bearer YOUR_API_KEY',
  },
})

// Get balance
const getBalance = async (address: string) => {
  const response = await client.post('/api/v1/rpc/get-balance-by-address', {
    address,
  })
  return response.data
}

// Get transactions
const getTransactions = async (address: string, cursor?: string) => {
  const response = await client.get(`/api/v1/addresses/${address}/transactions`, {
    params: { limit: 50, cursor },
  })
  return response.data
}
```

### Python

```python
import requests

BASE_URL = 'https://api.kaspa.org'
HEADERS = {
    'Authorization': 'Bearer YOUR_API_KEY'
}

# Get balance
def get_balance(address):
    response = requests.post(
        f'{BASE_URL}/api/v1/rpc/get-balance-by-address',
        json={'address': address},
        headers=HEADERS
    )
    return response.json()

# Get transactions
def get_transactions(address, cursor=None):
    params = {'limit': 50}
    if cursor:
        params['cursor'] = cursor

    response = requests.get(
        f'{BASE_URL}/api/v1/addresses/{address}/transactions',
        params=params,
        headers=HEADERS
    )
    return response.json()
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

const baseURL = "https://api.kaspa.org"

func getBalance(apiKey, address string) (map[string]interface{}, error) {
    payload := map[string]string{"address": address}
    jsonData, _ := json.Marshal(payload)

    req, _ := http.NewRequest("POST", baseURL+"/api/v1/rpc/get-balance-by-address", bytes.NewBuffer(jsonData))
    req.Header.Set("Authorization", "Bearer "+apiKey)
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    return result, nil
}
```
