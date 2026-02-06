---
name: messenger
description: OpenClaw skill for Facebook Messenger Platform workflows, including messaging, webhooks, and Page inbox operations using direct HTTPS requests.
---

# Facebook Messenger API Skill (Advanced)

## Purpose

Provide a production-oriented guide for Messenger Platform workflows: sending messages, handling webhooks, and managing Page messaging using direct HTTPS calls.

## Best fit

- You need bot-style messaging in Facebook Messenger.
- You want clean webhook handling and message UX.
- You prefer direct HTTP requests rather than SDKs.

## Not a fit

- You need advanced Graph API Ads or Marketing workflows.
- You must use complex browser-based OAuth flows.

## Quick orientation

- Read `references/messenger-api-overview.md` for base URLs and core object map.
- Read `references/webhooks.md` for verification and signature validation.
- Read `references/messaging.md` for Send API fields and message types.
- Read `references/permissions-and-tokens.md` for token flow and required permissions.
- Read `references/request-templates.md` for concrete HTTP payloads.
- Read `references/conversation-patterns.md` for UX flows (get started, menu, fallback).
- Read `references/webhook-event-map.md` for event types and routing.

## Required inputs

- Facebook App ID and App Secret.
- Page ID and Page access token.
- Webhook URL and verify token.
- Message UX and allowed interactions.

## Expected output

- A clear messaging workflow plan, permissions checklist, and operational guardrails.

## Operational notes

- Validate signatures on all webhook events.
- Keep replies short and acknowledge quickly.
- Handle rate limits and retries with backoff.

## Security notes

- Never log tokens or app secrets.
- Use least-privilege permissions.
