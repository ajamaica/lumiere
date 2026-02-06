---
name: Env Typegen - TypeScript Types from .env
description: Generate TypeScript types from .env files with smart inference. Type-safe environment variables. Optional Zod schema. Free CLI tool.
---

# Env Typegen

Generate TypeScript types from your .env file. Smart type inference for numbers, booleans, URLs.

## Installation

```bash
npm install -g @lxgicstudios/env-typegen
```

## Commands

### Generate Types

```bash
npx @lxgicstudios/env-typegen
npx @lxgicstudios/env-typegen .env.local
npx @lxgicstudios/env-typegen -o src/types/env.d.ts
```

### With Zod Schema

```bash
npx @lxgicstudios/env-typegen --zod
```

## Example

Input `.env`:

```env
# Database
DATABASE_URL=postgresql://localhost:5432/db
DB_POOL_SIZE=10

# Server
PORT=3000
DEBUG=true

# API
API_KEY=sk_live_abc123
```

Output:

```typescript
export interface Env {
  /** Database */
  DATABASE_URL: string
  DB_POOL_SIZE: number
  /** Server */
  PORT: number
  DEBUG: boolean
  /** API */
  API_KEY: string
}

export function getEnv(): Env {
  return {
    DATABASE_URL: process.env.DATABASE_URL || '',
    DB_POOL_SIZE: Number(process.env.DB_POOL_SIZE),
    PORT: Number(process.env.PORT),
    DEBUG: ['true', '1', 'yes'].includes(process.env.DEBUG?.toLowerCase() || ''),
    API_KEY: process.env.API_KEY || '',
  }
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string
      DB_POOL_SIZE: string
      PORT: string
      DEBUG: string
      API_KEY: string
    }
  }
}
```

## Type Inference

| Pattern               | Type           |
| --------------------- | -------------- |
| `PORT=3000`           | number         |
| `DEBUG=true`          | boolean        |
| `API_URL=https://...` | string (URL)   |
| `EMAIL=a@b.com`       | string (email) |
| Everything else       | string         |

## Options

| Option         | Description                     |
| -------------- | ------------------------------- |
| `-i, --input`  | Input file (default: .env)      |
| `-o, --output` | Output file (default: env.d.ts) |
| `--zod`        | Generate Zod schema too         |
| `--name`       | Interface name (default: Env)   |

## Common Use Cases

**Generate for project:**

```bash
npx @lxgicstudios/env-typegen -o src/types/env.d.ts
```

**With runtime validation:**

```bash
npx @lxgicstudios/env-typegen --zod -o src/env.ts
```

---

**Built by [LXGIC Studios](https://lxgicstudios.com)**

🔗 [GitHub](https://github.com/lxgicstudios/env-typegen) · [Twitter](https://x.com/lxgicstudios)
