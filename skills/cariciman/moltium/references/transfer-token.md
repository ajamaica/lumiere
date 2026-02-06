# Token Transfer (SPL / Token-2022) (builder -> local sign -> send)

## Endpoint

- `POST /tx/build/transfer/token`

## Observed vs guaranteed

- **Guaranteed**: The transfer is built by Moltium and must be signed locally, then sent via `/tx/send`.
- **Observed**: `/tx/build/transfer/token` expects `amount` as a **RAW integer** (base units). Passing a non-integer or using unsupported keys like `amountRaw` may fail validation.

## Critical rule: amount units (MUST)

The `amount` field is an **integer in RAW base units**.

Example:

- decimals = 6
- 1.000000 token = `amount = 1000000`

Do NOT assume UI units.

## Steps (MUST)

1. Resolve decimals

- `GET /token/decimals?mint=<MINT>`

The response may use `data.DECIMALS` (uppercase) or `data.decimals`.

2. Convert UI intent to raw integer

- Treat user input as UI amount unless user explicitly says "raw".
- Compute:

```
raw = round(ui * 10^decimals)
```

Use BigInt-safe conversion (avoid float drift for large values).

3. Build transfer

```json
{
  "mint": "<token mint>",
  "to": "<recipient pubkey>",
  "amount": 1000000
}
```

4. Sign locally

- Use universal signer

5. Send

- `POST /tx/send` with `{ signedTxBase64 }`

6. Verify (recommended)

- Check recipient via `GET /walletview/tokens/top?address=<RECIPIENT>`
- Confirm `amount`, `decimals`, `uiAmount` match intent

## Failure handling

- Invalid amount -> ensure `amount` is a positive integer
- ATA creation / Token-2022 differences -> backend should handle; if not, fall back to direct chain transfer only if user explicitly asks
- Insufficient SOL for fees -> require small SOL for account rent/fees
