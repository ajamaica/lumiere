# Trakt API Reference

Base URL: `https://api.trakt.tv`

All requests require:

- Header: `trakt-api-key: <client_id>`
- Header: `trakt-api-version: 2`
- Header: `Authorization: Bearer <access_token>` (for authenticated endpoints)

## Authentication

### Device Authorization (PIN Auth)

**Step 1: Generate Device Code**

```http
POST /oauth/device/code
Content-Type: application/json

{
  "client_id": "<client_id>"
}
```

Response:

```json
{
  "device_code": "...",
  "user_code": "...",
  "verification_url": "https://trakt.tv/activate",
  "expires_in": 600,
  "interval": 5
}
```

**Step 2: Poll for Token**

```http
POST /oauth/device/token
Content-Type: application/json

{
  "code": "<device_code>",
  "client_id": "<client_id>",
  "client_secret": "<client_secret>"
}
```

Response:

```json
{
  "access_token": "...",
  "token_type": "bearer",
  "expires_in": 7776000,
  "refresh_token": "...",
  "scope": "public",
  "created_at": 1234567890
}
```

### PIN Auth (Simplified)

Navigate user to: `https://trakt.tv/pin/<client_id>`

They get a PIN, then:

```http
POST /oauth/device/token
Content-Type: application/json

{
  "code": "<pin>",
  "client_id": "<client_id>",
  "client_secret": "<client_secret>"
}
```

## Watch History

### Get Watched History

```http
GET /sync/history/{type}/{id}
Authorization: Bearer <access_token>
```

Parameters:

- `type`: `shows`, `movies`, `seasons`, `episodes`
- `id` (optional): Specific item ID
- Query params:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10, max: 100)
  - `start_at`: ISO 8601 date (filter by date)
  - `end_at`: ISO 8601 date

Example Response:

```json
[
  {
    "id": 123456,
    "watched_at": "2026-02-04T00:00:00.000Z",
    "action": "watch",
    "type": "episode",
    "episode": {
      "season": 1,
      "number": 1,
      "title": "Pilot",
      "ids": {
        "trakt": 123,
        "tvdb": 456,
        "imdb": "tt1234567",
        "tmdb": 789
      }
    },
    "show": {
      "title": "Breaking Bad",
      "year": 2008,
      "ids": {...}
    }
  }
]
```

## Recommendations

### Get Personalized Recommendations

```http
GET /recommendations/{type}
Authorization: Bearer <access_token>
```

Parameters:

- `type`: `shows` or `movies`
- Query params:
  - `ignore_collected`: true/false (default: false)
  - `ignore_watchlisted`: true/false (default: false)
  - `limit`: Number of results (default: 10)

Example Response:

```json
[
  {
    "title": "Better Call Saul",
    "year": 2015,
    "ids": {
      "trakt": 12345,
      "slug": "better-call-saul",
      "tvdb": 273181,
      "imdb": "tt3032476",
      "tmdb": 60059
    },
    "overview": "Six years before Saul Goodman meets Walter White...",
    "rating": 8.7,
    "votes": 12345,
    "genres": ["drama", "crime"]
  }
]
```

## Watchlist

### Get Watchlist

```http
GET /sync/watchlist/{type}/{sort}
Authorization: Bearer <access_token>
```

Parameters:

- `type`: `shows`, `movies`, `seasons`, `episodes`
- `sort` (optional): `rank`, `added`, `title`, `released`, `runtime`, `popularity`, `percentage`, `votes`, `random`

## Search

### Search for Shows/Movies

```http
GET /search/{type}
```

Parameters:

- `type`: Comma-separated: `movie`, `show`, `episode`, `person`, `list`
- Query params:
  - `query`: Search query (required)
  - `years`: Comma-separated year range (e.g., `2010-2020`)
  - `genres`: Comma-separated genres
  - `languages`: Comma-separated language codes
  - `limit`: Results per page (default: 10)

Example:

```http
GET /search/show?query=breaking+bad&limit=5
```

Response:

```json
[
  {
    "type": "show",
    "score": 100.0,
    "show": {
      "title": "Breaking Bad",
      "year": 2008,
      "ids": {...}
    }
  }
]
```

## Trending

### Get Trending Content

```http
GET /{type}/trending
```

Parameters:

- `type`: `shows` or `movies`
- Query params:
  - `page`: Page number
  - `limit`: Results per page (default: 10, max: 100)

Response:

```json
[
  {
    "watchers": 543,
    "show": {
      "title": "The Last of Us",
      "year": 2023,
      "ids": {...}
    }
  }
]
```

## Popular & Most Watched

### Get Popular

```http
GET /{type}/popular
```

### Get Most Watched

```http
GET /{type}/watched/{period}
```

Parameters:

- `period`: `weekly`, `monthly`, `yearly`, `all`

## User Lists

### Get User Lists

```http
GET /users/{username}/lists
Authorization: Bearer <access_token>
```

### Get List Items

```http
GET /users/{username}/lists/{list_id}/items/{type}
```

Parameters:

- `type`: `movies`, `shows`, `seasons`, `episodes`, `people`

## Rate Limits

- **Authenticated requests**: 1000 requests per 5 minutes per user
- **Unauthenticated**: 1000 requests per 5 minutes per IP

Headers returned:

- `X-Ratelimit-Limit`: Request limit
- `X-Ratelimit-Remaining`: Requests remaining
- `X-Ratelimit-Reset`: Unix timestamp when limit resets

## Error Responses

Common status codes:

- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Invalid or expired token
- `403`: Forbidden - Valid token but not allowed
- `404`: Not Found
- `409`: Conflict - Resource already exists
- `412`: Precondition Failed - Use application/json content type
- `420`: Account Limit Exceeded
- `422`: Unprocessable Entity - Validation errors
- `429`: Rate Limit Exceeded
- `500`: Server Error - Trakt having issues
- `502`: Bad Gateway - Trakt down or maintenance
- `503`: Service Unavailable - Overloaded or maintenance
- `504`: Gateway Timeout

## Useful Endpoints for OpenClaw

**Most Important:**

- `/sync/history/shows` - Watch history
- `/recommendations/shows` - Personalized recommendations
- `/sync/watchlist/shows` - User's watchlist
- `/shows/trending` - Trending shows
- `/search/show` - Search

**Future Enhancements:**

- `/sync/collection` - Add to collection
- `/sync/ratings` - Get/add ratings
- `/shows/{id}/related` - Related shows
- `/shows/{id}/next_episode` - Next episode info
