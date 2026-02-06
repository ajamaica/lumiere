---
name: manifold
description: Read and trade on Manifold Markets (search markets, fetch probabilities, inspect users/bets, place bets/sell/comment). Never place a bet/sell/comment without explicit user confirmation.
homepage: https://manifold.markets
metadata:
  {
    'openclaw':
      {
        'emoji': '🔮',
        'requires': { 'bins': ['curl'], 'env': ['MANIFOLD_API_KEY'] },
        'primaryEnv': 'MANIFOLD_API_KEY',
      },
  }
---

# Manifold Markets

Use this skill to read from Manifold Markets (search markets, fetch probabilities, inspect public user info) and to place trades/comments with explicit confirmation.

Write actions require `MANIFOLD_API_KEY` (in the environment or configured via OpenClaw skill entries).

Base URL: `https://api.manifold.markets/v0`

Docs: https://docs.manifold.markets/api

## Read tasks

### Search markets

```bash
curl -s "https://api.manifold.markets/v0/search-markets?term=AI+safety&limit=5"
```

Tip: replace spaces with `+` (or URL-encode). If you have `jq`, format results:

```bash
curl -s "https://api.manifold.markets/v0/search-markets?term=AI+safety&limit=5" | jq '.[] | {id, slug, question, outcomeType, probability, createdTime, creatorUsername}'
```

### List newest markets

```bash
curl -s "https://api.manifold.markets/v0/markets?limit=10"
```

With `jq`:

```bash
curl -s "https://api.manifold.markets/v0/markets?limit=10" | jq '.[] | {id, slug, question, outcomeType, probability, closeTime}'
```

### Get market details (by ID)

```bash
curl -s "https://api.manifold.markets/v0/market/MARKET_ID"
```

Binary markets usually expose `probability` (0..1). Other market types may not have a single probability field.

### Get market details (by slug)

The slug is the portion of the Manifold URL after the username (e.g. `.../Alice/my-market-slug` → `my-market-slug`).

```bash
curl -s "https://api.manifold.markets/v0/slug/MARKET_SLUG"
```

### Inspect a user (by username)

```bash
curl -s "https://api.manifold.markets/v0/user/USERNAME"
```

### List bets for a user

If you have `jq`:

```bash
USER_ID="$(curl -s "https://api.manifold.markets/v0/user/USERNAME" | jq -r '.id')"
curl -s "https://api.manifold.markets/v0/bets?userId=$USER_ID&limit=50"
```

Without `jq`, fetch the user JSON and read the `id` field, then use it:

```bash
curl -s "https://api.manifold.markets/v0/user/USERNAME"
curl -s "https://api.manifold.markets/v0/bets?userId=USER_ID&limit=50"
```

## Write safety rules

- Never place a bet, sell shares, or post a comment unless the user explicitly confirms (e.g. “yes, place it”, “confirm”, “do it”).
- Always fetch the market first and restate: market question, market id/slug, action (bet/sell/comment), side/answer, amount/shares, and any limits.
- If the user is not explicit about amount/side, stop and ask.

## Write tasks

Authentication

- Uses `MANIFOLD_API_KEY` in header: `Authorization: Key $MANIFOLD_API_KEY`
- Set `MANIFOLD_API_KEY` (or `skills.manifold.apiKey` in `~/.openclaw/openclaw.json`).

### Place a bet (binary market)

1. Fetch the market and confirm it’s the right one:

```bash
curl -s "https://api.manifold.markets/v0/market/MARKET_ID"
```

2. Preview the exact payload you intend to send (do not run the POST until user confirms):

```bash
cat <<'JSON'
{"amount":10,"contractId":"MARKET_ID","outcome":"YES"}
JSON
```

3. After explicit confirmation, place the bet:

```bash
curl -s -X POST "https://api.manifold.markets/v0/bet" \
  -H "Authorization: Key $MANIFOLD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount":10,"contractId":"MARKET_ID","outcome":"YES"}'
```

Notes:

- `amount` is in Mana (integer).
- `outcome` is `YES` or `NO` for binary markets.
- For non-binary markets, consult the Manifold API docs for the correct payload.

### Sell shares

Preview first (do not run until user confirms).

Sell all shares for an outcome (omit `shares` to sell all):

```bash
curl -s -X POST "https://api.manifold.markets/v0/market/MARKET_ID/sell" \
  -H "Authorization: Key $MANIFOLD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"outcome":"YES"}'
```

Sell a specific number of shares:

```bash
curl -s -X POST "https://api.manifold.markets/v0/market/MARKET_ID/sell" \
  -H "Authorization: Key $MANIFOLD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"outcome":"YES","shares":10}'
```

### Post a comment

Comments made through the API can incur a fee (see Manifold API docs). Always confirm text + target market.

```bash
curl -s -X POST "https://api.manifold.markets/v0/comment" \
  -H "Authorization: Key $MANIFOLD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contractId":"MARKET_ID","content":"Your comment here."}'
```

## Notes

- Rate limits apply (see Manifold API docs).
- Private/unlisted markets may not be accessible via the public API depending on current platform behavior.
