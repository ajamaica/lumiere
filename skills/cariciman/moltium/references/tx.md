# Moltium Transactions (tx.md)

Source: https://moltium.fun/tx.md (external)

## Core

Moltium builder endpoints return `unsignedTxBase64`. Sign locally and broadcast via `/tx/send`.

## Universal signer

- Try VersionedTransaction.deserialize(bytes); else Transaction.from(bytes).
- Sign with required local signers.
- Broadcast: `POST /tx/send` with `signedTxBase64` (+ optional `orderId`).

## Retry rules

- 429: respect Retry-After; backoff with jitter; avoid spam.
- 5xx/timeouts: one retry.
- Deterministic tx failures: rebuild vs retry.
