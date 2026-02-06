---
name: supermarkt-prijzen
description: Albert Heijn bonuses, product search, multi-store price comparison (12 supermarkets), recipe search by ingredients, and fridge scanner with vision AI.
homepage: https://www.ah.nl
metadata: { 'openclaw': { 'emoji': '🛒', 'requires': { 'bins': ['python3', 'curl'] } } }
---

# Albert Heijn API Skill

Complete AH bonussen + producten + recepten via GraphQL (web) en OAuth (mobile).

## Features

✅ **Bonussen ophalen** (GraphQL, 200+ items, **geen login**)  
✅ **Producten zoeken** (REST API, 20k+ items, **geen login**)  
✅ **Recepten zoeken** (GraphQL, **geen login**)  
✅ **Multi-supermarkt prijsvergelijking** (Checkjebon.nl - 12 supermarkten, 107k producten)  
✅ **OAuth token flow** (mobile API access - alleen voor persoonlijke data)  
✅ **Fridge scanner** (vision AI → recepten → shopping list)

## Quick Start

### 1. Bonussen + Producten (GEEN LOGIN NODIG!)

**Bonussen ophalen (200+ items):**

```bash
./ah-api.py bonuses --filter WEB_BONUS_PAGE --pretty
```

**Producten zoeken (20.000+ items):**

```bash
./ah-api.py search --query "melk" --limit 10 --pretty
```

**Recepten zoeken:**

```bash
./ah-recipes.py search --query "pasta carbonara" --pretty
```

**Recept ophalen via URL:**

```bash
./ah-recipes.py url --url "https://www.ah.nl/allerhande/recept/R-R1187649/zoete-tortillachips" --pretty
```

✨ **Alles werkt zonder cookies!** Gebruikt `curl-cffi` met Chrome fingerprint.

### 2. OAuth Token Flow (mobile API)

**Get initial token:**

1. Open Appie app
2. Tap profiel → instellingen → scroll down → "Developer" (hidden option)
3. Tap "OAuth Code" → copy code
4. Run binnen 30 seconden:

```bash
curl -X POST 'https://api.ah.nl/mobile-auth/v1/auth/token' \
  -H 'Content-Type: application/json' \
  -H 'User-Agent: Appie/8.22.3' \
  -d '{"clientId":"appie","code":"PASTE_CODE_HERE"}'
```

**Response:**

```json
{
  "access_token": "USERID_TOKEN",
  "refresh_token": "REFRESH_TOKEN",
  "expires_in": 604798
}
```

**Save to ~/.ah_tokens.json:**

```bash
echo '{"access_token":"...","refresh_token":"...","expires_in":604798}' > ~/.ah_tokens.json
```

**Refresh token (na 7 dagen):**

```bash
./refresh-token.py
```

### 3. Multi-store price comparison

**Search across 12 supermarkets:**

```bash
./checkjebon-search.py --compare "melk" --top 10
```

**Stores:** AH, Jumbo, Lidl, Plus, Dekamarkt, Spar, Dirk, Hoogvliet, Poiesz, Aldi, Vomar, Ekoplaza

## Tools

| Tool                   | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| `ah-api.py`            | Cookie-based bonussen + producten (GraphQL + REST)    |
| `ah-recipes.py`        | **NEW!** Recipe search by text or ingredients         |
| `fridge-scan.sh`       | **NEW!** Scan fridge with camera/peekaboo             |
| `smart-cook.sh`        | **NEW!** Complete workflow: scan → recipes → shopping |
| `get-bonuses.py`       | Legacy bonus tool (GraphQL only)                      |
| `checkjebon-search.py` | Multi-store prijsvergelijking                         |
| `refresh-token.py`     | OAuth token vernieuwen                                |
| `setup-cookies.sh`     | Cookie setup helper                                   |

## Technical Details

### Authentication (NONE NEEDED!)

**Previous:** Required session cookies from browser  
**Now:** Uses `curl-cffi` with `impersonate='chrome120'`

**How it works:**

- curl-cffi sends real Chrome TLS fingerprints
- AH's bot detection sees it as a normal browser
- No cookies, no login, no setup required! 🎉

**Only needed for:**

- OAuth mobile API (receipts, personal data) - requires app login

### GraphQL Bonuses API

**Endpoint:** `https://www.ah.nl/gql`

**Query:**

