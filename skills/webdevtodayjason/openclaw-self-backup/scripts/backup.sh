#!/bin/bash
set -euo pipefail

# Self-Backup Script for AI Agents
# Creates timestamped backups of workspace, memory, and configurations

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="${SKILL_DIR}/config/backup.json"
LOG_DIR="${HOME}/.openclaw-backup/logs"
STATE_FILE="${HOME}/.openclaw-backup/.last-backup"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Parse arguments
DRY_RUN=false
VERBOSE=false
CUSTOM_CONFIG=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --config)
      CUSTOM_CONFIG="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--dry-run] [--verbose] [--config /path/to/config.json]"
      exit 1
      ;;
  esac
done

# Use custom config if provided
if [ -n "$CUSTOM_CONFIG" ]; then
  CONFIG_FILE="$CUSTOM_CONFIG"
fi

# Check if config exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo -e "${RED}Error: Config file not found: $CONFIG_FILE${NC}"
  echo "Copy config/backup.example.json to config/backup.json and edit it."
  exit 1
fi

# Create log directory
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/backup-$(date +%Y-%m-%d).log"

# Logging function
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_info() {
  if [ "$VERBOSE" = true ]; then
    echo -e "${YELLOW}[INFO]${NC} $1" | tee -a "$LOG_FILE"
  fi
}

# Parse JSON config (requires jq)
if ! command -v jq &> /dev/null; then
  log_error "jq is required but not installed. Install with: brew install jq"
  exit 1
fi

WORKSPACE=$(jq -r '.workspace' "$CONFIG_FILE")
BACKUP_DIR=$(jq -r '.backupDir' "$CONFIG_FILE")
COMPRESSION=$(jq -r '.compression' "$CONFIG_FILE")
LOCAL_ENABLED=$(jq -r '.targets.local.enabled' "$CONFIG_FILE")

# Generate backup timestamp
TIMESTAMP=$(date +%Y-%m-%d-%H-%M)
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"

log "Starting backup: $TIMESTAMP"
log "Workspace: $WORKSPACE"
log "Backup destination: $BACKUP_PATH"

if [ "$DRY_RUN" = true ]; then
  log_info "DRY RUN MODE - No files will be copied"
fi

# Create backup directory
if [ "$DRY_RUN" = false ]; then
  mkdir -p "$BACKUP_PATH"
fi

