# Google Antigravity Quota API Reference

## Endpoints

- **Load Project:** `POST https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:loadCodeAssist`
  - Used to discover the `cloudaicompanionProject` ID.
- **Fetch Models:** `POST https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:fetchAvailableModels`
  - Main endpoint for quota information.
  - Requires `project` ID in the JSON body.

## Auth

- Header: `Authorization: Bearer <OAuth_Access_Token>`
- OAuth Scopes: `https://www.googleapis.com/auth/cloud-platform`, `https://www.googleapis.com/auth/userinfo.email`

## Required Headers

- `Content-Type: application/json`
- `User-Agent: antigravity/<version> <os>/<arch>`
  - Example: `antigravity/1.16.5 macos/arm64`

## Response Format

```json
{
  "models": {
    "models/gemini-3-flash": {
      "quotaInfo": {
        "remainingFraction": 0.6,
        "resetTime": "2026-02-05T11:05:59Z"
      }
    }
  }
}
```
