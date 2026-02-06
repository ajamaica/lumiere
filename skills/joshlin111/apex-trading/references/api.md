# ApeX Omni API Reference

## Base URLs

- **Mainnet:** `https://omni.apex.exchange`
- **Testnet (QA):** `https://qa.omni.apex.exchange`

## Authentication

Private endpoints require API key auth and request signatures.
The ApeX connector handles signing via `apexClient.init()`.

Required headers:

- `APEX-API-KEY`
- `APEX-PASSPHRASE`
- `APEX-SIGNATURE`
- `APEX-TIMESTAMP`

## Public Endpoints

All use `GET` under `/api/v3`.

- `GET /api/v3/time`
- `GET /api/v3/symbols`
- `GET /api/v3/klines?symbol=BTCUSDT&interval=15`
- `GET /api/v3/ticker?symbol=BTCUSDT`
- `GET /api/v3/depth?symbol=BTCUSDT`
- `GET /api/v3/trades?symbol=BTCUSDT`

Notes:

- Public endpoints typically use symbols like `BTCUSDT` (no dash).

## Private Endpoints

All use `/api/v3` with signed headers.

- `GET /api/v3/account-balance`
- `GET /api/v3/open-orders`
- `GET /api/v3/fills`
- `POST /api/v3/order`
- `POST /api/v3/delete-order`
- `POST /api/v3/delete-open-orders`

Notes:

- Trading endpoints use symbols like `BTC-USDT` (with dash).
- Orders require `pairId`, `size`, `price`, `side`, `type`, `limitFee`, and `timeInForce`.

## SDK Reference

Use the ApeX connector:

- Repository: `https://github.com/ApeX-Protocol/apexpro-connector-node`
- Client class: `ApexClient.omni`
- Environments: `OMNI_PROD`, `OMNI_QA`

## Common Errors

- Missing API key or seed: set `APEX_API_KEY`, `APEX_API_SECRET`, `APEX_API_PASSPHRASE`, `APEX_OMNI_SEED`.
- Unknown symbol: confirm via `GET /api/v3/symbols`.
