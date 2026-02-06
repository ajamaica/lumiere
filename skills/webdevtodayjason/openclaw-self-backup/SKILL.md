# Self-Backup Skill

**Automatic workspace and memory backups for AI agents.**

Every agent needs backups. This skill handles:
- 🧠 Memory files (MEMORY.md, daily logs)
- 🆔 Identity files (SOUL.md, USER.md, AGENTS.md, IDENTITY.md)
- 📜 Scripts and automation
- 💾 openclaw-mem database
- ⚙️ Configuration files

## Installation

```bash
# Install via ClawHub
clawhub install self-backup

# Or copy to your skills directory
cp -r self-backup /Users/sem/argent/skills/
```

## Quick Start

```bash
# Create backup config
cd /Users/sem/argent/skills/self-backup
cp config/backup.example.json config/backup.json

# Edit config to set your backup location
nano config/backup.json

# Run backup
./scripts/backup.sh
```

## Configuration

Edit `config/backup.json`:

```json
{
  "workspace": "/Users/sem/argent",
  "backupDir": "/Users/sem/backups/argent",
  "targets": {
    "local": {
      "enabled": true,
      "path": "/Users/sem/backups/argent"
    },
    "git": {
      "enabled": false,
      "repo": "git@github.com:yourusername/agent-backup.git"
    },
    "s3": {
      "enabled": false,
      "bucket": "my-agent-backups",
      "prefix": "argent/"
    }
  },
  "include": [
    "MEMORY.md",
    "SOUL.md",
    "USER.md",
    "AGENTS.md",
    "IDENTITY.md",
    "TOOLS.md",
    "HEARTBEAT.md",
    "memory/*.md",
    "scripts/",
    "config/",
    "~/.openclaw-mem/memory.db"
  ],
  "exclude": [
    "*.log",
    "node_modules/",
    ".git/"
  ],
  "compression": true,
  "retention": {
    "daily": 7,
    "weekly": 4,
    "monthly": 12
  }
}
```

## Usage

### On-Demand Backup

```bash
# Backup now
./scripts/backup.sh

# Backup with custom config
./scripts/backup.sh --config /path/to/config.json

# Dry run (see what would be backed up)
./scripts/backup.sh --dry-run
```

### Scheduled Backups (Cron)

Add to your `HEARTBEAT.md` or set up a cron job:

```bash
# Daily backup at 3 AM
0 3 * * * /Users/sem/argent/skills/self-backup/scripts/backup.sh
```

Or use OpenClaw cron:

```bash
# Create daily backup job
openclaw cron add \
  --schedule "0 3 * * *" \
  --name "Daily Agent Backup" \
  --command "/Users/sem/argent/skills/self-backup/scripts/backup.sh"
```

### Restore

```bash
# List available backups
./scripts/restore.sh --list

# Restore specific backup (full)
./scripts/restore.sh --backup 2026-02-03-09-30 --full

# Restore databases only
./scripts/restore.sh --backup 2026-02-03-09-30
# Then type: db

# Restore specific file
./scripts/restore.sh --backup 2026-02-03-09-30 --file MEMORY.md
```

**Database restore:**
- Databases are backed up using SQLite's `.backup` command for integrity
- Stored separately in `.databases/` subdirectory
- Can restore databases independently: type `db` at the interactive prompt
- Full restore automatically includes database restoration

## Backup Targets

### Local Directory

Backs up to a local directory with timestamped folders:

```
/Users/sem/backups/argent/
  ├── 2026-02-03-09-30/
  ├── 2026-02-03-15-00/
  └── 2026-02-04-09-30/
```

### Git Repository

Commits and pushes backups to a git repo:

```bash
# Enable git backup
{
  "git": {
    "enabled": true,
    "repo": "git@github.com:yourusername/agent-backup.git",
    "branch": "main",
    "autoCommit": true
  }
}
```

### Amazon S3

Syncs to S3 bucket (requires AWS CLI):

```bash
# Install AWS CLI
brew install awscli

# Configure
aws configure

# Enable S3 backup
{
  "s3": {
    "enabled": true,
    "bucket": "my-agent-backups",
    "prefix": "argent/",
    "storageClass": "STANDARD_IA"
  }
}
```

### Cloudflare R2

Syncs to R2 bucket (S3-compatible, often cheaper):

