# Antigravity Internal API Reference

This skill impersonates the Google Cloud Code / Antigravity VS Code plugin to access internal sandbox endpoints.

## Endpoint Details

- **Base URL**: `https://daily-cloudcode-pa.sandbox.googleapis.com`
- **Path**: `/v1internal:generateContent`
- **Method**: `POST`

## Request Headers

The following headers are critical for successful impersonation:

- `User-Agent`: `antigravity/1.15.8 darwin/arm64` (Must match a valid plugin version)
- `X-Goog-Api-Client`: `google-cloud-sdk vscode_cloudshelleditor/0.1`
- `Authorization`: `Bearer <OAUTH_TOKEN>`

## Payload Structure

```json
{
  "project": "<PROJECT_ID>",
  "model": "gemini-3-pro-image",
  "request": {
    "contents": [
      {
        "role": "user",
        "parts": [{ "text": "<PROMPT>" }]
      }
    ],
    "generationConfig": {
      "responseModalities": ["IMAGE"]
    }
  },
  "requestType": "agent",
  "userAgent": "antigravity"
}
```

## Response Body

Returns a JSON object containing the image in `inlineData` (base64 encoded):

```json
{
  "response": {
    "candidates": [
      {
        "content": {
          "parts": [
            {
              "inlineData": {
                "mimeType": "image/png",
                "data": "<BASE64_DATA>"
              }
            }
          ]
        }
      }
    ]
  }
}
```
