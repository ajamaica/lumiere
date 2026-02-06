# Webhooks

## 1) Verification (GET)

- Expect `hub.mode`, `hub.verify_token`, `hub.challenge`.
- Respond with `hub.challenge` to confirm.

## 2) Signature validation

- Validate `X-Hub-Signature-256` with your app secret.

## 3) Events

- `messages`, `messaging_postbacks`, `messaging_optins`, `message_reads`.

## 4) Reliability

- Acknowledge quickly, process async.
- Keep handlers idempotent.
