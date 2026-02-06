#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "CHECK 15: Remove skills from blacklisted publishers"

PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
IOC_DIR="$PROJECT_DIR/ioc"
PUBLISHER_FILE="$IOC_DIR/malicious-publishers.txt"

log "Looking for publisher blacklist at: $PUBLISHER_FILE"

# Check if IOC file exists
if [ ! -f "$PUBLISHER_FILE" ]; then
    log "[SKIP] No malicious-publishers.txt file found"
    log "Expected location: $PUBLISHER_FILE"
    exit 2
fi

# Load publishers
BLACKLISTED_PUBS=()
while IFS= read -r line; do
    # Skip comments and empty lines
    [[ "$line" =~ ^#.*$ ]] && continue
    [[ -z "$line" ]] && continue
    BLACKLISTED_PUBS+=("$line")
done < "$PUBLISHER_FILE"

if [ ${#BLACKLISTED_PUBS[@]} -eq 0 ]; then
    log "[OK] No blacklisted publishers in list"
    exit 2
fi

log "Loaded ${#BLACKLISTED_PUBS[@]} blacklisted publisher(s)"

FOUND_ISSUES=0
MATCHED_SKILLS=()

log "Scanning skills for blacklisted publishers..."

# Scan SKILL.md and package.json files
while IFS= read -r -d '' skillfile; do
    # Skip security-monitor
    if [[ "$skillfile" == *"security-monitor"* ]]; then
        continue
    fi

    skill_dir=$(dirname "$skillfile")
    skill_name=$(basename "$skill_dir")

    # Check against each blacklisted publisher
    for publisher in "${BLACKLISTED_PUBS[@]}"; do
        if grep -qiF "$publisher" "$skillfile" 2>/dev/null; then
            if [[ ! " ${MATCHED_SKILLS[@]} " =~ " ${skill_name} " ]]; then
                log "[!] Found blacklisted publisher in skill: $skill_name"
                log "    Publisher: $publisher"
                log "    File: $skillfile"

                # Show context
                log "    Context:"
                grep -niF "$publisher" "$skillfile" | head -2 | sed 's/^/      /' || true

                MATCHED_SKILLS+=("$skill_name")
                FOUND_ISSUES=$((FOUND_ISSUES + 1))
            fi
            break
        fi
    done
done < <(find "$SKILLS_DIR" -type f \( -name "SKILL.md" -o -name "package.json" -o -name "setup.py" \) -print0 2>/dev/null)

if [ $FOUND_ISSUES -eq 0 ]; then
    log "[OK] No skills from blacklisted publishers found"
    exit 2
fi

log ""
log "=========================================="
log "GUIDANCE: Manual Review Required"
log "=========================================="
log ""
log "Found $FOUND_ISSUES skill(s) from blacklisted publishers."
log ""
log "Blacklisted publishers:"
for pub in "${BLACKLISTED_PUBS[@]}"; do
    log "  - $pub"
done
log ""
log "Affected skills:"
for skill in "${MATCHED_SKILLS[@]}"; do
    log "  - $skill"
done
log ""
log "RECOMMENDED ACTIONS:"
log "1. These publishers are known to distribute malicious skills"
log "2. Remove all skills from these publishers immediately:"
for skill in "${MATCHED_SKILLS[@]}"; do
    log "   rm -rf \"$SKILLS_DIR/$skill\""
done
log ""
log "3. After removal, verify with:"
log "   ./check-15-malicious-pub.sh"
log ""
log "4. Update the IOC list regularly:"
log "   git pull  # if using git for IOC updates"
log ""

guidance "Immediate removal of skills from blacklisted publishers required"
exit 2
