#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "Check 21: Fix credential/session dir permissions"

# Fix OPENCLAW_DIR permissions
if [[ -d "$OPENCLAW_DIR" ]]; then
    fix_perms "$OPENCLAW_DIR" "700" "OPENCLAW_DIR"
else
    log "OPENCLAW_DIR not found at $OPENCLAW_DIR"
fi

# Fix credentials directory
CREDS_DIR="$OPENCLAW_DIR/credentials"
if [[ -d "$CREDS_DIR" ]]; then
    fix_perms "$CREDS_DIR" "700" "credentials directory"

    # Fix individual credential files
    while IFS= read -r -d '' cred_file; do
        fix_perms "$cred_file" "600" "credential file $(basename "$cred_file")"
    done < <(find "$CREDS_DIR" -type f -name "*.json" -print0 2>/dev/null)
else
    log "Credentials directory not found at $CREDS_DIR"
fi

# Fix session directories
AGENTS_DIR="$OPENCLAW_DIR/agents"
if [[ -d "$AGENTS_DIR" ]]; then
    while IFS= read -r -d '' session_dir; do
        fix_perms "$session_dir" "700" "session directory $(basename "$(dirname "$session_dir")")/sessions"
    done < <(find "$AGENTS_DIR" -type d -name "sessions" -print0 2>/dev/null)
else
    log "Agents directory not found at $AGENTS_DIR"
fi

# Fix config directory if it exists
CONFIG_DIR="$OPENCLAW_DIR/config"
if [[ -d "$CONFIG_DIR" ]]; then
    fix_perms "$CONFIG_DIR" "700" "config directory"

    # Fix config files
    while IFS= read -r -d '' config_file; do
        fix_perms "$config_file" "600" "config file $(basename "$config_file")"
    done < <(find "$CONFIG_DIR" -type f \( -name "*.json" -o -name "*.yml" -o -name "*.yaml" \) -print0 2>/dev/null)
fi

finish
