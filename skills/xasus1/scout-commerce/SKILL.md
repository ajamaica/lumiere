---
name: scout-commerce
version: 1.1.0
description: Search for products on Amazon/shopify and buy with USDC on Solana. Swap tokens using Jupiter.
homepage: https://scout.trustra.xyz
metadata: {"emoji":"🛒","category":"shopping","api_base":"https://scout-api.trustra.xyz/api/v2"}
---

# Scout 🛒

Buy from Amazon & Shopify with USDC. Swap tokens via Jupiter. US shipping only.

## Presenting Products (Important!)

**Search results:** For each recommended product, send the image as actual media (not markdown links) with the product details as the caption. One product per message so images render properly.

**Product details:** When showing details, send images as media attachments alongside the text. The API returns images in the same response — use them immediately, don't make the user ask.

**Why:** Markdown image links (`![](url)`) don't render on Telegram/messaging platforms. Always send images as actual media using the message tool with `media` parameter, or via inline if supported.

## Quick Reference

**Setup (once)** → `python get_api_key.py --email ... --address "..."`

**Find products** → `python search.py "gaming mouse under $50"`

**Get Product details** → `python product.py amazon:B07GBZ4Q68`

**Check Wallet balance** → `python balance.py` (shows all tokens)

**Buy product** → `python buy.py amazon:B07GBZ4Q68`

**Check order** → `python order_status.py ord_abc123`

**List orders** → `python order_status.py --list`

**Swap tokens** → `python swap.py SOL USDC 5` (min $5)

**Get swap quote** → `python swap.py --quote SOL USDC 5`

**List wallet tokens** → `python swap.py --list`

All commands run from `scripts/` folder. API key loads automatically from `credentials.json`.

## Setup (one-time)

```bash
python get_api_key.py --email <EMAIL> --address "<NAME>,<STREET>,<CITY>,<STATE>,<ZIP>,<COUNTRY>"
```

Creates a **Crossmint wallet** + **API key** and stores them in `credentials.json`. Fund the wallet with USDC to buy.

**Keep API key secure** - it authorizes transactions from your wallet.

## Commands

| Command | Usage |
|---------|-------|
| Search | `python search.py "query"` |
| Details | `python product.py amazon:B07GBZ4Q68` |
| Balance | `python balance.py` (all tokens) or `balance.py --usdc` |
| Buy | `python buy.py amazon:B07GBZ4Q68` |
| Orders | `python order_status.py --list` or `order_status.py <orderId>` |
| Swap | `python swap.py SOL USDC 5` (min $5 for gasless) |
| Quote | `python swap.py --quote SOL USDC 5` |
| Tokens | `python swap.py --list` |

**Supported tokens:** SOL, USDC, USDT, BONK, TRUST — or use any mint address directly.

## Workflow

1. **No credentials?** → `get_api_key.py` (creates wallet + API key)
2. **No balance?** → Fund wallet address shown by `balance.py`
3. **Ready to buy** → `buy.py <locator>`

## Errors

| Error | Fix |
|-------|-----|
| `INSUFFICIENT_BALANCE` | Fund wallet (`balance.py` shows address) |
| `No API key found` | Run `get_api_key.py` |
| `OUT_OF_STOCK` | Search for alternatives |
| `OVER_LIMIT` | Max $1,500 per order |

## Credentials (`credentials.json`)

```json
{
  "api_key": "scout_sk_...",
  "wallet_address": "FtbC9x5...",
  "shipping_profile": { "email": "...", "address": "..." }
}
```

Never share the API key.
