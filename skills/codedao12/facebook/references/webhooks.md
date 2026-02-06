# Webhooks (Pages)

## 1) Subscribe to webhook

- Use the App dashboard to subscribe the Page.
- Configure a callback URL and verify token.

## 2) Verification (GET)

- Expect `hub.mode`, `hub.verify_token`, `hub.challenge`.
- Respond with `hub.challenge` on success.

## 3) Signature validation

- Validate `X-Hub-Signature-256` with your app secret.

## 4) Events to consider

- `feed`, `mentions`, `comments` (depending on needs)

## 5) Reliability

- Acknowledge quickly, then process async.
- Keep handlers idempotent.
