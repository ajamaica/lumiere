---
name: facebook
description: OpenClaw skill for Facebook Graph API workflows focused on Pages posting, comments, and Page management using direct HTTPS requests.
---

# Facebook Graph API Skill (Advanced)

## Purpose

Provide a production-oriented guide for building Facebook Graph API workflows for Pages: publishing posts, managing comments, and operating Page content safely using direct HTTPS calls.

## Best fit

- You need Page posting and comment workflows.
- You want a professional command design and safe operational guidance.
- You prefer direct HTTP requests rather than SDKs.

## Not a fit

- You need advanced ads or marketing APIs.
- You must use complex browser-based OAuth flows.

## Quick orientation

- Read `references/graph-api-overview.md` for base URLs, versions, and request patterns.
- Read `references/page-posting.md` for Page publishing workflows and fields.
- Read `references/comments-moderation.md` for comment actions and moderation flows.
- Read `references/permissions-and-tokens.md` for access types and scope guidance.
- Read `references/webhooks.md` for subscriptions and verification steps.
- Read `references/http-request-templates.md` for concrete HTTP request payloads.

## Required inputs

- Facebook App ID and App Secret.
- Target Page ID(s).
- Token strategy: user token → Page access token.
- Required permissions and review status.

## Expected output

- A clear Page workflow plan, permissions checklist, and operational guardrails.

## Operational notes

- Use least-privilege permissions.
- Handle rate limits and retries.
- Log minimal identifiers only.

## Security notes

- Never log tokens or app secrets.
- Validate webhook signatures.
