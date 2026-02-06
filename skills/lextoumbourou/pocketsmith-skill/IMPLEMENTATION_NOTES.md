# PocketSmith Skill Implementation Notes

## Overview

CLI tool for accessing PocketSmith financial data via the API. Based on the sharesight-skill architecture.

**API Base URL:** `https://api.pocketsmith.com/v2`
**Auth Method:** `X-Developer-Key` header (simpler than OAuth)
**Docs:** https://developers.pocketsmith.com/reference

## Environment Variables

| Variable                    | Required | Description                                  |
| --------------------------- | -------- | -------------------------------------------- |
| `POCKETSMITH_DEVELOPER_KEY` | Yes      | API key from PocketSmith Settings > Security |
| `POCKETSMITH_ALLOW_WRITES`  | No       | Set to `true` to enable create/update/delete |

## Implementation Progress

### Completed

- [x] **Core Infrastructure**
  - `auth.py` - Developer key management
  - `client.py` - HTTP client with `X-Developer-Key` header
  - `api.py` - API wrapper
  - `cli.py` - argparse CLI with write protection

- [x] **User**
  - `GET /me` - Get authenticated user

- [x] **Transactions**
  - `GET /transactions/{id}` - Get single transaction
  - `PUT /transactions/{id}` - Update transaction
  - `DELETE /transactions/{id}` - Delete transaction
  - `GET /users/{id}/transactions` - List by user
  - `GET /accounts/{id}/transactions` - List by account
  - `GET /categories/{id}/transactions` - List by categories
  - `GET /transaction_accounts/{id}/transactions` - List by transaction account
  - `POST /transaction_accounts/{id}/transactions` - Create transaction

- [x] **Categories**
  - `GET /categories/{id}` - Get category
  - `GET /users/{id}/categories` - List categories
  - `POST /users/{id}/categories` - Create category
  - `PUT /categories/{id}` - Update category
  - `DELETE /categories/{id}` - Delete category

- [x] **Labels**
  - `GET /users/{id}/labels` - List labels

- [x] **Budgeting**
  - `GET /users/{id}/budget` - List budget (per-category analysis)
  - `GET /users/{id}/budget_summary` - Get budget summary
  - `GET /users/{id}/trend_analysis` - Get trend analysis
  - `DELETE /users/{id}/forecast_cache` - Refresh forecast cache

### To Do

- [ ] **Category Rules**
  - `GET /users/{id}/category_rules` - List category rules
  - `GET /category_rules/{id}` - Get category rule
  - `POST /categories/{id}/category_rules` - Create category rule
  - `PUT /category_rules/{id}` - Update category rule
  - `DELETE /category_rules/{id}` - Delete category rule

- [ ] **Events**
  - `GET /users/{id}/events` - List events
  - `GET /events/{id}` - Get event
  - `POST /users/{id}/events` - Create event
  - `PUT /events/{id}` - Update event
  - `DELETE /events/{id}` - Delete event

- [ ] **Institutions**
  - `GET /users/{id}/institutions` - List institutions
  - `GET /institutions/{id}` - Get institution
  - `POST /users/{id}/institutions` - Create institution
  - `PUT /institutions/{id}` - Update institution
  - `DELETE /institutions/{id}` - Delete institution

- [ ] **Accounts**
  - `GET /users/{id}/accounts` - List accounts
  - `GET /accounts/{id}` - Get account
  - `POST /users/{id}/accounts` - Create account
  - `PUT /accounts/{id}` - Update account
  - `DELETE /accounts/{id}` - Delete account

- [ ] **Transaction Accounts**
  - `GET /users/{id}/transaction_accounts` - List transaction accounts
  - `GET /transaction_accounts/{id}` - Get transaction account
  - `PUT /transaction_accounts/{id}` - Update transaction account

- [ ] **Attachments**
  - `GET /users/{id}/attachments` - List attachments
  - `GET /attachments/{id}` - Get attachment
  - `POST /transactions/{id}/attachments` - Create attachment
  - `PUT /attachments/{id}` - Update attachment
  - `DELETE /attachments/{id}` - Delete attachment

## Architecture

```
src/pocketsmith/
├── __init__.py      # Package version
├── __main__.py      # Entry point for python -m pocketsmith
├── auth.py          # Developer key management
├── client.py        # HTTP client with auth headers
├── api.py           # High-level API methods
└── cli.py           # argparse CLI interface
```

### Write Protection

Write operations (create, update, delete) are disabled by default. The `@requires_write_permission` decorator checks for `POCKETSMITH_ALLOW_WRITES=true` before executing.

```python
@requires_write_permission
def cmd_transactions_create(args):
    ...
```

### CLI Command Pattern

Commands follow the pattern: `pocketsmith <resource> <action> [args]`

```bash
pocketsmith transactions get 123
pocketsmith transactions list-by-user 456 --start-date 2024-01-01
pocketsmith transactions create 789 --payee "Store" --amount -50.00 --date 2024-01-15
```

## Testing

```bash
# Install
uv sync

# Run CLI
uv run pocketsmith --help
uv run pocketsmith transactions --help
uv run pocketsmith categories --help

# Check auth
uv run pocketsmith auth status

# Test write protection (should fail without POCKETSMITH_ALLOW_WRITES=true)
uv run pocketsmith transactions create 123 --payee "Test" --amount -10 --date 2024-01-01
uv run pocketsmith categories create 123 --title "Test Category"
```
