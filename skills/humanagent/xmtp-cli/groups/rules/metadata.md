---
title: Update group metadata
impact: MEDIUM
tags: groups, metadata, name, image
---

## Update group metadata

Update a group’s name or image URL.

```bash
xmtp groups metadata --group-id <id> --name "New Name"
xmtp groups metadata --group-id <id> --image-url https://...
```

**Options:**

- `--group-id <id>` – Group ID (required)
- `--name <name>` – New group name
- `--image-url <url>` – New image URL for the group
