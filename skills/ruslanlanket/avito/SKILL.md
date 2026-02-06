---
name: avito
description: Manage Avito.ru account, items, and messenger via API. Use for listing items, checking balance, reading chats, and getting account info.
---

# Avito

This skill provides tools to interact with the Avito.ru API.

## Requirements

- `requests` library for Python.
- Avito Client ID and Client Secret.

## Setup

Set your credentials in your environment or provide them when prompted.

## Features

### Authentication

Get an access token using your client credentials.

```bash
python3 scripts/auth.py <client_id> <client_secret>
```

### Account Info

Get information about your account, including your `user_id`.

```bash
python3 scripts/get_self.py <token>
```

### Balance

Check your account balance.

```bash
python3 scripts/get_balance.py <token> <user_id>
```

### Items Management

List your current advertisements.

```bash
python3 scripts/list_items.py <token>
```

### Messenger

List chats in your account.

```bash
python3 scripts/list_chats.py <token> <user_id>
```

_Note: Messenger API access may require a specific Avito subscription._

## TODO

- Implement item creation (POST /items).
- Implement item status updates (editing, deleting).
- Implement webhook registration.
- Implement messenger message sending and retrieval.
