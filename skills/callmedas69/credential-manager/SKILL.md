---
name: credential-manager
description: MANDATORY security foundation for OpenClaw. Consolidate scattered API keys and credentials into a secure .env file with proper permissions. Use when setting up OpenClaw, migrating credentials, auditing security, or enforcing the .env standard. This is not optional — centralized credential management is a core requirement for secure OpenClaw deployments. Scans for credential files across common locations, backs up existing files, creates a unified .env with mode 600, validates security, and enforces best practices.
---

# Credential Manager

**STATUS: MANDATORY SECURITY FOUNDATION**

Consolidate scattered API keys and credentials into a secure, centralized `.env` file.

## ⚠️ This Is Not Optional

Centralized `.env` credential management is a **core requirement** for OpenClaw security. If your credentials are scattered across multiple files, **stop and consolidate them now**.

See [CORE-PRINCIPLE.md](CORE-PRINCIPLE.md) for why this is non-negotiable.

## The Foundation

**Every OpenClaw deployment MUST have:**

```
~/.openclaw/.env (mode 600)
```

This is your single source of truth for all credentials. No exceptions.

**Why?**

- Single location = easier to secure
- File mode 600 = only you can read
- Git-ignored = won't accidentally commit
- Validated format = catches errors
- Audit trail = know what changed

Scattered credentials = scattered attack surface. This skill fixes that.

## What This Skill Does

1. **Scans** for credentials in common locations
2. **Backs up** existing credential files (timestamped)
3. **Consolidates** into `~/.openclaw/.env`
4. **Secures** with proper permissions (600)
5. **Validates** security and format
6. **Enforces** best practices
7. **Cleans up** old files after migration

## Quick Start

### Full Migration (Recommended)

```bash
# Scan for credentials
./scripts/scan.py

# Review and consolidate
./scripts/consolidate.py

# Validate security
./scripts/validate.py
```

### Individual Operations

```bash
# Scan only
./scripts/scan.py

# Consolidate specific service
./scripts/consolidate.py --service x

# Backup without removing
./scripts/consolidate.py --backup-only

# Clean up old files
./scripts/cleanup.py --confirm
```

## Common Credential Locations

The skill scans these locations:

```
~/.config/*/credentials.json
~/.openclaw/workspace/memory/*-creds.json
~/.openclaw/workspace/memory/*credentials*.json
~/.env (if exists, merges)
```

## Security Features

✅ **File permissions:** Sets `.env` to mode 600 (owner only)
✅ **Git protection:** Creates/updates `.gitignore`
✅ **Backups:** Timestamped backups before changes
✅ **Validation:** Checks format, permissions, and duplicates
✅ **Template:** Creates `.env.example` (safe to share)

## Output Structure

After migration:

```
~/.openclaw/
├── .env                     # All credentials (secure)
├── .env.example             # Template (safe)
├── .gitignore               # Protects .env
├── CREDENTIALS.md           # Documentation
└── backups/
    └── credentials-old-YYYYMMDD/  # Backup of old files
```

## Supported Services

Common services auto-detected:

- **X (Twitter):** OAuth 1.0a credentials
- **Molten:** Agent intent matching
- **Moltbook:** Agent social network
- **Botchan/4claw:** Net Protocol
- **OpenAI, Anthropic, Google:** AI providers
- **GitHub, GitLab:** Code hosting
- **Generic:** `API_KEY`, `*_TOKEN`, `*_SECRET` patterns

See [references/supported-services.md](references/supported-services.md) for full list.

## Security Best Practices

See [references/security.md](references/security.md) for detailed security guidelines.

**Quick checklist:**

- ✅ `.env` has 600 permissions
- ✅ `.env` is git-ignored
- ✅ No credentials in code or logs
- ✅ Rotate keys periodically
- ✅ Use separate keys per environment

## Scripts

All scripts support `--help` for detailed usage.

### scan.py

