# Best Practices (SendGrid)

## Required

- **Verified sender/domain**: Ensure `from` uses a verified sender identity.
- **Use both text + HTML**: Improves deliverability and accessibility.
- **Handle errors correctly**:
  - **400/401/403/422**: Fix request or credentials; do not retry.
  - **429**: Rate limit; retry with exponential backoff.
  - **5xx**: Retry with exponential backoff.

## Attachments

- Base64-encode content.
- Include `type` (MIME) when known.
- Keep payload sizes reasonable; avoid large attachments unless necessary.
- SendGrid limits: max 30 MB total payload; keep attachments under that cap.

## Rate Limits

- **429**: rate limited — retry with exponential backoff.
- **5xx**: server error — retry with exponential backoff.
- **400/401/403/422**: fix request or credentials; do **not** retry.

## Idempotency

SendGrid doesn’t support idempotency keys for Mail Send. If you need idempotency:
- Track your own message IDs and ensure you don’t send duplicates on retry.
- Persist send attempts and outcomes in your DB.

## Testing

- Avoid fake addresses at real providers (bounces hurt reputation).
- Prefer sending to addresses you control (e.g., `vince@winkintel.com`).
