# Security Checks

This document explains each security check performed by the OpenClaw Security
Auditor, why it matters, common real-world risks, and how to fix it. Examples
use redacted values or environment variables only.

## 1. Hardcoded API Keys in Config

**Why it matters:** Secrets in config files can leak through logs, backups, or
source control.

**Scenario:** A config file is accidentally committed to a public repo. Tokens
are exposed.

**Fix:** Move secrets to environment variables.

Before:

```yaml
llm:
  apiKey: 'sk-...'
```

After:

```yaml
llm:
  apiKey: ${OPENCLAW_LLM_API_KEY}
```

## 2. Weak or Missing Gateway Auth Tokens

**Why it matters:** Without strong auth, the gateway can be controlled by anyone
on the network.

**Scenario:** A user exposes the gateway to a local network without auth.

**Fix:** Set a strong token via environment variables.

Before:

```yaml
gateway:
  authToken: ''
```

After:

```yaml
gateway:
  authToken: ${OPENCLAW_GATEWAY_TOKEN}
```

## 3. Unsafe `gateway.bind` Settings

**Why it matters:** Binding to `0.0.0.0` exposes the gateway to the
network.

**Scenario:** Gateway is reachable from the internet through a router or
misconfigured firewall.

**Fix:** Bind to localhost unless remote access is required.

Before:

```yaml
gateway:
  bind: 0.0.0.0
```

After:

```yaml
gateway:
  bind: 127.0.0.1
```

## 4. Missing Channel Access Controls (`allowFrom`)

**Why it matters:** Unrestricted channels let unknown users invoke actions.

**Scenario:** A public Discord channel can trigger admin actions.

**Fix:** Add allowlists.

Before:

```yaml
channels:
  discord: {}
```

After:

```yaml
channels:
  discord:
    allowFrom:
      - 'user:123456789'
```

## 5. Unsafe Tool Policies

**Why it matters:** Elevated tools without restrictions can modify files or
exfiltrate data.

**Scenario:** Prompt injection triggers a tool to read secrets outside the
project scope.

**Fix:** Require approval and restrict paths.

Before:

```yaml
tools:
  policies:
    elevated: {}
```

After:

```yaml
tools:
  policies:
    elevated:
      requireApproval: true
      allowPaths:
        - '/home/user/projects'
```

## 6. Sandbox Disabled

**Why it matters:** Sandboxing reduces the blast radius of untrusted tool calls.

**Scenario:** A tool has access to the full file system.

**Fix:** Enable sandboxing and restrict scope.

Before:

```yaml
tools:
  sandbox: false
```

After:

```yaml
tools:
  sandbox: true
```

## 7. Missing Rate Limits on Channels

**Why it matters:** No limits allow abuse, spam, or denial of service.

**Scenario:** A bot is overwhelmed by repeated requests.

**Fix:** Add rate limits.

Before:

```yaml
channels:
  telegram: {}
```

After:

```yaml
channels:
  telegram:
    rateLimits:
      perMinute: 15
```

## 8. Secrets Exposed in Logs

**Why it matters:** Logs may be shared or retained in insecure locations.

**Scenario:** Debug logs include tokens or sensitive metadata.

**Fix:** Redact sensitive fields and lower verbosity.

Before:

```yaml
logging:
  level: debug
```

After:

```yaml
logging:
  level: info
  redact:
    - 'apiKey'
    - 'authToken'
```

## 9. Outdated OpenClaw Version

**Why it matters:** Older versions can contain known vulnerabilities.

**Scenario:** A security patch is released but not applied.

**Fix:** Update to the latest stable version.

## 10. Insecure WhatsApp Configuration

**Why it matters:** Public or weakly authenticated integrations can be abused.

**Scenario:** A webhook endpoint is exposed without allowlists.

**Fix:** Require authentication and allowlists where supported.

## 11. Insecure Telegram Configuration

**Why it matters:** Public bot tokens or wide access increase abuse risk.

**Scenario:** Bot token is stored in plain text in the config.

**Fix:** Use environment variables and restrict allowed chats.

Before:

```yaml
channels:
  telegram:
    token: '123:abc'
```

After:

```yaml
channels:
  telegram:
    token: ${OPENCLAW_TELEGRAM_TOKEN}
    allowFrom:
      - 'chat:987654321'
```

## 12. Insecure Discord Configuration

**Why it matters:** Public or unrestricted Discord bots can be abused.

**Scenario:** Bot is active in public servers without allowlists.

**Fix:** Restrict servers/channels and enable rate limits.

## 13. Missing Audit Logging for Privileged Actions

**Why it matters:** Without audit logs, incident response is harder.

**Scenario:** Elevated tool execution occurs but is not recorded.

**Fix:** Enable audit logging and set retention.

Before:

```yaml
logging:
  audit:
    enabled: false
```

After:

```yaml
logging:
  audit:
    enabled: true
    retentionDays: 30
```

## 14. Overly Permissive File System Access

**Why it matters:** Tools can access sensitive locations.

**Scenario:** A tool can read the entire home directory.

**Fix:** Restrict allowed paths to necessary directories only.

Before:

```yaml
tools:
  fileSystem:
    allowPaths:
      - '/'
```

After:

```yaml
tools:
  fileSystem:
    allowPaths:
      - '/home/user/projects'
```

## 15. Unrestricted Webhook Endpoints

**Why it matters:** Public endpoints invite probing and abuse.

**Scenario:** A webhook processes requests from any IP.

**Fix:** Add allowlists and authentication.

Before:

```yaml
webhooks:
  allowFrom: []
```

After:

```yaml
webhooks:
  allowFrom:
    - '203.0.113.5'
```

## 16. Insecure Default Admin Credentials

**Why it matters:** Defaults are widely known and exploited.

**Scenario:** Admin credentials are never changed after install.

**Fix:** Rotate credentials and store them securely.

## Best Practices for OpenClaw Security

- Store all secrets in environment variables or a local secret manager.
- Bind gateways to localhost and use allowlists when remote access is required.
- Enable sandboxing and restrict tool access.
- Configure allowlists and rate limits for all channels.
- Enable audit logging with retention.
- Keep OpenClaw updated.
