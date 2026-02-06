---
title: Create DM or group
impact: HIGH
tags: groups, create, dm, group, members
---

## Create DM or group

**Create a DM:**

```bash
xmtp groups create --target <address>
```

`--target` is required for a DM.

**Create a group:**

```bash
xmtp groups create --type group --name "Team" --member-addresses "0x123...,0x456..."
xmtp groups create --type group --name "Team" --member-inbox-ids "inbox1...,inbox2..."
xmtp groups create --type group --name "Team" --member-addresses "0x123..." --member-inbox-ids "inbox1..."
```

**Options:**

- `--target <address>` – Target address (required for DM)
- `--type <type>` – `dm` or `group` (default: `dm`)
- `--name <name>` – Group name
- `--member-addresses <addresses>` – Comma-separated Ethereum addresses
- `--member-inbox-ids <inboxIds>` – Comma-separated inbox IDs

You can use both `--member-addresses` and `--member-inbox-ids` in the same command.
