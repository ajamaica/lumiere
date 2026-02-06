# OpenClaw Security Auditor

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/Muhammad-Waleed381/Openclaw-Security-Auditor?style=flat)](https://github.com/Muhammad-Waleed381/Openclaw-Security-Auditor)
[![Version](https://img.shields.io/badge/version-1.0.0-success.svg)](https://github.com/Muhammad-Waleed381/Openclaw-Security-Auditor/releases)

Comprehensive security auditing for your OpenClaw instance

## Features

- 🔍 15+ automated security checks
- 🤖 AI-powered analysis using YOUR existing LLM
- 📊 Risk scoring and prioritization
- 🛠️ Step-by-step fix instructions
- 🔒 Privacy-focused (secrets never exposed)
- ⚡ Zero configuration required

## Quick Start

```bash
clawhub install openclaw-security-auditor
```

Then ask your OpenClaw bot: "Run security audit"

## What It Checks

- API keys hardcoded in config vs environment variables
- Weak or missing gateway authentication tokens
- Unsafe `gateway.bind` settings (0.0.0.0 without proper auth)
- Missing channel access controls (`allowFrom` not set)
- Unsafe tool policies (elevated tools without restrictions)
- Sandbox disabled when it should be enabled
- Missing rate limits on channels
- Secrets potentially exposed in logs
- Outdated OpenClaw version
- Insecure WhatsApp configuration
- Insecure Telegram configuration
- Insecure Discord configuration
- Missing audit logging for privileged actions
- Overly permissive file system access scopes
- Unrestricted webhook endpoints
- Insecure default admin credentials

## Example Output

```markdown
# OpenClaw Security Audit Report

Overall Risk Score: 74/100

## Critical

- Missing gateway authentication token
  - Why it matters: Unauthenticated access enables full remote control.
  - How to fix: Set `gateway.authToken` and rotate any exposed tokens.
  - Example:
    gateway:
    authToken: ${OPENCLAW_GATEWAY_TOKEN}

## High

- `gateway.bind` set to 0.0.0.0 with weak auth
  - Why it matters: Public exposure without strong auth increases attack surface.
  - How to fix: Bind to localhost or enforce strong auth + allowlist.

## Remediation Roadmap

1. Enable gateway authentication and rotate tokens.
2. Restrict gateway bind address or add allowlist controls.
3. Add channel rate limits and access controls.
```

## How It Works

This skill runs entirely on YOUR OpenClaw instance using YOUR configured LLM.
No external services, no additional API keys needed.

## Installation

1. Install from ClawHub:

   ```bash
   clawhub install openclaw-security-auditor
   ```

2. Ensure your OpenClaw instance is configured with any LLM you already use.
3. Restart OpenClaw if needed so the skill loads.

## Usage

- Run a full audit:
  - "Run security audit"
- Validate after a config change:
  - "Re-run the OpenClaw security audit"
- Ask for a focused remediation plan:
  - "Summarize the top 3 fixes from the audit"

## Privacy

We never see your actual API keys or secrets. The skill only analyzes
configuration metadata and strips all secret values before analysis.

## Contributing

Contributions welcome! See `CONTRIBUTING.md`.

## License

MIT License - see `LICENSE` file.

## Author

Muhammad Waleed
