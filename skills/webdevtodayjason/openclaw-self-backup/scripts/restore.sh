#!/bin/bash
set -euo pipefail

# Self-Backup Restore Script
# Restores backups created by backup.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="${SKILL_DIR}/config/backup.json"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Parse arguments
ACTION=""
BACKUP_ID=""
FILE_FILTER=""
FULL_RESTORE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --list)
      ACTION="list"
      shift
      ;;
    --backup)
      BACKUP_ID="$2"
      shift 2
      ;;
    --file)
      FILE_FILTER="$2"
      shift 2
      ;;
    --filter)
      FILE_FILTER="$2"
      shift 2
      ;;
    --full)
      FULL_RESTORE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 --list"
      echo "       $0 --backup <backup-id> [--file <file>] [--filter <pattern>] [--full]"
      exit 1
      ;;
  esac
done

# Check if config exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo -e "${RED}Error: Config file not found: $CONFIG_FILE${NC}"
  exit 1
fi

BACKUP_DIR=$(jq -r '.backupDir' "$CONFIG_FILE")
WORKSPACE=$(jq -r '.workspace' "$CONFIG_FILE")

# List backups
if [ "$ACTION" = "list" ]; then
  echo -e "${GREEN}Available backups:${NC}"
  cd "$BACKUP_DIR"
  
  if ls *.tar.gz >/dev/null 2>&1; then
    for backup in $(ls -t *.tar.gz); do
      backup_name="${backup%.tar.gz}"
      size=$(du -h "$backup" | cut -f1)
      echo "  $backup_name ($size)"
    done
  fi
  
  if ls -d */ >/dev/null 2>&1; then
    for backup in $(ls -dt */); do
      backup_name="${backup%/}"
      size=$(du -sh "$backup" | cut -f1)
      echo "  $backup_name ($size)"
    done
  fi
  
  exit 0
fi

# Restore backup
if [ -z "$BACKUP_ID" ]; then
  echo -e "${RED}Error: --backup <backup-id> required${NC}"
  echo "Run with --list to see available backups"
  exit 1
fi

# Find backup (compressed or uncompressed)
BACKUP_PATH=""
if [ -f "${BACKUP_DIR}/${BACKUP_ID}.tar.gz" ]; then
  BACKUP_PATH="${BACKUP_DIR}/${BACKUP_ID}.tar.gz"
  COMPRESSED=true
elif [ -d "${BACKUP_DIR}/${BACKUP_ID}" ]; then
  BACKUP_PATH="${BACKUP_DIR}/${BACKUP_ID}"
  COMPRESSED=false
else
  echo -e "${RED}Error: Backup not found: $BACKUP_ID${NC}"
  exit 1
fi

echo -e "${GREEN}Restoring backup: $BACKUP_ID${NC}"

# Extract if compressed
EXTRACT_DIR="$BACKUP_PATH"
if [ "$COMPRESSED" = true ]; then
  echo "Extracting compressed backup..."
  EXTRACT_DIR="/tmp/restore-${BACKUP_ID}"
  mkdir -p "$EXTRACT_DIR"
  tar -xzf "$BACKUP_PATH" -C "/tmp/"
  EXTRACT_DIR="/tmp/${BACKUP_ID}"
fi

# Full restore
if [ "$FULL_RESTORE" = true ]; then
  echo -e "${YELLOW}WARNING: Full restore will overwrite workspace files!${NC}"
  read -p "Continue? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
  fi
  
  echo "Restoring all files to $WORKSPACE..."
  cp -R "$EXTRACT_DIR"/* "$WORKSPACE/"
  
  # Restore databases if they exist
  if [ -d "$EXTRACT_DIR/.databases" ]; then
    echo "Restoring SQLite databases..."
    if [ -f "$EXTRACT_DIR/.databases/openclaw-mem.db" ]; then
      mkdir -p ~/.openclaw-mem
      cp "$EXTRACT_DIR/.databases/openclaw-mem.db" ~/.openclaw-mem/memory.db
      echo "  Restored: openclaw-mem database"
    fi
  fi
  
  echo -e "${GREEN}Full restore complete!${NC}"
  exit 0
fi

# Selective restore
if [ -n "$FILE_FILTER" ]; then
  echo "Restoring files matching: $FILE_FILTER"
  cd "$EXTRACT_DIR"
  eval "find . -path '$FILE_FILTER' -exec cp --parents {} $WORKSPACE/ \;"
  echo -e "${GREEN}Selective restore complete!${NC}"
  exit 0
fi

# Interactive restore
echo "Files in backup:"
cd "$EXTRACT_DIR"
find . -type f | grep -v "^./.databases/" | sed 's|^\./||'

# Check for databases
if [ -d "$EXTRACT_DIR/.databases" ]; then
  echo ""
  echo "Databases:"
  ls -1 "$EXTRACT_DIR/.databases" | sed 's/^/  /'
fi

echo ""
read -p "Enter file path to restore (or 'all' for full restore, 'db' for databases only): " file_path

if [ "$file_path" = "all" ]; then
  cp -R "$EXTRACT_DIR"/* "$WORKSPACE/"
  # Restore databases
  if [ -d "$EXTRACT_DIR/.databases" ]; then
    echo "Restoring databases..."
    if [ -f "$EXTRACT_DIR/.databases/openclaw-mem.db" ]; then
      mkdir -p ~/.openclaw-mem
      cp "$EXTRACT_DIR/.databases/openclaw-mem.db" ~/.openclaw-mem/memory.db
      echo "  Restored: openclaw-mem database"
    fi
  fi
  echo -e "${GREEN}Full restore complete!${NC}"
elif [ "$file_path" = "db" ]; then
  if [ -d "$EXTRACT_DIR/.databases" ]; then
    echo "Restoring databases only..."
    if [ -f "$EXTRACT_DIR/.databases/openclaw-mem.db" ]; then
      mkdir -p ~/.openclaw-mem
      cp "$EXTRACT_DIR/.databases/openclaw-mem.db" ~/.openclaw-mem/memory.db
      echo -e "${GREEN}Restored: openclaw-mem database${NC}"
    fi
  else
    echo -e "${RED}No databases found in backup${NC}"
    exit 1
  fi
else
  if [ -f "$EXTRACT_DIR/$file_path" ]; then
    dest_dir=$(dirname "$WORKSPACE/$file_path")
    mkdir -p "$dest_dir"
    cp "$EXTRACT_DIR/$file_path" "$WORKSPACE/$file_path"
    echo -e "${GREEN}Restored: $file_path${NC}"
  else
    echo -e "${RED}File not found in backup: $file_path${NC}"
    exit 1
  fi
fi

# Cleanup temp extraction
if [ "$COMPRESSED" = true ]; then
  rm -rf "/tmp/${BACKUP_ID}"
fi

exit 0
