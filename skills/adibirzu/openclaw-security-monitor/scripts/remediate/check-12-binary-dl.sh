#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "CHECK 12: Remove skills referencing binary downloads"

# Patterns for binary downloads and suspicious archives
BINARY_PATTERNS=(
    "\.exe"
    "\.dmg"
    "\.pkg"
    "\.msi"
    "releases/download"
    "password.*\.zip"
    "\.encrypted\.zip"
    "wget.*\.exe"
    "curl.*\.dmg"
    "download.*binary"
)

FOUND_ISSUES=0
MATCHED_SKILLS=()

log "Scanning skills for binary download patterns..."

# Scan all files in skills
while IFS= read -r -d '' skillfile; do
    # Skip security-monitor
    if [[ "$skillfile" == *"security-monitor"* ]]; then
        continue
    fi

    for pattern in "${BINARY_PATTERNS[@]}"; do
        if grep -qiE "$pattern" "$skillfile" 2>/dev/null; then
            skill_dir=$(dirname "$skillfile")
            skill_name=$(basename "$skill_dir")

            # Avoid duplicates
            if [[ ! " ${MATCHED_SKILLS[@]} " =~ " ${skill_name} " ]]; then
                log "[!] Found binary download reference in skill: $skill_name"
                log "    File: $skillfile"
                log "    Pattern: $pattern"

                # Show matching lines
                log "    Matched lines:"
                grep -niE "$pattern" "$skillfile" | head -3 | sed 's/^/      /' || true

                MATCHED_SKILLS+=("$skill_name")
                FOUND_ISSUES=$((FOUND_ISSUES + 1))
            fi
            break
        fi
    done
done < <(find "$SKILLS_DIR" -type f -print0 2>/dev/null)

if [ $FOUND_ISSUES -eq 0 ]; then
    log "[OK] No binary download patterns found"
    exit 2
fi

log ""
log "=========================================="
log "GUIDANCE: Manual Review Required"
log "=========================================="
log ""
log "Found $FOUND_ISSUES skill(s) referencing binary downloads."
log ""
log "WARNING: Skills should generally not download or execute binaries."
log "This is a common malware delivery mechanism."
log ""
log "Affected skills:"
for skill in "${MATCHED_SKILLS[@]}"; do
    log "  - $skill"
done
log ""
log "RECOMMENDED ACTIONS:"
log "1. Review each skill to determine if binary downloads are necessary"
log "2. Check what the downloaded file is and where it comes from"
log "3. Verify the source is trustworthy (official repos only)"
log "4. Look for hardcoded URLs pointing to suspicious domains"
log ""
log "5. If confirmed malicious or unnecessary, remove the skill:"
log "   rm -rf \"\$SKILLS_DIR/<skill-name>\""
log ""
log "6. After removal, verify with:"
log "   ./check-12-binary-dl.sh"
log ""

guidance "Manual review of binary-downloading skills required"
exit 2
