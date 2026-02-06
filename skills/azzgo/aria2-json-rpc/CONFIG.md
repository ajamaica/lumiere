# Configuration Guide

This document provides detailed information about configuring the aria2-json-rpc skill.

## Configuration Fields

| Field     | Type        | Default       | Description                                                    |
| --------- | ----------- | ------------- | -------------------------------------------------------------- |
| `host`    | string      | `"localhost"` | Hostname or IP address of the aria2 RPC server                 |
| `port`    | integer     | `6800`        | Port number (1-65535)                                          |
| `path`    | string/null | `null`        | Optional URL path (e.g., `"/jsonrpc"`). Use `null` for no path |
| `secret`  | string/null | `null`        | RPC secret token. Use `null` if aria2 has no secret            |
| `secure`  | boolean     | `false`       | Use HTTPS instead of HTTP                                      |
| `timeout` | integer     | `30000`       | Request timeout in milliseconds                                |

## Configuration Examples

### Local Development (Default)

```json
{
  "host": "localhost",
  "port": 6800,
  "path": null,
  "secret": null,
  "secure": false,
  "timeout": 30000
}
```

### Remote Server with Authentication

```json
{
  "host": "aria2.example.com",
  "port": 6800,
  "path": "/jsonrpc",
  "secret": "your-secret-token",
  "secure": true,
  "timeout": 30000
}
```

### Reverse Proxy Setup

```json
{
  "host": "example.com",
  "port": 443,
  "path": "/aria2/jsonrpc",
  "secret": "proxy-secret",
  "secure": true,
  "timeout": 30000
}
```

### Docker Container

```json
{
  "host": "172.17.0.2",
  "port": 6800,
  "path": null,
  "secret": "docker-secret",
  "secure": false,
  "timeout": 30000
}
```

## Configuration Methods

### Method 1: User Config (Recommended)

Location: `~/.config/aria2-skill/config.json`

**Advantages:**

- ✅ Survives skill updates via `npx skills add`
- ✅ Works across all projects
- ✅ Perfect for personal default settings

**Setup:**

```bash
python3 scripts/config_loader.py init --user
# Edit ~/.config/aria2-skill/config.json
```

### Method 2: Skill Directory Config

Location: `skills/aria2-json-rpc/config.json`

**Advantages:**

- ✅ Project-specific configuration
- ✅ Perfect for testing different environments
- ✅ Can be version controlled (if no secrets)

**Disadvantages:**

- ⚠️ Lost when running `npx skills add` to update

**Setup:**

```bash
python3 scripts/config_loader.py init --local
# Edit skills/aria2-json-rpc/config.json
```

### Method 3: Environment Variables

Set environment variables with `ARIA2_RPC_` prefix:

```bash
export ARIA2_RPC_HOST="aria2.example.com"
export ARIA2_RPC_PORT=6800
export ARIA2_RPC_PATH="/jsonrpc"
export ARIA2_RPC_SECRET="your-token"
export ARIA2_RPC_SECURE="true"
export ARIA2_RPC_TIMEOUT=30000
```

**Advantages:**

- ✅ Highest priority (overrides file configs)
- ✅ Perfect for CI/CD pipelines
- ✅ No files to manage

**Type Conversions:**

- `ARIA2_RPC_PORT`: Converted to integer
- `ARIA2_RPC_TIMEOUT`: Converted to integer
- `ARIA2_RPC_SECURE`: `"true"`, `"1"`, or `"yes"` → `true`; everything else → `false`
- `ARIA2_RPC_PATH`: Auto-prefixed with `/` if missing

## Configuration Priority

When multiple configuration sources exist, they are applied in this order (highest to lowest):

1. **Environment Variables** (highest priority)
2. **Skill Directory Config** (`skills/aria2-json-rpc/config.json`)
3. **User Config Directory** (`~/.config/aria2-skill/config.json`)
4. **Defaults** (lowest priority)

**Example:**

```bash
# User config has host="localhost"
# Skill config has host="test-server"
# Environment variable ARIA2_RPC_HOST="prod-server"

# Result: Uses "prod-server" (env var wins)
```

## Verifying Configuration

### Show Current Config

```bash
python3 scripts/config_loader.py show
```

Output shows:

- Configuration source (which file/defaults)
- Whether environment variables are active
- All active configuration values
- Generated endpoint URL

### Test Connection

```bash
python3 scripts/config_loader.py test
```

Tests the connection to aria2 RPC and reports success/failure with diagnostics.

## Troubleshooting

### Connection Failed

**Check configuration source:**

```bash
python3 scripts/config_loader.py show
```

**Common issues:**

1. aria2 daemon not running
2. Wrong host/port
3. Firewall blocking connection
4. Wrong RPC secret
5. Wrong path (should be `/jsonrpc` or `null`)

### Configuration Not Loading

**Priority check:**

- Environment variables override everything
- Skill directory config overrides user config
- Check which file exists:
  ```bash
  ls -la skills/aria2-json-rpc/config.json
  ls -la ~/.config/aria2-skill/config.json
  ```

### Invalid JSON

If you get JSON parse errors:

- Remove trailing commas
- Use `null` instead of `None`
- Use double quotes, not single quotes
- Validate JSON: https://jsonlint.com/

## Security Best Practices

1. **Never commit secrets:**

   ```bash
   # Add to .gitignore
   skills/aria2-json-rpc/config.json
   ```

2. **Use environment variables in CI/CD:**

   ```yaml
   # GitHub Actions example
   env:
     ARIA2_RPC_SECRET: ${{ secrets.ARIA2_SECRET }}
   ```

3. **File permissions:**

   ```bash
   chmod 600 ~/.config/aria2-skill/config.json
   ```

4. **Use HTTPS for remote connections:**
   ```json
   {
     "secure": true
   }
   ```
