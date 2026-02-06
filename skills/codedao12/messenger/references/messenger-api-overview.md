# Messenger Platform Overview

## 1) Base URL and request style

- Base: `https://graph.facebook.com`
- Use a pinned version: `/vXX.X`.
- Send API via Page access token.

## 2) Core objects

- `Page`, `User`, `Conversation`, `Message`.
- Webhook events for messaging.

## 3) High-level flow

- Obtain Page access token.
- Configure webhook subscription.
- Receive messages, reply via Send API.

## 4) Common errors

- `4xx` for permissions/validation.
- `5xx` for transient errors.
