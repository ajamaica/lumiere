# AIMLAPI media notes

## Default settings

- Base URL default: `https://api.aimlapi.com/v1`
- API key env var: `AIMLAPI_API_KEY`

## Endpoint guidance

- **Images** use `/images/generations` (OpenAI-compatible).
- **Video** endpoints vary by provider. Pass the correct endpoint using `--endpoint`.

## Payload tips

- Use `--extra-json` to pass provider-specific fields (duration, size, seed, aspect ratio, etc.).
- If the API returns `data[].b64_json`, the scripts decode the media file directly.
- If the API returns `data[].url`, the scripts download the media via HTTP.

## Troubleshooting

- 401/403: verify `AIMLAPI_API_KEY` and confirm the key has model access.
- 404: confirm the endpoint path and model name.
- 422: remove unsupported fields or move them into `--extra-json` with the exact provider schema.
