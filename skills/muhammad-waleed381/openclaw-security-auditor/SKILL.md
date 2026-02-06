---
name: openclaw-security-audit
description: Audit OpenClaw configuration for security risks and generate a remediation report using the user's configured LLM.
metadata:
  openclaw:
    requires:
      bins: ['cat', 'jq']
    os: ['darwin', 'linux', 'windows']
---

# OpenClaw Security Audit Skill

Local-only skill that audits `~/.openclaw/openclaw.json`, runs 15+ security
checks, and generates a detailed report using the user's existing LLM
configuration. No external APIs or keys required.

## When to Use This Skill

- The user asks for a security audit of their OpenClaw instance.
- The user wants a remediation checklist for configuration risks.
- The user is preparing an OpenClaw deployment and wants a hardening review.

## How It Works

1. Read config with standard tools (`cat`, `jq`).
2. Extract security-relevant settings (NEVER actual secrets).
3. Build a structured findings object with metadata only.
4. Pass findings to the user's LLM via OpenClaw's normal agent flow.
5. Generate a markdown report with severity ratings and fixes.

## Inputs

- target_config_path (optional): Path to OpenClaw config file.
  - default: ~/.openclaw/openclaw.json

## Outputs

- Markdown report including:
  - Overall risk score (0-100)
  - Findings categorized by severity (Critical/High/Medium/Low)
  - Each finding with description, why it matters, how to fix, example config
  - Prioritized remediation roadmap

## Security Checks (15+)

1. API keys hardcoded in config (vs environment variables)
2. Weak or missing gateway authentication tokens
3. Unsafe gateway.bind settings (0.0.0.0 without proper auth)
4. Missing channel access controls (allowFrom not set)
5. Unsafe tool policies (elevated tools without restrictions)
6. Sandbox disabled when it should be enabled
7. Missing rate limits on channels
8. Secrets potentially exposed in logs
9. Outdated OpenClaw version
10. Insecure WhatsApp configuration
11. Insecure Telegram configuration
12. Insecure Discord configuration
13. Missing audit logging for privileged actions
14. Overly permissive file system access scopes
15. Unrestricted webhook endpoints
16. Insecure default admin credentials

## Data Handling Rules

- Strip all secrets before analysis.
- Only report metadata such as present/missing/configured.
- Do not log or emit actual key values.
- Use local-only execution; no network calls.

## Example Findings Object (Redacted)

```json
{
  "config_path": "~/.openclaw/openclaw.json",
  "openclaw_version": "present",
  "gateway": {
    "bind": "0.0.0.0",
    "auth_token": "missing"
  },
  "channels": {
    "allowFrom": "missing",
    "rate_limits": "missing"
  },
  "secrets": {
    "hardcoded": "detected"
  },
  "tool_policies": {
    "elevated": "unrestricted"
  }
}
```

## Report Format

The report must include:

- Overall risk score (0-100)
- Severity buckets: Critical, High, Medium, Low
- Each finding: description, why it matters, how to fix, example config
- Prioritized remediation roadmap

## Skill Flow (Pseudo)

```text
read_config_path = input.target_config_path || ~/.openclaw/openclaw.json
raw_config = cat(read_config_path)
json = jq parse raw_config
metadata = extract_security_metadata(json)
findings = build_findings(metadata)
report = openclaw.agent.analyze(findings, format=markdown)
return report
```

## Notes

- Uses the user's existing OpenClaw LLM configuration (Opus, GPT, Gemini, and
  local models).
- No external APIs or special model access are required.
