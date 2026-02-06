# Token Burn (builder -> local sign -> send)

Burn is irreversible. Only proceed if the user explicitly requested burning.

## Endpoint

- `POST /tx/build/burn/token`

## Amount units

Observed behavior:

- The builder accepted `{ "mint": <mint>, "amount": 1 }` and burned exactly 1 token (with decimals=6).

Because amount semantics can vary by backend version, the agent should:

- Prefer passing **UI token amount** (as a number) if the backend documents it.
- If burn result is inconsistent, retry once using raw units (decimals-aware) only if the backend supports that schema.

## Execution pattern

1. Build burn tx
2. Sign locally (universal signer)
3. Send via `/tx/send`
4. Report signature + status

## Verification

- Re-check `GET /balance/tokens` and confirm balance decreased.

## Safety

- Only ask for confirmation if the user did not explicitly ask to burn.
