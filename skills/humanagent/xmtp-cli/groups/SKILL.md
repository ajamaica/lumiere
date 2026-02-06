---
name: xmtp-cli-groups
description: Create and manage XMTP groups and DMs from the CLI. Use when creating a DM or group, or updating group metadata.
license: MIT
metadata:
  author: xmtp
  version: '1.0.0'
---

# CLI groups

Create DMs and groups, and update group metadata with the XMTP CLI.

## When to apply

- Creating a DM with a target address
- Creating a group with member addresses or inbox IDs
- Updating group name or image URL

## Rules

- `create-dm-group` – `groups create` (DM vs group, member-addresses, member-inbox-ids)
- `metadata` – `groups metadata` (group-id, name, image-url)

## Quick start

```bash
# Create DM
xmtp groups create --target 0x123...

# Create group
xmtp groups create --type group --name "Team" --member-addresses "0x123...,0x456..."
```

Read `rules/create-dm-group.md` and `rules/metadata.md` for details.
