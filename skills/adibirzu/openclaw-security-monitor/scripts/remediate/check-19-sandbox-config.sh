#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "Check 19: Enable sandboxing"

# Check if openclaw CLI is available
if ! command -v openclaw &>/dev/null; then
    log "openclaw CLI not found - skipping check"
    finish
fi

# Check sandbox.mode configuration
sandbox_mode=$(openclaw config get "sandbox.mode" 2>/dev/null)

if [[ "$sandbox_mode" == "off" ]] || [[ "$sandbox_mode" == "none" ]]; then
    log "WARNING: Sandbox mode is set to '$sandbox_mode'"
    if confirm "Set sandbox.mode to 'all'?"; then
        if $DRY_RUN; then
            log "[DRY-RUN] Would set sandbox.mode to 'all'"
            FIXED=$((FIXED + 1))
        else
            if openclaw config set "sandbox.mode" "all"; then
                log "SUCCESS: Set sandbox.mode to 'all'"
                FIXED=$((FIXED + 1))
            else
                log "ERROR: Failed to set sandbox.mode"
                FAILED=$((FAILED + 1))
            fi
        fi
    fi
elif [[ -z "$sandbox_mode" ]] || [[ "$sandbox_mode" == "null" ]]; then
    log "WARNING: Sandbox mode is not configured"
    if confirm "Set sandbox.mode to 'all'?"; then
        if $DRY_RUN; then
            log "[DRY-RUN] Would set sandbox.mode to 'all'"
            FIXED=$((FIXED + 1))
        else
            if openclaw config set "sandbox.mode" "all"; then
                log "SUCCESS: Set sandbox.mode to 'all'"
                FIXED=$((FIXED + 1))
            else
                log "ERROR: Failed to set sandbox.mode"
                FAILED=$((FAILED + 1))
            fi
        fi
    fi
else
    log "Sandbox mode is already set to '$sandbox_mode'"
fi

finish
