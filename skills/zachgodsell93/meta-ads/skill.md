---
slug: meta-ads
display_name: Meta Ads API
version: 1.0.0
tags: [latest]
---

# Meta Ads API

## Description

Full read/write integration with Meta (Facebook) Ads API for managing campaigns, ad sets, ads, and accessing performance insights/metrics.

## Setup

### Environment Variables

- `META_ACCESS_TOKEN` - Meta access token (User Access Token or System User Token)
- `META_AD_ACCOUNT_ID` - Your ad account ID (numeric, without `act_` prefix)

### Required Permissions

- `ads_read` - Read access to ads data
- `ads_management` - Create, edit, and delete ads

### Token Types

**User Access Token**
- Short-lived: ~2 hours
- Can be extended to 60-90 days
- Obtained via OAuth flow or Graph API Explorer

**System User Token**
- No expiration
- Recommended for production/automated access
- Created in Business Manager

### Authentication

All requests require the access token as a query parameter or header:

```
Authorization: Bearer $META_ACCESS_TOKEN
Content-Type: application/json
```

Or as query parameter:
```
?access_token=$META_ACCESS_TOKEN
```

## API Reference

Base URL: `https://graph.facebook.com/v25.0/`

**Important:** Ad account IDs must be prefixed with `act_` in API calls (e.g., `act_123456789`).

### Ad Account

#### Get Ad Account Info

```bash
curl "https://graph.facebook.com/v25.0/act_$META_AD_ACCOUNT_ID?fields=name,account_status,currency,timezone_name,amount_spent" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

---

### Campaigns

#### List Campaigns

```bash
curl "https://graph.facebook.com/v25.0/act_$META_AD_ACCOUNT_ID/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

#### Get Single Campaign

```bash
curl "https://graph.facebook.com/v25.0/{CAMPAIGN_ID}?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

#### Create Campaign

```bash
curl -X POST "https://graph.facebook.com/v25.0/act_$META_AD_ACCOUNT_ID/campaigns" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Campaign",
    "objective": "OUTCOME_TRAFFIC",
    "status": "PAUSED",
    "special_ad_categories": []
  }'
```

#### Update Campaign

```bash
curl -X POST "https://graph.facebook.com/v25.0/{CAMPAIGN_ID}" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Campaign Name",
    "status": "ACTIVE"
  }'
```

#### Pause Campaign

```bash
curl -X POST "https://graph.facebook.com/v25.0/{CAMPAIGN_ID}" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PAUSED"
  }'
```

#### Delete Campaign

```bash
curl -X DELETE "https://graph.facebook.com/v25.0/{CAMPAIGN_ID}" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

---

### Ad Sets

#### List Ad Sets

```bash
curl "https://graph.facebook.com/v25.0/act_$META_AD_ACCOUNT_ID/adsets?fields=id,name,status,campaign_id,daily_budget,lifetime_budget,targeting,optimization_goal" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

#### Get Single Ad Set

```bash
curl "https://graph.facebook.com/v25.0/{ADSET_ID}?fields=id,name,status,campaign_id,daily_budget,lifetime_budget,targeting,optimization_goal,bid_amount,billing_event" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

#### Create Ad Set

```bash
curl -X POST "https://graph.facebook.com/v25.0/act_$META_AD_ACCOUNT_ID/adsets" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Ad Set",
    "campaign_id": "{CAMPAIGN_ID}",
    "daily_budget": 5000,
    "billing_event": "IMPRESSIONS",
    "optimization_goal": "LINK_CLICKS",
    "bid_amount": 200,
    "targeting": {
      "geo_locations": {
        "countries": ["US"]
      },
      "age_min": 18,
      "age_max": 65
    },
    "status": "PAUSED"
  }'
```

**Note:** Budget values are in cents (e.g., 5000 = $50.00).

#### Update Ad Set

```bash
curl -X POST "https://graph.facebook.com/v25.0/{ADSET_ID}" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Ad Set Name",
    "daily_budget": 10000,
    "status": "ACTIVE"
  }'
```

#### Pause Ad Set

```bash
curl -X POST "https://graph.facebook.com/v25.0/{ADSET_ID}" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PAUSED"
  }'
```

#### Delete Ad Set

```bash
curl -X DELETE "https://graph.facebook.com/v25.0/{ADSET_ID}" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

---

### Ads

#### List Ads

```bash
curl "https://graph.facebook.com/v25.0/act_$META_AD_ACCOUNT_ID/ads?fields=id,name,status,adset_id,campaign_id,creative,created_time" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

#### Get Single Ad

```bash
curl "https://graph.facebook.com/v25.0/{AD_ID}?fields=id,name,status,adset_id,campaign_id,creative,tracking_specs,created_time,updated_time" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

#### Create Ad

```bash
curl -X POST "https://graph.facebook.com/v25.0/act_$META_AD_ACCOUNT_ID/ads" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Ad",
    "adset_id": "{ADSET_ID}",
    "creative": {
      "creative_id": "{CREATIVE_ID}"
    },
    "status": "PAUSED"
  }'
