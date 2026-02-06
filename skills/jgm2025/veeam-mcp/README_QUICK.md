# Veeam MCP Skill - Quick Setup

OpenClaw skill for querying Veeam Backup & Replication and Veeam ONE via the Veeam Intelligence MCP server.

## Quick Start

### 1. Prerequisites

- Docker installed
- Veeam B&R or Veeam ONE with active license (not Community Edition)
- Veeam Intelligence enabled on your Veeam servers

### 2. Obtain Veeam MCP Server

The Veeam Intelligence MCP server is currently in **beta**.

**To obtain access:**

- Contact Veeam or your Veeam account representative
- Visit official Veeam community forums
- Check Veeam's channels for beta program info

Once obtained, build the Docker image:

```bash
cd /path/to/veeam-mcp-server
docker build -t veeam-intelligence-mcp-server .
```

### 3. Install This Skill

```bash
clawhub install veeam-mcp
```

### 4. Configure Credentials

Copy the template and fill in your details:

```bash
cp credentials-template.json ~/.veeam-mcp-creds.json
nano ~/.veeam-mcp-creds.json
```

Example:

```json
{
  "vbr": {
    "url": "https://veeam-server.local:443/",
    "username": ".\\administrator",
    "password": "your_password"
  },
  "vone": {
    "url": "https://veeam-one.local:1239/",
    "username": ".\\administrator",
    "password": "your_password"
  }
}
```

Lock it down:

```bash
chmod 600 ~/.veeam-mcp-creds.json
```

### 5. Test Connection

```bash
cd ~/.openclaw/workspace/skills/veeam-mcp
./scripts/test-connection.sh vbr
./scripts/test-connection.sh vone
```

### 6. Try a Query

```bash
./scripts/query-veeam.sh vbr "What backup jobs ran in the last 24 hours?"
```

## Usage

### From OpenClaw

Just ask naturally:

- "What Veeam backup jobs failed yesterday?"
- "Show me backup repository capacity"
- "Check Veeam ONE alerts"
- "Which VMs haven't been backed up this week?"

### Command Line

```bash
# Query VBR
./scripts/query-veeam.sh vbr "your question here"

# Query Veeam ONE
./scripts/query-veeam.sh vone "your question here"

# List available tools
./scripts/list-tools.sh vbr
./scripts/list-tools.sh vone
```

## Enable Advanced Mode

For live data queries (not just documentation), enable **Veeam Intelligence** on your Veeam servers:

**Veeam B&R:**

1. Open console → Options → Veeam Intelligence Settings
2. Enable AI assistant

**Veeam ONE:**

1. Open console → Find Veeam Intelligence settings
2. Enable feature

Without this, you'll only get documentation-based answers.

## Troubleshooting

### Connection fails

**Username format issues:**

- Local account: `".\\username"`
- Domain account: `"DOMAIN\\username"` or `"username@domain.com"`
- Use single backslash in JSON

**Docker permission denied:**

```bash
sudo usermod -aG docker $USER
newgrp docker
```

**Invalid credentials:**

- Verify in `~/.veeam-mcp-creds.json`
- Check JSON is valid: `cat ~/.veeam-mcp-creds.json | jq .`

### Basic Mode warning

Enable Veeam Intelligence on your servers for live data access.

## Files

```
veeam-mcp/
├── SKILL.md                       # Full documentation
├── README.md                      # This file
├── credentials-template.json      # Template for credentials
├── scripts/
│   ├── query-veeam.sh            # Main query interface
│   ├── test-connection.sh        # Test connectivity
│   ├── start-mcp.sh              # Interactive MCP session
│   └── list-tools.sh             # Show available MCP tools
└── .clawhub/
    └── metadata.json             # Skill metadata
```

## Support

- Veeam MCP Server: Contact Veeam for beta access
- [OpenClaw Discord](https://discord.com/invite/clawd)
- [OpenClaw Docs](https://docs.openclaw.ai)

## License

This skill is provided as-is. Veeam Intelligence MCP server is licensed separately by Veeam.
