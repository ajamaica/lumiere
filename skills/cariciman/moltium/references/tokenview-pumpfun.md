# pump.fun Token Views (Descriptors)

This module documents pump.fun token views accessed via Moltium descriptors.

## Core rules

- Descriptor call uses Moltium auth.
- Upstream call must NOT include Moltium auth.
- Apply descriptor template substitutions from query params.
- Forward user-provided query params (e.g., createdTs, interval, limit) to upstream.

## 1) Token details

- `GET /tokenview/pumpfun?mint=<MINT>`

Use this to resolve:

- `created_timestamp` (for candles)
- `creator` (for dev tokens / creator fees)

## 2) Recent trades

- `GET /tokenview/pumpfun/trades?mint=<MINT>`

## 3) Candles (OHLCV)

- `GET /tokenview/pumpfun/candles?mint=<MINT>&createdTs=<INT>&interval=1m&limit=500`

MUST:

- include `createdTs` as an integer (get it from `/tokenview/pumpfun` if not provided)
- include a valid `interval` string

If upstream returns 400:

- check that `createdTs` is integer
- check interval enum

## 4) Dev tokens

- `GET /tokenview/pumpfun/devtokens?walletAddress=<WALLET>`

Notes:

- Some descriptor variants may name the required param `walletAddress`.
- If the user provided only a mint, resolve creator via `/tokenview/pumpfun` and then call devtokens.

## 5) Livestream info

- `GET /tokenview/pumpfun/livestream?mintId=<MINT>`

Observed:

- Calling with `mint=` may return empty; `mintId=` is required by upstream.

Important:

- Upstream expects `mintId`, not `mint`.
- If upstream returns 404, treat as "not live".

## 6) Creator fees (total)

- `GET /tokenview/pumpfun/creator-fees/total?devWalletAddress=<WALLET>`

If only mint is known, resolve creator first.