```graphql
query FetchBonusPromotions($periodStart: String, $periodEnd: String) {
  bonusPromotions(
    filterSet: WEB_BONUS_PAGE
    input: {
      periodStart: "2026-02-01"
      periodEnd: "2026-02-08"
      filterUnavailableProducts: false
      forcePromotionVisibility: true
    }
  ) {
    id
    title
    promotionType
    price {
      now {
        amount
      }
    }
    product {
      title
      category
    }
  }
}
```

**Available filters:**

- `WEB_BONUS_PAGE` - Alle bonussen (326 items!)
- `APP_PERSONAL` - Persoonlijke aanbiedingen
- `APP_BONUS_BOX` - Bonus box
- `COUPON` - Kortingsbonnen
- `FREE_DELIVERY` - Gratis bezorging
- `SPOTLIGHT` - Spotlight aanbiedingen

### REST Product Search

**Endpoint:** `https://www.ah.nl/zoeken/api/products/search`

**Example:**

```bash
curl 'https://www.ah.nl/zoeken/api/products/search?query=melk' \
  -H 'Cookie: SSOC=...; jsessionid_myah=...' \
  --user-agent 'Mozilla/5.0 (compatible; AH-Bot/1.0)'
```

**Response:**

```json
{
  "cards": [
    {
      "products": [
        {
          "id": 441199,
          "title": "Campina Halfvolle melk",
          "price": { "now": 1.99, "unitSize": "1,5 l" }
        }
      ]
    }
  ]
}
```

### OAuth Mobile API

**Authorization:** `https://login.ah.nl/secure/oauth/authorize`  
**Token exchange:** `https://api.ah.nl/mobile-auth/v1/auth/token`  
**Token refresh:** `https://api.ah.nl/mobile-auth/v1/auth/token/refresh`

**Token lifetime:** 7 days (604798 seconds)

**Known endpoints (from gist):**

- `/mobile-services/v1/receipts` - All receipts
- `/mobile-services/v2/receipts/{id}` - Specific receipt
- `/mobile-services/product/search/v2` - Product search

**Note:** Some mobile endpoints currently return 500 errors (infrastructure issues).

### Why curl-cffi?

AH uses **Cloudflare + Akamai bot detection**. Normal `requests` → 403 Access Denied.

**curl-cffi** uses real Chrome TLS fingerprints:

```python
from curl_cffi import requests
response = requests.get(url, impersonate="chrome120")  # ← Magic!
```

## Checkjebon Multi-Store Data

**Source:** `https://raw.githubusercontent.com/supermarkt/checkjebon/main/data/supermarkets.json`

**Stats:**

- File size: 10.3MB
- Total products: 106,991
- Daily updates
- 24h local cache

**Usage:**

```bash
# Find cheapest
./checkjebon-search.py --compare "bier" --top 5

# Specific store
./checkjebon-search.py --query "campina" --store jumbo

# Show stats
./checkjebon-search.py --stats
```

## Recipe Features (NEW!) 🍳

### Scan Fridge → Find Recipes → Shopping List

**1. Scan your fridge:**

```bash
./fridge-scan.sh
# Opens camera, captures fridge contents
# Output: /tmp/fridge-scan.jpg
```

**2. Extract ingredients (via OpenClaw image tool):**

```bash
# Ask assistant:
# "Analyze /tmp/fridge-scan.jpg and list all food items as comma-separated"
# → melk, eieren, tomaten, kaas, broccoli
```

**3. Find recipes:**

```bash
./ah-recipes.py ingredients --ingredients "melk,eieren,kaas,broccoli" --pretty
```

**4. Get recipe details (by ID):**

```bash
./ah-recipes.py details --recipe-id 1187649 --pretty
```

**Or get recipe from URL directly:**

```bash
./ah-recipes.py url --url "https://www.ah.nl/allerhande/recept/R-R1187649/zoete-tortillachips" --pretty
```

**5. Complete workflow:**

```bash
./smart-cook.sh
# Interactive: scan → analyze → find recipes → shopping list
```

### Recipe ID Resolution

**How to get recipe IDs:**

1. **From search results:** The `search` action returns titles only. To get full details, you need the recipe ID.
2. **From URL:** Recipe URLs contain the ID in format `R-R{ID}`:
   - Example: `https://www.ah.nl/allerhande/recept/R-R1187649/zoete-tortillachips`
   - Extract: `R-R1187649` → ID = `1187649`
3. **Direct lookup:** Use the `url` action to automatically extract ID and fetch details

**Workflow:**