# Function to copy files with pattern
copy_pattern() {
  local pattern="$1"
  local source_base="$2"
  
  # Expand tilde in pattern
  pattern="${pattern/#\~/$HOME}"
  
  # Handle absolute paths
  local file_list
  if [[ "$pattern" = /* ]]; then
    file_list=$(eval "ls -d $pattern 2>/dev/null" || true)
  else
    file_list=$(eval "ls -d ${source_base}/${pattern} 2>/dev/null" || true)
  fi
  
  if [ -z "$file_list" ]; then
    return
  fi
  
  echo "$file_list" | while IFS= read -r file; do
    if [ -e "$file" ]; then
      local rel_path="${file#$source_base/}"
      # For absolute paths (like ~/.openclaw-mem/memory.db), use basename
      if [[ "$file" = /* ]] && [[ ! "$file" = "$source_base"* ]]; then
        rel_path=$(basename "$file")
      fi
      
      local dest="${BACKUP_PATH}/${rel_path}"
      local dest_dir=$(dirname "$dest")
      
      log_info "Backing up: $file"
      
      if [ "$DRY_RUN" = false ]; then
        mkdir -p "$dest_dir"
        if [ -d "$file" ]; then
          cp -R "$file" "$dest_dir/"
        else
          cp "$file" "$dest"
        fi
      else
        echo "  Would copy: $file -> $dest"
      fi
    fi
  done
}

# Backup SQLite databases first (special handling for data integrity)
log "Backing up SQLite databases..."
DB_BACKUP_DIR="${BACKUP_PATH}/.databases"
mkdir -p "$DB_BACKUP_DIR"

# openclaw-mem database
if [ -f ~/.openclaw-mem/memory.db ]; then
  log_info "Backing up openclaw-mem database..."
  if [ "$DRY_RUN" = false ]; then
    sqlite3 ~/.openclaw-mem/memory.db ".backup ${DB_BACKUP_DIR}/openclaw-mem.db"
    log_success "Database backed up: openclaw-mem.db"
  else
    echo "  Would backup: ~/.openclaw-mem/memory.db -> ${DB_BACKUP_DIR}/openclaw-mem.db"
  fi
fi

# Backup included files
log "Backing up workspace files..."
while IFS= read -r pattern; do
  # Skip database files - already handled above
  if [[ "$pattern" == *"memory.db"* ]]; then
    continue
  fi
  copy_pattern "$pattern" "$WORKSPACE"
done < <(jq -r '.include[]' "$CONFIG_FILE")

# Compress if enabled
if [ "$COMPRESSION" = "true" ] && [ "$DRY_RUN" = false ]; then
  log "Compressing backup..."
  tar -czf "${BACKUP_PATH}.tar.gz" -C "$BACKUP_DIR" "$TIMESTAMP"
  rm -rf "$BACKUP_PATH"
  log_success "Backup compressed: ${BACKUP_PATH}.tar.gz"
else
  log_success "Backup created: $BACKUP_PATH"
fi

# Git backup if enabled
GIT_ENABLED=$(jq -r '.targets.git.enabled' "$CONFIG_FILE")
if [ "$GIT_ENABLED" = "true" ] && [ "$DRY_RUN" = false ]; then
  log "Syncing to git repository..."
  GIT_REPO=$(jq -r '.targets.git.repo' "$CONFIG_FILE")
  GIT_BRANCH=$(jq -r '.targets.git.branch' "$CONFIG_FILE")
  
  # TODO: Implement git sync
  log_info "Git sync not yet implemented"
fi

# S3 backup if enabled
S3_ENABLED=$(jq -r '.targets.s3.enabled' "$CONFIG_FILE")
if [ "$S3_ENABLED" = "true" ] && [ "$DRY_RUN" = false ]; then
  log "Syncing to S3..."
  S3_BUCKET=$(jq -r '.targets.s3.bucket' "$CONFIG_FILE")
  S3_PREFIX=$(jq -r '.targets.s3.prefix' "$CONFIG_FILE")
  
  if command -v aws &> /dev/null; then
    if [ "$COMPRESSION" = "true" ]; then
      aws s3 cp "${BACKUP_PATH}.tar.gz" "s3://${S3_BUCKET}/${S3_PREFIX}${TIMESTAMP}.tar.gz"
    else
      aws s3 sync "$BACKUP_PATH" "s3://${S3_BUCKET}/${S3_PREFIX}${TIMESTAMP}/"
    fi
    log_success "Synced to S3: s3://${S3_BUCKET}/${S3_PREFIX}"
  else
    log_error "AWS CLI not installed. Install with: brew install awscli"
  fi
fi

# Cloudflare R2 backup if enabled
R2_ENABLED=$(jq -r '.targets.r2.enabled' "$CONFIG_FILE")
if [ "$R2_ENABLED" = "true" ] && [ "$DRY_RUN" = false ]; then
  log "Syncing to Cloudflare R2..."
  R2_ACCOUNT_ID=$(jq -r '.targets.r2.accountId' "$CONFIG_FILE")
  R2_BUCKET=$(jq -r '.targets.r2.bucket' "$CONFIG_FILE")
  R2_PREFIX=$(jq -r '.targets.r2.prefix' "$CONFIG_FILE")
  R2_ACCESS_KEY=$(jq -r '.targets.r2.accessKeyId' "$CONFIG_FILE")
  R2_SECRET_KEY=$(jq -r '.targets.r2.secretAccessKey' "$CONFIG_FILE")
  
  if command -v aws &> /dev/null; then
    R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    
    if [ "$COMPRESSION" = "true" ]; then
      AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY" \
      AWS_SECRET_ACCESS_KEY="$R2_SECRET_KEY" \
      aws s3 cp "${BACKUP_PATH}.tar.gz" \
        "s3://${R2_BUCKET}/${R2_PREFIX}${TIMESTAMP}.tar.gz" \
        --endpoint-url "$R2_ENDPOINT"
    else
      AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY" \
      AWS_SECRET_ACCESS_KEY="$R2_SECRET_KEY" \
      aws s3 sync "$BACKUP_PATH" \
        "s3://${R2_BUCKET}/${R2_PREFIX}${TIMESTAMP}/" \
        --endpoint-url "$R2_ENDPOINT"
    fi
    log_success "Synced to R2: ${R2_ENDPOINT}/${R2_BUCKET}/${R2_PREFIX}"
  else
    log_error "AWS CLI not installed (required for R2). Install with: brew install awscli"
  fi
fi

# Cleanup old backups (retention policy)
if [ "$DRY_RUN" = false ]; then
  log "Applying retention policy..."
  DAILY_RETENTION=$(jq -r '.retention.daily' "$CONFIG_FILE")
  
  if [ "$DAILY_RETENTION" != "-1" ] && [ "$DAILY_RETENTION" != "null" ]; then
    # Keep only last N daily backups
    cd "$BACKUP_DIR"
    if [ "$COMPRESSION" = "true" ]; then
      ls -t *.tar.gz 2>/dev/null | tail -n +$((DAILY_RETENTION + 1)) | xargs -r rm --
    else
      ls -dt */ 2>/dev/null | tail -n +$((DAILY_RETENTION + 1)) | xargs -r rm -rf --
    fi
    log_info "Cleaned up old backups (keeping last $DAILY_RETENTION)"
  fi
fi

# Save state
if [ "$DRY_RUN" = false ]; then
  mkdir -p "$(dirname "$STATE_FILE")"
  cat > "$STATE_FILE" <<EOF
{
  "timestamp": $(date +%s),
  "date": "$(date -Iseconds)",
  "backupPath": "$BACKUP_PATH",
  "compression": $COMPRESSION,
  "success": true
}
EOF
fi

log_success "Backup complete!"
log "Log file: $LOG_FILE"

# Calculate backup size
if [ "$DRY_RUN" = false ]; then
  if [ "$COMPRESSION" = "true" ]; then
    SIZE=$(du -h "${BACKUP_PATH}.tar.gz" | cut -f1)
    log "Backup size: $SIZE"
  else
    SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
    log "Backup size: $SIZE"
  fi
fi

exit 0
