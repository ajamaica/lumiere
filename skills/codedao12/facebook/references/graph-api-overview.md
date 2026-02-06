# Facebook Graph API Overview

## 1) Base URL and versioning

- Base: `https://graph.facebook.com`
- Versioned: `https://graph.facebook.com/vXX.X`
- Prefer pinned versions for stability.

## 2) Request style

- HTTP GET for reads.
- HTTP POST for creates/updates.
- HTTP DELETE for deletes (where supported).
- Access token in query (`access_token`) or `Authorization: Bearer` header.

## 3) Page publishing flow (high level)

- Obtain user access token with required scopes.
- Exchange or extend token as needed.
- Retrieve Page access token via `/me/accounts`.
- Use Page token to publish or manage Page content.

## 4) Common objects

- `Page`, `Post`, `Comment`, `User`.

## 5) Common error handling

- `4xx` for permissions/validation.
- `5xx` for transient errors.
- Back off on rate limits and retry safely.
