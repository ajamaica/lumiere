# refinORE API Endpoints — Verified Feb 4, 2026

**Backend URL:** `https://automine-refinore-backend-production.up.railway.app/api`
**Frontend URL:** `https://automine.refinore.com/api` (proxies to backend)

All authenticated endpoints require: `x-api-key: rsk_...` header

---

## Account

### GET /account/me ✅

Get account info including wallet address and deposit instructions.

**Response:**

```json
{
  "privy_user_id": "did:privy:...",
  "email": "user@example.com",
  "wallet_address": "5Eze...mpek",
  "wallet_chain": "solana",
  "wallet_type": "embedded",
  "created_at": "2025-11-17T03:44:12.019Z",
  "deposit_instructions": {
    "network": "Solana",
    "address": "5Eze...mpek",
    "supported_tokens": ["SOL", "USDC", "ORE", "stORE", "SKR"],
    "minimum_sol_for_gas": "0.005 SOL"
  }
}
```

---

## Wallet

### GET /wallet/balances?wallet=ADDRESS ✅

Get all token balances. **Requires `wallet` query parameter.**

**Response:**

```json
{
  "success": true,
  "balances": {
    "sol": 0.084,
    "ore": 0,
    "usdc": 0,
    "store": 0,
    "skr": 68.21
  },
  "address": "5Eze...mpek"
}
```

> ⚠️ The old endpoint `/wallet/balance` (no 's', no wallet param) does NOT exist.

---

## Mining

### POST /mining/start ✅

Start a new mining session.

**Required fields:** `wallet_address`, `sol_amount`, `num_squares`

```json
{
  "wallet_address": "5Eze...mpek",
  "sol_amount": 0.002,
  "num_squares": 5,
  "risk_tolerance": "low",
  "mining_token": "SOL",
  "tile_selection_mode": "optimal",
  "auto_restart": true,
  "frequency": "every_round"
}
```

> ⚠️ `wallet_address` is **required** — omitting it returns `{"error":"Missing required fields"}`

**Response:**

```json
{
  "success": true,
  "session": {
    "id": "51f09bba-...",
    "status": "active",
    "started_at": "2026-02-04T18:14:21.147+00:00"
  }
}
```

### POST /mining/start-strategy ✅

Start mining using a saved strategy. **Requires `strategy_id`.**

```json
{
  "strategy_id": "cb5d46f3-..."
}
```

### POST /mining/stop ✅

Stop the active mining session.

**Response:** `{"success": true}`

### POST /mining/reload-session

Reload/restart a session. **Requires `session_id` in body.**

### GET /mining/session ✅

Get current active session status.

**Response (active):**

```json
{
  "session": {
    "id": "51f09bba-...",
    "status": "active",
    "total_rounds": 3,
    "total_rounds_deployed": 3,
    "total_wins": 0,
    "total_losses": 3,
    "total_sol_deployed": 0.006,
    "total_sol_won": 0
  }
}
```

**Response (inactive):** `{"hasActiveSession": false}`

### GET /mining/session-rounds?session_id=ID ✅

Get round-by-round results. **Requires `session_id` query parameter.**

**Response:**

```json
{
  "rounds": [
    {
      "round_number": 145897,
      "sol_amount": 0.002,
      "num_squares": 5,
      "amount_per_block": 0.0004,
      "deployed_block_indices": [23, 8, 22, 15, 11],
      "deployed_at": "2026-02-04T18:17:04.437+00:00",
      "result_recorded_at": "2026-02-04T18:17:48.695+00:00"
    }
  ]
}
```

### GET /mining/history?limit=N ✅

Get historical mining round data. Default limit: 20.

### GET /mining/last-config ✅

Get the last mining configuration used.

**Response:**

```json
{
  "hasLastConfig": true,
  "config": {
    "sol_amount": 0.002,
    "num_squares": 5,
    "risk_tolerance": "low",
    "mining_token": "SOL",
    "tile_selection_mode": "optimal"
  }
}
```