```bash
# Scan and report
./scripts/scan.py

# Include custom paths
./scripts/scan.py --paths ~/.myapp/config ~/.local/share/creds

# JSON output
./scripts/scan.py --format json
```

### consolidate.py

```bash
# Interactive mode (prompts before changes)
./scripts/consolidate.py

# Auto-confirm (no prompts)
./scripts/consolidate.py --yes

# Backup only
./scripts/consolidate.py --backup-only

# Specific service
./scripts/consolidate.py --service molten
```

### validate.py

```bash
# Full validation
./scripts/validate.py

# Check permissions only
./scripts/validate.py --check permissions

# Fix issues automatically
./scripts/validate.py --fix
```

### cleanup.py

```bash
# Dry run (shows what would be deleted)
./scripts/cleanup.py

# Actually delete old files
./scripts/cleanup.py --confirm

# Keep backups
./scripts/cleanup.py --confirm --keep-backups
```

## Migration Workflow

**Step 1: Discovery**

```bash
./scripts/scan.py
```

Review output to see what will be migrated.

**Step 2: Backup & Consolidate**

```bash
./scripts/consolidate.py
```

Creates backups, builds `.env`, sets permissions.

**Step 3: Validation**

```bash
./scripts/validate.py
```

Ensures everything is secure and correct.

**Step 4: Test**
Test your applications/skills with the new `.env` file.

**Step 5: Cleanup**

```bash
./scripts/cleanup.py --confirm
```

Removes old credential files (backups remain).

## For Skill Developers: Enforce This Standard

Other OpenClaw skills MUST validate credentials are secure before using them:

### Python Skills

```python
#!/usr/bin/env python3
import sys
from pathlib import Path

# Add credential-manager scripts to path
sys.path.insert(0, str(Path.home() / '.openclaw/skills/credential-manager/scripts'))

# Enforce secure .env (exits if not compliant)
from enforce import require_secure_env, get_credential

require_secure_env()

# Now safe to load credentials
api_key = get_credential('SERVICE_API_KEY')
```

### Bash Skills

```bash
#!/usr/bin/env bash
set -euo pipefail

# Validate .env exists and is secure
if ! python3 ~/.openclaw/skills/credential-manager/scripts/enforce.py; then
    exit 1
fi

# Now safe to load
source ~/.openclaw/.env
```

**This creates a fail-fast system:** If credentials aren't properly secured, skills refuse to run. Users are forced to fix it.

## Loading Credentials

After migration, load from `.env`:

### Python

```python
import os
from pathlib import Path

# Load .env
env_file = Path.home() / '.openclaw' / '.env'
with open(env_file) as f:
    for line in f:
        if '=' in line and not line.strip().startswith('#'):
            key, val = line.strip().split('=', 1)
            os.environ[key] = val

# Use credentials
api_key = os.getenv('SERVICE_API_KEY')
```

### Bash

```bash
# Load .env
set -a
source ~/.openclaw/.env
set +a

# Use credentials
echo "$SERVICE_API_KEY"
```

### Using Existing Loaders

If you migrated using OpenClaw scripts:

```python
from load_credentials import get_credentials
creds = get_credentials('x')
```

## Adding New Credentials

Edit `~/.openclaw/.env`:

```bash
# Add new service
NEW_SERVICE_API_KEY=your_key_here
NEW_SERVICE_SECRET=your_secret_here
```

Update template too:

```bash
# Edit .env.example
NEW_SERVICE_API_KEY=your_key_here
NEW_SERVICE_SECRET=your_secret_here
```

## Rollback

If something goes wrong:

```bash
# Find your backup
ls -la ~/.openclaw/backups/

# Restore specific file
cp ~/.openclaw/backups/credentials-old-YYYYMMDD/x-credentials.json.bak \
   ~/.config/x/credentials.json
```

## Notes

- **Non-destructive by default:** Original files backed up before removal
- **Idempotent:** Safe to run multiple times
- **Extensible:** Add custom credential patterns in scripts
- **Secure:** Never logs full credentials, only metadata
