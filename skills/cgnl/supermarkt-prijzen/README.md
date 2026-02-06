# Albert Heijn Bonuses Skill 🛒

Fetch your Albert Heijn bonuses programmatically! Bypasses bot detection using curl-cffi.

## Quick Start

### 1. Install Dependencies

```bash
pip3 install curl-cffi --break-system-packages
```

### 2. Setup Cookies

```bash
./setup-cookies.sh
```

Follow the prompts to paste your browser cookies.

### 3. Fetch Bonuses!

```bash
# Get all bonuses
./get-bonuses.py --filter WEB_BONUS_PAGE --pretty

# Get personal bonuses only
./get-bonuses.py --filter APP_PERSONAL

# Save to file
./get-bonuses.py --filter WEB_BONUS_PAGE -o bonuses.json
```

## Example Output

```json
{
  "filter": "WEB_BONUS_PAGE",
  "count": 326,
  "fetched_at": "2026-02-01T20:57:00",
  "period": {
    "start": "2026-02-01",
    "end": "2026-02-08"
  },
  "bonuses": [
    {
      "id": "...",
      "title": "Innocent: gratis bezorging bij 12.50 euro",
      "subtitle": null,
      "promotionType": "INCENTIVE",
      "periodDescription": "vanaf maandag",
      "activationStatus": "NONE",
      "price": {
        "now": { "amount": 12.5 },
        "was": { "amount": 15.0 }
      },
      "product": {
        "title": "Innocent Smoothie",
        "category": "Dranken"
      }
    }
  ]
}
```

## Usage from OpenClaw

```bash
# In your agent, just run:
exec ~/clawd/skills/ah-bonuses/get-bonuses.py --filter WEB_BONUS_PAGE
```

Then parse the JSON output!

## Filters

- `WEB_BONUS_PAGE` - All bonuses (most results)
- `APP_PERSONAL` - Your personal offers
- `APP_BONUS_BOX` - Bonus box offers
- `WEB_BONUS_BOX` - Web bonus box
- `COUPON` - Coupons
- `FREE_DELIVERY` - Free delivery
- `SPOTLIGHT` - Spotlight offers

## Cookie Refresh

Cookies expire after ~1 hour. When you get errors:

```bash
./setup-cookies.sh
```

## How It Works

1. Uses **curl-cffi** with Chrome TLS fingerprinting to bypass bot detection
2. Queries Albert Heijn GraphQL API (`https://www.ah.nl/gql`)
3. Returns structured JSON with all bonus details

## Technical Details

See [SKILL.md](SKILL.md) for full documentation.

## Troubleshooting

**"Access Denied":**
→ Cookies expired. Run `./setup-cookies.sh` again.

**Empty results:**
→ Try different filter. `WEB_BONUS_PAGE` has the most bonuses.

**Import error:**
→ Install curl-cffi: `pip3 install curl-cffi --break-system-packages`

## Credits

Built by Miel Monteur 🛠️ (Feb 2026)
