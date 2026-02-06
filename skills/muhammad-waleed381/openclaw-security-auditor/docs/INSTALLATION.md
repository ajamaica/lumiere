# Installation

This guide installs the OpenClaw Security Auditor skill on your local OpenClaw instance.

## Prerequisites

- OpenClaw installed and running locally
- OpenClaw config file present at `~/.openclaw/openclaw.json`
- `cat` and `jq` available in your PATH
- Recommended OpenClaw version: 0.8.0 or newer

If you are unsure of your OpenClaw version, run:

```bash
openclaw --version
```

## Installation via ClawHub (Recommended)

```bash
clawhub install openclaw-security-auditor
```

Restart OpenClaw if the skill does not appear immediately.

## Manual Installation from GitHub

1. Clone the repository:

   ```bash
   git clone https://github.com/Muhammad-Waleed381/Openclaw-Security-Auditor
   ```

2. Copy `SKILL.md` to your OpenClaw skills directory.
3. Restart OpenClaw.

If you do not know your skills directory, consult your OpenClaw documentation
or run:

```bash
openclaw skills list
```

## Verification Steps

1. Open the OpenClaw skill list and confirm "OpenClaw Security Audit" is
   available.
2. Run the skill with a simple request:
   - "Run security audit"
3. Ensure a markdown report is generated.

## Troubleshooting

### Skill not found

- Restart OpenClaw.
- Confirm `SKILL.md` is in the correct skills directory.
- Check file permissions.

### jq not found

- Install jq:
  - macOS: `brew install jq`
  - Ubuntu/Debian: `sudo apt-get install jq`
  - Windows: install via Chocolatey or Scoop

### Config file missing

- Ensure `~/.openclaw/openclaw.json` exists.
- If your config is stored elsewhere, pass the custom path when asked.

### Report contains no findings

- Confirm your OpenClaw config is valid JSON.
- Check that OpenClaw is using the expected config file.
