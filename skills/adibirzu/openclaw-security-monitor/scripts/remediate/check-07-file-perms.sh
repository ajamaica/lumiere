#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "CHECK 7: Checking file and directory permissions..."

# Files that should be 600 (rw-------)
CONFIG_FILES=(
  "$OPENCLAW_DIR/openclaw.json"
  "$OPENCLAW_DIR/auth-profiles.json"
  "$OPENCLAW_DIR/exec-approvals.json"
  "$OPENCLAW_DIR/mcp.json"
  "$OPENCLAW_DIR/.env"
  "$OPENCLAW_DIR/credentials.json"
)

# Directories that should be 700 (rwx------)
SECURE_DIRS=(
  "$OPENCLAW_DIR"
  "$LOG_DIR"
  "$OPENCLAW_DIR/workspace"
  "$OPENCLAW_DIR/cache"
  "$OPENCLAW_DIR/.ssh"
)

NEEDS_FIX=false
FILES_TO_FIX=()
DIRS_TO_FIX=()

# Check config files
log "Checking config file permissions..."
for file in "${CONFIG_FILES[@]}"; do
  if [ -f "$file" ]; then
    current_perms=$(stat -f "%OLp" "$file" 2>/dev/null || stat -c "%a" "$file" 2>/dev/null)
    if [ "$current_perms" != "600" ]; then
      log "  ✗ $file has permissions $current_perms (should be 600)"
      FILES_TO_FIX+=("$file")
      NEEDS_FIX=true
    else
      log "  ✓ $file (600)"
    fi
  fi
done

# Check directories
log "Checking directory permissions..."
for dir in "${SECURE_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    current_perms=$(stat -f "%OLp" "$dir" 2>/dev/null || stat -c "%a" "$dir" 2>/dev/null)
    if [ "$current_perms" != "700" ]; then
      log "  ✗ $dir has permissions $current_perms (should be 700)"
      DIRS_TO_FIX+=("$dir")
      NEEDS_FIX=true
    else
      log "  ✓ $dir (700)"
    fi
  fi
done

if [ "$NEEDS_FIX" = false ]; then
  log "All file and directory permissions are correct"
  exit 2
fi

# Auto-fix permissions
log ""
log "Found permission issues:"
log "  ${#FILES_TO_FIX[@]} file(s) need chmod 600"
log "  ${#DIRS_TO_FIX[@]} directory(ies) need chmod 700"

if confirm "Fix these permissions?"; then
  # Fix files
  for file in "${FILES_TO_FIX[@]}"; do
    if fix_perms "$file" 600 "config file"; then
      log "  ✓ Fixed $file"
      FIXED=$((FIXED + 1))
    else
      log "  ✗ Failed to fix $file"
      FAILED=$((FAILED + 1))
    fi
  done

  # Fix directories
  for dir in "${DIRS_TO_FIX[@]}"; do
    if fix_perms "$dir" 700 "directory"; then
      log "  ✓ Fixed $dir"
      FIXED=$((FIXED + 1))
    else
      log "  ✗ Failed to fix $dir"
      FAILED=$((FAILED + 1))
    fi
  done

  if [ $FIXED -gt 0 ]; then
    log ""
    guidance "File permissions have been secured." \
            "" \
            "What these permissions mean:" \
            "- 600 (rw-------): Only you can read/write, no one else can access" \
            "- 700 (rwx------): Only you can read/write/execute, no one else can access"
  fi
else
  log "Skipping permission fixes"
  FAILED=$((FAILED + ${#FILES_TO_FIX[@]} + ${#DIRS_TO_FIX[@]}))
fi

finish
