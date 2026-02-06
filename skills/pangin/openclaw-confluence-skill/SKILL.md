---
name: confluence-v2
description: Full Confluence Cloud REST API v2 skill (pages, spaces, folders, databases, whiteboards, comments, labels, tasks, properties, etc.) with basic/OAuth auth, pagination, and migration from confluence-cli.
---

# Confluence Cloud REST API v2

Use this skill to call **Confluence Cloud REST API v2** endpoints directly. Supports **all v2 groups** (pages, spaces, folders, whiteboards, databases, embeds, comments, labels, properties, tasks, etc.).

## Quick Start

1. Configure credentials (one of):

- **Basic**: email + API token
- **OAuth**: access token

2. Call endpoints using scripts in `scripts/`.

## Config

Set these env vars (preferred) or store in a local config file:

```
CONFLUENCE_BASE_URL=https://pangin.atlassian.net/wiki
CONFLUENCE_AUTH_METHOD=basic   # basic | oauth
CONFLUENCE_EMAIL=chrono3412@gmail.com
CONFLUENCE_API_TOKEN=YOUR_TOKEN
# or for OAuth
# CONFLUENCE_OAUTH_TOKEN=YOUR_OAUTH_ACCESS_TOKEN

# Optional admin key header (Premium/Enterprise only)
# CONFLUENCE_ADMIN_KEY=true
```

**Base URL** is always `https://<site>.atlassian.net/wiki`.

## Core Helpers

- `scripts/client.js` — HTTP client wrapper, auth header, pagination
- `scripts/*` — endpoint groups (pages, spaces, folders, etc.)

## Example

```bash
# list everything
node scripts/spaces.js list --all
node scripts/pages.js list --all
node scripts/labels.js list --all

# get single items
node scripts/pages.js get 89522178
node scripts/folders.js direct-children 87457793

# ad-hoc call
node scripts/call.js GET /folders/87457793/direct-children
```

## Migration from confluence-cli

If `~/.confluence-cli/config.json` exists, map:

- `domain` → `CONFLUENCE_BASE_URL` (`https://{domain}/wiki`)
- `email` → `CONFLUENCE_EMAIL`
- `token` → `CONFLUENCE_API_TOKEN`

## References

- OpenAPI spec: `refs/openapi-v2.v3.json`
- Endpoints list: `refs/endpoints.md`
- Scopes: `refs/scopes.md`
- Tests: `refs/tests.md`
- Usage tips: `refs/usage.md`
