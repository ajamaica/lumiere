# Redis LangCache REST API Reference

Complete documentation for the Redis LangCache REST API.

## Base URL

```
https://{LANGCACHE_HOST}/v1/caches/{CACHE_ID}
```

## Authentication

All requests require a Bearer token in the Authorization header:

```
Authorization: Bearer {API_KEY}
```

## Endpoints

### Search for Cached Response

Search the cache for semantically similar prompts.

```
POST /v1/caches/{cacheId}/entries/search
```

**Request Body:**

| Field                 | Type   | Required | Description                                                |
| --------------------- | ------ | -------- | ---------------------------------------------------------- |
| `prompt`              | string | Yes      | The prompt to search for                                   |
| `similarityThreshold` | number | No       | Similarity threshold (0.0-1.0). Higher = stricter matching |
| `searchStrategies`    | array  | No       | `["exact"]`, `["semantic"]`, or `["exact", "semantic"]`    |
| `attributes`          | object | No       | Key-value pairs to filter results                          |

**Example Request:**

```json
{
  "prompt": "What is semantic caching?",
  "similarityThreshold": 0.9,
  "searchStrategies": ["semantic"],
  "attributes": {
    "model": "gpt-5"
  }
}
```

**Response (Cache Hit):**

```json
{
  "hit": true,
  "entryId": "abc123",
  "prompt": "What is semantic caching?",
  "response": "Semantic caching stores and retrieves data based on meaning similarity...",
  "similarity": 0.95,
  "attributes": {
    "model": "gpt-5"
  }
}
```

**Response (Cache Miss):**

```json
{
  "hit": false
}
```

---

### Store New Entry

Store a prompt-response pair in the cache.

```
POST /v1/caches/{cacheId}/entries
```

**Request Body:**

| Field        | Type   | Required | Description                                   |
| ------------ | ------ | -------- | --------------------------------------------- |
| `prompt`     | string | Yes      | The prompt to cache                           |
| `response`   | string | Yes      | The LLM response to cache                     |
| `attributes` | object | No       | Key-value metadata for filtering/organization |

**Example Request:**

```json
{
  "prompt": "What is semantic caching?",
  "response": "Semantic caching is a technique that stores and retrieves cached data based on semantic similarity rather than exact matches.",
  "attributes": {
    "model": "gpt-5",
    "skill": "general-qa",
    "version": "1.0"
  }
}
```

**Response:**

```json
{
  "entryId": "abc123",
  "created": true
}
```

---

### Delete Entry by ID

Delete a specific cache entry.

```
DELETE /v1/caches/{cacheId}/entries/{entryId}
```

**Response:**

```json
{
  "deleted": true
}
```

---

### Delete Entries by Attributes

Delete all entries matching the specified attributes.

```
DELETE /v1/caches/{cacheId}/entries
```

**Request Body:**

```json
{
  "attributes": {
    "user_id": "123"
  }
}
```

**Response:**

```json
{
  "deletedCount": 15
}
```

---

### Flush Cache

Delete all entries in the cache.

```
POST /v1/caches/{cacheId}/flush
```

**Response:**

```json
{
  "flushed": true
}
```

**Warning:** This operation cannot be undone.

---

## Search Strategies

| Strategy   | Description                                 |
| ---------- | ------------------------------------------- |
| `exact`    | Case-insensitive exact match on prompt text |
| `semantic` | Vector similarity search using embeddings   |

When both strategies are specified, exact match is checked first. If no exact match, semantic search is performed.

## Similarity Threshold

The `similarityThreshold` parameter controls how similar a cached prompt must be to return a hit:

- `1.0` - Exact semantic match only
- `0.95` - Very high similarity (recommended for factual queries)
- `0.90` - High similarity (good default)
- `0.85` - Moderate similarity (allows more variation)
- `0.80` - Lower similarity (may return less relevant results)

The optimal threshold depends on your use case. Start with `0.90` and adjust based on hit/miss quality.

## Attributes

Attributes are key-value pairs attached to cache entries. Use them to:

1. **Partition the cache** - Separate entries by user, model, or context
2. **Filter searches** - Only match entries with specific attributes
3. **Bulk delete** - Remove all entries matching attributes

**Common attribute patterns:**

```json
{
  "model": "gpt-5.2",
  "user_id": "user_123",
  "skill": "code-review",
  "language": "en",
  "version": "2.0"
}
```

## Error Responses

| Status | Description                                           |
| ------ | ----------------------------------------------------- |
| 400    | Bad request (invalid JSON or missing required fields) |
| 401    | Unauthorized (invalid or missing API key)             |
| 404    | Cache or entry not found                              |
| 429    | Rate limited                                          |
| 500    | Internal server error                                 |

**Error Response Format:**

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required field: prompt"
  }
}
```

## Rate Limits

Rate limits depend on your Redis Cloud plan. Monitor the `X-RateLimit-*` headers in responses:

- `X-RateLimit-Limit` - Maximum requests per window
- `X-RateLimit-Remaining` - Requests remaining
- `X-RateLimit-Reset` - Unix timestamp when limit resets

## SDKs

Official SDKs are available for:

- **Python:** `pip install langcache`
- **JavaScript/Node:** `npm install @redis-ai/langcache`

See [Redis LangCache documentation](https://redis.io/docs/latest/develop/ai/langcache/) for SDK usage examples.
