#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "Check 24: Enable log redaction, fix log dir perms"

# Check if openclaw CLI is available for config changes
if command -v openclaw &>/dev/null; then
    # Check logging.redactSensitive configuration
    redact_sensitive=$(openclaw config get "logging.redactSensitive" 2>/dev/null)

    if [[ "$redact_sensitive" == "false" ]] || [[ "$redact_sensitive" == "off" ]] || [[ "$redact_sensitive" == "none" ]] || [[ -z "$redact_sensitive" ]] || [[ "$redact_sensitive" == "null" ]]; then
        log "WARNING: Log redaction is disabled or not set"
        if confirm "Set logging.redactSensitive to true?"; then
            if $DRY_RUN; then
                log "[DRY-RUN] Would set logging.redactSensitive to true"
                FIXED=$((FIXED + 1))
            else
                if openclaw config set "logging.redactSensitive" "true"; then
                    log "SUCCESS: Set logging.redactSensitive to true"
                    FIXED=$((FIXED + 1))
                else
                    log "ERROR: Failed to set logging.redactSensitive"
                    FAILED=$((FAILED + 1))
                fi
            fi
        fi
    else
        log "Log redaction is already enabled"
    fi
else
    log "openclaw CLI not found - skipping config check"
fi

# Fix /tmp/openclaw permissions
TMP_OPENCLAW="/tmp/openclaw"
if [[ -d "$TMP_OPENCLAW" ]]; then
    fix_perms "$TMP_OPENCLAW" "700" "/tmp/openclaw directory"
else
    log "/tmp/openclaw directory does not exist"
fi

# Fix LOG_DIR permissions
if [[ -n "$LOG_DIR" ]] && [[ -d "$LOG_DIR" ]]; then
    fix_perms "$LOG_DIR" "700" "log directory"

    # Fix individual log files
    while IFS= read -r -d '' log_file; do
        fix_perms "$log_file" "600" "log file $(basename "$log_file")"
    done < <(find "$LOG_DIR" -type f -name "*.log" -print0 2>/dev/null)
else
    log "LOG_DIR not set or does not exist"
fi

# Fix openclaw logs in standard locations
STANDARD_LOG_DIRS=(
    "$HOME/.openclaw/logs"
    "$OPENCLAW_DIR/logs"
    "/var/log/openclaw"
)

for log_dir in "${STANDARD_LOG_DIRS[@]}"; do
    if [[ -d "$log_dir" ]]; then
        fix_perms "$log_dir" "700" "log directory $log_dir"

        # Fix log files in this directory
        while IFS= read -r -d '' log_file; do
            fix_perms "$log_file" "600" "log file $(basename "$log_file")"
        done < <(find "$log_dir" -type f -name "*.log" -print0 2>/dev/null)
    fi
done

finish
