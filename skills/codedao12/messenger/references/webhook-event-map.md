# Webhook Event Map

## Core events

- `messages`: inbound user messages.
- `messaging_postbacks`: button/postback payloads.
- `messaging_optins`: opt-in events.
- `message_reads`: read receipts.
- `message_deliveries`: delivery confirmations.

## Routing recommendations

- Handle postbacks before plain text.
- De-duplicate using message IDs.
- Keep handlers idempotent for retries.
