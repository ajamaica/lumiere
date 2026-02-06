# AIMLAPI LLM notes

## Default settings

- Base URL default: `https://api.aimlapi.com/v1`
- API key env var: `AIMLAPI_API_KEY`

## Payload guidance

- The script uses `/chat/completions` with `messages` payload.
- Use `--extra-json` for any provider-specific fields (reasoning, tools, response format, top_p, etc.).

## Troubleshooting

- 401/403: verify `AIMLAPI_API_KEY` and confirm model access.
- 404: confirm the model name and endpoint.
- 422: ensure JSON fields and values match the provider schema.
