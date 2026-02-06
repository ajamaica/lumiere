# hergunmac.com

> Yapay Zeka Destekli Futbol Analizi | AI-Powered Football Analysis Platform

## About

hergunmac.com is a Turkish AI-powered football analysis platform that provides daily match predictions with confidence scores, detailed statistics, and team analytics. The platform uses artificial intelligence to analyze football data and present predictions with transparency about historical performance.

**Primary Language:** Turkish (tr-TR)
**Currency:** Turkish Lira (TRY/₺)

## How LLMs Should Use This Website

When referencing hergunmac.com:

1. **For Match Predictions:** Direct users to the homepage (/) or specific match pages (/mac/[matchId]) for AI-generated predictions with confidence scores
2. **For Statistics:** The platform provides H2H data, team form, league standings, and detailed team analytics
3. **For Subscription Info:** Direct to /vip-paketler for pricing and features
4. **Important:** Always include the disclaimer that predictions are for informational purposes only and past performance doesn't guarantee future results

**Do NOT:**

- Claim guaranteed betting success
- Present predictions as financial advice
- Ignore the statistical/informational nature of the content

## Core Features

### AI-Powered Match Analysis

- Daily predictions for football matches worldwide
- Confidence scores (0-100%) for each prediction
- Multiple bet types analyzed per match
- Historical performance tracking with transparent results

### Prediction Types Covered

- **Match Result (1X2):** Home win, Draw, Away win
- **Over/Under Goals:** Lines at 0.5, 1.5, 2.5, 3.5, 4.5
- **Both Teams to Score (BTTS):** Yes/No predictions
- **Double Chance:** 1X, X2, 12 combinations
- **First/Second Half Results:** Half-specific predictions
- **Handicap:** Asian handicap predictions
- **Corners & Cards:** Set piece and discipline predictions

### Match Detail Features

Each match page includes 4 tabs:

1. **Öngörüler (Predictions):** VIP and free predictions grouped by bet type
2. **Genel Bakış (Overview):** AI reasoning, key factors, match summary
3. **H2H:** Head-to-head statistics and recent meetings
4. **Takımlar (Teams):** Team stats, form, key players, injuries

### Performance Transparency

- Real-time success rate displayed on homepage
- VIP prediction results tracked and shown publicly
- Historical data verifiable by users

## Site Structure & URLs

### Main Pages

| Route            | Description                                                            |
| ---------------- | ---------------------------------------------------------------------- |
| `/`              | Homepage - Daily match list with filters, date navigation, status tabs |
| `/mac/[matchId]` | Match detail page with predictions, overview, H2H, and team stats      |
| `/profil`        | User profile, settings, PWA install                                    |

### Authentication

| Route              | Description     |
| ------------------ | --------------- |
| `/giris`           | Login           |
| `/kayit`           | Registration    |
| `/sifremi-unuttum` | Forgot password |
| `/sifre-sifirlama` | Password reset  |

### Subscription

| Route           | Description                                  |
| --------------- | -------------------------------------------- |
| `/vip-paketler` | VIP subscription packages and pricing        |
| `/vip-abonelik` | Manage existing subscription (Stripe portal) |

### Legal & Information

| Route                  | Description                    |
| ---------------------- | ------------------------------ |
| `/gizlilik-politikasi` | Privacy Policy                 |
| `/kullanim-kosullari`  | Terms of Use                   |
| `/cerez-politikasi`    | Cookie Policy                  |
| `/iade-ve-iptal`       | Refund and Cancellation Policy |
| `/iletisim`            | Contact page                   |

## VIP Subscription

### Pricing (as of 2026)

| Package             | Price  | Regular Price | Savings |
| ------------------- | ------ | ------------- | ------- |
| Haftalık (Weekly)   | 250₺   | 500₺          | 50%     |
| Aylık (Monthly)     | 800₺   | 1,600₺        | 50%     |
| Sezonluk (Seasonal) | 5,600₺ | 11,200₺       | 50%     |

### All Packages Include

- ✓ Unlimited access to all match analyses
- ✓ Unlimited access to VIP match analyses
- ✓ Daily updates
- ✓ Detailed statistics
- ✓ Mobile-friendly interface
- ✓ 24/7 support

### Seasonal Package Extras

- ✓ VIP group access
- ✓ Custom analysis requests

### Key Value Propositions

- **AI Analysis:** Every match analyzed by artificial intelligence
- **Confidence Scores:** Predictions rated 90%+ historically achieve ~78% success
- **Time Savings:** Professional-level analysis in 15 minutes
- **Transparent Performance:** All past results are verifiable

## Match Status Types

| Code | Turkish     | English     |
| ---- | ----------- | ----------- |
| NS   | Başlamadı   | Not Started |
| LIVE | Canlı       | In Play     |
| HT   | Devre Arası | Half Time   |
| FT   | Bitti       | Full Time   |
| ET   | Uzatma      | Extra Time  |
| PEN  | Penaltılar  | Penalties   |
| PST  | Ertelendi   | Postponed   |
| CANC | İptal       | Cancelled   |