### GET /mining/round/:roundNumber

Get details for a specific round. Returns `{"deployed": false}` if user didn't participate.

---

## Rounds

### GET /rounds/current ✅ (No auth required)

Get current active round information.

**Response:**

```json
{
  "round_number": 145901,
  "motherlode_formatted": 16.8,
  "motherlode_hit": false,
  "total_deployed_sol": 2.729,
  "num_winners": 0,
  "network": "mainnet"
}
```

---

## Strategies

### GET /auto-strategies ✅

List all saved strategies.

### POST /auto-strategies

Create a new strategy.

```json
{
  "name": "Conservative Grinder",
  "sol_amount": 0.005,
  "num_squares": 10,
  "tile_selection_mode": "optimal",
  "risk_tolerance": "low",
  "mining_token": "SOL",
  "auto_restart": true,
  "frequency": "every_round"
}
```

### PUT /auto-strategies/:id

Update a strategy. Partial updates supported.

### DELETE /auto-strategies/:id

Delete a strategy.

---

## DCA / Limit Orders

### GET /auto-swap-orders ✅

List active orders.

### POST /auto-swap-orders

Create a DCA or limit order.

**DCA:** `{"type":"dca","input_token":"SOL","output_token":"ORE","amount":0.1,"interval_hours":24,"total_orders":30}`

**Limit:** `{"type":"limit","input_token":"SOL","output_token":"ORE","amount":1.0,"target_price":60.00,"direction":"buy"}`

### PUT /auto-swap-orders/:id | DELETE /auto-swap-orders/:id

---

## Staking

### GET /staking/info?wallet=ADDRESS ✅

Get stake info. **Requires `wallet` query parameter.**

**Response:**

```json
{
  "success": true,
  "stakingInfo": {
    "balance": 50000000000,
    "rewards": 487316076,
    "lifetimeRewards": 130949148134,
    "lastClaimAt": 1768177848,
    "lastDepositAt": 1768498844
  }
}
```

---

## Rewards

### GET /rewards?wallet=ADDRESS ✅

Get mining rewards summary. **Requires `wallet` query parameter.**

**Response:**

```json
{
  "success": true,
  "rewards": {
    "unclaimedSol": 0,
    "unrefinedOre": 111.45,
    "bonusRefinedOre": 12.27,
    "solDeployed": 0.002
  }
}
```

---

## Tile Presets

### GET /tile-presets ✅

List saved tile presets.

### POST /tile-presets

Save a new preset. `{"name":"Diagonal","tile_ids":[0,6,12,18,24]}`

---

## Public Endpoints (No Auth)

### GET /refinore-apr ✅

Current staking APR.

**Response:** `{"success":true,"apr":113.21,"asOf":"2026-02-04T18:16:13.830Z"}`

---

## Non-Functional Endpoints (removed from docs)

The following were previously documented but do **not exist** on the current backend:

- ~~GET /sse~~ — No SSE route
- ~~GET /wallet/balance~~ — Use `/wallet/balances?wallet=X` instead
- ~~GET /wallet/transactions~~ — Not implemented
- ~~POST /coinbase-onramp~~ — Not on backend (frontend only)
- ~~GET /unsubscribe~~ — Uses token-based auth, not API key
- ~~POST /resubscribe~~ — Returns 500

---

## Error Handling

| HTTP Code | Meaning                      | Agent Action                         |
| --------- | ---------------------------- | ------------------------------------ |
| `200`     | Success                      | Process response                     |
| `400`     | Bad request / missing fields | Check required params                |
| `401`     | Invalid API key              | Alert owner to regenerate key        |
| `404`     | Not found (no session)       | Handle gracefully                    |
| `429`     | Rate limited                 | Back off, retry after delay          |
| `500`     | Server error                 | Retry after 30s, alert if persistent |
