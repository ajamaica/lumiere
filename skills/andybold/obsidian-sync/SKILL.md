---
name: obsidian-sync
description: Sync files between Clawdbot workspace and Obsidian. Run the sync server to enable two-way file synchronization with the OpenClaw Obsidian plugin.
---

# Obsidian Sync Server

A secure file sync server for two-way synchronization between Clawdbot and Obsidian.

> **📦 This skill is part of [obsidian-openclaw](https://github.com/AndyBold/obsidian-openclaw)**  
> An Obsidian plugin that lets you chat with your Clawdbot agent and sync notes between your vault and the agent's workspace.

## Quick Start

```bash
SYNC_TOKEN="your-gateway-token" node scripts/sync-server.mjs
```

## Configuration

| Environment Variable | Default          | Description                            |
| -------------------- | ---------------- | -------------------------------------- |
| `SYNC_PORT`          | `18790`          | Server port                            |
| `SYNC_BIND`          | `localhost`      | Bind address                           |
| `SYNC_WORKSPACE`     | `/data/clawdbot` | Root workspace path                    |
| `SYNC_TOKEN`         | (required)       | Auth token (use Gateway token)         |
| `SYNC_ALLOWED_PATHS` | `notes,memory`   | Comma-separated allowed subdirectories |

## Security

- Only configured subdirectories are accessible
- Path traversal (`../`) is blocked
- All requests require `Authorization: Bearer <token>`
- Bind to localhost; expose via Tailscale serve for remote access

## API Endpoints

| Method | Endpoint                      | Description                     |
| ------ | ----------------------------- | ------------------------------- |
| GET    | `/sync/status`                | Health check                    |
| GET    | `/sync/list?path=notes`       | List markdown files             |
| GET    | `/sync/read?path=notes/x.md`  | Read file + metadata            |
| POST   | `/sync/write?path=notes/x.md` | Write file (conflict detection) |

## Exposing via Tailscale

```bash
tailscale serve --bg --https=18790 http://localhost:18790
```

## Running as a Service

### User systemd service

```bash
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/openclaw-sync.service << 'EOF'
[Unit]
Description=OpenClaw Sync Server
After=network.target

[Service]
Type=simple
Environment=SYNC_TOKEN=your-token-here
Environment=SYNC_WORKSPACE=/data/clawdbot
Environment=SYNC_ALLOWED_PATHS=notes,memory
ExecStart=/usr/bin/node /path/to/skills/obsidian-sync/scripts/sync-server.mjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now openclaw-sync
loginctl enable-linger $USER  # Start on boot
```

## Obsidian Plugin

This skill provides the backend for the **OpenClaw Obsidian plugin**:

**[github.com/AndyBold/obsidian-openclaw](https://github.com/AndyBold/obsidian-openclaw)**

The plugin provides:

- 💬 **Chat sidebar** — Talk to your Clawdbot agent from Obsidian
- 📁 **File actions** — Create, edit, delete notes via conversation
- 🔄 **Two-way sync** — Keep notes synchronized between vault and agent
- 🔒 **Secure storage** — OS keychain integration for tokens
- 📋 **Audit logging** — Track all file operations

Install the plugin via [BRAT](https://github.com/TfTHacker/obsidian42-brat) using: `AndyBold/obsidian-openclaw`
