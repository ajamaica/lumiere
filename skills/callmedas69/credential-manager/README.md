# Credential Manager Skill

**Status:** ✅ Production Ready  
**Category:** 🔒 Core Security Infrastructure  
**Package:** `credential-manager.skill`  
**Version:** 1.0.0

## What This Is

**MANDATORY security foundation for OpenClaw.**

This skill consolidates scattered API keys and credentials into a secure, centralized `.env` file. This is not optional — it's a core requirement for secure OpenClaw deployments.

## Why This Matters

Scattered credentials = scattered attack surface. One `.env` file with proper permissions is:

- ✅ Easier to secure (one file, one permission)
- ✅ Easier to audit (one location to check)
- ✅ Easier to rotate (update once, everywhere works)
- ✅ Harder to leak (git-ignored by default)

See `CORE-PRINCIPLE.md` for the full security rationale.

## What It Does

1. **Scans** for credentials across common locations
2. **Backs up** existing credential files safely
3. **Consolidates** everything into `~/.openclaw/.env`
4. **Secures** with proper permissions (600)
5. **Validates** security and format
6. **Cleans up** old files after migration

## Quick Start

```bash
# Install the skill
# (Copy credential-manager/ to your OpenClaw skills directory)

# Scan for credentials
./scripts/scan.py

# Consolidate into .env
./scripts/consolidate.py

# Validate security
./scripts/validate.py

# (Optional) Clean up old files
./scripts/cleanup.py --confirm
```

## Files Included

```
credential-manager/
├── SKILL.md                         # Main skill documentation
├── scripts/
│   ├── scan.py                      # Scan for credential files
│   ├── consolidate.py               # Merge into .env
│   ├── validate.py                  # Security validation
│   └── cleanup.py                   # Remove old files
└── references/
    ├── security.md                  # Security best practices
    └── supported-services.md        # Known service patterns
```

## Supported Services

- **Social:** X (Twitter), Molten, Moltbook, Botchan/4claw
- **AI:** OpenAI, Anthropic, Google/Gemini, OpenRouter
- **Dev:** GitHub, GitLab
- **Cloud:** AWS, GCP, Azure
- **Databases:** PostgreSQL, MongoDB, Redis
- **Communication:** Telegram, Discord, Slack, WhatsApp
- **Payment:** Stripe, PayPal
- **Web3:** Ethereum, Solana
- **Storage:** S3, R2, IPFS/Pinata
- **And many more...**

See `references/supported-services.md` for the full list.

## Security Features

✅ **File permissions** - Sets .env to mode 600 (owner only)  
✅ **Git protection** - Creates/updates .gitignore  
✅ **Backups** - Timestamped backups before changes  
✅ **Validation** - Checks format, permissions, duplicates  
✅ **Template** - Creates .env.example (safe to share)  
✅ **Documentation** - Comprehensive security guide

## Usage Examples

### Scan Only

```bash
./scripts/scan.py
```

### Consolidate with Confirmation

```bash
./scripts/consolidate.py
# (Prompts before making changes)
```

### Auto-Confirm Mode

```bash
./scripts/consolidate.py --yes
```

### Validate

```bash
./scripts/validate.py
```

### Fix Issues Automatically

```bash
./scripts/validate.py --fix
```

### Cleanup (Dry Run)

```bash
./scripts/cleanup.py
# Shows what would be deleted
```

### Cleanup (Actually Delete)

```bash
./scripts/cleanup.py --confirm
```

## Testing

The skill has been tested on the current OpenClaw installation and successfully:

- ✅ Scans existing .env file
- ✅ Validates format (15 keys found)
- ✅ Validates permissions (600)
- ✅ Validates .gitignore protection
- ✅ No security warnings

## Distribution

The skill is packaged as `credential-manager.skill` (a zip file with .skill extension).

To share:

1. Send the `.skill` file
2. Recipient extracts to their OpenClaw skills directory
3. Scripts are immediately usable

## Migration Story

This skill was created based on a real migration where we:

1. Found credentials scattered across 4 locations
2. Consolidated into `~/.openclaw/.env`
3. Created unified API scripts (x_post.py, molten.sh, moltbook.sh)
4. Validated security
5. Cleaned up old files

The process took ~10 minutes and consolidated credentials for X, Molten, Moltbook, and Botchan.

## Future Enhancements

Potential additions:

- Interactive TUI for easier navigation
- Integration with secret managers (1Password, etc.)
- Automatic key rotation reminders
- Multi-environment support (.env.dev, .env.prod)
- Encryption at rest option

## Support

For issues or questions:

- Read SKILL.md for detailed documentation
- Check references/ for security guides
- All scripts support --help flag

## License

Part of the OpenClaw project.

---

**Created:** 2026-02-05  
**Author:** Mr. Tee (OpenClaw Agent)  
**Tested:** ✅ Production Ready
