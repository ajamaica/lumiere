#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "Check 17: Set DM policy to restricted"

# Check if openclaw CLI is available
if ! command -v openclaw &>/dev/null; then
    log "openclaw CLI not found - skipping check"
    finish
fi

CHANNELS=("whatsapp" "telegram" "discord" "slack" "signal")
NEEDS_FIX=0

for channel in "${CHANNELS[@]}"; do
    # Check DM policy for this channel
    dm_policy=$(openclaw config get "channels.${channel}.dmPolicy" 2>/dev/null)
    allow_from=$(openclaw config get "channels.${channel}.allowFrom" 2>/dev/null)

    if [[ "$dm_policy" == "open" ]]; then
        log "WARNING: Channel $channel has dmPolicy=open"
        if confirm "Set $channel dmPolicy to 'restricted'?"; then
            if $DRY_RUN; then
                log "[DRY-RUN] Would set channels.${channel}.dmPolicy to 'restricted'"
                FIXED=$((FIXED + 1))
            else
                if openclaw config set "channels.${channel}.dmPolicy" "restricted"; then
                    log "SUCCESS: Set $channel dmPolicy to 'restricted'"
                    FIXED=$((FIXED + 1))
                else
                    log "ERROR: Failed to set $channel dmPolicy"
                    FAILED=$((FAILED + 1))
                fi
            fi
        else
            NEEDS_FIX=$((NEEDS_FIX + 1))
        fi
    fi

    if [[ "$allow_from" == *"*"* ]]; then
        log "WARNING: Channel $channel has wildcard '*' in allowFrom"
        guidance "Review and restrict channels.${channel}.allowFrom to specific user IDs"
        NEEDS_FIX=$((NEEDS_FIX + 1))
    fi
done

if [[ "$NEEDS_FIX" -gt 0 ]]; then
    log "Some DM policy issues require manual attention"
fi

finish