```

#### Create Ad with Inline Creative

```bash
curl -X POST "https://graph.facebook.com/v25.0/act_$META_AD_ACCOUNT_ID/ads" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Ad",
    "adset_id": "{ADSET_ID}",
    "creative": {
      "object_story_spec": {
        "page_id": "{PAGE_ID}",
        "link_data": {
          "link": "https://example.com",
          "message": "Check out our website!",
          "name": "Example Site",
          "call_to_action": {
            "type": "LEARN_MORE"
          }
        }
      }
    },
    "status": "PAUSED"
  }'
```

#### Update Ad

```bash
curl -X POST "https://graph.facebook.com/v25.0/{AD_ID}" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Ad Name",
    "status": "ACTIVE"
  }'
```

#### Pause Ad

```bash
curl -X POST "https://graph.facebook.com/v25.0/{AD_ID}" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PAUSED"
  }'
```

#### Delete Ad

```bash
curl -X DELETE "https://graph.facebook.com/v25.0/{AD_ID}" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

---

### Ad Creatives

#### List Ad Creatives

```bash
curl "https://graph.facebook.com/v25.0/act_$META_AD_ACCOUNT_ID/adcreatives?fields=id,name,object_story_spec,thumbnail_url" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

#### Create Ad Creative

```bash
curl -X POST "https://graph.facebook.com/v25.0/act_$META_AD_ACCOUNT_ID/adcreatives" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Creative",
    "object_story_spec": {
      "page_id": "{PAGE_ID}",
      "link_data": {
        "link": "https://example.com",
        "message": "Ad copy text here",
        "name": "Headline",
        "description": "Description text",
        "call_to_action": {
          "type": "SHOP_NOW"
        }
      }
    }
  }'
```

---

### Insights (Performance Metrics)

#### Get Account-Level Insights

```bash
curl "https://graph.facebook.com/v25.0/act_$META_AD_ACCOUNT_ID/insights?fields=spend,impressions,clicks,reach,cpc,cpm,ctr&date_preset=last_30d" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

#### Get Campaign Insights

```bash
curl "https://graph.facebook.com/v25.0/{CAMPAIGN_ID}/insights?fields=spend,impressions,clicks,reach,frequency,cpc,cpm,ctr,actions&date_preset=last_7d" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

#### Get Ad Set Insights

```bash
curl "https://graph.facebook.com/v25.0/{ADSET_ID}/insights?fields=spend,impressions,clicks,reach,cpc,cpm,ctr,actions&date_preset=last_7d" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

#### Get Ad Insights

```bash
curl "https://graph.facebook.com/v25.0/{AD_ID}/insights?fields=spend,impressions,clicks,reach,cpc,cpm,ctr,actions&date_preset=last_7d" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

#### Get Insights with Custom Date Range

```bash
curl "https://graph.facebook.com/v25.0/act_$META_AD_ACCOUNT_ID/insights?fields=spend,impressions,clicks,cpc,cpm,ctr&time_range={\"since\":\"2026-01-01\",\"until\":\"2026-01-31\"}" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

#### Get Insights with Breakdowns

```bash
curl "https://graph.facebook.com/v25.0/act_$META_AD_ACCOUNT_ID/insights?fields=spend,impressions,clicks,cpc&breakdowns=age,gender&date_preset=last_7d" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

#### Get Insights by Day

```bash
curl "https://graph.facebook.com/v25.0/act_$META_AD_ACCOUNT_ID/insights?fields=spend,impressions,clicks&time_increment=1&date_preset=last_7d" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

#### Get Insights with Attribution Window

