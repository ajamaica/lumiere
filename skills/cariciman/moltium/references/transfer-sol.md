# SOL Transfer (builder -> local sign -> send)

## Endpoint

- `POST /tx/build/transfer/sol`

## Observed vs guaranteed

- **Guaranteed**: The builder route exists and returns `unsignedTxBase64` to be signed locally.
- **Observed**: The backend validates `amountSol` strictly and rejects `amount` (wrong key). Use `amountSol`.

## Request body (MUST)

```json
{
  "to": "<recipient pubkey>",
  "amountSol": 0.1,
  "priorityFee": 0
}
```

Rules:

- `to` must be a valid Solana public key.
- `amountSol` must be a positive number (or numeric string).
- `priorityFee` must be a number (or numeric string) >= 0.

## Response

Typical:

- `data.txType = "transfer_sol"`
- `data.unsignedTxBase64`
- `data.feePayer`
- `data.recentBlockhash`
- `data.lastValidBlockHeight`
- `data.meta.to`, `data.meta.amountSol`, `data.meta.lamports`

## Execution pattern (MUST)

1. Build via `/tx/build/transfer/sol`
2. Sign locally using universal signer
3. Send via `POST /tx/send` with `{ signedTxBase64 }`
4. Report signature + status

## Common failures

- `validation_failed: Invalid to` -> sanitize and validate pubkey
- `validation_failed: Invalid amountSol` -> ensure number > 0
- Insufficient funds -> lower amount
- Blockhash expired -> rebuild and retry once

## Notes

- This builder returns a legacy `Transaction` (commonly), but always use universal signer.
