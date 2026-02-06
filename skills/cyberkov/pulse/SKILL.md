---
name: pulse
description: Query and control Pulse monitoring system via REST API. Use for checking infrastructure health, resource status (nodes/VMs/containers/storage), metrics, alerts, and system management. Supports authentication via API token or session. Use when user asks about Pulse status, infrastructure monitoring, or needs to interact with the Pulse dashboard programmatically.
---

# Pulse Monitoring API

CLI tool for interacting with Pulse infrastructure monitoring system.

## Configuration

Set environment variables or pass flags:

- `PULSE_URL` - Base URL (default: `https://demo.pulserelay.pro`)
- `PULSE_TOKEN` - API token for authentication (pre-configured)

## Quick Start

```bash
# Check system health
pulse health

# Get complete infrastructure state
pulse state

# Get resource summary
pulse resources --stats

# View specific resource
pulse resource <resource-id>

# Get metrics for a time range
pulse metrics --range 24h
```

## Core Operations

### System Health

```bash
pulse health
# Returns: status, uptime, timestamp
```

### Infrastructure State

```bash
pulse state
# Complete state: Nodes, VMs, Containers, Storage, Alerts
```

### Resources

```bash
pulse resources              # List all resources
pulse resources --stats      # Summary counts and health
pulse resource <id>          # Single resource details
```

### Metrics & Charts

```bash
pulse metrics --range 1h     # CPU, Memory, Storage charts
pulse metrics --range 24h
pulse metrics --range 7d

# Available ranges: 5m, 15m, 30m, 1h, 4h, 12h, 24h, 7d

pulse storage-stats          # Detailed storage usage
pulse backups                # Unified backup history
```

### Notifications

```bash
pulse test-notification      # Send test alert
pulse notification-health    # Check notification system
```

### Updates

```bash
pulse updates check          # Check for Pulse updates
pulse updates status         # Current update status
pulse updates apply          # Apply available updates
```

## Advanced Features

### Agent Management

```bash
pulse agents list            # List all agents
pulse agent <id> config      # Get agent configuration
pulse agent <id> unlink      # Unlink agent from node
```

### Security

```bash
pulse tokens list            # List API tokens
pulse token create --name "automation" --scopes "monitoring:read"
pulse token revoke <id>      # Revoke token
```

### AI Features (Pro)

```bash
pulse ai status              # AI patrol status
pulse ai findings            # Current AI findings
pulse ai run                 # Trigger AI patrol run
```

## Environment Setup

Create a helper script at `~/.local/bin/pulse`:

```bash
#!/bin/bash
# Pulse CLI wrapper
PULSE_URL="${PULSE_URL:-https://demo.pulserelay.pro}"
PULSE_TOKEN="${PULSE_TOKEN:-a4b819a65b8d41318d167356dbf5be2c70b0bbf7d5fd4687bbf325a6a61819e0}"

endpoint="$1"
shift

curl -s -H "X-API-Token: $PULSE_TOKEN" \
     "${PULSE_URL}/api/${endpoint}" "$@" | jq
```

Make it executable:

```bash
chmod +x ~/.local/bin/pulse
```

## Common Patterns

### Get RAM usage for a host

```bash
pulse state | jq '.hosts[] | {name: .displayName, memory}'
```

### List all containers with high CPU

```bash
pulse state | jq '.containers[] | select(.cpu > 80)'
```

### Get alerts

```bash
pulse state | jq '.alerts'
```

### Export metrics to JSON

```bash
pulse metrics --range 24h > metrics-$(date +%Y%m%d).json
```

## Authentication Methods

### API Token (Recommended)

```bash
curl -H "X-API-Token: your-token" http://pulse:7655/api/health
```

### Bearer Token

```bash
curl -H "Authorization: Bearer your-token" http://pulse:7655/api/health
```

### Session Cookie

Used by web UI automatically.

## Reference Files

- **[API.md](references/API.md)** - Complete API endpoint reference
- **[examples.sh](scripts/examples.sh)** - Common API usage examples

## Notes

- Most endpoints require authentication (except `/health`, `/version`)
- Some endpoints require admin privileges or specific scopes
- Pro features require a Pulse Pro license
- Default base URL: `https://demo.pulserelay.pro/api`
