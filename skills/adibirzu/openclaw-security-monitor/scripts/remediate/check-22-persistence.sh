#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "Check 22: Audit/remove unauthorized LaunchAgents/crontabs"

SUSPICIOUS_FOUND=0

# Check LaunchAgents
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
if [[ -d "$LAUNCH_AGENTS_DIR" ]]; then
    log "Checking LaunchAgents in $LAUNCH_AGENTS_DIR"

    while IFS= read -r -d '' plist; do
        plist_name=$(basename "$plist")

        # Skip the security dashboard (authorized)
        if [[ "$plist_name" == *"security-dashboard"* ]]; then
            continue
        fi

        # Check for suspicious openclaw/clawdbot/moltbot entries
        if [[ "$plist_name" == *"openclaw"* ]] || [[ "$plist_name" == *"clawdbot"* ]] || [[ "$plist_name" == *"moltbot"* ]]; then
            log "SUSPICIOUS: Found unauthorized LaunchAgent: $plist_name"
            SUSPICIOUS_FOUND=$((SUSPICIOUS_FOUND + 1))

            guidance "To remove this LaunchAgent:"
            guidance "  launchctl unload \"$plist\""
            guidance "  rm \"$plist\""
        fi
    done < <(find "$LAUNCH_AGENTS_DIR" -type f -name "*.plist" -print0 2>/dev/null)
fi

# Check crontab
if crontab -l &>/dev/null; then
    log "Checking crontab entries"

    crontab -l | while IFS= read -r line; do
        # Skip comments and empty lines
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "$line" ]] && continue

        # Check for suspicious openclaw/clawdbot/moltbot entries
        if [[ "$line" == *"openclaw"* ]] || [[ "$line" == *"clawdbot"* ]] || [[ "$line" == *"moltbot"* ]]; then
            log "SUSPICIOUS: Found crontab entry: $line"
            SUSPICIOUS_FOUND=$((SUSPICIOUS_FOUND + 1))
        fi
    done

    if [[ $SUSPICIOUS_FOUND -gt 0 ]]; then
        guidance "To edit crontab and remove suspicious entries:"
        guidance "  crontab -e"
    fi
fi

# Check system-level LaunchDaemons (requires sudo, just warn)
LAUNCH_DAEMONS_DIR="/Library/LaunchDaemons"
if [[ -d "$LAUNCH_DAEMONS_DIR" ]]; then
    log "Checking system LaunchDaemons (requires elevated permissions)"

    while IFS= read -r plist; do
        plist_name=$(basename "$plist")

        if [[ "$plist_name" == *"openclaw"* ]] || [[ "$plist_name" == *"clawdbot"* ]] || [[ "$plist_name" == *"moltbot"* ]]; then
            log "SUSPICIOUS: Found system LaunchDaemon: $plist_name"
            SUSPICIOUS_FOUND=$((SUSPICIOUS_FOUND + 1))

            guidance "To remove this system LaunchDaemon (requires sudo):"
            guidance "  sudo launchctl unload \"$plist\""
            guidance "  sudo rm \"$plist\""
        fi
    done < <(find "$LAUNCH_DAEMONS_DIR" -type f -name "*.plist" 2>/dev/null)
fi

if [[ $SUSPICIOUS_FOUND -eq 0 ]]; then
    log "No unauthorized persistence mechanisms found"
fi

finish