```bash
# Step 1: Search for recipes (returns titles only)
./ah-recipes.py search --query "pasta carbonara" --pretty

# Step 2: If you have the recipe URL (e.g., from browser or website), extract ID
./ah-recipes.py url --url "https://www.ah.nl/allerhande/recept/R-R{ID}/{slug}" --pretty

# Note: Search results don't include recipe IDs (client-side rendered)
# To get full details, you need either:
#   - The direct recipe URL (contains R-R{ID})
#   - The recipe ID number
```

### Recipe Search Examples

**Search by text (returns IDs + titles):**

```bash
./ah-recipes.py search --query "pasta carbonara" --size 10 --pretty
# Output: {"recipes": [{"id": 1200422, "title": "Klassieke spaghetti carbonara"}, ...], "total": 49, "hasMore": true}
```

**Search with detailed info (cook time, ratings, images, servings):**

```bash
./ah-recipes.py search --query "pasta carbonara" --size 5 --detailed --pretty
# Output: Full recipe summaries with time, ratings, images, servings
```

**Search by ingredients:**

```bash
./ah-recipes.py ingredients --ingredients "tomaat,ui,knoflook" --size 5 --pretty
```

**Get recipe from URL:**

```bash
./ah-recipes.py url --url "https://www.ah.nl/allerhande/recept/R-R1187649/zoete-tortillachips" --pretty
# Extracts recipe ID from URL (R-R1187649 → 1187649) and fetches full details
```

## Examples

**Cheapest melk across all stores:**

```bash
./checkjebon-search.py --compare "melk" --top 5
```

**AH bonussen vandaag:**

```bash
./ah-api.py bonuses --filter WEB_BONUS_PAGE --pretty | \
  jq '.bonuses[] | select(.title | contains("Campina"))'
```

**Search AH products:**

```bash
./ah-api.py search --query "bier" --limit 20 --pretty
```

## Troubleshooting

**"Access Denied" errors:**

- Use curl-cffi (not standard requests)
- Check User-Agent header
- Refresh cookies (run `./setup-cookies.sh`)

**OAuth code expired:**

- Codes valid for only 30 seconds!
- Use curl command immediately after generating code
- Or use refresh_token to extend session

**GraphQL errors:**

- Check date format (YYYY-MM-DD)
- Verify filterSet value (case-sensitive)
- Ensure cookies are fresh

## Files

```
ah-bonuses/
├── SKILL.md              # This file
├── README.md             # Quick start
├── ah-api.py             # Main CLI tool (bonuses + search)
├── get-bonuses.py        # Legacy bonus tool
├── checkjebon-search.py  # Multi-store search
├── refresh-token.py      # OAuth token refresh
├── setup-cookies.sh      # Cookie extractor
└── ~/.ah_cookies.json    # Session cookies (gitignored)
└── ~/.ah_tokens.json     # OAuth tokens (gitignored)
```

## Credits

- **AlbertPWN** (userlandkernel) - Original mobile API research
- **TommasoAmici/ah-bonus-bot** - Rust bot with product search endpoint
- **jabbink** - Comprehensive API documentation gist
- **curl-cffi** - Chrome fingerprinting library

## Status

✅ **Bonussen API** (GraphQL) - **100% working WITHOUT login!** (200+ bonussen)  
✅ **Product search** (REST) - **100% working WITHOUT login!** (20k+ producten)  
✅ **Recipe search** (GraphQL) - **100% working WITHOUT login!**  
✅ **Multi-store comparison** (Checkjebon) - **100% working** (107k products, 12 stores)  
✅ **OAuth token flow** - Working (7-day tokens, voor mobile API)  
⚠️ **Mobile API endpoints** - Partial (some 500 errors)

## Changelog

**2026-02-02 - MAJOR UPDATE:**

- 🎉 **Removed cookie requirement!** All APIs now work WITHOUT login
- ✅ Bonussen: 200+ items, anonymous access
- ✅ Product search: 20k+ items, anonymous access
- ✅ Recipes: Full search, anonymous access
- 🔧 Uses `curl-cffi` with `impersonate='chrome120'` to bypass bot detection
- 🗑️ Deprecated: `setup-cookies.sh` (no longer needed)
- ⚠️ OAuth still available for mobile API (receipts, personal data)

**2026-02-01:**

- Added recipe search by ingredients
- Added fridge scanner workflow
- Multi-store comparison (Checkjebon.nl)

Last updated: 2026-02-02