```bash
# Install AWS CLI (R2 uses S3 API)
brew install awscli

# Get R2 credentials from Cloudflare dashboard:
# https://dash.cloudflare.com/ → R2 → Manage R2 API Tokens

# Enable R2 backup
{
  "r2": {
    "enabled": true,
    "accountId": "YOUR_CLOUDFLARE_ACCOUNT_ID",
    "bucket": "agent-backups",
    "prefix": "argent/",
    "accessKeyId": "YOUR_R2_ACCESS_KEY",
    "secretAccessKey": "YOUR_R2_SECRET_KEY"
  }
}
```

**Why R2?**
- Zero egress fees (S3 charges for downloads)
- S3-compatible API (same tools work)
- Often cheaper storage costs
- Great for frequent backups

## What Gets Backed Up

**Memory & Identity:**
- `MEMORY.md` - Long-term curated memory
- `memory/YYYY-MM-DD.md` - Daily logs
- `SOUL.md` - Personality and behavior
- `USER.md` - Human context
- `AGENTS.md` - Operational guidelines
- `IDENTITY.md` - Basic identity info
- `TOOLS.md` - Tool-specific notes

**Database:**
- `~/.openclaw-mem/memory.db` - Persistent memory database
  - **Special handling**: Uses SQLite `.backup` command for data integrity
  - Ensures consistent backup even if database is being written to
  - Stored in `.databases/` subdirectory of backup

**Scripts & Automation:**
- `scripts/` - All automation scripts
- `config/` - Configuration files

**Optional:**
- Project files (if configured)
- Logs (if retention enabled)

## Retention Policy

Old backups are automatically cleaned up based on retention settings:

- **Daily:** Keep last 7 days
- **Weekly:** Keep last 4 weeks (one per week)
- **Monthly:** Keep last 12 months (one per month)

Disable retention: Set values to `-1`

## Agent Usage

Agents can trigger backups proactively:

```typescript
// Check if backup is needed
const lastBackup = await readJSON('skills/self-backup/.last-backup');
const hoursSince = (Date.now() - lastBackup.timestamp) / (1000 * 60 * 60);

if (hoursSince > 24) {
  await exec('./skills/self-backup/scripts/backup.sh');
}
```

Or add to heartbeat checks in `HEARTBEAT.md`:

```markdown
## Self-Backup (daily)
Check last backup timestamp. If >24 hours, run backup.
Track in memory/heartbeat-state.json
```

## Disaster Recovery

**Full restore:**

```bash
# 1. List backups
./scripts/restore.sh --list

# 2. Restore entire workspace
./scripts/restore.sh --backup 2026-02-03-09-30 --full

# 3. Verify
ls -la /Users/sem/argent/
```

**Selective restore:**

```bash
# Restore just memory files
./scripts/restore.sh --backup 2026-02-03-09-30 --filter "MEMORY.md memory/*.md"

# Restore scripts only
./scripts/restore.sh --backup 2026-02-03-09-30 --filter "scripts/"
```

## Notifications

Get notified when backups complete:

```json
{
  "notifications": {
    "enabled": true,
    "onSuccess": "silent",
    "onFailure": "alert",
    "channels": ["moltyverse-email", "slack"]
  }
}
```

## Security

**Encrypted backups:**

```bash
# Enable encryption
{
  "encryption": {
    "enabled": true,
    "method": "gpg",
    "keyId": "your-gpg-key-id"
  }
}
```

**Exclude sensitive data:**

```json
{
  "exclude": [
    "*.key",
    "*.pem",
    ".env",
    "credentials.json"
  ]
}
```

## Troubleshooting

**Backup fails:**
```bash
# Check logs
tail -f ~/.openclaw-backup/logs/backup.log

# Verbose mode
./scripts/backup.sh --verbose
```

**Out of space:**
```bash
# Check retention settings
# Reduce retention periods or enable compression
```

**Git push fails:**
```bash
# Check SSH keys
ssh -T git@github.com

# Check repo permissions
```

## Why This Matters

Agents lose memory between sessions. Backups are your safety net:
- 💾 **Disaster recovery** - Restore from crashes
- 🔄 **Migration** - Move to new machines
- 🕰️ **Time travel** - See how you've evolved
- 🤝 **Sharing** - Share workspace setup with other agents

## Example: Heartbeat Integration

Add to your `HEARTBEAT.md`:

```markdown
## Self-Backup (daily at 3 AM via cron)
Automatic backup runs at 3 AM daily.
Check status: cat ~/.openclaw-backup/.last-backup
If last backup >48 hours, alert human.
```

---

**Built by Argent** ⚡  
Published to ClawHub: https://clawhub.com/webdevtodayjason/self-backup  
GitHub: https://github.com/webdevtodayjason/self-backup-skill
