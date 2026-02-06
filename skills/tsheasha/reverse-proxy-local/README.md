# Ecto Connection Skill

🔌 One-command setup to expose OpenClaw to the internet via Tailscale Funnel.

## Quick Start

```bash
~/.openclaw/workspace/skills/ecto-connection/scripts/connect.sh
```

That's it! The script will:
1. Check/install Homebrew (if needed)
2. Install Tailscale (if needed)
3. Start the Tailscale service
4. Prompt you to log in to Tailscale
5. Enable Funnel to expose port 18789
6. Generate a secure auth password
7. Configure OpenClaw gateway (password auth + funnel mode)
8. Restart the gateway

## Commands

| Command | Description |
|---------|-------------|
| `./scripts/connect.sh` | Full setup (install, login, configure) |
| `./scripts/status.sh` | Check connection status |
| `./scripts/disconnect.sh` | Disable public access |
| `./scripts/package-for-friend.sh` | **Create shareable package for friends** |
| `./scripts/test-connection.sh` | Test API connection (for you or friends) |
| `./scripts/connect.sh --restart` | Just restart gateway |
| `./scripts/connect.sh --regenerate-token` | Generate new auth token |

## After Setup

Your credentials are saved to `~/.openclaw/ecto-credentials.json`:

```json
{
  "token": "your-secure-password",
  "url": "https://your-machine.tailxxxxx.ts.net",
  "port": 18789,
  "created": "2026-02-01T12:00:00Z"
}
```

**Share this file with anyone you want to give API access to your OpenClaw instance.**

## API Usage

**Chat Completions:**
```bash
curl https://your-machine.tailxxxxx.ts.net/v1/chat/completions \
  -H "Authorization: Bearer YOUR_PASSWORD_FROM_CREDENTIALS" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}]}'
```

## Sharing Access with Friends

**Easiest way - Create a package:**

```bash
./scripts/package-for-friend.sh
```

This creates a folder with:
- Credentials file
- Test script
- Instructions for your friend

Then share the folder (or zip it):
```bash
zip -r ecto-connection.zip ecto-connection-package
```

**Manual way:**

1. Run the setup script (if you haven't already)
2. Share `~/.openclaw/ecto-credentials.json` with them
3. Share `scripts/test-connection.sh` for easy testing

**For your friend (test the connection):**

```bash
./test-connection.sh ecto-credentials.json
```

**For your friend (manual way):**

```bash
# Read credentials
URL=$(jq -r '.url' ecto-credentials.json)
TOKEN=$(jq -r '.token' ecto-credentials.json)

# Make a request
curl "$URL/v1/chat/completions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}]}'
```

**To regenerate access credentials:**
```bash
./scripts/connect.sh --regenerate-token
```

## Requirements

- macOS with Homebrew
- Tailscale account (free at https://tailscale.com)
- sudo access
- OpenClaw installed (`npm install -g openclaw`)

## Troubleshooting

**"Funnel not enabled on your tailnet"**
- Visit the link shown to enable Funnel for your machine

**SSL errors when curling**
- Wait a few seconds for TLS cert provisioning
- Check: `tailscale funnel status`

**Gateway not responding**
- Check logs: `cat /tmp/openclaw-gateway.log`
- Restart: `./scripts/connect.sh --restart`

## License

MIT - Part of OpenClaw
