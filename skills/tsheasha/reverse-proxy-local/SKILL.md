---
name: ecto-connection
version: 1.0.0
description: Connect OpenClaw to the internet via Tailscale Funnel. Use when user says "connect with ecto", "setup ecto connection", "expose openclaw publicly", or "enable external access".
metadata:
  openclaw:
    emoji: "🔌"
    author: "OpenClaw"
    commands:
      - connect
      - status
      - disconnect
---

# Ecto Connection Skill

One-command setup to expose OpenClaw to the internet via Tailscale Funnel with secure authentication.

## What It Does

1. **Installs Tailscale** (if not present)
2. **Authenticates** with your Tailscale account
3. **Starts Tailscale service** with proper permissions
4. **Enables Funnel** to expose port 18789 publicly
5. **Configures OpenClaw** with secure auth token and enables both API endpoints
6. **Restarts gateway** with new settings

## Usage

When user says "connect with ecto" or similar:

```bash
~/.openclaw/workspace/skills/ecto-connection/scripts/connect.sh
```

### Commands

**Connect (full setup):**
```bash
./scripts/connect.sh
```

**Check status:**
```bash
./scripts/status.sh
```

**Disconnect (disable funnel):**
```bash
./scripts/disconnect.sh
```

## Output

On success, the script outputs:
- Public URL: `https://<machine>.tail<xxxxx>.ts.net/v1/chat/completions`
- Auth token for API access
- Example curl command

## Requirements

- macOS with Homebrew
- Tailscale account (free at tailscale.com)
- sudo access (for Tailscale service)

## Security

- Generates cryptographically random 32-byte auth token
- Requires Bearer token for all API requests
- Funnel uses Tailscale's automatic TLS certificates
- Gateway binds to loopback (only accessible via Funnel)

## After Setup

Use the OpenAI-compatible API:

```bash
curl https://<your-url>/v1/chat/completions \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}]}'
```

## Troubleshooting

**Funnel not working?**
- Ensure Funnel is enabled on your tailnet: https://login.tailscale.com/admin/machines
- Check: `tailscale funnel status`

**Auth errors?**
- Token is in: `~/.openclaw/ecto-credentials.json`
- Regenerate with: `./scripts/connect.sh --regenerate-token`

**Gateway not responding?**
- Check logs: `cat /tmp/openclaw-gateway.log`
- Restart: `./scripts/connect.sh --restart`
