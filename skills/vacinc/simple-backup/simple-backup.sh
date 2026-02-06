#!/bin/bash
set -e

# ==========================================
# Simple Backup Script
# ==========================================
# Backs up OpenClaw brain, body, and skills to local folder + rclone remote.
# Auto-detects paths from OpenClaw config, but allows manual overrides.
# ==========================================

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# --- Dependency Check ---
for cmd in tar gpg rclone jq; do
    if ! command -v $cmd &> /dev/null; then
        echo "Error: $cmd is not installed."
        exit 1
    fi
done

# --- Load OpenClaw config ---
OPENCLAW_CONFIG="$HOME/.openclaw/openclaw.json"

if [ ! -f "$OPENCLAW_CONFIG" ]; then
    echo "Error: OpenClaw config not found at $OPENCLAW_CONFIG"
    exit 1
fi

# Read skill-specific config
SKILL_CONFIG=$(jq -r '.skills.entries["simple-backup"].config // empty' "$OPENCLAW_CONFIG" 2>/dev/null)

get_config() {
    local key="$1"
    local env_var="$2"
    local default="$3"
    
    if [ -n "$SKILL_CONFIG" ]; then
        val=$(echo "$SKILL_CONFIG" | jq -r ".$key // empty" 2>/dev/null)
        if [ -n "$val" ] && [ "$val" != "null" ]; then
            echo "${val/#\~/$HOME}"
            return
        fi
    fi
    
    if [ -n "${!env_var}" ]; then
        echo "${!env_var}"
        return
    fi
    
    echo "$default"
}

# --- Auto-detect defaults ---
AUTO_WORKSPACE=$(jq -r '.agents.defaults.workspace // empty' "$OPENCLAW_CONFIG" 2>/dev/null)
AUTO_STATE="$HOME/.openclaw"

# --- Configuration (config overrides -> env vars -> auto-detect) ---
WORKSPACE_DIR=$(get_config "workspaceDir" "BRAIN_DIR" "$AUTO_WORKSPACE")
STATE_DIR=$(get_config "stateDir" "BODY_DIR" "$AUTO_STATE")
SKILLS_DIR=$(get_config "skillsDir" "SKILLS_DIR" "$HOME/openclaw/skills")
BACKUP_ROOT=$(get_config "backupRoot" "BACKUP_ROOT" "${WORKSPACE_DIR:-$HOME}/BACKUPS")
REMOTE_DEST=$(get_config "remoteDest" "REMOTE_DEST" "")
MAX_DAYS=$(get_config "maxDays" "MAX_DAYS" "7")
HOURLY_RETENTION_HOURS=$(get_config "hourlyRetentionHours" "HOURLY_RETENTION_HOURS" "24")

# --- Validate ---
if [ -z "$WORKSPACE_DIR" ]; then
    echo "Error: No workspace found."
    echo "Set agents.defaults.workspace in openclaw.json or add workspaceDir to skill config."
    exit 1
fi

# --- Credential Check ---
BACKUP_PASSWORD="${BACKUP_PASSWORD:-}"
if [ -z "$BACKUP_PASSWORD" ]; then
    BACKUP_PASSWORD=$(get_config "password" "BACKUP_PASSWORD" "")
fi
if [ -z "$BACKUP_PASSWORD" ]; then
    KEY_FILE="$STATE_DIR/credentials/backup.key"
    if [ -f "$KEY_FILE" ]; then
        BACKUP_PASSWORD=$(cat "$KEY_FILE" | tr -d '\n')
    else
        echo "Error: Encryption password missing."
        echo "Options:"
        echo "  1. Set BACKUP_PASSWORD env var"
        echo "  2. Add 'password' to skill config in openclaw.json"
        echo "  3. Place password in $KEY_FILE"
        exit 1
    fi
fi

# --- Setup ---
TIMESTAMP=$(date +%Y%m%d-%H%M)
TODAY=$(date +%Y%m%d)
CURRENT_HOUR=$(date +%H)
STAGING_DIR=$(mktemp -d)
ARCHIVE_DIR=$(mktemp -d)

mkdir -p "$BACKUP_ROOT"

