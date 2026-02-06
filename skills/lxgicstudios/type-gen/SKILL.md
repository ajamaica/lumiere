---
name: JSON to TypeScript - Interface Generator
description: Generate TypeScript interfaces from JSON data or API responses. Auto-type your APIs instantly. Free CLI tool for TypeScript developers.
---

# JSON to TypeScript

Generate TypeScript interfaces from JSON. Stop writing types by hand.

## Installation

```bash
npm install -g @lxgicstudios/json-to-ts
```

## Commands

### From File

```bash
npx @lxgicstudios/json-to-ts data.json
npx @lxgicstudios/json-to-ts response.json -n User
```

### From URL

```bash
npx @lxgicstudios/json-to-ts https://api.example.com/users -n User
```

### From Pipe

```bash
curl https://api.example.com/data | npx @lxgicstudios/json-to-ts -n ApiResponse
```

### Output to File

```bash
npx @lxgicstudios/json-to-ts api.json -o src/types/api.ts
```

## Example

Input JSON:

```json
{
  "id": 1,
  "name": "John",
  "email": "john@example.com",
  "address": { "city": "NYC" },
  "tags": ["dev", "ts"]
}
```

Output:

```typescript
export interface Address {
  city: string
}

export interface Root {
  id: number
  name: string
  email: string
  address: Address
  tags: string[]
}
```

## Options

| Option         | Description                         |
| -------------- | ----------------------------------- |
| `-n, --name`   | Root interface name (default: Root) |
| `-o, --output` | Write to file                       |
| `-t, --type`   | Use `type` instead of `interface`   |
| `--optional`   | Make all properties optional        |
| `--no-export`  | Don't add export keyword            |

## Features

- Nested objects become separate interfaces
- Arrays properly typed
- Mixed arrays become union types
- Fetches directly from URLs
- Handles empty arrays as `unknown[]`

## Common Use Cases

**Type an API response:**

```bash
curl https://api.github.com/users/octocat | npx @lxgicstudios/json-to-ts -n GitHubUser
```

**Generate types for project:**

```bash
npx @lxgicstudios/json-to-ts sample-response.json -o src/types/api.ts -n ApiResponse
```

---

**Built by [LXGIC Studios](https://lxgicstudios.com)**

🔗 [GitHub](https://github.com/lxgicstudios/json-to-ts) · [Twitter](https://x.com/lxgicstudios)
