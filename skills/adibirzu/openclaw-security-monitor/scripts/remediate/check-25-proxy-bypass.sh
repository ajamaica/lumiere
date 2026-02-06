#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "Check 25: Configure trustedProxies, disable dangerouslyDisableDeviceAuth"

# Check if openclaw CLI is available
if ! command -v openclaw &>/dev/null; then
    log "openclaw CLI not found, skipping check"
    finish
fi

NEEDS_FIX=0

# Check dangerouslyDisableDeviceAuth setting
DISABLE_AUTH=$(openclaw config get dangerouslyDisableDeviceAuth 2>/dev/null)
if [[ "$DISABLE_AUTH" == "true" ]]; then
    log "WARNING: dangerouslyDisableDeviceAuth is enabled (security risk)"
    if confirm "Disable dangerouslyDisableDeviceAuth?"; then
        if $DRY_RUN; then
            log "[DRY-RUN] Would set dangerouslyDisableDeviceAuth=false"
            ((FIXED++))
        else
            if openclaw config set dangerouslyDisableDeviceAuth false; then
                log "Successfully disabled dangerouslyDisableDeviceAuth"
                ((FIXED++))
            else
                log "ERROR: Failed to disable dangerouslyDisableDeviceAuth"
                ((FAILED++))
            fi
        fi
    else
        ((FAILED++))
    fi
    NEEDS_FIX=1
fi

# Check gateway.bind and trustedProxies configuration
GATEWAY_BIND=$(openclaw config get gateway.bind 2>/dev/null)
TRUSTED_PROXIES=$(openclaw config get gateway.trustedProxies 2>/dev/null)

if [[ "$GATEWAY_BIND" == "0.0.0.0" || "$GATEWAY_BIND" == "lan" ]]; then
    if [[ -z "$TRUSTED_PROXIES" || "$TRUSTED_PROXIES" == "[]" || "$TRUSTED_PROXIES" == "null" ]]; then
        log "WARNING: Gateway bound to $GATEWAY_BIND but trustedProxies is empty"
        guidance "Gateway Security Configuration" \
            "Your gateway is exposed to the network without proxy protection:" \
            "1. Configure trusted proxy IPs: openclaw config set gateway.trustedProxies '[\"192.168.1.1\"]'" \
            "2. Or bind to localhost only: openclaw config set gateway.bind localhost" \
            "3. Use a reverse proxy (nginx/caddy) for external access" \
            "4. Reference: https://docs.openclaw.ai/security/proxy-configuration"
        ((FAILED++))
        NEEDS_FIX=1
    fi
fi

finish