# Label logic: DAILY once per day after 3AM, otherwise HOURLY
LABEL="HOURLY"
if [ "$CURRENT_HOUR" -ge 3 ]; then
    if ! ls "$BACKUP_ROOT"/backup-"$TODAY"-*-DAILY.tgz.gpg >/dev/null 2>&1; then
        LABEL="DAILY"
    fi
fi

ARCHIVE_NAME="backup-${TIMESTAMP}-${LABEL}.tgz"
ENCRYPTED_NAME="${ARCHIVE_NAME}.gpg"
ARCHIVE_PATH="$ARCHIVE_DIR/$ARCHIVE_NAME"
ENCRYPTED_PATH="$ARCHIVE_DIR/$ENCRYPTED_NAME"

echo "📦 Starting backup: ${TIMESTAMP} (${LABEL})"
echo "   Workspace: $WORKSPACE_DIR"
echo "   State: $STATE_DIR"
echo "   Skills: $SKILLS_DIR"
echo "   Output: $BACKUP_ROOT"

# --- 1. Stage Files ---
echo "   Staging files..."
mkdir -p "$STAGING_DIR/workspace"
mkdir -p "$STAGING_DIR/state"
mkdir -p "$STAGING_DIR/skills"

if [ -d "$WORKSPACE_DIR" ]; then
    rsync -a --exclude 'BACKUPS' --exclude 'backups' --exclude '.git' --exclude 'node_modules' --exclude 'canvas' "$WORKSPACE_DIR/" "$STAGING_DIR/workspace/"
else
    echo "   Warning: Workspace not found at $WORKSPACE_DIR"
fi

if [ -d "$STATE_DIR" ]; then
    rsync -a --exclude 'logs' --exclude 'media' --exclude 'browser' "$STATE_DIR/" "$STAGING_DIR/state/"
else
    echo "   Warning: State dir not found at $STATE_DIR"
fi

if [ -d "$SKILLS_DIR" ]; then
    rsync -a --exclude 'node_modules' --exclude '.venv' "$SKILLS_DIR/" "$STAGING_DIR/skills/"
else
    echo "   Warning: Skills dir not found at $SKILLS_DIR"
fi

# --- 2. Compress ---
echo "   Compressing..."
tar -czf "$ARCHIVE_PATH" -C "$STAGING_DIR" .

# --- 3. Encrypt ---
echo "   Encrypting..."
gpg --batch --yes --passphrase "$BACKUP_PASSWORD" --symmetric --cipher-algo AES256 -o "$ENCRYPTED_PATH" "$ARCHIVE_PATH"

# --- 4. Move to Local Storage ---
mv "$ENCRYPTED_PATH" "$BACKUP_ROOT/"
echo "   Saved to $BACKUP_ROOT/$ENCRYPTED_NAME"

# --- 5. Cleanup Staging ---
rm -rf "$STAGING_DIR" "$ARCHIVE_DIR"

# --- 6. Prune Local Backups ---
echo "   Pruning old backups (keeping $MAX_DAYS daily, $HOURLY_RETENTION_HOURS hours of hourly)..."
find "$BACKUP_ROOT" -type f -name "*-DAILY.tgz.gpg" -mtime +"$MAX_DAYS" -print0 | xargs -0 -I {} rm -- {} 2>/dev/null || true
find "$BACKUP_ROOT" -type f -name "*-HOURLY.tgz.gpg" -mmin +$((HOURLY_RETENTION_HOURS * 60)) -print0 | xargs -0 -I {} rm -- {} 2>/dev/null || true

# --- 7. Cloud Sync (Optional) ---
if [ -n "$REMOTE_DEST" ]; then
    echo "   Syncing to Cloud ($REMOTE_DEST)..."
    REMOTE_NAME="${REMOTE_DEST%%:*}"
    
    if rclone listremotes | grep -q "$REMOTE_NAME"; then
        rclone sync "$BACKUP_ROOT" "$REMOTE_DEST" --include "*.gpg" --progress
        echo "✅ Backup complete and synced."
    else
        echo "⚠️  Remote '$REMOTE_NAME' not configured. Cloud sync skipped."
    fi
else
    echo "✅ Backup complete (local only)."
fi
