# 🔌 Pulse API Reference

Pulse provides a comprehensive REST API for automation and integration.

**Base URL**: `http://<your-pulse-ip>:7655/api`

## 🔐 Authentication

Most API requests require authentication via one of the following methods:

### API Token (Recommended)

Pass the token in the `X-API-Token` header.

```bash
curl -H "X-API-Token: your-token" http://localhost:7655/api/health
```

### Bearer Token

```bash
curl -H "Authorization: Bearer your-token" http://localhost:7655/api/health
```

### Session Cookie

Standard browser session cookie (used by the UI).

Public endpoints include:

- `GET /api/health`
- `GET /api/version`
- `GET /api/agent/version` (agent update checks)
- `GET /api/setup-script` (requires a setup token)

## 🔏 Scopes and Admin Access

Some endpoints require admin privileges and/or scopes. Common scopes include:

- `monitoring:read`
- `settings:read`
- `settings:write`
- `host-agent:config:read`
- `host-agent:manage`

Endpoints that require admin access are noted below.

---

## 📡 Core Endpoints

### System Health

`GET /api/health`
Check if Pulse is running.

```json
{
  "status": "healthy",
  "timestamp": 1700000000,
  "uptime": 3600,
  "devModeSSH": false
}
```

### System State

`GET /api/state`
Returns the complete state of your infrastructure (Nodes, VMs, Containers, Storage, Alerts). This is the main endpoint used by the dashboard.

### Unified Resources

`GET /api/resources`
Returns a unified, flattened resource list. Requires `monitoring:read`.

`GET /api/resources/stats`
Summary counts and health rollups.

`GET /api/resources/{id}`
Fetch a single resource by ID.

### Version Info

`GET /api/version`
Returns version, build time, and update status.
Example response:

```json
{
  "version": "5.0.16",
  "buildTime": "2026-01-19T22:20:18Z",
  "channel": "stable",
  "deploymentType": "systemd",
  "updateAvailable": true,
  "latestVersion": "5.0.17"
}
```

Version fields are returned as plain semantic versions (no leading `v`).

---

## 🖥️ Nodes & Config

### List Nodes

`GET /api/config/nodes`

### Add Node

`POST /api/config/nodes`

```json
{
  "type": "pve",
  "name": "Proxmox 1",
  "host": "https://192.168.1.10:8006",
  "user": "root@pam",
  "password": "password"
}
```

### Test Connection

`POST /api/config/nodes/test-connection`
Validate credentials before saving.

### Export Configuration

`POST /api/config/export` (admin or API token)
Request body:

```json
{ "passphrase": "use-a-strong-passphrase" }
```

Returns an encrypted export bundle in `data`. Passphrases must be at least 12 characters.

### Import Configuration

`POST /api/config/import` (admin)
Request body:

```json
{
  "data": "<exported-bundle>",
  "passphrase": "use-a-strong-passphrase"
}
```

---

## 📊 Metrics & Charts

### Chart Data

`GET /api/charts?range=1h`
Returns time-series data for CPU, Memory, and Storage.
**Ranges**: `5m`, `15m`, `30m`, `1h`, `4h`, `12h`, `24h`, `7d`

### Storage Charts

`GET /api/storage-charts`
Returns storage chart data.

### Storage Stats

`GET /api/storage/`
Detailed storage usage per node and pool.

### Backup History

`GET /api/backups/unified`
Combined view of PVE and PBS backups.

Other backup endpoints:

- `GET /api/backups`
- `GET /api/backups/pve`
- `GET /api/backups/pbs`

---

## 🔔 Notifications

### Send Test Notification

`POST /api/notifications/test` (admin)
Triggers a test alert to all configured channels.

### Email, Apprise, and Webhooks

- `GET /api/notifications/email` (admin)
- `PUT /api/notifications/email` (admin)
- `GET /api/notifications/apprise` (admin)
- `PUT /api/notifications/apprise` (admin)
- `GET /api/notifications/webhooks` (admin)
- `POST /api/notifications/webhooks` (admin)
- `PUT /api/notifications/webhooks/<id>` (admin)
- `DELETE /api/notifications/webhooks/<id>` (admin)
- `POST /api/notifications/webhooks/test` (admin)
- `GET /api/notifications/webhook-templates` (admin)
- `GET /api/notifications/webhook-history` (admin)
- `GET /api/notifications/email-providers` (admin)
- `GET /api/notifications/health` (admin)

### Queue and Dead-Letter Tools

- `GET /api/notifications/queue/stats` (admin)
- `GET /api/notifications/dlq` (admin)
- `POST /api/notifications/dlq/retry` (admin)
- `POST /api/notifications/dlq/delete` (admin)

---

## 🛡️ Security

### Security Status

`GET /api/security/status`
Returns authentication status, proxy auth state, and security posture flags.

### List API Tokens

`GET /api/security/tokens`

### Create API Token

`POST /api/security/tokens`

```json
{ "name": "ansible-script", "scopes": ["monitoring:read"] }
```

