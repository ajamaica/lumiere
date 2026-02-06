# Cloudflare DNS Updater Skill

This is a skill for AI agents that provides a robust, stateless command-line script to create or update Cloudflare DNS 'A' records.

## Features

- **Stateless Design**: All required configuration (except for the API token) is passed via command-line arguments, making it ideal for automated, agent-driven workflows.
- **Environment-based Authentication**: Securely reads the Cloudflare API Token from an environment variable.
- **Idempotent**: Safely creates a new record or updates an existing one.

## Prerequisites

Before using the script, the `CLOUDFLARE_API_TOKEN` environment variable must be set on the host system.

```bash
export CLOUDFLARE_API_TOKEN="your_cloudflare_api_token"
```

The token requires DNS edit permissions for the specified zone.

## Usage

The core logic is contained within `scripts/update-record.py`.

### Arguments

- `--zone` (Required): The root domain name (e.g., `example.com`).
- `--record` (Required): The name of the record (subdomain). Use `@` for the root domain itself.
- `--ip` (Required): The IPv4 address for the 'A' record.
- `--proxied` (Optional): `true` or `false` to set the Cloudflare proxy status. Defaults to `true`.

### Example

```bash
python3 scripts/update-record.py \
  --zone "example.com" \
  --record "www" \
  --ip "192.0.2.1"
```

## Included in this Skill

- `SKILL.md`: The manifest file for the AI agent.
- `scripts/update-record.py`: The Python script that performs the DNS update.
