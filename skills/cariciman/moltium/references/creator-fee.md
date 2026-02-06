# Creator Fee (pump.fun): Total + Claim

## 1) View total creator fees (descriptor -> upstream)

Use descriptor endpoint:

- `GET /tokenview/pumpfun/creator-fees/total?devWalletAddress=<WALLET>`

Rules:

- Call Moltium descriptor with auth.
- Call upstream without Moltium auth.

Upstream response (example):

- `totalFeesSOL` (string)

Treat upstream lag as normal.

## 2) Claim creator fees (builder -> local sign -> send)

### Endpoint

- `POST /tx/build/creator-fee/claim`

## Observed vs guaranteed

- **Guaranteed**: The claim flow is builder -> local sign -> `/tx/send`.
- **Observed**: `/tx/build/creator-fee/claim` requires a JSON body with `priorityFee` (>= 0). Empty body may fail.

### Request body (MUST)

```json
{ "priorityFee": 0 }
```

### Flow

1. Build claim tx
2. Sign locally (this is commonly a VersionedTransaction)
3. Send via `POST /tx/send`
4. Report signature + status

### Failure handling

- `upstream_error`: retry once after a short backoff
- If repeated failures: stop and report

### Suggested reporting

- Show claim tx signature
- Optionally re-fetch total fees after a short delay and report best-effort change