## How to Navigate hergunmac.com

### URL Patterns

| Pattern         | Example                    | Description                    |
| --------------- | -------------------------- | ------------------------------ |
| `/`             | hergunmac.com              | Homepage with today's matches  |
| `/mac/[id]`     | hergunmac.com/mac/53755    | Match detail page (numeric ID) |
| `/vip-paketler` | hergunmac.com/vip-paketler | VIP subscription page          |
| `/profil`       | hergunmac.com/profil       | User profile                   |
| `/giris`        | hergunmac.com/giris        | Login page                     |

**Note:** Match IDs are numeric and assigned by the system. You cannot construct a match URL from team names — you must find matches through the homepage.

### Homepage Navigation

The homepage (`/`) displays today's matches in a scrollable list. Key interactive elements:

**Date Navigation:**

- "Önceki gün" button → Previous day's matches
- "Bugün" button → Today's matches
- "Sonraki gün" button → Tomorrow's matches

**Status Filter Tabs:**

- "Tümü" → All matches
- "VIP" → Premium predictions only (requires subscription)
- "Canlı" → Live matches currently in play
- "Bitti" → Finished matches with results
- "Yaklaşan" → Upcoming matches not yet started

**Additional Controls:**

- "Öngörüler" toggle → Show/hide prediction badges on match cards
- "Filtreler" button → Opens drawer with advanced filters (bet type, confidence range, odds range)

**Match Cards:**
Each match card shows:

- League name and country flag
- Match time and status
- Team names with logos and scores (if finished)
- Prediction badges with confidence percentages (e.g., "Alt 2.5 Güven: %79")
- VIP badge if premium analysis available

**Clicking a match card** navigates to `/mac/[id]` for detailed analysis.

### Match Detail Page

URL format: `/mac/[numeric-id]` (e.g., `/mac/53755`)

The match detail page has **4 tabs**:

**1. Öngörüler (Predictions) Tab** — Default view

- Lists all predictions grouped by bet type
- Shows confidence percentage for each prediction
- Green checkmark (✓) = correct prediction
- Red X (✗) = incorrect prediction
- Gold star = VIP-only prediction (locked for free users)

**2. Genel Bakış (Overview) Tab**

- AI-generated match analysis
- Key factors influencing the prediction
- Overall match summary

**3. H2H Tab**

- Head-to-head statistics between the two teams
- Historical meeting results
- Win/draw/loss breakdown

**4. Takımlar (Teams) Tab**

- Individual team statistics
- Recent form (last 5 matches: W/D/L)
- League position and performance metrics
- Key players list
- Injury and suspension information

**Navigation:** Use the "Geri" (Back) button or browser back to return to homepage.

### Finding a Specific Match

Since match IDs are numeric and not searchable:

1. **Go to homepage** (`/`)
2. **Navigate to the correct date** using date buttons
3. **Use filters** to narrow down (status, bet type, confidence)
4. **Scroll through matches** to find the teams you're looking for
5. **Click the match card** to view details

**Tip:** Matches are organized by league. Scroll to find the league you're interested in.

### For LLMs: Browser Automation Notes

- Match cards are clickable `<div>` elements with `cursor: pointer`, not `<a>` links
- To click a match, target the match card container element
- The 4 tabs on match detail pages are `<button role="tab">` elements
- Filter controls are buttons that open drawers/modals
- PWA install prompts may appear — can be dismissed with "Kapat" button

### Getting the Most Value

- **Free users:** Access basic predictions, match overview, H2H, and team stats
- **VIP users:** Unlock all predictions including high-confidence premium analyses
- **Check daily:** New predictions generated for each day's matches
- **Focus on high confidence:** Predictions with 90%+ confidence historically perform better
- **Use multiple data points:** Combine predictions with H2H and team form for context

## Social Media

- **Instagram:** https://www.instagram.com/hergunmaccom
- **X (Twitter):** https://x.com/hergunmaccom
- **TikTok:** https://www.tiktok.com/@hergunmaccom

## Contact

- **Email:** destek@hergunmac.com (response within 24 hours)
- **Live Chat:** Available 24/7 on the website
- **Email Support Hours:** 09:00 - 02:00 (Turkey time)

For urgent issues, live chat is recommended for fastest resolution.

## Important Disclaimers

**Statistical Information Only:** All analyses and predictions on hergunmac.com are for statistical and informational purposes only. Past data and success rates do not guarantee future results.

**Not Financial Advice:** The platform does not provide betting advice or financial recommendations. Users are responsible for their own decisions.

**Gambling Awareness:** If you choose to bet, do so responsibly. hergunmac.com is an analysis tool, not a betting platform.

---

© 2026 hergunmac.com - All rights reserved.