### Revoke Token

`DELETE /api/security/tokens/<id>`

### Recovery (Localhost or Recovery Token)

`POST /api/security/recovery`
Supports actions:

- `generate_token` (localhost only)
- `disable_auth`
- `enable_auth`

`GET /api/security/recovery` returns recovery mode status.

### Reset Account Lockout (Admin)

`POST /api/security/reset-lockout`

```json
{ "identifier": "admin" }
```

Identifier can be a username or IP address.

---

## ⚙️ System Settings

### Get Settings

`GET /api/system/settings`
Retrieve current system settings.

### Update Settings

`POST /api/system/settings/update`
Update system settings. Requires admin + `settings:write`.

### Scheduler Health

`GET /api/monitoring/scheduler/health`
Returns scheduler health, DLQ, and breaker status. Requires `monitoring:read`.

### Updates (Admin)

- `GET /api/updates/check`
- `POST /api/updates/apply`
- `GET /api/updates/status`
- `GET /api/updates/stream`
- `GET /api/updates/plan?version=X.Y.Z`
- `GET /api/updates/history`
- `GET /api/updates/history/entry?id=<event_id>`

### Infrastructure Updates

- `GET /api/infra-updates` (requires `monitoring:read`)
- `GET /api/infra-updates/summary` (requires `monitoring:read`)
- `POST /api/infra-updates/check` (requires `monitoring:write`)
- `GET /api/infra-updates/host/{hostId}` (requires `monitoring:read`)
- `GET /api/infra-updates/{resourceId}` (requires `monitoring:read`)

---

## 🤖 Agent Endpoints

### Unified Agent (Recommended)

`GET /download/pulse-agent`
Downloads the unified agent binary.

Optional query:

- `?arch=linux-amd64` (supported: `linux-amd64`, `linux-arm64`, `linux-armv7`, `linux-armv6`, `linux-386`, `darwin-amd64`, `darwin-arm64`, `windows-amd64`, `windows-arm64`, `windows-386`)

### Agent Version

`GET /api/agent/version`
Returns the current server version for agent update checks.

### Unified Agent Installer Script

`GET /install.sh`
Serves the universal `install.sh` used to install `pulse-agent` on target machines.

### Submit Reports

`POST /api/agents/host/report` - Host metrics
`POST /api/agents/docker/report` - Docker container metrics
`POST /api/agents/kubernetes/report` - Kubernetes cluster metrics

### Host Agent Management

`GET /api/agents/host/lookup?id=<host_id>`  
`GET /api/agents/host/lookup?hostname=<hostname>`  
Looks up a host by ID or hostname/display name. Requires `host-agent:report`.

`POST /api/agents/host/unlink` (admin, `host-agent:manage`)  
Unlinks a host agent from a node.

`DELETE /api/agents/host/{host_id}` (admin, `host-agent:manage`)  
Removes a host agent from state.

---

## 🤖 Pulse AI _(v5)_

**Pro gating:** endpoints labeled "(Pro)" require a Pulse Pro license.

### Get AI Settings

`GET /api/settings/ai`
Returns current AI configuration. Requires admin + `settings:read`.

### Update AI Settings

`PUT /api/settings/ai/update`
Configure AI providers, API keys, and preferences. Requires admin + `settings:write`.

### Patrol

- `GET /api/ai/patrol/status`
- `GET /api/ai/patrol/findings`
- `DELETE /api/ai/patrol/findings` (clear all findings)
- `GET /api/ai/patrol/history`
- `POST /api/ai/patrol/run` (admin, Pro)
- `POST /api/ai/patrol/acknowledge` (Pro)
- `POST /api/ai/patrol/dismiss`
- `POST /api/ai/patrol/resolve`

### Cost Tracking

- `GET /api/ai/cost/summary`
- `POST /api/ai/cost/reset` (admin)
- `GET /api/ai/cost/export` (admin)

---

## 📈 Metrics Store (v5)

Auth required: `monitoring:read`.

### Store Stats

`GET /api/metrics-store/stats`
Returns stats for the persistent metrics store.

### History

`GET /api/metrics-store/history`
Returns historical metric series for a resource and time range.

Query params:

- `resourceType` (required): `node`, `vm`, `container`, `storage`, `dockerHost`, `dockerContainer`
- `resourceId` (required)
- `metric` (optional): `cpu`, `memory`, `disk`, etc.
- `range` (optional): `1h`, `6h`, `12h`, `24h`, `7d`, `30d`, `90d` (default `24h`)

---

## 💳 License (Pulse Pro)

### License Status (Admin)

`GET /api/license/status`

### Activate License (Admin)

`POST /api/license/activate`

```json
{ "license_key": "PASTE_KEY_HERE" }
```

### Clear License (Admin)

`POST /api/license/clear`

---

> **Note**: This is a summary of the most common endpoints. For a complete list, inspect the network traffic of the Pulse dashboard or check the source code in `internal/api/router.go`.
