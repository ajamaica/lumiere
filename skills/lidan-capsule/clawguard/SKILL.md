---
name: clawguard
description: Install and configure the ClawGuard security plugin - an LLM-as-a-Judge guardrail that detects and blocks risky tool calls
metadata:
  { 'openclaw': { 'emoji': '🛡️', 'homepage': 'https://github.com/capsulesecurity/clawguard' } }
---

# ClawGuard Plugin Installation Guide

ClawGuard is a security plugin that uses an LLM-as-a-Judge to evaluate tool calls before execution, detecting and optionally blocking risky operations.

## Prerequisites

Before installing ClawGuard, ensure the gateway's chat completions endpoint is enabled:

```bash
openclaw config set gateway.http.endpoints.chatCompletions.enabled true
```

## Installation

Install the plugin from npm:

```bash
openclaw plugins install @capsulesecurity/clawguard
```

After installation, restart the gateway to load the plugin.

## Docker Installation

If running OpenClaw in Docker:

```bash
# Install the plugin
docker compose run --rm openclaw-cli plugins install @capsulesecurity/clawguard

# Restart gateway with force-recreate to reload env vars
docker compose up -d --force-recreate openclaw-gateway
```

**Important:** Always use `--force-recreate` when restarting. Plain `docker compose restart` does NOT reload environment variables.

## Verify Installation

Check the gateway logs for the initialization message:

```
[clawguard] Initialized (logging: true, security: true, block: true, metrics: enabled)
```

## Configuration

Configure ClawGuard via `openclaw config set plugins.clawguard.<option> <value>`:

| Option               | Default   | Description                               |
| -------------------- | --------- | ----------------------------------------- |
| enabled              | true      | Enable/disable the plugin                 |
| logToolCalls         | true      | Log tool call JSON to gateway logs        |
| securityCheckEnabled | true      | Run LLM security evaluation               |
| blockOnRisk          | true      | Block high/critical risk tool calls       |
| maxContextWords      | 2000      | Session context word limit for evaluation |
| timeoutMs            | 15000     | Security check timeout in milliseconds    |
| gatewayHost          | 127.0.0.1 | Gateway host for LLM calls                |
| gatewayPort          | 18789     | Gateway port for LLM calls                |
| metricsEnabled       | true      | Enable anonymous usage metrics            |

### Example Configuration

```bash
# Disable blocking (log-only mode)
openclaw config set plugins.clawguard.blockOnRisk false

# Increase timeout for slower models
openclaw config set plugins.clawguard.timeoutMs 30000

# Disable metrics collection
openclaw config set plugins.clawguard.metricsEnabled false
```

## Gateway Authentication

ClawGuard calls the gateway's `/v1/chat/completions` endpoint internally. If you see 401 Unauthorized errors:

1. Check the gateway token in your environment matches the config:

   ```bash
   # Check env var
   printenv OPENCLAW_GATEWAY_TOKEN

   # Check config token
   cat ~/.openclaw/openclaw.json | grep -A2 '"token"'
   ```

2. If tokens don't match, update your environment and restart the gateway.

For Docker, ensure `.env` contains the correct `OPENCLAW_GATEWAY_TOKEN` and use `--force-recreate` when restarting.

## Troubleshooting

### 405 Method Not Allowed

The chat completions endpoint is not enabled. Run:

```bash
openclaw config set gateway.http.endpoints.chatCompletions.enabled true
```

### 401 Unauthorized

Token mismatch between environment and config. See Gateway Authentication section above.

### Plugin Not Loading

1. Check `openclaw plugins list` shows clawguard
2. Restart the gateway
3. Check gateway logs for errors

## How It Works

ClawGuard registers a `before_tool_call` hook that:

1. Logs tool call details (if `logToolCalls` is enabled)
2. Sends tool context to an LLM for security evaluation
3. Returns a risk assessment (none/low/medium/high/critical)
4. Blocks execution if risk is high/critical (if `blockOnRisk` is enabled)

The security evaluation uses your configured LLM provider, so it works with any model you have set up in OpenClaw.

## Links

- GitHub: https://github.com/capsulesecurity/clawguard
- npm: https://www.npmjs.com/package/@capsulesecurity/clawguard
