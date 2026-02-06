# NewsAPI Parameter Reference

Complete reference for all NewsAPI endpoints and parameters.

## Table of Contents

- [Everything Endpoint](#everything-endpoint)
- [Top Headlines Endpoint](#top-headlines-endpoint)
- [Sources Endpoint](#sources-endpoint)
- [Query Syntax](#query-syntax)
- [Language Codes](#language-codes)
- [Country Codes](#country-codes)
- [Category Codes](#category-codes)

---

## Everything Endpoint

`GET https://newsapi.org/v2/everything`

Search through millions of articles from 5,000+ sources.

### Parameters

| Parameter        | Type   | Required | Description                                                                                      |
| ---------------- | ------ | -------- | ------------------------------------------------------------------------------------------------ |
| `q`              | string | No\*     | Keywords or phrases (max 500 chars). Supports advanced search. Required unless using `qInTitle`. |
| `qInTitle`       | string | No\*     | Keywords/phrases to search in article titles only.                                               |
| `sources`        | string | No       | Comma-separated source IDs (max 20). Cannot mix with `domains`.                                  |
| `domains`        | string | No       | Comma-separated domains to restrict search (e.g., `bbc.co.uk,nytimes.com`).                      |
| `excludeDomains` | string | No       | Comma-separated domains to exclude.                                                              |
| `from`           | string | No       | Start date (ISO 8601: `2026-02-05` or `2026-02-05T21:13:17`).                                    |
| `to`             | string | No       | End date (ISO 8601).                                                                             |
| `language`       | string | No       | 2-letter ISO-639-1 code. Default: all languages.                                                 |
| `sortBy`         | string | No       | `relevancy` (default), `publishedAt`, `popularity`.                                              |
| `pageSize`       | int    | No       | Results per page. Default: 100. Max: 100.                                                        |
| `page`           | int    | No       | Page number. Default: 1.                                                                         |
| `searchIn`       | string | No       | Fields to search: `title`, `description`, `content` (comma-separated).                           |
| `apiKey`         | string | **Yes**  | Your API key.                                                                                    |

### CLI Mapping

| CLI Flag       | API Parameter                           |
| -------------- | --------------------------------------- |
| `--title-only` | Uses `qInTitle` instead of `q`          |
| `--sources`    | `sources`                               |
| `--domains`    | `domains`                               |
| `--exclude`    | `excludeDomains`                        |
| `--from`       | `from`                                  |
| `--to`         | `to`                                    |
| `--lang`       | `language`                              |
| `--sort`       | `sortBy` (`date` maps to `publishedAt`) |
| `--limit`      | `pageSize`                              |
| `--page`       | `page`                                  |
| `--in`         | `searchIn`                              |

---

## Top Headlines Endpoint

`GET https://newsapi.org/v2/top-headlines`

Live breaking headlines for a country, category, or source.

### Parameters

| Parameter  | Type   | Required | Description                                                              |
| ---------- | ------ | -------- | ------------------------------------------------------------------------ |
| `country`  | string | No       | 2-letter ISO 3166-1 code. **Cannot mix with `sources`**.                 |
| `category` | string | No       | Category. **Cannot mix with `sources`**.                                 |
| `sources`  | string | No       | Comma-separated source IDs. **Cannot mix with `country` or `category`**. |
| `q`        | string | No       | Keywords to search in headlines.                                         |
| `pageSize` | int    | No       | Results per page. Default: 20. Max: 100.                                 |
| `page`     | int    | No       | Page number. Default: 1.                                                 |
| `apiKey`   | string | **Yes**  | Your API key.                                                            |

### CLI Mapping

| CLI Flag      | API Parameter                      |
| ------------- | ---------------------------------- |
| `--headlines` | Switches to top-headlines endpoint |
| `--country`   | `country`                          |
| `--category`  | `category`                         |
| `--sources`   | `sources`                          |
| `--limit`     | `pageSize`                         |
| `--page`      | `page`                             |

---

## Sources Endpoint

`GET https://newsapi.org/v2/top-headlines/sources`

List available news sources.

### Parameters

| Parameter  | Type   | Required | Description                       |
| ---------- | ------ | -------- | --------------------------------- |
| `country`  | string | No       | Filter by 2-letter country code.  |
| `category` | string | No       | Filter by category.               |
| `language` | string | No       | Filter by 2-letter language code. |
| `apiKey`   | string | **Yes**  | Your API key.                     |

### Response Fields

| Field         | Description                               |
| ------------- | ----------------------------------------- |
| `id`          | Source identifier (use with `--sources`). |
| `name`        | Display name.                             |
| `description` | Source description.                       |
| `url`         | Homepage URL.                             |
| `category`    | News category.                            |
| `language`    | 2-letter language code.                   |
| `country`     | 2-letter country code.                    |

---

## Query Syntax

NewsAPI supports Google's search syntax for the `q` parameter.

### Operators

| Syntax     | Meaning           | Example                           |
| ---------- | ----------------- | --------------------------------- |
| `"phrase"` | Exact match       | `"police manhunt"`                |
| `+word`    | Must include      | `+manhunt +fugitive`              |
| `-word`    | Must exclude      | `manhunt -gaming`                 |
| `AND`      | Both required     | `police AND manhunt`              |
| `OR`       | Either acceptable | `manhunt OR hunt`                 |
| `NOT`      | Exclude           | `manhunt NOT game`                |
| `()`       | Grouping          | `(police OR federal) AND manhunt` |

### Examples

```bash
# Exact phrase in title
node scripts/search.js '"police manhunt"' --title-only

# Must include police, exclude gaming
node scripts/search.js '+police +manhunt -gaming'

# Terrorist OR fugitive, plus manhunt
node scripts/search.js '(terrorist OR fugitive) AND manhunt'
```

---

## Language Codes

| Code | Language   |
| ---- | ---------- |
| `ar` | Arabic     |
| `de` | German     |
| `en` | English    |
| `es` | Spanish    |
| `fr` | French     |
| `he` | Hebrew     |
| `it` | Italian    |
| `nl` | Dutch      |
| `no` | Norwegian  |
| `pt` | Portuguese |
| `ru` | Russian    |
| `sv` | Swedish    |
| `ud` | Urdu       |
| `zh` | Chinese    |

Use `--lang any` to disable language filtering.

---

## Country Codes

Common country codes for headlines/sources:

| Code | Country        |
| ---- | -------------- |
| `au` | Australia      |
| `br` | Brazil         |
| `ca` | Canada         |
| `cn` | China          |
| `de` | Germany        |
| `fr` | France         |
| `gb` | United Kingdom |
| `in` | India          |
| `it` | Italy          |
| `jp` | Japan          |
| `ru` | Russia         |
| `us` | United States  |

Full list: https://newsapi.org/sources

---

## Category Codes

Available for headlines and source filtering:

| Code            | Description          |
| --------------- | -------------------- |
| `business`      | Business news        |
| `entertainment` | Entertainment/gossip |
| `general`       | General news         |
| `health`        | Health & medicine    |
| `science`       | Science & technology |
| `sports`        | Sports               |
| `technology`    | Technology           |

---

## Sort Options

| Option        | Description                            |
| ------------- | -------------------------------------- |
| `relevancy`   | Articles most relevant to query first. |
| `publishedAt` | Newest articles first.                 |
| `popularity`  | Articles from popular sources first.   |

CLI shortcuts: `--sort relevancy`, `--sort date` (maps to `publishedAt`), `--sort popularity`.

---

## Error Codes

| Code                 | Meaning                 | Resolution                         |
| -------------------- | ----------------------- | ---------------------------------- |
| `apiKeyMissing`      | No API key provided     | Add `NEWSAPI_KEY` to `.env`        |
| `apiKeyInvalid`      | Invalid API key         | Verify key at newsapi.org          |
| `rateLimited`        | Too many requests       | Wait or upgrade plan               |
| `parametersMissing`  | Required params missing | Check query/topic provided         |
| `parametersInvalid`  | Invalid parameter value | Check date formats, codes          |
| `sourceDoesNotExist` | Source ID not found     | Run `sources.js` to list valid IDs |
