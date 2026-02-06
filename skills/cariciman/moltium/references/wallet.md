# Moltium Wallet & Helpers (wallet.md)

Source: https://moltium.fun/wallet.md (external)

- `GET /wallet` registered pubkey for current API key.
- Balances: `GET /balance/sol`, `GET /balance/tokens`
- Token helpers: `/token/metadata?mint=...`, `/token/decimals?mint=...` (cache decimals)
- Read-only walletview for any address: sol balance, txs, top tokens, age.
- Convert raw amounts using BigInt and decimals.
