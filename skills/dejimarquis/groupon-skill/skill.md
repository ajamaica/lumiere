# Groupon Deal Finder

Find cheap and discounted local deals on Groupon for services like oil changes, yoga classes, massages, fitness, dining, and more.

## Purpose

Help users find the best Groupon deals for local services and activities based on their location and needs. Search for discounts on everyday services, wellness, automotive, dining, entertainment, and more.

---

## How to Search for Deals

### Method 1: Web Search (Recommended)

Use web search with targeted queries:

```
site:groupon.com {service} {city}
```

**Examples:**

- `site:groupon.com oil change Austin`
- `site:groupon.com massage near me San Francisco`
- `site:groupon.com yoga classes Chicago`
- `site:groupon.com Solidcore Los Angeles`

### Method 2: Direct Groupon URLs

Navigate directly to Groupon's local pages using this URL pattern:

```
https://www.groupon.com/local/{city-slug}/{category-slug}
```

**City slugs:** Use lowercase, replace spaces with hyphens

- New York → `new-york`
- Los Angeles → `los-angeles`
- San Francisco → `san-francisco`
- Washington DC → `washington-dc`

**Examples:**

- All deals in Austin: `https://www.groupon.com/local/austin`
- Spa deals in Chicago: `https://www.groupon.com/local/chicago/beauty-and-spas`
- Auto services in Houston: `https://www.groupon.com/local/houston/automotive`

---

## Categories Reference

| Category         | URL Slug             | Common Services                                                        |
| ---------------- | -------------------- | ---------------------------------------------------------------------- |
| Beauty & Spas    | `beauty-and-spas`    | Massage, facials, nails, haircuts, waxing, lashes                      |
| Health & Fitness | `health-and-fitness` | Yoga, gym memberships, Solidcore, CrossFit, Pilates, personal training |
| Automotive       | `automotive`         | Oil change, car wash, detailing, tire services, brake inspection       |
| Food & Drink     | `food-and-drink`     | Restaurant deals, wine tastings, cooking classes                       |
| Things To Do     | `things-to-do`       | Activities, tours, escape rooms, bowling, attractions                  |
| Home Services    | `home-services`      | Cleaning, HVAC, pest control, handyman, carpet cleaning                |
| Medical & Dental | `health-and-fitness` | Teeth whitening, chiropractic, IV therapy, health screenings           |

---

## Extracting Deal Information

When presenting deals to users, extract and display:

| Field              | What to Look For                                    |
| ------------------ | --------------------------------------------------- |
| **Deal Title**     | Name of the service/offer                           |
| **Price**          | Current discounted price (e.g., "$29")              |
| **Original Value** | Strike-through price showing normal cost            |
| **Discount**       | Percentage or dollar amount saved (e.g., "55% off") |
| **Merchant**       | Business name providing the service                 |
| **Location**       | Address or neighborhood                             |
| **Rating**         | Star rating and number of reviews                   |
| **Fine Print**     | Restrictions, expiration, booking requirements      |

### Example Deal Presentation

Single deal:

```
Deep Tissue Massage at Zen Spa
$49 (was $100) — 51% off
Downtown Austin, TX | 4.5 stars (234 reviews)
Fine print: Valid for 60-min massage. New customers only. Expires in 90 days.
Link: https://groupon.com/deals/...
```

Multiple deals:

```
1. Deep Tissue Massage at Zen Spa
   $49 (was $100) — 51% off
   Downtown Austin | 4.5 stars (234 reviews)

2. Swedish Massage at Relax Studio
   $39 (was $95) — 60% off
   North Austin | 4.2 stars (89 reviews)

3. Couples Massage at Serenity Spa
   $99 (was $180) — 45% off
   South Austin | 4.7 stars (156 reviews)
```

---

## Search Tips

### Finding the Best Deals

1. **Sort by discount** — Look for highest percentage off
2. **Check ratings** — Prioritize 4+ star deals with many reviews
3. **Read fine print** — Note expiration dates and restrictions
4. **Compare options** — Present 3-5 deals for user to choose

### Location Handling

- If user provides a **zip code**, convert to city name for URL
- For **ambiguous cities** (e.g., "Springfield"), ask which state
- Suggest **nearby cities** if no deals found in specified location

### Common User Requests

| User Says             | Search For                                 |
| --------------------- | ------------------------------------------ |
| "cheap oil change"    | `automotive` category, oil change services |
| "massage deals"       | `beauty-and-spas` category, massage        |
| "something fun to do" | `things-to-do` category                    |
| "fitness classes"     | `health-and-fitness` category              |
| "date night ideas"    | `food-and-drink` + `things-to-do`          |

---

## Handling Edge Cases

### No Deals Found

If Groupon has no matching deals:

1. Suggest **broadening the search** (e.g., nearby cities, related categories)
2. Recommend checking **similar services**
3. Offer to search **alternative deal sites** (if within scope)

### Service Not on Groupon

Some services rarely appear on Groupon. Suggest:

- Searching for alternatives (e.g., "Solidcore" → search "Pilates" or "fitness classes")
- Checking the general category page

### Expired or Sold Out

If a deal is no longer available:

- Search for **similar current deals**
- Note that Groupon inventory changes frequently

---

## Example Interactions

### Example 1: Specific Service Request

**User:** "Find me a cheap oil change in Austin"

**Agent Action:**

1. Search: `site:groupon.com oil change Austin` OR browse `https://www.groupon.com/local/austin/automotive`
2. Find 3-5 oil change deals
3. Present with prices, discounts, locations, and ratings

**Response:**

```
Found 4 oil change deals in Austin:

1. Jiffy Lube — Conventional Oil Change
   $24.99 (was $50) — 50% off
   North Austin | 4.2 stars (112 reviews)

2. Take 5 Oil Change — Full Synthetic
   $29.99 (was $55) — 45% off
   Downtown Austin | 4.5 stars (87 reviews)

3. Midas — Oil Change + Inspection
   $19.99 (was $45) — 55% off
   South Austin | 4.0 stars (64 reviews)

4. Valvoline — Conventional Oil Change
   $22.99 (was $38) — 40% off
   East Austin | 4.3 stars (203 reviews)

Let me know if you'd like more details on any of these.
```

### Example 2: Category Browsing

**User:** "What spa deals are available in San Francisco?"

**Agent Action:**

1. Browse: `https://www.groupon.com/local/san-francisco/beauty-and-spas`
2. Scan for popular services (massage, facial, etc.)
3. Highlight best-rated and biggest discounts

### Example 3: Activity Ideas

**User:** "Find something fun to do this weekend in Chicago"

**Agent Action:**

1. Browse: `https://www.groupon.com/local/chicago/things-to-do`
2. Look for activities, entertainment, tours
3. Present variety of options with different price points

## Quick Reference

### URL Templates

```
# Browse all deals in a city
https://www.groupon.com/local/{city}

# Browse by category
https://www.groupon.com/local/{city}/{category}

# Search with query
https://www.groupon.com/local/{city}?query={search-term}
```

### Top Categories by Use Case

- **Self-care:** beauty-and-spas
- **Car maintenance:** automotive
- **Exercise:** health-and-fitness
- **Dining out:** food-and-drink
- **Weekend plans:** things-to-do
- **Home help:** home-services
