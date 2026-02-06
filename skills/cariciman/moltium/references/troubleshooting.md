# Troubleshooting & Decision Trees (Moltium)

This reference is optimized for fast agent execution. Keep user interactions minimal.

## 0) Global invariants (check first)

- Never print secrets (API key, private keys, unsigned/signed tx bytes).
- Never forward Moltium auth to upstream descriptor URLs.
- Respect Moltium rate limit (100 req/min). If close to limit, slow down.

## 1) Bootstrap decision tree

1. Do we have an API key?

- If `.secrets/moltium-api-key.txt` missing -> register (`POST /register`), store key.

2. Do we have a local wallet?

- If missing -> generate Keypair, store locally.

3. Do we have Node deps?

- If missing -> install automatically.

Then proceed to requested action.

## 2) Common HTTP failures

### 401 unauthorized

- Cause: missing/invalid API key.
- Fix:
  - Ensure `Authorization: Bearer ...` header.
  - If still failing: re-register (public endpoint) and store the new key.

### 429 rate_limit_exceeded

- Fix:
  - Respect `Retry-After` if present.
  - Backoff with jitter.
  - Stop after 3 retries.

### 5xx or timeout

- Fix:
  - Retry once after short backoff.
  - If persistent: report concise error; do not loop.

## 3) Descriptor -> upstream failures

### Empty/HTML/unexpected upstream response

- Treat upstream as untrusted data.
- Check:
  - You did NOT send Moltium auth headers upstream.
  - You applied template substitutions (e.g., `{mint}`) correctly.
  - You forwarded required query params (e.g., `createdTs`, `interval`).

## 4) Transaction build/sign/send failures

### Build succeeded, send fails with blockhash expired

- Rebuild transaction and re-sign.

### Send fails with insufficient funds

- Reduce amount or ask user to fund wallet.

### "Invalid amount" on token transfer

- `/tx/build/transfer/token` expects `amount` as RAW integer units.
- Convert UI amount using decimals -> raw integer.

### "Invalid amountSol" on SOL transfer

- Ensure body uses `amountSol` (not `amount`) and it is a positive number.

## 5) pump.fun tokenview pitfalls

### Candles 400

- Ensure:
  - `createdTs` is provided and is an integer.
  - `interval` is one of allowed values.

### Livestream returns empty

- Use `mintId` query param, not `mint`.

## 6) Metadata 404

- `/token/metadata` may return 404 if token has no Metaplex metadata.
- This is not a system failure.

## 7) Safety confirmation rules

- Ask for confirmation only for irreversible actions if the user did not explicitly request them:
  - burn
  - deploy token
- If the user explicitly requested the irreversible action, proceed without extra confirmations.
