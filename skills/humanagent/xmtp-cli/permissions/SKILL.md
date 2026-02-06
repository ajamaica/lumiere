---
name: xmtp-cli-permissions
description: Manage group permissions from the XMTP CLI. Use when listing, inspecting, or updating group permissions.
license: MIT
metadata:
  author: xmtp
  version: '1.0.0'
---

# CLI permissions

List members and permissions, get group info, or update group permissions.

## When to apply

- Listing members and permissions for a group
- Getting detailed group info
- Updating permission rules (e.g. update-metadata, admin-only)

## Rules

- `list-info` – `permissions list` and `permissions info` with group-id
- `update-permissions` – `permissions update-permissions` with features and permissions

## Quick start

```bash
xmtp permissions list --group-id <id>
xmtp permissions info --group-id <id>
xmtp permissions update-permissions --group-id <id> --features update-metadata --permissions admin-only
```

Read `rules/list-info.md` and `rules/update-permissions.md` for details.