```bash
curl "https://graph.facebook.com/v25.0/{CAMPAIGN_ID}/insights?fields=spend,actions,action_values&action_attribution_windows=[\"7d_click\",\"1d_view\"]&date_preset=last_7d" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

## Campaign Objectives

| Objective | Description |
|-----------|-------------|
| `OUTCOME_AWARENESS` | Brand awareness and reach |
| `OUTCOME_ENGAGEMENT` | Post engagement, page likes, event responses |
| `OUTCOME_TRAFFIC` | Drive traffic to website or app |
| `OUTCOME_LEADS` | Lead generation |
| `OUTCOME_APP_PROMOTION` | App installs and engagement |
| `OUTCOME_SALES` | Conversions and catalog sales |

**Legacy objectives (still supported):**
- `BRAND_AWARENESS`, `REACH`, `LINK_CLICKS`, `POST_ENGAGEMENT`, `VIDEO_VIEWS`, `LEAD_GENERATION`, `CONVERSIONS`, `APP_INSTALLS`

## Targeting Options

### Geographic Targeting

```json
{
  "geo_locations": {
    "countries": ["US", "CA"],
    "regions": [{"key": "4081"}],
    "cities": [{"key": "2420379", "radius": 25, "distance_unit": "mile"}],
    "zips": [{"key": "US:90210"}]
  }
}
```

### Demographic Targeting

```json
{
  "age_min": 25,
  "age_max": 54,
  "genders": [1, 2]
}
```

Gender values: `1` = Male, `2` = Female

### Interest Targeting

```json
{
  "flexible_spec": [{
    "interests": [{"id": "6003139266461", "name": "Technology"}]
  }]
}
```

## Budget Types

| Type | Description |
|------|-------------|
| `daily_budget` | Maximum spend per day (in cents) |
| `lifetime_budget` | Total budget for campaign/ad set duration (in cents) |

**Important:** Budget values are in the smallest currency unit (cents for USD). Example: `5000` = $50.00

## Status Values

| Status | Description |
|--------|-------------|
| `ACTIVE` | Currently running |
| `PAUSED` | Manually paused |
| `DELETED` | Soft deleted |
| `ARCHIVED` | Archived, not running |

## Available Metrics

| Metric | Description |
|--------|-------------|
| `spend` | Total amount spent |
| `impressions` | Number of times ads were shown |
| `clicks` | Number of clicks on ads |
| `reach` | Number of unique people who saw ads |
| `frequency` | Average number of times each person saw your ad |
| `cpc` | Cost per click |
| `cpm` | Cost per 1,000 impressions |
| `ctr` | Click-through rate (clicks / impressions) |
| `cpp` | Cost per 1,000 people reached |
| `actions` | Total actions (conversions) broken down by type |
| `action_values` | Value of conversions |
| `conversions` | Number of conversions |
| `cost_per_action_type` | Cost per action by type |

## Attribution Windows

| Window | Description |
|--------|-------------|
| `1d_click` | 1-day click attribution |
| `7d_click` | 7-day click attribution (default) |
| `28d_click` | 28-day click attribution |
| `1d_view` | 1-day view-through attribution |

**Note:** As of January 2026, 7-day view (`7d_view`) and 28-day view (`28d_view`) attribution windows have been removed. Only `1d_view` remains for view-through attribution.

## Breakdowns

| Breakdown | Description |
|-----------|-------------|
| `age` | Age ranges (18-24, 25-34, etc.) |
| `gender` | Male, Female, Unknown |
| `placement` | Where ad was shown (feed, stories, etc.) |
| `device_platform` | Device type (mobile, desktop) |
| `platform_position` | Position within platform |
| `publisher_platform` | Facebook, Instagram, Audience Network |
| `country` | Country of viewer |
| `region` | Region/state of viewer |

## Date Presets

| Preset | Description |
|--------|-------------|
| `today` | Today only |
| `yesterday` | Yesterday only |
| `this_month` | Current month |
| `last_month` | Previous month |
| `last_7d` | Last 7 days |
| `last_14d` | Last 14 days |
| `last_28d` | Last 28 days |
| `last_30d` | Last 30 days |
| `last_90d` | Last 90 days |

## Pagination

The API uses cursor-based pagination. Responses include a `paging` object with cursors.

```json
{
  "data": [...],
  "paging": {
    "cursors": {
      "before": "abc123",
      "after": "xyz789"
    },
    "next": "https://graph.facebook.com/v25.0/..."
  }
}
```

To get the next page:

```bash
curl "https://graph.facebook.com/v25.0/act_$META_AD_ACCOUNT_ID/campaigns?fields=id,name&after={AFTER_CURSOR}" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

**Limits:**
- Default: 25 records per page
- Maximum: 5000 records per page (use `limit` parameter)

## Rate Limits

Rate limits are calculated per ad account using the formula:

```
Call Limit = 60 + (400 × Active Ads) - (0.001 × API Errors)
```

- Minimum: 60 calls per hour
- Increases with more active ads
- Decreases with API errors

**Handling Rate Limits:**
- Check `X-Business-Use-Case-Usage` header for current usage
- Implement exponential backoff when receiving 429 responses
- Start with 1 second delay, double on each retry (max 5 retries)

## Token Management

### Extending User Access Tokens

Short-lived user tokens (~2 hours) can be exchanged for long-lived tokens (60-90 days):

```bash
curl "https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={SHORT_LIVED_TOKEN}"
```

Response:
```json
{
  "access_token": "long_lived_token_here",
  "token_type": "bearer",
  "expires_in": 5184000
}
```

### Debugging Tokens

Check token validity and permissions:

```bash
curl "https://graph.facebook.com/v25.0/debug_token?input_token={TOKEN_TO_CHECK}&access_token={APP_ID}|{APP_SECRET}"
```

### Recommended: System User Tokens

For production use, create a System User in Business Manager:

1. Go to Business Settings > Users > System Users
2. Create a new System User with "Admin" role
3. Assign the ad account to the System User
4. Generate a token with `ads_read` and `ads_management` permissions

System User tokens do not expire.

## Changelog

### v1.0.0

- Initial release with full read/write access
- Ad Account: get info
- Campaigns: list, get, create, update, pause, delete
- Ad Sets: list, get, create, update, pause, delete with targeting
- Ads: list, get, create, update, pause, delete
- Ad Creatives: list, create
- Insights: account/campaign/adset/ad level with all metrics
- Support for breakdowns, date ranges, and attribution windows
- Campaign objectives and targeting documentation
- Budget types (daily/lifetime) in cents
- Pagination documentation
- Rate limits and token management
