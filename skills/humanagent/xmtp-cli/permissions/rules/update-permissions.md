---
title: Update group permissions
impact: MEDIUM
tags: permissions, update, features, admin
---

## Update group permissions

Update which features are allowed and who can use them.

```bash
xmtp permissions update-permissions --group-id <id> --features update-metadata --permissions admin-only
```

**Options:**

- `--group-id <id>` – Group ID (required)
- `--features <features>` – Comma-separated features to update (e.g. `update-metadata`)
- `--permissions <type>` – Permission type: `everyone`, `disabled`, `admin-only`, `super-admin-only`

**Examples:**

```bash
xmtp permissions update-permissions --group-id <id> --features update-metadata --permissions admin-only
xmtp permissions update-permissions --group-id <id> --features add-members,remove-members --permissions admin-only
```
