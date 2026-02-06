#!/bin/bash
# OpenClaw Security Monitor - IOC Database Updater
# Fetches latest threat intelligence from community sources and updates
# the local IOC database. Run periodically or before scans.
#
# Sources:
#   - Koi Security ClawHavoc feed
#   - GitHub community IOC contributions
#   - Local scan findings
#
# Usage: update-ioc.sh [--check-only] [--github-repo URL]
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
IOC_DIR="$PROJECT_DIR/ioc"
LOG_DIR="${OPENCLAW_HOME:-$HOME/.openclaw}/logs"
UPDATE_LOG="$LOG_DIR/ioc-update.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Default upstream repo for IOC updates
GITHUB_REPO="${2:-https://raw.githubusercontent.com/adibirzu/openclaw-security-monitor/main/ioc}"

CHECK_ONLY=false
if [ "${1:-}" = "--check-only" ]; then
    CHECK_ONLY=true
fi

mkdir -p "$LOG_DIR" "$IOC_DIR"

log() { echo "[$TIMESTAMP] $1" | tee -a "$UPDATE_LOG"; }

log "IOC update started"

# ============================================================
# 1. Check for upstream IOC updates from GitHub
# ============================================================
echo "=== Checking upstream IOC database ==="

IOC_FILES=("c2-ips.txt" "malicious-domains.txt" "file-hashes.txt" "malicious-publishers.txt" "malicious-skill-patterns.txt")
UPDATES_FOUND=0

