---
name: moonbanking
description: Full access to Moon Banking API endpoints for data about every bank on Earth, including stories, votes, scores, search, country overviews, world overview, crypto-friendliness, and more. Requires MOON_BANKING_API_KEY env var.
metadata:
  {
    'openclaw':
      {
        'emoji': '💰',
        'requires': { 'env': ['MOON_BANKING_API_KEY'], 'bins': ['curl', 'jq'] },
        'os': ['linux', 'darwin', 'win32'],
      },
  }
---

# Moon Banking API

Query the Moon Banking API at https://api.moonbanking.com/v1 for data about every bank on Earth, as well as aggregated bank data at the world and country levels. Includes data about banks, countries, stories, votes, search, world overview, and more.

## Setup & Authentication

- Set the environment variable:  
  `MOON_BANKING_API_KEY=your_api_key_here`  
  (A [Moon Banking Pro plan](https://moonbanking.com/pro) is required to get your API key. Once you have a plan, you can create an API key in your [Moon Banking dashboard](https://moonbanking.com/settings/api/manage-api-keys).)

- Every request must include the header:  
  `Authorization: Bearer $MOON_BANKING_API_KEY`

- Use `exec` with `curl -s` (silent mode) and pipe to `jq` for clean, readable JSON output.

- If `jq` is not installed, remove `| jq .` — the agent can still parse raw JSON.

### Standard curl pattern

```bash
curl -s -H "Authorization: Bearer $MOON_BANKING_API_KEY" \
     "https://api.moonbanking.com/v1/ENDPOINT?param=value&another=val" | jq .
```

## All Endpoints

### 1. /banks

This endpoint allows you to retrieve a paginated list of all banks. By default, a maximum of ten banks are shown per page. You can search banks by name, filter by country, sort them by various fields, and include related data like scores and country information.  
**Common params**

- `limit` (optional) - (1–100, default 10)
- `starting_after` (optional)
- `ending_before` (optional)
- `sortBy` (optional) - (name, rank, countryRank, storiesCount, countryId, overall_score, overall_total, overall_up, overall_down, cryptoFriendly_score, cryptoFriendly_total, cryptoFriendly_up, cryptoFriendly_down, customerService_score, customerService_total, customerService_up, customerService_down, feesPricing_score, feesPricing_total, feesPricing_up, feesPricing_down, digitalExperience_score, digitalExperience_total, digitalExperience_up, digitalExperience_down, securityTrust_score, securityTrust_total, securityTrust_up, securityTrust_down, accountFeatures_score, accountFeatures_total, accountFeatures_up, accountFeatures_down, branchAtmAccess_score, branchAtmAccess_total, branchAtmAccess_up, branchAtmAccess_down, internationalBanking_score, internationalBanking_total, internationalBanking_up, internationalBanking_down, businessBanking_score, businessBanking_total, businessBanking_up, businessBanking_down, processingSpeed_score, processingSpeed_total, processingSpeed_up, processingSpeed_down, transparency_score, transparency_total, transparency_up, transparency_down, innovation_score, innovation_total, innovation_up, innovation_down, investmentServices_score, investmentServices_total, investmentServices_up, investmentServices_down, lending_score, lending_total, lending_up, lending_down)
- `sortOrder` (optional) - (asc, desc)  
  **Query params**
- `include` (optional) - (scores, country, meta)
- `countryId` (optional)
- `countryCode` (optional)  
  **Example**

```bash
curl -s -H "Authorization: Bearer $MOON_BANKING_API_KEY" \
     "https://api.moonbanking.com/v1/banks?limit=10&sortBy=overall_score&sortOrder=desc&include=scores,country&countryCode=US" | jq .
```

### /banks/{id}

This endpoint allows you to retrieve a specific bank by providing the bank ID. You can include related data like scores and country information in the response.  
**Query params**

- `include` (optional) - (scores, country)  
  **Path params**
- `id` (required)  
  **Example**

```bash
curl -s -H "Authorization: Bearer $MOON_BANKING_API_KEY" \
     "https://api.moonbanking.com/v1/banks/6jkxE4N8gHXgDPK?include=scores,country" | jq .
```

### 2. /bank-votes

This endpoint allows you to retrieve a paginated list of bank votes. You can filter by bank ID, category, country, vote type (upvote or downvote), and other parameters.  
**Common params**

- `limit` (optional) - (1–100, default 10)
- `starting_after` (optional)
- `ending_before` (optional)
- `sortBy` (optional) - (createdAt)
- `sortOrder` (optional) - (asc, desc)  
  **Query params**
- `bankId` (optional)
- `categories` (optional)
- `isUp` (optional)
- `countryCode` (optional)
- `include` (optional) - (bank, country)  
  **Example**

```bash
curl -s -H "Authorization: Bearer $MOON_BANKING_API_KEY" \
     "https://api.moonbanking.com/v1/bank-votes?limit=10&bankId=bank_abc&isUp=true&countryCode=US&sortBy=createdAt&sortOrder=desc&include=scores,country" | jq .
```

### 3. /countries

This endpoint allows you to retrieve a paginated list of all countries. By default, a maximum of ten countries are shown per page. You can search countries by name or 2-letter code, sort them by various fields, and include related data like scores.  
**Common params**

- `limit` (optional) - (1–100, default 10)
- `starting_after` (optional)
- `ending_before` (optional)
- `sortBy` (optional) - (name, code, rank, banksCount, storiesCount, overall_score, overall_total, overall_up, overall_down, cryptoFriendly_score, cryptoFriendly_total, cryptoFriendly_up, cryptoFriendly_down, customerService_score, customerService_total, customerService_up, customerService_down, feesPricing_score, feesPricing_total, feesPricing_up, feesPricing_down, digitalExperience_score, digitalExperience_total, digitalExperience_up, digitalExperience_down, securityTrust_score, securityTrust_total, securityTrust_up, securityTrust_down, accountFeatures_score, accountFeatures_total, accountFeatures_up, accountFeatures_down, branchAtmAccess_score, branchAtmAccess_total, branchAtmAccess_up, branchAtmAccess_down, internationalBanking_score, internationalBanking_total, internationalBanking_up, internationalBanking_down, businessBanking_score, businessBanking_total, businessBanking_up, businessBanking_down, processingSpeed_score, processingSpeed_total, processingSpeed_up, processingSpeed_down, transparency_score, transparency_total, transparency_up, transparency_down, innovation_score, innovation_total, innovation_up, innovation_down, investmentServices_score, investmentServices_total, investmentServices_up, investmentServices_down, lending_score, lending_total, lending_up, lending_down)
- `sortOrder` (optional) - (asc, desc)  
  **Query params**
- `search` (optional)
- `include` (optional) - (scores)  
  **Example**

```bash
curl -s -H "Authorization: Bearer $MOON_BANKING_API_KEY" \
     "https://api.moonbanking.com/v1/countries?limit=10&search=swiss&sortBy=overall_score&sortOrder=desc&include=scores" | jq .
```

### /countries/{code}

This endpoint allows you to retrieve a specific country by providing the 2-letter ISO country code. You can include related data like scores in the response.  
**Query params**

- `include` (optional) - (scores)  
  **Path params**
- `code` (required)  
  **Example**

```bash
curl -s -H "Authorization: Bearer $MOON_BANKING_API_KEY" \
     "https://api.moonbanking.com/v1/countries/US?include=scores" | jq .
```

### 4. /stories

This endpoint allows you to retrieve a paginated list of all stories. By default, a maximum of ten stories are shown per page. You can search stories by text content, filter by bank ID, sort them by various fields, and include related data like bank and country information.  
**Common params**

- `limit` (optional) - (1–100, default 10)
- `starting_after` (optional)
- `ending_before` (optional)
- `sortBy` (optional) - (createdAt, thumbsUpCount)
- `sortOrder` (optional) - (asc, desc)  
  **Query params**
- `search` (optional)
- `include` (optional) - (bank, country)
- `countryCode` (optional)
- `bankId` (optional)
- `tags` (optional)  
  **Example**

```bash
curl -s -H "Authorization: Bearer $MOON_BANKING_API_KEY" \
     "https://api.moonbanking.com/v1/stories?limit=10&search=swiss&sortBy=createdAt&sortOrder=desc&include=bank,country&countryCode=US&bankId=bank_abc" | jq .
```

### /stories/{id}

This endpoint allows you to retrieve a specific story by providing the story ID. You can include related data like bank and country information in the response.  
**Query params**

- `include` (optional) - (bank, country)  
  **Path params**
- `id` (required)  
  **Example**

```bash
curl -s -H "Authorization: Bearer $MOON_BANKING_API_KEY" \
     "https://api.moonbanking.com/v1/stories/8HsY5nBc7jAqM4u?include=bank,country" | jq .
```

### 5. /world

This endpoint allows you to retrieve global overview data that aggregates banks votes, stories and other data across all banks in all countries. You can include related data like scores in the response.  
**Query params**

- `include` (optional) - (scores)  
  **Example**

```bash
curl -s -H "Authorization: Bearer $MOON_BANKING_API_KEY" \
     "https://api.moonbanking.com/v1/world?include=scores" | jq .
```

### 6. /search

Search across banks, countries, and stories. You can specify which entities to search using the include parameter. If no include value is provided, all entities will be searched.  
**Common params**

- `limit` (optional) - (1–50, default 10)  
  **Query params**
- `q` (required)
- `include` (optional) - (banks, countries, stories)  
  **Example**

```bash
curl -s -H "Authorization: Bearer $MOON_BANKING_API_KEY" \
     "https://api.moonbanking.com/v1/search?q=crypto+friendly+banks&include=banks,countries,stories&limit=15" | jq .
```

## Best Practices & Tips

- Use `jq` filters to extract useful fields, e.g.:

  ```bash
  | jq '.data[] | {name, overall_score, rank, country?.name}'
  ```

- Error handling:
  - 401/403 → check or set `MOON_BANKING_API_KEY`
  - 404 → invalid ID or code
  - 429 → rate limit (wait and retry)

- Pagination: Use `starting_after` / `ending_before` from previous responses.

- Always summarize results helpfully (top banks, country rankings, popular stories, etc.) instead of dumping raw JSON.

- Chain multiple `exec` calls for complex questions.

Use this skill whenever questions or discussions involve bank information of any kind, including, but not limited to, rankings, reviews, country comparisons, customer experiences, or global banking insights.
