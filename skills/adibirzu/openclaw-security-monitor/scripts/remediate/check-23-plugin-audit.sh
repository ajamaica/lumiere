#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "Check 23: Remove suspicious extensions"

EXTENSIONS_DIR="$OPENCLAW_DIR/extensions"
SUSPICIOUS_FOUND=0

if [[ ! -d "$EXTENSIONS_DIR" ]]; then
    log "Extensions directory not found at $EXTENSIONS_DIR"
    finish
fi

log "Scanning extensions for suspicious patterns"

# Find all JavaScript/TypeScript files in extensions
while IFS= read -r -d '' ext_file; do
    ext_name=$(basename "$(dirname "$ext_file")")

    # Check for suspicious patterns
    if grep -qE "(eval\s*\(|Function\s*\(|child_process|exec\s*\(|spawn\s*\()" "$ext_file" 2>/dev/null; then
        log "SUSPICIOUS: Extension '$ext_name' contains potentially dangerous code"
        log "  File: $ext_file"

        # Show the suspicious lines
        grep -nE "(eval\s*\(|Function\s*\(|child_process|exec\s*\(|spawn\s*\()" "$ext_file" 2>/dev/null | while IFS= read -r match; do
            log "    $match"
        done

        SUSPICIOUS_FOUND=$((SUSPICIOUS_FOUND + 1))

        guidance "Review extension '$ext_name' at:"
        guidance "  $(dirname "$ext_file")"
        guidance "If unauthorized, remove with:"
        guidance "  rm -rf \"$(dirname "$ext_file")\""
    fi
done < <(find "$EXTENSIONS_DIR" -type f \( -name "*.js" -o -name "*.ts" \) -print0 2>/dev/null)

# Check for extensions with network access patterns
while IFS= read -r -d '' ext_file; do
    ext_name=$(basename "$(dirname "$ext_file")")

    # Check for network patterns without validation
    if grep -qE "(http\.request|https\.request|fetch\(|axios\.|net\.connect)" "$ext_file" 2>/dev/null; then
        if ! grep -qE "(validateUrl|whitelist|allowedHosts)" "$ext_file" 2>/dev/null; then
            log "WARNING: Extension '$ext_name' makes network requests without apparent validation"
            log "  File: $ext_file"

            guidance "Review network usage in extension '$ext_name'"
        fi
    fi
done < <(find "$EXTENSIONS_DIR" -type f \( -name "*.js" -o -name "*.ts" \) -print0 2>/dev/null)

if [[ $SUSPICIOUS_FOUND -eq 0 ]]; then
    log "No obviously suspicious extensions found"
    log "Note: Manual review of all extensions is still recommended"
fi

finish
