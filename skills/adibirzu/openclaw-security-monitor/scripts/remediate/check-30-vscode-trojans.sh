#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "Check 30: Scan for fake ClawdBot VS Code extensions"

# Define extension directories to check
EXTENSION_DIRS=(
    "$HOME/.vscode/extensions"
    "$HOME/.vscode-insiders/extensions"
    "$HOME/.vscode-oss/extensions"
    "$HOME/.cursor/extensions"
)

# Suspicious extension patterns
SUSPICIOUS_PATTERNS=(
    "*clawdbot*"
    "*moltbot*"
    "*openclaw-unofficial*"
    "*claw-bot*"
    "*claudebot*"
)

TROJANS_FOUND=0
declare -a TROJAN_PATHS=()

for EXT_DIR in "${EXTENSION_DIRS[@]}"; do
    if [[ ! -d "$EXT_DIR" ]]; then
        continue
    fi

    log "Scanning $EXT_DIR..."

    for PATTERN in "${SUSPICIOUS_PATTERNS[@]}"; do
        while IFS= read -r EXTENSION; do
            if [[ -d "$EXTENSION" ]]; then
                EXTENSION_NAME=$(basename "$EXTENSION")
                log "WARNING: Suspicious extension found: $EXTENSION_NAME"
                ((TROJANS_FOUND++))
                TROJAN_PATHS+=("$EXTENSION")
            fi
        done < <(find "$EXT_DIR" -maxdepth 1 -type d -iname "$PATTERN" 2>/dev/null)
    done
done

if [[ $TROJANS_FOUND -eq 0 ]]; then
    log "No suspicious extensions found"
    finish
fi

log "Found $TROJANS_FOUND suspicious extension(s)"

# Offer to remove them
for TROJAN in "${TROJAN_PATHS[@]}"; do
    TROJAN_NAME=$(basename "$TROJAN")

    if confirm "Remove suspicious extension: $TROJAN_NAME?"; then
        if $DRY_RUN; then
            log "[DRY-RUN] Would remove: $TROJAN"
            ((FIXED++))
        else
            if rm -rf "$TROJAN"; then
                log "Successfully removed: $TROJAN"
                ((FIXED++))
            else
                log "ERROR: Failed to remove: $TROJAN"
                ((FAILED++))
            fi
        fi
    else
        log "Skipped: $TROJAN_NAME"
        ((FAILED++))
    fi
done

if [[ $FIXED -gt 0 ]]; then
    guidance "Extension Removal Complete" \
        "Removed $FIXED suspicious extension(s)." \
        "" \
        "ADDITIONAL SECURITY STEPS:" \
        "1. Restart VS Code / Cursor to complete removal" \
        "2. Review installed extensions for other suspicious entries" \
        "3. Only install extensions from verified publishers" \
        "4. Check extension permissions before installing" \
        "5. Monitor system for unusual behavior" \
        "" \
        "OFFICIAL OPENCLAW EXTENSIONS:" \
        "- Publisher: openclaw (verified)" \
        "- Extension ID: openclaw.openclaw-vscode" \
        "- Marketplace: https://marketplace.visualstudio.com/items?itemName=openclaw.openclaw-vscode" \
        "" \
        "If you installed these extensions manually:" \
        "- Scan your downloads folder for malicious installers" \
        "- Run antivirus scan on your system" \
        "- Review recent system changes" \
        "" \
        "Report malicious extensions: security@openclaw.ai"
elif [[ $FAILED -gt 0 ]]; then
    guidance "Manual Removal Required" \
        "Some suspicious extensions were not removed automatically." \
        "" \
        "MANUAL REMOVAL STEPS:" \
        "$(printf '1. rm -rf "%s"\n' "${TROJAN_PATHS[@]}")" \
        "" \
        "Then restart VS Code / Cursor"
fi

finish
