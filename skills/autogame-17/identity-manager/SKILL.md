---
name: identity-manager
description: strictly manages user identity mappings (Feishu OpenID <-> Name/Role). Use this to `lookup` a user by ID before replying, or `register` new users to the database. Prevents hallucinating user identities.
---

# Identity Manager

A dedicated tool to store and retrieve user identities.

## Usage

### 1. Lookup User (By ID)

Check who sent a message.

```bash
node skills/identity-manager/index.js lookup "ou_cdc63fe05e88c580aedead04d851fc04"
# Output: { "name": "张昊阳", "role": "Master", "alias": "zhy" }
```

### 2. Register/Update User

Save a new user or update existing info.

```bash
node skills/identity-manager/index.js register \
  --id "ou_..." \
  --name "李四" \
  --role "Guest" \
  --alias "Lisi"
```

### 3. List All

```bash
node skills/identity-manager/index.js list
```

### 4. Auto-Scan (Global Discovery)

Scans all joined group chats and registers all members automatically.

```bash
node skills/identity-manager/auto_scan.js
```

## Data Storage

Data is persisted in `memory/user_registry.json`.
