---
name: MockAPI - Instant REST API from JSON
description: Spin up a mock REST API server from JSON files in seconds. Full CRUD, filtering, pagination. Zero config. Free CLI tool for frontend developers.
---

# MockAPI

Create a REST API from a JSON file. Perfect for frontend development, testing, prototyping.

## Installation

```bash
npm install -g @lxgicstudios/mockapi
```

## Quick Start

```bash
# Create example db.json
npx @lxgicstudios/mockapi --init

# Start server
npx @lxgicstudios/mockapi db.json
```

## Data File Format

Create `db.json`:

```json
{
  "users": [
    { "id": 1, "name": "Alice", "email": "alice@example.com" },
    { "id": 2, "name": "Bob", "email": "bob@example.com" }
  ],
  "posts": [{ "id": 1, "title": "Hello", "body": "Content", "userId": 1 }]
}
```

## Generated Routes

For each resource (users, posts):

| Method | Route      | Description |
| ------ | ---------- | ----------- |
| GET    | /users     | List all    |
| GET    | /users/:id | Get by id   |
| POST   | /users     | Create      |
| PUT    | /users/:id | Replace     |
| PATCH  | /users/:id | Update      |
| DELETE | /users/:id | Delete      |

## Query Parameters

```bash
# Filter
GET /users?name=Alice

# Pagination
GET /users?_page=1&_limit=10

# Sort
GET /users?_sort=name&_order=asc
```

## Options

| Option           | Description            |
| ---------------- | ---------------------- |
| `-p, --port`     | Port (default: 3001)   |
| `-d, --delay`    | Response delay in ms   |
| `-w, --watch`    | Watch file for changes |
| `-r, --readonly` | Disable mutations      |
| `--init`         | Create example db.json |

## Common Use Cases

**Frontend development:**

```bash
npx @lxgicstudios/mockapi db.json --watch
```

**Demo with delay:**

```bash
npx @lxgicstudios/mockapi db.json --delay 500
```

**Read-only API:**

```bash
npx @lxgicstudios/mockapi db.json --readonly
```

## Features

- Full CRUD operations
- Automatic ID generation
- Filtering and pagination
- Sorting
- CORS enabled
- Hot reload with --watch
- Persistent changes to JSON

---

**Built by [LXGIC Studios](https://lxgicstudios.com)**

🔗 [GitHub](https://github.com/lxgicstudios/mockapi) · [Twitter](https://x.com/lxgicstudios)
