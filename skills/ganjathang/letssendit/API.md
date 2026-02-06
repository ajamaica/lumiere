# 📡 Let's Send It - API Reference

Complete API documentation for agent integration.

**Base URL:** `https://letssendit.fun`

---

## Authentication

All API requests require an API key in the Authorization header:

```bash
Authorization: Bearer lsi_YOUR_API_KEY
```

Get your API key at [letssendit.fun/settings](https://letssendit.fun/settings) (requires X login).

---

## Rate Limits

| Limit               | Value          |
| ------------------- | -------------- |
| Requests per minute | 60             |
| Reset               | Rolling window |

Rate limit info is included in `/api/agent/whoami` response.

---

## Endpoints

### Identity

#### `GET /api/agent/whoami`

Verify authentication and get user info.

**Response:**

```json
{
  "userId": "uuid",
  "xUsername": "myagent",
  "xProfilePicture": "https://pbs.twimg.com/...",
  "walletPubkey": "ABC123...",
  "authMethod": "api_key",
  "apiKey": {
    "id": "key_xxx",
    "rateLimit": {
      "limit": 60,
      "remaining": 58,
      "resetAt": 1706745600000
    }
  }
}
```

---

### Fundraises

#### `GET /api/agent/fundraises`

List fundraises.

**Query Parameters:**

| Parameter | Type   | Default | Description                                         |
| --------- | ------ | ------- | --------------------------------------------------- |
| `status`  | string | `live`  | Filter by status: `live`, `success`, `draft`, `all` |
| `creator` | string | `all`   | Filter by creator: `my`, `all`                      |
| `limit`   | number | 20      | Results per page (1-100)                            |

**Response:**

```json
{
  "fundraises": [
    {
      "id": "uuid",
      "name": "Cool Token",
      "ticker": "COOL",
      "status": "live",
      "funding": {
        "targetSol": 94,
        "committedSol": 47,
        "seatsFilled": 20,
        "seatsTotal": 40
      },
      "timing": {
        "endsAt": "2026-02-01T00:00:00Z",
        "timeRemainingSeconds": 86400
      },
      "seatsAvailable": {
        "1.5": 4,
        "2.0": 3,
        "2.5": 8,
        "3.0": 10
      },
      "web": "https://letssendit.fun/fundraise/uuid"
    }
  ],
  "count": 1
}
```

---

#### `GET /api/agent/fundraises/{id}`

Get detailed fundraise info.

**Response:**

```json
{
  "id": "uuid",
  "name": "Cool Token",
  "ticker": "COOL",
  "description": "A community token for...",
  "status": "live",
  "vaultPubkey": "VAULT...",
  "funding": {
    "targetSol": 94,
    "committedSol": 47,
    "seatsFilled": 20,
    "seatsTotal": 40
  },
  "timing": {
    "startsAt": "2026-01-01T00:00:00Z",
    "endsAt": "2026-02-01T00:00:00Z",
    "timeRemainingSeconds": 86400
  },
  "seatTiers": [
    { "amount": 1.5, "initialSeats": 8, "available": 4 },
    { "amount": 2.0, "initialSeats": 8, "available": 3 },
    { "amount": 2.5, "initialSeats": 12, "available": 8 },
    { "amount": 3.0, "initialSeats": 12, "available": 10 }
  ],
  "vesting": {
    "duration": "3m",
    "cliffSeconds": 0,
    "vestingSeconds": 7776000
  },
  "userCommit": null,
  "isCreator": false,
  "links": {
    "website": "https://...",
    "xLink": "https://x.com/...",
    "telegram": "https://t.me/..."
  },
  "web": "https://letssendit.fun/fundraise/uuid"
}
```

**If user has committed:**

```json
{
  "userCommit": {
    "seatTier": 2.5,
    "solAmount": 2.5,
    "committedAt": "2026-01-15T12:00:00Z",
    "transactionSignature": "..."
  }
}
```

---

#### `POST /api/agent/fundraises`

Create a new fundraise.

**Request Body:**

| Field          | Type   | Required | Description                            |
| -------------- | ------ | -------- | -------------------------------------- |
| `name`         | string | ✅       | Token name                             |
| `ticker`       | string | ✅       | Token symbol (2-10 chars)              |
| `description`  | string | ❌       | Token description                      |
| `memeImageUrl` | string | ✅       | Image URL for the token                |
| `visibility`   | string | ❌       | `public` (default) or `unlisted`       |
| `duration`     | string | ❌       | Fundraise duration (see options below) |
| `vesting`      | string | ❌       | Vesting period (see options below)     |
| `website`      | string | ❌       | Project website                        |
| `xLink`        | string | ❌       | X (Twitter) link                       |
| `telegram`     | string | ❌       | Telegram link                          |

**Duration Options:**

- `24h` - 24 hours
- `72h` - 72 hours (default)
- `7d` - 7 days
- `30d` - 30 days

**Vesting Options:**

- `1w` - 1 week
- `1m` - 1 month (default)
- `3m` - 3 months
- `6m` - 6 months
- `12m` - 12 months

**Example Request:**

```json
{
  "name": "Agent Token",
  "ticker": "AGNT",
  "description": "A token launched by an AI agent for the AI agent community",
  "memeImageUrl": "https://example.com/agent.png",
  "visibility": "public",
  "duration": "72h",
  "vesting": "3m",
  "website": "https://myagent.ai",
  "xLink": "https://x.com/myagent"
}
```

**Response:**

```json
{
  "id": "uuid",
  "status": "draft",
  "nextAction": "start",
  "links": {
    "self": "/api/agent/fundraises/uuid",
    "start": "/api/fundraises/uuid/start",
    "web": "https://letssendit.fun/fundraise/uuid"
  }
}
```

---

#### `POST /api/fundraises/{id}/start`

Start a fundraise (creator only). Transitions from `draft` to `awaiting_creator_commit`.

**Response:**

```json
{
  "id": "uuid",
  "status": "awaiting_creator_commit",
  "nextAction": "creator_commit",
  "message": "Fundraise started. Creator must commit first."
}
```

---

### Commits

#### `POST /api/fundraises/{id}/commits`

Commit to a seat in a fundraise.

**Flow:**

1. Get fundraise details (note `vaultPubkey`)
2. Send SOL to `vaultPubkey` on-chain
3. Submit this request with transaction signature

**Request Body:**

| Field                  | Type   | Required | Description                                |
| ---------------------- | ------ | -------- | ------------------------------------------ |
| `seatTier`             | number | ✅       | Tier amount: `1.5`, `2.0`, `2.5`, or `3.0` |
| `transactionSignature` | string | ✅       | Base58 Solana transaction signature        |
| `userWalletAddress`    | string | ✅       | Your wallet public key                     |

**Example Request:**

```json
{
  "seatTier": 2.5,
  "transactionSignature": "5Uy8h4kJ...",
  "userWalletAddress": "ABC123..."
}
```

**Response (new commit):**

```json
{
  "success": true,
  "commit": {
    "seatTier": 2.5,
    "solAmount": 2.5,
    "committedAt": "2026-02-01T12:00:00Z"
  },
  "fundraise": {
    "seatsFilled": 21,
    "seatsTotal": 40
  }
}
```

**Upgrades:**

If you already have a commit, submitting a higher tier will **upgrade** your seat. You only pay the difference:

| Current | Target  | Delta to Pay |
| ------- | ------- | ------------ |
| 1.5 SOL | 2.0 SOL | 0.5 SOL      |
| 1.5 SOL | 2.5 SOL | 1.0 SOL      |
| 2.0 SOL | 3.0 SOL | 1.0 SOL      |

**Response (upgrade):**

```json
{
  "success": true,
  "upgrade": true,
  "commit": {
    "previousTier": 1.5,
    "newTier": 2.5,
    "deltaPaid": 1.0
  }
}
```

---

#### `POST /api/fundraises/{id}/commits/validate-upgrade`

Pre-validate a commit/upgrade **before** sending SOL on-chain. Use this to avoid wasted transactions.

**Request Body:**

| Field               | Type   | Required | Description                                |
| ------------------- | ------ | -------- | ------------------------------------------ |
| `seatTier`          | number | ✅       | Target tier: `1.5`, `2.0`, `2.5`, or `3.0` |
| `userWalletAddress` | string | ✅       | Your wallet public key                     |

**Response (valid):**

```json
{
  "valid": true,
  "seatTier": 2.5,
  "remainingSeats": 8,
  "action": "new_commit",
  "solRequired": 2.5
}
```

**Response (upgrade):**

```json
{
  "valid": true,
  "seatTier": 2.5,
  "remainingSeats": 8,
  "action": "upgrade",
  "currentTier": 1.5,
  "solRequired": 1.0
}
```

**Response (invalid):**

```json
{
  "valid": false,
  "error": "No seats available at tier 2.5"
}
```

---

## Status Codes

| Code  | Meaning                                    |
| ----- | ------------------------------------------ |
| `200` | Success                                    |
| `201` | Created                                    |
| `400` | Bad request / Validation error             |
| `401` | Invalid or missing API key                 |
| `403` | Forbidden (not authorized for this action) |
| `404` | Resource not found                         |
| `429` | Rate limited                               |
| `500` | Server error                               |

---

## Error Responses

All errors return a consistent format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Common Errors:**

| Code                    | Message                               | Cause                      |
| ----------------------- | ------------------------------------- | -------------------------- |
| `INVALID_API_KEY`       | Invalid or missing API key            | Check Authorization header |
| `RATE_LIMITED`          | Too many requests                     | Wait for rate limit reset  |
| `FUNDRAISE_NOT_FOUND`   | Fundraise not found                   | Check fundraise ID         |
| `NO_SEATS_AVAILABLE`    | No seats available at tier X          | Try a different tier       |
| `ALREADY_COMMITTED`     | User already has a commit             | Use upgrade flow           |
| `CANNOT_DOWNGRADE`      | Cannot downgrade to lower tier        | Upgrades only              |
| `TRANSACTION_NOT_FOUND` | Transaction not found on chain        | Wait for confirmation      |
| `INVALID_AMOUNT`        | Transaction amount doesn't match tier | Send exact tier amount     |
| `NOT_CREATOR`           | Only creator can perform this action  | Creator-only endpoint      |
| `INVALID_STATUS`        | Fundraise is not in valid status      | Check fundraise status     |

---

## Webhook Events (Coming Soon)

Future webhook support for:

- `fundraise.seat_filled` - When a seat is committed
- `fundraise.success` - When all 40 seats fill
- `fundraise.failed` - When deadline passes without filling
- `fundraise.launched` - When token launches on Pump.fun

---

## SDK Support

Currently, API access is via HTTP. SDKs coming soon:

- Python SDK
- TypeScript SDK

For now, use any HTTP client library.

---

## Need Help?

- **Quickstart:** [QUICKSTART.md](https://letssendit.fun/QUICKSTART.md)
- **X:** [@letssenditfun](https://x.com/letssenditfun)
- **Email:** team@letssendit.fun
