#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "Check 20: Disable mDNS full mode"

# Check if openclaw CLI is available
if ! command -v openclaw &>/dev/null; then
    log "openclaw CLI not found - skipping check"
    finish
fi

# Check discovery.mdns.mode configuration
mdns_mode=$(openclaw config get "discovery.mdns.mode" 2>/dev/null)

if [[ "$mdns_mode" == "full" ]]; then
    log "WARNING: mDNS mode is set to 'full' (exposes instance metadata)"
    if confirm "Set discovery.mdns.mode to 'off'?"; then
        if $DRY_RUN; then
            log "[DRY-RUN] Would set discovery.mdns.mode to 'off'"
            FIXED=$((FIXED + 1))
        else
            if openclaw config set "discovery.mdns.mode" "off"; then
                log "SUCCESS: Set discovery.mdns.mode to 'off'"
                FIXED=$((FIXED + 1))
            else
                log "ERROR: Failed to set discovery.mdns.mode"
                FAILED=$((FAILED + 1))
            fi
        fi
    fi
elif [[ -z "$mdns_mode" ]] || [[ "$mdns_mode" == "null" ]] || [[ "$mdns_mode" == "off" ]]; then
    log "mDNS mode is already disabled or off"
else
    log "mDNS mode is set to '$mdns_mode' (not 'full')"
fi

finish
