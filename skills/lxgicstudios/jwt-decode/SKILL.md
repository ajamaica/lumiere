---
name: JWT Decode - Token Inspector CLI
description: Decode and inspect JWT tokens from command line. Check expiration, extract claims, debug auth. No more jwt.io tabs. Free CLI tool.
---

# JWT Decode

Decode JWTs from the terminal. See what's inside, check if expired.

## Installation

```bash
npm install -g @lxgicstudios/jwt-decode
```

## Commands

### Decode Token

```bash
npx @lxgicstudios/jwt-decode eyJhbGciOiJIUzI1NiIs...

# Works with Bearer prefix
npx @lxgicstudios/jwt-decode "Bearer eyJhbGci..."
```

### From Environment Variable

```bash
echo $AUTH_TOKEN | npx @lxgicstudios/jwt-decode
```

### From File

```bash
npx @lxgicstudios/jwt-decode -f token.txt
```

### Check if Expired

```bash
npx @lxgicstudios/jwt-decode --check $TOKEN && echo "Valid" || echo "Expired"
```

### Extract Specific Claim

```bash
npx @lxgicstudios/jwt-decode -c sub $TOKEN
npx @lxgicstudios/jwt-decode -c email $TOKEN
```

## Example Output

```
Header
──────
  alg: "HS256"
  typ: "JWT"

Payload
───────
  sub: "1234567890"
  name: "John Doe"
  email: "john@example.com"
  iat: 1706547200 (2024-01-29T16:00:00.000Z)
  exp: 1706633600 (2024-01-30T16:00:00.000Z)

Status
──────
  Valid - expires in 23 hours
```

## Options

| Option        | Description            |
| ------------- | ---------------------- |
| `-f, --file`  | Read from file         |
| `-c, --claim` | Extract specific claim |
| `--header`    | Show only header       |
| `--payload`   | Show only payload      |
| `--json`      | JSON output            |
| `--check`     | Exit 1 if expired      |

## Common Use Cases

**Debug auth token:**

```bash
npx @lxgicstudios/jwt-decode $AUTH_TOKEN
```

**Get user ID from token:**

```bash
npx @lxgicstudios/jwt-decode -c sub $TOKEN
```

**Use in scripts:**

```bash
if npx @lxgicstudios/jwt-decode --check $TOKEN 2>/dev/null; then
  echo "Token valid"
else
  echo "Token expired, refreshing..."
fi
```

## Features

- Colored, readable output
- Automatic Bearer prefix handling
- Human-readable expiration times
- Timestamp conversion
- Script-friendly exit codes
- JSON output mode

---

**Built by [LXGIC Studios](https://lxgicstudios.com)**

🔗 [GitHub](https://github.com/lxgicstudios/jwt-decode) · [Twitter](https://x.com/lxgicstudios)