for ioc_file in "${IOC_FILES[@]}"; do
    echo -n "  Checking $ioc_file... "
    REMOTE_CONTENT=$(curl -sL --connect-timeout 10 --max-time 30 "$GITHUB_REPO/$ioc_file" 2>/dev/null)

    if [ $? -ne 0 ] || [ -z "$REMOTE_CONTENT" ]; then
        echo "SKIP (unreachable)"
        continue
    fi

    # Check if remote contains error page (GitHub 404)
    if echo "$REMOTE_CONTENT" | grep -q "^404"; then
        echo "SKIP (not found)"
        continue
    fi

    LOCAL_FILE="$IOC_DIR/$ioc_file"
    if [ -f "$LOCAL_FILE" ]; then
        LOCAL_HASH=$(shasum -a 256 "$LOCAL_FILE" | cut -d' ' -f1)
        REMOTE_HASH=$(echo "$REMOTE_CONTENT" | shasum -a 256 | cut -d' ' -f1)

        if [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
            echo "UPDATE AVAILABLE"
            UPDATES_FOUND=$((UPDATES_FOUND + 1))

            if [ "$CHECK_ONLY" = false ]; then
                # Backup existing
                cp "$LOCAL_FILE" "$LOCAL_FILE.bak"
                echo "$REMOTE_CONTENT" > "$LOCAL_FILE"
                log "Updated $ioc_file (was $LOCAL_HASH, now $REMOTE_HASH)"
                echo "    -> Updated"
            else
                echo "    -> Would update (run without --check-only to apply)"
            fi
        else
            echo "UP TO DATE"
        fi
    else
        echo "NEW"
        UPDATES_FOUND=$((UPDATES_FOUND + 1))
        if [ "$CHECK_ONLY" = false ]; then
            echo "$REMOTE_CONTENT" > "$LOCAL_FILE"
            log "Downloaded new $ioc_file"
            echo "    -> Downloaded"
        fi
    fi
done

echo ""

# ============================================================
# 2. Live threat feed: scan active network for new C2 indicators
# ============================================================
echo "=== Scanning active network for undocumented connections ==="

# Get all non-local, non-Apple IPs from active connections
ACTIVE_IPS=$(lsof -i -nP 2>/dev/null | grep -E "node|openclaw" | grep -E "ESTABLISHED|SYN_SENT" | \
    awk '{print $9}' | grep '->' | sed 's/.*->//' | cut -d: -f1 | \
    grep -vE "^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|::1|localhost)" | \
    sort -u)

if [ -n "$ACTIVE_IPS" ]; then
    echo "  Active external connections from node/openclaw:"
    KNOWN_IPS=$(grep -v '^#' "$IOC_DIR/c2-ips.txt" 2>/dev/null | grep -v '^$' | cut -d'|' -f1)
    while IFS= read -r ip; do
        KNOWN=false
        for kip in $KNOWN_IPS; do
            if echo "$ip" | grep -q "$kip" 2>/dev/null; then
                echo "    ALERT: $ip matches known C2: $kip"
                KNOWN=true
                break
            fi
        done
        if [ "$KNOWN" = false ]; then
            echo "    OK: $ip (not in C2 database)"
        fi
    done <<< "$ACTIVE_IPS"
else
    echo "  No external connections from node/openclaw processes"
fi

echo ""

# ============================================================
# 3. Scan installed skills for IOC matches
# ============================================================
echo "=== Checking installed skills against IOC database ==="

SKILLS_DIR="${OPENCLAW_HOME:-$HOME/.openclaw}/workspace/skills"
THREATS_FOUND=0

if [ -d "$SKILLS_DIR" ]; then
    # Check skill names against malicious patterns
    if [ -f "$IOC_DIR/malicious-skill-patterns.txt" ]; then
        PATTERNS=$(grep -v '^#' "$IOC_DIR/malicious-skill-patterns.txt" | grep -v '^$' | cut -d'|' -f1)
        for skilldir in "$SKILLS_DIR"/*/; do
            SKILL_NAME=$(basename "$skilldir")
            [ "$SKILL_NAME" = "security-monitor" ] && continue
            for pattern in $PATTERNS; do
                if echo "$SKILL_NAME" | grep -qiE "$pattern" 2>/dev/null; then
                    echo "  WARNING: Skill '$SKILL_NAME' matches malicious pattern: $pattern"
                    THREATS_FOUND=$((THREATS_FOUND + 1))
                    break
                fi
            done
        done
    fi

    # Check for known malicious publishers in skill files
    if [ -f "$IOC_DIR/malicious-publishers.txt" ]; then
        PUBLISHERS=$(grep -v '^#' "$IOC_DIR/malicious-publishers.txt" | grep -v '^$' | cut -d'|' -f1)
        for pub in $PUBLISHERS; do
            FOUND=$(grep -rl --exclude-dir=security-monitor "$pub" "$SKILLS_DIR" 2>/dev/null || true)
            if [ -n "$FOUND" ]; then
                echo "  CRITICAL: Known malicious publisher '$pub' found in: $FOUND"
                THREATS_FOUND=$((THREATS_FOUND + 1))
            fi
        done
    fi

    # Check for known malicious file hashes
    if [ -f "$IOC_DIR/file-hashes.txt" ]; then
        HASHES=$(grep -v '^#' "$IOC_DIR/file-hashes.txt" | grep -v '^$' | cut -d'|' -f1)
        for hash in $HASHES; do
            FOUND=$(find "$SKILLS_DIR" -type f -not -path "*/security-monitor/*" -exec shasum -a 256 {} \; 2>/dev/null | grep "$hash" || true)
            if [ -n "$FOUND" ]; then
                echo "  CRITICAL: Known malicious file hash found: $FOUND"
                THREATS_FOUND=$((THREATS_FOUND + 1))
            fi
        done
    fi
fi

if [ "$THREATS_FOUND" -eq 0 ]; then
    echo "  CLEAN: No installed skills match known threats"
fi

echo ""

# ============================================================
# Summary
# ============================================================
echo "=== Summary ==="
echo "  IOC files checked: ${#IOC_FILES[@]}"
echo "  Updates available: $UPDATES_FOUND"
echo "  Threats found: $THREATS_FOUND"
echo ""

if [ "$UPDATES_FOUND" -gt 0 ] && [ "$CHECK_ONLY" = true ]; then
    echo "Run without --check-only to apply updates."
fi

log "IOC update complete: $UPDATES_FOUND updates, $THREATS_FOUND threats"
