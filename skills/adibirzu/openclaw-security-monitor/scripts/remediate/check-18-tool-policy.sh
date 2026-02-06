#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "Check 18: Set tools.deny, restrict elevated access"

# Check if openclaw CLI is available
if ! command -v openclaw &>/dev/null; then
    log "openclaw CLI not found - skipping check"
    finish
fi

# Check tools.deny configuration
tools_deny=$(openclaw config get "tools.deny" 2>/dev/null)

if [[ -z "$tools_deny" ]] || [[ "$tools_deny" == "null" ]] || [[ "$tools_deny" == "[]" ]]; then
    log "WARNING: tools.deny is empty or not set"
    if confirm "Set tools.deny to [\"exec\",\"process\"]?"; then
        if $DRY_RUN; then
            log "[DRY-RUN] Would set tools.deny to [\"exec\",\"process\"]"
            FIXED=$((FIXED + 1))
        else
            if openclaw config set "tools.deny" '["exec","process"]' --json; then
                log "SUCCESS: Set tools.deny to [\"exec\",\"process\"]"
                FIXED=$((FIXED + 1))
            else
                log "ERROR: Failed to set tools.deny"
                FAILED=$((FAILED + 1))
            fi
        fi
    fi
fi

# Check tools.elevated configuration
elevated_enabled=$(openclaw config get "tools.elevated.enabled" 2>/dev/null)
elevated_allow_from=$(openclaw config get "tools.elevated.allowFrom" 2>/dev/null)
elevated_require_approval=$(openclaw config get "tools.elevated.requireApproval" 2>/dev/null)

if [[ "$elevated_enabled" == "true" ]]; then
    if [[ "$elevated_allow_from" == *"*"* ]]; then
        log "WARNING: tools.elevated.enabled=true with wildcard allowFrom"
        if confirm "Set tools.elevated.requireApproval to true?"; then
            if $DRY_RUN; then
                log "[DRY-RUN] Would set tools.elevated.requireApproval to true"
                FIXED=$((FIXED + 1))
            else
                if openclaw config set "tools.elevated.requireApproval" "true"; then
                    log "SUCCESS: Set tools.elevated.requireApproval to true"
                    FIXED=$((FIXED + 1))
                else
                    log "ERROR: Failed to set requireApproval"
                    FAILED=$((FAILED + 1))
                fi
            fi
        fi
        guidance "Consider restricting tools.elevated.allowFrom to specific user IDs instead of wildcards"
    fi
fi

finish
